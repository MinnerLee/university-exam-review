"""Render original objective questions for inline use in the major quiz."""

import argparse
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re

from PIL import Image
from pypdfium2 import PdfDocument, raw


SHA256 = "5c61686ca2c133412ffee60641dee0b1f63bfcacc9c1f2865928fab880c6c4ec"
SECTIONS = "一二三四五六七八九十"
MARKER = re.compile(
    rf"^[ \t]*(?:(?P<section>[{SECTIONS}]+)、|(?P<number>\d{{1,2}})[.．、](?!\d)|"
    r"(?P<end>[\[【]?(?:参考)?(?:答案|解答)[\]】]?[ \t\r]*$|©|[ivx]+\)))",
    re.M,
)
SCALE = 2.6


@dataclass
class Bounds:
    page: int
    start: int
    end: int


def source_pages(document, paper):
    """Keep offsets in PDFium's character array, including UTF-16 pairs."""
    for number in range(paper["first"], min(paper["last"], paper["answer"]) + 1):
        text_page = document[number - 1].get_textpage()
        text = "".join(
            chr(raw.FPDFText_GetUnicode(text_page, index) or 0xFFFD)
            for index in range(text_page.count_chars())
        )
        yield number, text_page, text


def locate_questions(paper, pages):
    wanted = {(item["page"], item["id"]): [] for item in paper["questions"] if item.get("kind")}
    section = ""
    active = None
    for page, text_page, text in pages:
        start = text.find("\n") + 1
        for marker in MARKER.finditer(text, start):
            position = marker.start(marker.lastgroup)
            left, _, _, _ = text_page.get_charbox(position)
            if left >= 130:
                continue
            if active is not None:
                wanted[active].append(Bounds(page, start, marker.start()))
            if marker["end"]:
                if "答案" in marker["end"] or "解答" in marker["end"]:
                    return wanted
                # Footer and footnotes end this page, but the question may continue.
                break
            active = None
            if marker["section"]:
                section = marker["section"]
            elif (key := (page, f'{section}-{marker["number"]}')) in wanted and not wanted[key]:
                active = key
                start = position
        else:
            if active is not None:
                wanted[active].append(Bounds(page, start, len(text)))
    return wanted


def crop(document, pages, bounds):
    text_page, text = pages[bounds.page]
    boxes = [
        text_page.get_charbox(index)
        for index in range(bounds.start, bounds.end)
        if not text[index].isspace() and text[index] != "\ufffd"
    ]
    boxes = [box for box in boxes if box[2] > box[0] and box[3] > box[1] and 47 < box[1] < 800]
    if not boxes:
        return None
    page = document[bounds.page - 1]
    width, height = page.get_size()
    # Keep the full printable line width and enough padding for formula rules.
    bottom = min(box[1] for box in boxes) - 5
    top = max(box[3] for box in boxes) + 5
    return page.render(scale=SCALE, crop=(53, bottom, width - 544, height - top)).to_pil().convert("RGB")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--dist", type=Path, default=Path("dist"))
    args = parser.parse_args()
    if hashlib.sha256(args.pdf.read_bytes()).hexdigest() != SHA256:
        parser.error("Expected the official BUMP 1.5.0 PDF.")
    index_file = args.dist / "papers-index.js"
    payload = index_file.read_text(encoding="utf-8").strip()
    index = json.loads(payload.removeprefix("globalThis.papersIndex = ").removesuffix(";"))
    document = PdfDocument(args.pdf)
    count = 0
    missing = []
    for paper in index:
        page_data = list(source_pages(document, paper))
        questions = locate_questions(paper, page_data)
        pages = {number: (text_page, text) for number, text_page, text in page_data}
        for question in paper["questions"]:
            if not question.get("kind"):
                continue
            bounds = questions[(question["page"], question["id"])]
            images = [crop(document, pages, part) for part in bounds]
            images = [image for image in images if image is not None]
            if not images:
                missing.append(f'{paper["id"]}/{question["id"]} ({question["page"]})')
                continue
            width, height = max(image.width for image in images), sum(image.height for image in images)
            combined = Image.new("RGB", (width, height), "white")
            y = 0
            for image in images:
                combined.paste(image, (0, y))
                y += image.height
            section, number = question["id"].split("-")
            path = Path("paper-questions") / paper["id"] / f"{SECTIONS.index(section) + 1}-{number}.webp"
            target = args.dist / path
            target.parent.mkdir(parents=True, exist_ok=True)
            combined.save(target, "WEBP", quality=88)
            question["preview"] = [path.as_posix(), width, height]
            if question["kind"] == "choice":
                source = " ".join(pages[part.page][1][part.start:part.end] for part in bounds)
                labels = list(dict.fromkeys(re.findall(r"(?<![A-Za-z])([A-E])[.．、](?![A-Za-z])", source)))
                if labels in (list("ABCD"), list("ABCDE")):
                    question["options"] = labels
            count += 1
    if missing:
        parser.error("Missing source text for " + ", ".join(missing))
    index_file.write_text(
        "globalThis.papersIndex = " + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Rendered {count} objective questions.")


if __name__ == "__main__":
    main()

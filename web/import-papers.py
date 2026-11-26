"""Build the public index from the user's local copy of BUMP 1.5.0."""
import json
from pathlib import Path
import re
import sys
import unicodedata

from pypdf import PdfReader


def papers(reader):
    entries = [
        (reader.get_destination_page_number(entry) + 1, entry.title)
        for entry in reader.outline if not isinstance(entry, list)
    ]
    for (first, title), (following, _) in zip(entries, entries[1:]):
        head = re.match(r"^(\d+)\s+(?:\[分析([上下])期([中末])\]\s*)?(.*)$", title)
        if not head or not 1 <= int(head[1]) <= 97:
            continue
        name = head[4].removeprefix("[无准确标题]").strip()
        year = int(re.search(r"\b20\d{2}\b", name)[0]) if re.search(r"\b20\d{2}\b", name) else 0
        if year < 2020:
            continue
        if "学年" not in name and re.search(r"\b20\d{2}\s*春", name):
            year -= 1
        course = "工科数学分析" if "工科数学分析" in name else "高等数学" if re.search("高等数学|高数", name) else "数学分析"
        questions, section, number_seen = [], "", 0
        answer_page = 0
        for page in range(first, following):
            lines = reader.pages[page - 1].extract_text().splitlines()[1:]
            for line in lines:
                if re.fullmatch(r"[\[【]?(?:参考)?(?:答案|解答)[\]】]?", line.strip()) or (
                    head[1] == "20" and page == 64 and re.match(r"一、\s*1[.．]", line)
                ):
                    answer_page = page
                    break
                if match := re.match(r"^([一二三四五六七八九十]+)、(.*)", line):
                    section = match[1]
                    number_seen = 0
                    questions.append({
                        "id": section, "label": f"第{section}大题", "page": page,
                        "type": re.sub(r"[\s（(].*$", "", match[2].strip()) if re.match(r"\s*(单选题|填空题|选择题|判断题|计算题|解答题|证明题)", match[2]) else "",
                    })
                elif (match := re.match(r"^(\d{1,2})[.．、](?!\d)", line)) and section:
                    number = int(match[1])
                    if number == number_seen + 1:
                        questions.append({"id": f"{section}-{number}", "label": f"第{section}大题第 {number} 题", "page": page, "number": number})
                        number_seen = number
            if answer_page:
                break
        assert questions and answer_page, name
        yield {
            "id": head[1], "title": unicodedata.normalize("NFC", name), "course": course,
            "year": year, "term": head[2] or "上", "exam": "期末" if head[3] == "末" else "期中",
            "first": first, "last": following - 1, "answer": answer_page, "questions": questions,
        }


index = list(papers(PdfReader(sys.argv[1])))
assert len(index) == 50
for paper in index:
    groups = {item["id"].split("-")[0] for item in paper["questions"] if "number" in item}
    paper["questions"] = [item for item in paper["questions"] if "number" in item or item["id"] not in groups]
output = Path(sys.argv[2] if len(sys.argv) > 2 else "dist/papers-index.js")
output.write_text("globalThis.papersIndex = " + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"{len(index)} papers, {sum(len(paper['questions']) for paper in index)} indexed entries")

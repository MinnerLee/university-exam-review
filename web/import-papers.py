"""Build the public index from the user's local copy of BUMP 1.5.0."""
import json
from pathlib import Path
import re
import sys
import unicodedata

from pypdf import PdfReader


def objective_kind(text):
    if re.match(r"\s*(单项选择题|单选题|选择题)", text):
        return "choice"
    if re.match(r"\s*填空题", text):
        return "fill"
    return ""


def knowledge(text):
    text = unicodedata.normalize("NFKC", text.split("\nA.")[0])
    patterns = [
        ("vector-integrals", r"曲线积分|曲面积分|格林|高斯公式|斯托克斯|散度|旋度|div|grad|rot|∮|∯"),
        ("series", r"级数|傅里叶|收敛域|收敛半径"),
        ("multiple-integrals", r"[二三重]重积分|二重积分|三重积分|积分次序|积分顺序|累次积分|逐次积分|∬|∭"),
        ("multivariable", r"偏导|方向导数|全微分|梯度|切平面|法平面|空间曲线|空间曲面|二重极限|二元函数|三元函数|二元|多元"),
        ("asymptote-patterns", r"渐近线"),
        ("curvature", r"曲率"),
        ("concavity", r"拐点|凹凸"),
        ("inverse-functions", r"反函数"),
        ("curves", r"参数方程|极坐标|切线|法线"),
        ("lhopital-conditions", r"洛必达|L.H[oô]pital"),
        ("higher-derivatives", r"高阶导|阶导|f\(\d+\)|y\(\d+\)"),
        ("taylor-methods", r"麦克劳林|Taylor|泰勒|Maclaurin|Peano|余项"),
        ("proof-techniques", r"中值定理|罗尔|拉格朗日|柯西中值"),
        ("continuity", r"间断点|连续点|连续性"),
        ("derivative-definition", r"左右导数|左导数|右导数|可导性|不可导|处可导|处的可导"),
        ("function-behavior", r"极值|单调|极小|极大"),
        ("optimization", r"最大值|最小值|最值"),
        ("basic-limits", r"等价无穷小|高阶无穷小|低阶无穷小|同阶无穷小"),
        ("related-rates", r"变化率|速率"),
        ("differentials", r"微分(?!方程)|\bdy\s*\|"),
        ("ode", r"微分方程|通解|特解|初值问题"),
        ("one-integral", r"反常积分|原函数|定积分|不定积分|旋转体|积分|∫"),
        ("estimates", r"数列|夹逼|单调有界|Stolz"),
        ("limit-constraints", r"求常数|参数.*极限"),
        ("basic-limits", r"\blim\b|极限|趋于"),
        ("differentiation", r"导数|求导|由方程|d[xy]/d[xy]|′|″"),
    ]
    for key, pattern in patterns:
        if re.search(pattern, text, flags=re.IGNORECASE):
            return key
    if re.search(r"\b[uz]\s*=|∂|𝜕|x,\s*y", text):
        return "multivariable"
    return "other"


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
        kind, objective, question_text = "", None, []
        answer_page = 0

        def finish():
            if objective is None:
                return
            objective["topic"] = knowledge("\n".join(question_text))
            question_text.clear()

        for page in range(first, following):
            lines = reader.pages[page - 1].extract_text().splitlines()[1:]
            for line in lines:
                if re.fullmatch(r"[\[【]?(?:参考)?(?:答案|解答)[\]】]?", line.strip()) or (
                    head[1] == "20" and page == 64 and re.match(r"一、\s*1[.．]", line)
                ):
                    answer_page = page
                    break
                if match := re.match(r"^([一二三四五六七八九十]+)、(.*)", line):
                    finish()
                    objective = None
                    section = match[1]
                    number_seen = 0
                    kind = objective_kind(match[2])
                    questions.append({
                        "id": section, "label": f"第{section}大题", "page": page,
                        "type": re.sub(r"[\s（(].*$", "", match[2].strip()) if re.match(r"\s*(单选题|填空题|选择题|判断题|计算题|解答题|证明题)", match[2]) else "",
                    })
                elif (match := re.match(r"^(\d{1,2})[.．、](?!\d)", line)) and section:
                    number = int(match[1])
                    if number == number_seen + 1:
                        finish()
                        question = {"id": f"{section}-{number}", "label": f"第{section}大题第 {number} 题", "page": page, "number": number}
                        objective = None
                        if kind:
                            question["kind"] = kind
                            objective = question
                            question_text.append(line)
                        questions.append(question)
                        number_seen = number
                elif objective is not None:
                    question_text.append(line)
            if answer_page:
                break
        finish()
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

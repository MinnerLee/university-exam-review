import fs from 'node:fs';
import { marked } from './vendor/marked.esm.js';
import katex from './vendor/katex.mjs';

const input = process.argv[2] ?? '../calculus-exam-review-notes.md';
const notes = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
const anchors = [...notes.matchAll(/^(?:&lt;a name=&quot;([\w-]+)&quot;&gt;&lt;\/a&gt;|<a name="([\w-]+)"><\/a>)[ \t]*$/gm)];
const issues = new Set();

function html(markdown, outline = []) {
  const equations = [];
  const prepared = markdown.replace(/\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g, (_, display, inline) => {
    const formula = (display ?? inline).trim();
    let markup;
    try {
      markup = katex.renderToString(formula, { displayMode: Boolean(display), strict: 'ignore' });
    } catch {
      issues.add(formula);
      markup = katex.renderToString(formula, { displayMode: Boolean(display), throwOnError: false });
    }
    return `MATHPLACEHOLDER${equations.push(markup) - 1}END`;
  });
  let headingIndex = 0;
  return marked.parse(prepared)
    .replace(/<h([45])>/g, (tag, depth) => {
      const item = outline[headingIndex++];
      return item ? '<h' + depth + ' id="point-' + item.index + '">' : tag;
    })
    .replace(/MATHPLACEHOLDER(\d+)END/g, (_, index) => equations[Number(index)]);
}

const entries = anchors.map((anchor, index) => {
  const id = anchor[1] ?? anchor[2];
  const section = notes.slice(anchor.index + anchor[0].length, anchors[index + 1]?.index).trim();
  const heading = section.match(/^(#{2,4})\s+(.+?)(?:\n|$)/);
  const body = heading ? section.slice(heading[0].length).trim() : section;
  const [question, ...solution] = body.split(/(?=\*\*破题思路\*\*|\*\*思路\*\*)/);
  const example = id.startsWith('example-') && /^example-\d/.test(id);
  const outline = example ? [] : [...body.matchAll(/^(#{4,5})[ \t]+(.+?)$/gm)].map((match, index) => ({
    index: index + 1, level: match[1].length, title: match[2],
  }));
  return {
    id,
    title: heading?.[2] ?? id,
    level: heading?.[1].length ?? 0,
    text: body,
    html: html(example && solution.length ? question : body, outline),
    ...(outline.length ? { outline } : {}),
    solution: example && solution.length ? html(solution.join('')) : '',
  };
});

const ids = new Set(entries.map(({ id }) => id));
const missing = [...new Set([...notes.matchAll(/\]\(#([\w-]+)\)/g)].map((match) => match[1]))].filter((id) => !ids.has(id));
if (missing.length || ids.size !== entries.length || !ids.has('example-64')) {
  throw new Error(`Invalid anchors. Missing: ${missing.join(', ')}`);
}
fs.writeFileSync('dist/notes.js', `globalThis.studyNotes = ${JSON.stringify(entries)};\n`);
console.log(`Built ${entries.length} sections and ${entries.filter(e => /^example-\d/.test(e.id)).length} examples.`);
if (issues.size) console.log(`Math rendering issues (${issues.size}):`, [...issues].slice(0, 12));

const notes = globalThis.studyNotes;
const byId = new Map(notes.map(entry => [entry.id, entry]));
const groups = [
  { id: 'limits-continuity', title: '极限与连续', summary: '等价无穷小、幂式极限、数列、间断点', topics: ['basic-limits', 'simplify-expand', 'power-limits', 'estimates', 'limit-constraints', 'continuity'] },
  { id: 'derivatives-differentials', title: '导数与微分', summary: '左右导数、参数求导、高阶导数、相关变化率', topics: ['derivative-definition', 'differentiation', 'inverse-functions', 'curves', 'higher-derivatives', 'differentials', 'curvature'] },
  { id: 'mean-value-taylor', title: '中值定理与函数性态', summary: '罗尔定理、泰勒展开、单调性、极值与拐点', topics: ['proof-techniques', 'taylor-methods', 'function-behavior', 'optimization', 'concavity'] },
];
const indexes = ['example-topics', 'midterm-deck', 'chapter-2-problems', 'chapter-2-homework'];
const examples = notes.filter(entry => /^example-\d/.test(entry.id));
const quiz = [
  { topic: 'continuity', title: '判断间断点', prompt: '如果某函数在 0 处的左、右极限都等于 1，但 f(0)=0，那么 0 属于哪一类？', options: ['连续点', '可去间断点', '跳跃间断点', '第二类间断点'], answer: 1, feedback: '左右都靠到同一个高度 1。把点值改成 1，图像就接上了。' },
  { topic: 'basic-limits', title: '比较无穷小', prompt: '当 u 趋于 0 时，哪一项与 1−cos u 等价？', options: ['u', 'u²', '−u²/2', 'u²/2'], answer: 3, feedback: '看同一量级还要看系数。1−cos u = 2sin²(u/2)，用 sin(u/2) 与 u/2 等价，系数就是 1/2。' },
  { topic: 'derivative-definition', title: '识别单侧差商', prompt: '导数定义里的增量若换成 h²，令 h 从两侧趋于 0，实际是在考察哪边的导数？', options: ['左导数', '右导数', '两侧导数', '对称差商'], answer: 1, feedback: 'h² 在 h≠0 时始终为正，所以 x₀+h² 始终在 x₀ 的右边。' },
  { topic: 'curves', title: '参数曲线的二阶导数', prompt: '设参数曲线的斜率 P(t)=dy/dx，且 x′(t)≠0。二阶导数怎么求？', options: ['P′(t)', 'P′(t) / x′(t)', 'P(t) / x′(t)', 'P′(t) / y′(t)'], answer: 1, feedback: 'P′(t) 是斜率随 t 的变化率。除以 x′(t)，就换算成斜率随 x 的变化率。' },
  { topic: 'higher-derivatives', title: '从展开式读出导数', prompt: '若 f 的麦克劳林展开里 x⁵ 的系数是 3，那么 f 的五阶导数在 0 处是多少？', options: ['3', '15', '3/120', '360'], answer: 3, feedback: '麦克劳林展开里这一项的系数是五阶导数值除以 5!，所以反过来要乘 5!，得到 3×120=360。' },
  { topic: 'rolle-basics', title: '使用罗尔定理', prompt: '函数在 [a,b] 上连续、在 (a,b) 内可导。加上哪个条件，就能用罗尔定理找到导数为 0 的点？', options: ['f(a)=f(b)', 'f(a)>f(b)', 'f(a)<f(b)', 'f(a) 与 f(b) 同号'], answer: 0, feedback: '两端同高是罗尔定理的条件，导数为零的点位于开区间 (a,b) 内。' },
  { topic: 'derivative-definition', title: '分段点的二阶导数', prompt: '分段函数在 0 处已经有一阶导数。接下来用定义判断二阶导数时，该看哪个差商？', options: ['[f(x)−f(0)] / x²', '[f′(x)−f′(0)] / x', '[f(x)−f(0)] / x', 'f′(x) / x'], answer: 1, feedback: '二阶导数是 f′ 的导数。把导数定义里的 f 全部换成 f′，点值也跟着换成 f′(0)。' },
  { topic: 'power-limits', title: '幂式极限的最后一步', prompt: '某个正值幂式 y 取对数后，算出 ln y 趋于 0。原式 y 的极限是多少？', options: ['0', '1', 'e', '不能判断'], answer: 1, feedback: '对数只算到中间一步。用 y=e^(ln y) 还原，得到 e⁰=1。' },
  { topic: 'concavity', title: '判断拐点', prompt: '若某点两侧二阶导数都为正，且该点二阶导数等于 0，能从这些信息判断该点是拐点吗？', options: ['能，因为二阶导数为零', '不能，两侧凹凸性相同', '能，因为两侧都有二阶导数', '必须先求一阶导数的零点'], answer: 1, feedback: '拐点要看凹凸性有没有改变。两边的二阶导数都为正，曲线在两侧都向同一个方向弯。' },
  { topic: 'limit-constraints', title: '求斜渐近线', prompt: '已经算出 f(x)/x 趋于 2。要找斜渐近线的截距，下一步应算什么？', options: ['f(x) 的极限', 'f(x)−2x 的极限', 'f(x)−2 的极限', 'x[f(x)−2x] 的极限'], answer: 1, feedback: '斜率已经是 2。减掉 2x 后，剩下的极限如果是有限数 b，渐近线就是 y=2x+b。' },
];

const main = document.querySelector('main');
const dialog = document.querySelector('#search-dialog');
const search = document.querySelector('#search-query');
const searchResults = document.querySelector('#search-results');
const storageKey = 'calculus-review-v1';
let state = { done: [], saved: [], recent: [], answers: {} };
try { state = { ...state, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch {}
let exampleFilter = 'all';
let quizIndex = 0;
let attempt = {};
let quizComplete = false;

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
}

function safe(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function row(entry, meta = '') {
  return `<a class="row" href="#${entry.id}"><strong>${safe(entry.title)}</strong>${meta ? `<span class="row-meta">${safe(meta)}</span>` : ''}</a>`;
}

function button(href, label, variant = '') {
  return `<a class="button ${variant}" href="#${href}">${safe(label)}</a>`;
}

function heading(title, description = '', back = '') {
  return `<header class="page-head">${back}<h1>${safe(title)}</h1>${description ? `<p>${safe(description)}</p>` : ''}</header>`;
}

function groupCards() {
  return `<div class="grid">${groups.map((group, index) => `<a class="card" href="#${group.id}"><span class="chapter-num">第 ${index + 1} 章</span><h3>${group.title}</h3><p>${group.summary}</p></a>`).join('')}</div>`;
}

function home() {
  const visited = state.recent.filter(id => byId.has(id)).slice(0, 3).map(id => byId.get(id));
  const starter = ['continuity', 'derivative-definition', 'common-maclaurin'].map(id => byId.get(id));
  return `<section class="hero"><div class="hero-copy"><div class="overline">数学分析 / 高等数学</div><h1>数分复习簿</h1><p>查考点，顺着例题推一遍，再做几道自测。</p><div class="actions">${button(visited[0]?.id ?? 'topics', visited.length ? '继续上次复习' : '开始复习', 'primary')}${button('quiz', '做一组自测', 'quiet')}</div></div><canvas id="curve-art" aria-hidden="true"></canvas></section>
    <section class="section"><div class="section-heading"><h2>按章节复习</h2><a href="#topics">查看全部考点</a></div>${groupCards()}</section>
    <section class="section"><div class="section-heading"><h2>${visited.length ? '最近复习' : '先从这几个考点开始'}</h2></div><div class="row-list">${(visited.length ? visited : starter).map(entry => row(entry)).join('')}</div></section>
    <section class="section card progress-card"><h2>例题进度</h2><span class="row-meta">已完成 ${state.done.length} / ${examples.length}</span><progress value="${state.done.length}" max="${examples.length}" aria-label="例题完成进度"></progress><p>可在例题里标记完成或加入待复习。</p><a href="#examples">打开例题库</a></section>`;
}

function drawHero() {
  const canvas = document.querySelector('#curve-art');
  if (!canvas) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx || !w || !h) return;
  const ratio = devicePixelRatio || 1;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  ctx.scale(ratio, ratio);
  const ox = w * .38, oy = h * .61;
  function line(fromX, fromY, toX, toY) {
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
  }
  ctx.strokeStyle = '#89b5ef27';
  for (let x = ox % 24; x < w; x += 24) line(x, 20, x, h - 20);
  for (let y = oy % 24; y < h - 18; y += 24) if (y > 18) line(0, y, w, y);
  ctx.strokeStyle = '#a1c6f475';
  line(ox, 18, ox, h - 18); line(0, oy, w, oy);
  const fn = x => oy - h * (.05 + .37 * Math.sin(x / w * 4.2 - 1.2) + .08 * x / w);
  ctx.strokeStyle = '#9cc6ff'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) x ? ctx.lineTo(x, fn(x)) : ctx.moveTo(x, fn(x));
  ctx.stroke();
  const px = w * .47, py = fn(px), slope = fn(px + 1) - py;
  ctx.strokeStyle = '#63d5bd'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  line(px - 84, py - 84 * slope, px + 85, py + 85 * slope);
  ctx.setLineDash([]); ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fillStyle = '#a0ead7'; ctx.fill();
}

function topicList(group) {
  const topics = item => `<div class="row-list">${item.topics.map(id => row(byId.get(id))).join('')}</div>`;
  if (group) return heading(group.title, group.summary, '<p class="breadcrumb"><a href="#topics">考点笔记</a></p>') + topics(group);
  return heading('考点笔记', '按章节查找公式、做题步骤和易错点。') + groups.map(item => `<section class="section"><div class="section-heading"><h2>${item.title}</h2></div>${topics(item)}</section>`).join('');
}

function exampleList() {
  return heading('例题库', `${examples.length} 道代表例题。可以按题号或关键词找题。`) + `<div class="field"><input id="example-query" type="search" aria-label="筛选例题" placeholder="搜索例题，例如「二阶导数」「2.2.91」"></div><div class="filters" aria-label="例题状态">${Object.entries({ all: '全部例题', saved: '待复习', done: '已完成' }).map(([id, label]) => `<button type="button" class="button" data-filter="${id}" aria-pressed="${exampleFilter === id}">${label}</button>`).join('')}${button('example-topics', '按题型选题')}</div><div id="example-results" class="section row-list"></div>`;
}

function normalize(value) {
  return value.normalize('NFKC').toLowerCase().replace(/\s/g, '');
}

function matches(entry, query) {
  return normalize(`${entry.title} ${entry.text}`).includes(normalize(query));
}

function renderExampleResults() {
  const query = document.querySelector('#example-query').value;
  const result = examples.filter(entry => (exampleFilter === 'all' || state[exampleFilter].includes(entry.id)) && matches(entry, query));
  document.querySelector('#example-results').innerHTML = result.map(entry => row(entry, state.done.includes(entry.id) ? '已完成' : state.saved.includes(entry.id) ? '待复习' : '')).join('') || '<p class="muted">这里暂时没有符合条件的例题。</p>';
  for (const filter of main.querySelectorAll('[data-filter]')) filter.setAttribute('aria-pressed', filter.dataset.filter === exampleFilter);
}

function article(entry) {
  const isExample = examples.includes(entry);
  const back = `<p class="breadcrumb"><a href="#${isExample ? 'examples' : 'topics'}">${isExample ? '例题库' : '考点笔记'}</a></p>`;
  const related = [];
  if (!isExample) {
    for (const candidate of examples) if (candidate.text.includes(`](#${entry.id})`)) related.push(candidate);
  }
  const relatedHtml = related.length ? `<section class="section"><h2>配套例题</h2><div class="row-list">${related.map(candidate => row(candidate)).join('')}</div></section>` : '';
  const previous = examples[examples.indexOf(entry) - 1];
  const next = examples[examples.indexOf(entry) + 1];
  return heading(entry.title, '', back) + `<article class="article">${entry.html}${entry.solution ? `<details><summary>展开思路与解析</summary>${entry.solution}</details>` : ''}</article>` + (isExample ? `<div class="actions article-actions"><div class="actions"><button type="button" class="button" data-toggle="saved" aria-pressed="${state.saved.includes(entry.id)}">${state.saved.includes(entry.id) ? '已加入待复习' : '加入待复习'}</button><button type="button" class="button" data-toggle="done" aria-pressed="${state.done.includes(entry.id)}">${state.done.includes(entry.id) ? '已完成' : '标记完成'}</button></div><div class="actions">${previous ? button(previous.id, '上一题') : ''}${next ? button(next.id, '下一题') : ''}</div></div>` : relatedHtml);
}

function quizView() {
  if (quizComplete) {
    const correct = quiz.filter((item, i) => item.answer === attempt[i]).length;
    const missed = quiz.filter((item, i) => item.answer !== attempt[i]);
    return heading('自测结果', `本轮答对 ${correct} / ${quiz.length} 题。`) + `<section class="article">${missed.length ? `<h2>回看答错的考点</h2><div class="row-list">${missed.map(item => row(byId.get(item.topic), item.title)).join('')}</div>` : '<p>本轮全部答对。</p>'}<div class="actions article-actions"><button type="button" data-quiz="restart" class="button primary">再做一轮</button>${button('topics', '去看笔记')}</div></section>`;
  }
  const item = quiz[quizIndex];
  const answer = attempt[quizIndex];
  const answered = answer !== undefined;
  return heading('随堂自测', `第 ${quizIndex + 1} / ${quiz.length} 题 · ${item.title}`) + `<article class="article"><h2>${item.prompt}</h2><div class="quiz-options">${item.options.map((option, i) => {
    const style = answered && i === item.answer ? 'correct' : answered && i === answer ? 'wrong' : '';
    return `<button type="button" data-option="${i}" class="button option ${style}" ${answered ? 'disabled' : ''}><b>${'ABCD'[i]}</b>${option}</button>`;
  }).join('')}</div><div class="feedback" aria-live="polite">${answered ? `<strong>${answer === item.answer ? '答对了。' : `正确答案是 ${'ABCD'[item.answer]}。`}</strong> ${item.feedback} <a href="#${item.topic}">回看考点</a>` : ''}</div><div class="actions">${quizIndex > 0 ? '<button type="button" class="button" data-quiz="previous">上一题</button>' : ''}<button type="button" class="button primary" data-quiz="next" ${answered ? '' : 'disabled'}>${quizIndex === quiz.length - 1 ? '查看结果' : '下一题'}</button></div></article>`;
}

function route(resetScroll = true) {
  const hash = location.hash.slice(1);
  const id = hash === 'worked-examples' ? 'examples' : hash || 'home';
  const entry = byId.get(id);
  const group = groups.find(item => item.id === id);
  const tab = id === 'quiz' ? 'quiz' : id === 'examples' || examples.includes(entry) || indexes.includes(id) ? 'examples' : id === 'topics' || entry ? 'topics' : 'home';
  for (const link of document.querySelectorAll('[data-tab]')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const link of document.querySelectorAll('.sidebar a')) {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (id === 'quiz') main.innerHTML = quizView();
  else if (id === 'examples') { main.innerHTML = exampleList(); renderExampleResults(); }
  else if (id === 'topics' || group) main.innerHTML = topicList(group);
  else if (entry) {
    state.recent = [id, ...state.recent.filter(key => key !== id)].slice(0, 6);
    persist();
    main.innerHTML = article(entry);
  } else { main.innerHTML = home(); drawHero(); }
  for (const table of main.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.before(wrap); wrap.append(table);
  }
  document.title = entry ? `${entry.title} · 数分复习簿` : '数分复习簿';
  if (resetScroll) window.scrollTo(0, 0);
}

function updateSearch() {
  const query = search.value.trim();
  const entries = query ? notes.filter(entry => entry.id !== 'study-navigation' && matches(entry, query)) : ['continuity', 'common-maclaurin', 'example-08'].map(id => byId.get(id));
  if (query) entries.sort((a, b) => Number(normalize(b.title).includes(normalize(query))) - Number(normalize(a.title).includes(normalize(query))));
  searchResults.innerHTML = entries.slice(0, 12).map(entry => row(entry, examples.includes(entry) ? '例题' : '笔记')).join('') || '<p class="muted">没有匹配内容。可以换个关键词或输入题号。</p>';
}

function openSearch() {
  updateSearch();
  dialog.showModal();
  search.focus();
}

document.querySelector('#chapter-nav').innerHTML = groups.map(group => `<a class="side-group" href="#${group.id}">${group.title}</a>${group.topics.map(id => `<a class="side-topic" href="#${id}">${safe(byId.get(id).title)}</a>`).join('')}`).join('');
document.querySelector('#index-nav').innerHTML = indexes.map(id => `<a href="#${id}">${safe(byId.get(id).title)}</a>`).join('');
document.querySelector('#skip-main').addEventListener('click', event => {
  event.preventDefault(); main.focus();
});
document.querySelector('.search-open').addEventListener('click', openSearch);
document.querySelector('#search-close').addEventListener('click', () => dialog.close());
search.addEventListener('input', updateSearch);
search.addEventListener('keydown', event => {
  if (event.key === 'Enter') searchResults.querySelector('a')?.click();
});
dialog.addEventListener('click', event => {
  if (event.target.closest('a') || event.target === dialog) dialog.close();
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !dialog.open && !event.target.closest('input, textarea, [contenteditable]')) {
    event.preventDefault(); openSearch();
  }
});
main.addEventListener('input', event => {
  if (event.target.id === 'example-query') renderExampleResults();
});
main.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  const { filter, toggle, option, quiz: action } = target.dataset;
  if (filter) { exampleFilter = filter; renderExampleResults(); }
  if (toggle) {
    const id = location.hash.slice(1);
    const present = state[toggle].includes(id);
    state[toggle] = present ? state[toggle].filter(key => key !== id) : [...state[toggle], id];
    target.setAttribute('aria-pressed', String(!present));
    target.textContent = toggle === 'done' ? present ? '标记完成' : '已完成' : present ? '加入待复习' : '已加入待复习';
    persist();
  }
  if (option !== undefined && attempt[quizIndex] === undefined) {
    attempt[quizIndex] = Number(option);
    state.answers = attempt; persist(); route(false);
    main.querySelector('[data-quiz="next"]').focus();
  }
  if (action) {
    if (action === 'previous') quizIndex--;
    if (action === 'next') {
      if (quizIndex === quiz.length - 1) quizComplete = true;
      else quizIndex++;
    }
    if (action === 'restart') { quizIndex = 0; attempt = {}; state.answers = {}; quizComplete = false; persist(); }
    route(); main.focus();
  }
});
window.addEventListener('hashchange', () => { route(); main.focus(); });
window.addEventListener('resize', drawHero);
attempt = state.answers;
quizIndex = Math.min(Object.keys(attempt).length, quiz.length - 1);
route();

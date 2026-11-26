const notes = globalThis.studyNotes;
const byId = new Map(notes.map(entry => [entry.id, entry]));
const groups = [
  { id: 'limits-continuity', title: '极限与连续', summary: '等价无穷小、幂式极限、数列、间断点', topics: ['basic-limits', 'simplify-expand', 'power-limits', 'estimates', 'limit-constraints', 'continuity'] },
  { id: 'derivatives-differentials', title: '导数与微分', summary: '左右导数、参数求导、高阶导数、相关变化率', topics: ['derivative-definition', 'differentiation', 'inverse-functions', 'curves', 'higher-derivatives', 'differentials', 'curvature'] },
  { id: 'mean-value-taylor', title: '中值定理与函数性态', summary: '罗尔定理、泰勒展开、单调性、极值与拐点', topics: ['proof-techniques', 'taylor-methods', 'function-behavior', 'optimization', 'concavity'] },
];
const indexes = ['example-topics', 'midterm-deck', 'chapter-2-problems', 'chapter-2-homework'];
const examples = notes.filter(entry => /^example-\d/.test(entry.id));

const main = document.querySelector('main');
const dialog = document.querySelector('#search-dialog');
const search = document.querySelector('#search-query');
const searchResults = document.querySelector('#search-results');
const themeToggle = document.querySelector('#theme-toggle');
const storageKey = 'calculus-review-v1';
const themeKey = 'calculus-review-theme';
let state = { done: [], saved: [], recent: [], answers: {} };
try { state = { ...state, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch {}
let exampleFilter = 'all';

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
}

function syncThemeIcon() {
  if (!themeToggle) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  const icon = themeToggle.querySelector('.theme-icon');
  if (icon) icon.textContent = dark ? '☀' : '☾';
  themeToggle.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题');
  themeToggle.title = dark ? '切换到浅色主题' : '切换到深色主题';
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  if (next === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem(themeKey, next); } catch {}
  syncThemeIcon();
  drawHero();
}

function safe(value) {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function metaClass(meta) {
  if (meta === '已完成') return ' is-done';
  if (meta === '待复习') return ' is-saved';
  if (meta === '例题') return ' is-example';
  return '';
}

function row(entry, meta = '') {
  return `<a class="row" href="#${entry.id}"><strong>${safe(entry.title)}</strong>${meta ? `<span class="row-meta${metaClass(meta)}">${safe(meta)}</span>` : ''}</a>`;
}

function button(href, label, variant = '') {
  return `<a class="button ${variant}" href="#${href}">${safe(label)}</a>`;
}

function heading(title, description = '', back = '') {
  return `<header class="page-head">${back}<h1>${safe(title)}</h1>${description ? `<p>${safe(description)}</p>` : ''}</header>`;
}

function groupCards() {
  return `<div class="grid">${groups.map((group, index) => `<a class="card" href="#${group.id}"><span class="chapter-num">[第 ${index + 1} 章]</span><h3>${group.title}</h3><p>${group.summary}</p></a>`).join('')}</div>`;
}

function home() {
  const visited = state.recent.filter(id => byId.has(id)).slice(0, 3).map(id => byId.get(id));
  const starter = ['continuity', 'derivative-definition', 'common-maclaurin'].map(id => byId.get(id)).filter(Boolean);
  return `<section class="hero"><div class="hero-copy"><div class="overline">数学分析 · 高等数学</div><h1>数分复习簿</h1><p>查考点，顺着例题推一遍，再做几道自测。</p><div class="actions">${button(visited[0]?.id ?? 'topics', visited.length ? '继续上次复习' : '开始复习', 'primary')}${button('quiz', '做一组自测', 'quiet')}</div></div><canvas id="curve-art" aria-hidden="true"></canvas></section>
    <section class="section"><div class="section-heading"><h2>按章节复习</h2><a href="#topics">查看全部考点</a></div>${groupCards()}</section>
    <section class="section"><div class="section-heading"><h2>${visited.length ? '最近复习' : '先从这几个考点开始'}</h2></div><div class="row-list">${(visited.length ? visited : starter).map(entry => row(entry)).join('')}</div></section>
    <section class="section card progress-card"><h2>例题进度</h2><span class="row-meta is-done">已完成 ${state.done.length} / ${examples.length}</span><progress value="${state.done.length}" max="${examples.length}" aria-label="例题完成进度"></progress><p>可在例题里标记完成或加入待复习。</p><a href="#examples">打开例题库</a></section>`;
}

/* Signature 大邮数学集 radial multi-hue mathematical rosette + central ∫ */
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
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.54;
  const cy = h * 0.5;
  const R = Math.min(w, h) * 0.44;

  // Soft ambient emerald radial glow behind the rosette
  const glow = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 1.15);
  glow.addColorStop(0, 'rgba(52, 211, 153, 0.16)');
  glow.addColorStop(0.55, 'rgba(16, 185, 129, 0.05)');
  glow.addColorStop(1, 'rgba(2, 44, 34, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Exact 10-stop pastel spectrum extracted from 大邮数学集-1.5.0.pdf Page 1 cover
  const spectrum = [
    '#a3e635', '#facc15', '#fbbf24', '#fb923c', '#fb7185',
    '#e879f9', '#a78bfa', '#38bdf8', '#2dd4bf', '#34d399',
  ];

  // Layered parametric rose/spirograph petals
  const layers = 20;
  ctx.lineWidth = 0.95;
  for (let i = 0; i < layers; i++) {
    const color = spectrum[i % spectrum.length];
    const rot = (i / layers) * Math.PI * 2;
    const scale = 0.72 + 0.28 * Math.sin((i / layers) * Math.PI);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    const steps = 120;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const r = R * scale * (0.48 + 0.42 * Math.cos(3 * t));
      const x = r * Math.cos(t);
      const y = r * Math.sin(t) * 0.78;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Subtle geometric reference ring
  ctx.save();
  ctx.strokeStyle = 'rgba(209, 250, 229, 0.16)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.94, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Central Serif Integral Emblem (∫) matching 大邮数学集 cover
  ctx.save();
  ctx.fillStyle = '#d1fae5';
  ctx.shadowColor = 'rgba(2, 44, 34, 0.85)';
  ctx.shadowBlur = 18;
  ctx.font = `600 ${Math.round(R * 1.08)}px "STIX Two Text", "Source Han Serif SC", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('∫', cx, cy + R * 0.04);
  ctx.restore();
}

function topicList(group) {
  const topics = item => `<div class="row-list">${item.topics.map(id => byId.get(id)).filter(Boolean).map(entry => row(entry)).join('')}</div>`;
  if (group) return heading(group.title, group.summary, '<p class="breadcrumb"><a href="#topics">← 考点笔记</a></p>') + topics(group);
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
  const back = `<p class="breadcrumb"><a href="#${isExample ? 'examples' : 'topics'}">← ${isExample ? '例题库' : '考点笔记'}</a></p>`;
  const related = [];
  if (!isExample) {
    for (const candidate of examples) if (candidate.text.includes(`](#${entry.id})`)) related.push(candidate);
  }
  const relatedHtml = related.length ? `<section class="section"><div class="section-heading"><h2>配套例题</h2></div><div class="row-list">${related.map(candidate => row(candidate, '例题')).join('')}</div></section>` : '';
  const previous = examples[examples.indexOf(entry) - 1];
  const next = examples[examples.indexOf(entry) + 1];
  return heading(entry.title, '', back) + `<article class="article">${entry.html}${entry.solution ? `<details><summary>展开思路与解析</summary>${entry.solution}</details>` : ''}</article>` + (isExample ? `<div class="actions article-actions"><div class="actions"><button type="button" class="button" data-toggle="saved" aria-pressed="${state.saved.includes(entry.id)}">${state.saved.includes(entry.id) ? '已加入待复习' : '加入待复习'}</button><button type="button" class="button" data-toggle="done" aria-pressed="${state.done.includes(entry.id)}">${state.done.includes(entry.id) ? '已完成' : '标记完成'}</button></div><div class="actions">${previous ? button(previous.id, '上一题') : ''}${next ? button(next.id, '下一题') : ''}</div></div>` : relatedHtml);
}

function quizView(id) {
  const round = reviewQuiz.round;
  const historyLink = button('quiz-history', '历次成绩');
  const onlineNote = reviewQuiz.storageAvailable ? '' : '<p class="feedback" role="status">浏览器暂时无法保存记录。本次结果关闭页面后可能丢失。</p>';
  const date = value => new Date(value).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
  const score = record => Math.round(record.correct / record.total * 100);
  const start = label => `<button type="button" class="button primary" data-quiz="start">${label}</button>`;

  if (id === 'quiz-history') {
    const history = reviewQuiz.history;
    if (!history.length) return heading('历次成绩') + `<section class="article">${onlineNote}<p>交卷后，这里会显示分数和答错的考点。</p>${button('quiz', '返回随堂自测', 'primary')}</section>`;
    const concepts = new Map();
    for (const record of history) {
      for (const item of record.missed) {
        const key = item.topic + ':' + item.title;
        const previous = concepts.get(key);
        concepts.set(key, { ...item, count: (previous?.count ?? 0) + 1 });
      }
    }
    const missed = [...concepts.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-CN'));
    return heading('历次成绩', `共完成 ${history.length} 轮，最高 ${history.reduce((best, record) => Math.max(best, score(record)), 0)} 分。`) + onlineNote + `
      <section class="row-list" aria-label="测验成绩">${history.map(record => row({
        id: 'quiz-result/' + record.id, title: date(record.time),
      }, `${score(record)} 分 · 答对 ${record.correct}/${record.total}`)).join('')}</section>
      <section class="section"><h2>累计错题考点</h2>${missed.length ? `<div class="row-list">${missed.map(item => row({
        id: item.topic, title: item.title,
      }, `错 ${item.count} 次`)).join('')}</div>` : '<p class="muted">目前没有答错的考点。</p>'}</section>
      <div class="actions article-actions">${button('quiz', '返回随堂自测')}</div>`;
  }

  if (id.startsWith('quiz-result/') || round?.complete) {
    const record = reviewQuiz.record(id.startsWith('quiz-result/') ? id.slice('quiz-result/'.length) : round.id);
    if (!record) return heading('自测结果') + `<section class="article"><p>在当前浏览器里找不到这轮记录。</p>${historyLink}</section>`;
    return heading('自测结果', `${score(record)} 分 · 答对 ${record.correct} / ${record.total} 题 · ${date(record.time)}`) +
      `<section class="article">${onlineNote}${record.missed.length ? `<h2>本轮答错的考点</h2>${record.missed.map(item =>
        `<details class="quiz-mistake"><summary>第 ${item.number} 题 · ${safe(item.title)}</summary><p>${safe(item.prompt)}</p><p>你的答案：${safe(item.chosen)}<br>正确答案：${safe(item.correct)}</p><p>${safe(item.feedback)}</p><a href="#${item.topic}">回看考点笔记</a></details>`).join('')}` : '<p>本轮全部答对。</p>'}
        <div class="actions article-actions">${id === 'quiz' ? start('再抽 10 题') : button('quiz', '返回随堂自测', 'primary')}${historyLink}</div>
      </section>`;
  }

  if (!round) {
    return heading('随堂自测', `题库有 ${reviewQuiz.count} 道题，每轮抽 ${reviewQuiz.size} 道。单题 10 分，交卷后可回看错题。`) +
      `<section class="article">${onlineNote}<p>本轮分数和做错的考点会记录在当前浏览器。</p><div class="actions">${start('开始抽题')}${historyLink}</div></section>`;
  }

  const entry = round.items[round.index];
  const item = reviewQuiz.question(entry.questionId);
  const answered = entry.choice !== null;
  const answeredCount = round.items.filter(question => question.choice !== null).length;
  const correct = entry.order[entry.choice] === item.answer;
  const last = round.index === round.items.length - 1;
  const answerLetter = 'ABCD'[entry.order.indexOf(item.answer)];
  return heading('随堂自测', `第 ${round.index + 1} / ${round.items.length} 题 · ${item.title}`) +
    `<article class="article">${onlineNote}<p class="muted">已答 ${answeredCount} / ${round.items.length}</p><h2>${safe(item.prompt)}</h2>
    <div class="quiz-options">${entry.order.map((index, position) => {
      const style = answered && index === item.answer ? 'correct' : answered && position === entry.choice ? 'wrong' : '';
      return `<button type="button" data-option="${position}" class="button option ${style}" ${answered ? 'disabled' : ''}><b>${'ABCD'[position]}</b><span>${safe(item.options[index])}</span></button>`;
    }).join('')}</div><div class="feedback" aria-live="polite">${answered ? `<strong>${correct ? '答对了。' : '正确答案是 ' + answerLetter + '。'}</strong> ${safe(item.feedback)} <a href="#${item.topic}">回看考点</a>` : ''}</div>
    <div class="actions">${round.index > 0 ? '<button type="button" class="button" data-quiz="previous">上一题</button>' : ''}
      <button type="button" class="button primary" data-quiz="${last ? 'submit' : 'next'}" ${answered ? '' : 'disabled'}>${last ? '交卷并查看结果' : '下一题'}</button>${historyLink}</div></article>`;
}

function route(resetScroll = true) {
  const hash = location.hash.slice(1);
  const id = hash === 'worked-examples' ? 'examples' : hash || 'home';
  const entry = byId.get(id);
  const group = groups.find(item => item.id === id);
  const isQuiz = id === 'quiz' || id === 'quiz-history' || id.startsWith('quiz-result/');
  const tab = isQuiz ? 'quiz' : id === 'examples' || examples.includes(entry) || indexes.includes(id) ? 'examples' : id === 'topics' || entry ? 'topics' : 'home';
  for (const link of document.querySelectorAll('[data-tab]')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const link of document.querySelectorAll('.sidebar a')) {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (isQuiz) main.innerHTML = quizView(id);
  else if (id === 'examples') { main.innerHTML = exampleList(); renderExampleResults(); }
  else if (id === 'topics' || group) main.innerHTML = topicList(group);
  else if (entry) {
    state.recent = [id, ...state.recent.filter(key => key !== id)].slice(0, 6);
    persist();
    main.innerHTML = article(entry);
  }
  else { main.innerHTML = home(); drawHero(); }
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
  const entries = query ? notes.filter(entry => entry.id !== 'study-navigation' && matches(entry, query)) : ['continuity', 'common-maclaurin', 'example-08'].map(id => byId.get(id)).filter(Boolean);
  if (query) entries.sort((a, b) => Number(normalize(b.title).includes(normalize(query))) - Number(normalize(a.title).includes(normalize(query))));
  searchResults.innerHTML = entries.slice(0, 12).map(entry => row(entry, examples.includes(entry) ? '例题' : '笔记')).join('') || '<p class="muted">没有匹配内容。可以换个关键词或输入题号。</p>';
}

function openSearch() {
  updateSearch();
  dialog.showModal();
  search.focus();
}

document.querySelector('#chapter-nav').innerHTML = groups.map(group => `<a class="side-group" href="#${group.id}">${group.title}</a>${group.topics.map(id => byId.get(id)).filter(Boolean).map(entry => `<a class="side-topic" href="#${entry.id}">${safe(entry.title)}</a>`).join('')}`).join('');
document.querySelector('#index-nav').innerHTML = indexes.map(id => byId.get(id)).filter(Boolean).map(entry => `<a href="#${entry.id}">${safe(entry.title)}</a>`).join('');
document.querySelector('#skip-main').addEventListener('click', event => {
  event.preventDefault(); main.focus();
});
document.querySelector('.search-open').addEventListener('click', openSearch);
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
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
  if (option !== undefined) {
    reviewQuiz.answer(Number(option));
    route(false);
    main.querySelector('[data-quiz="next"], [data-quiz="submit"]')?.focus();
  }
  if (action) {
    if (action === "start") reviewQuiz.start();
    if (action === "previous") reviewQuiz.move(-1);
    if (action === "next") reviewQuiz.move(1);
    if (action === "submit") reviewQuiz.submit();
    route();
    main.focus();
  }
});
window.addEventListener('hashchange', () => { route(); main.focus(); });
window.addEventListener('resize', drawHero);
syncThemeIcon();
route();

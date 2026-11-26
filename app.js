const notes = globalThis.studyNotes;
const byId = new Map(notes.map(entry => [entry.id, entry]));
const chapterSummaries = {
  'limits-continuity': '等价无穷小、幂式极限、数列、间断点',
  'derivatives-differentials': '左右导数、参数求导、高阶导数、相关变化率',
  'mean-value-taylor': '罗尔定理、泰勒展开、单调性、极值与拐点',
};
const groups = [];
const sectionByRoute = new Map();
let currentSection;
let currentPoint;
for (const entry of notes) {
  if (entry.id === 'worked-examples') break;
  if (entry.level === 2 && entry.id !== 'study-navigation') {
    groups.push({ ...entry, title: entry.title.replace(/^[一二三四五六七八九十]+、/, ''), summary: chapterSummaries[entry.id] ?? '', sections: [] });
    currentSection = null;
  } else if (entry.level === 3 && groups.length) {
    currentSection = { ...entry, chapterId: groups.at(-1).id, points: [] };
    groups.at(-1).sections.push(currentSection);
    currentPoint = null;
  } else if (entry.level === 4 && currentSection) {
    currentPoint = { ...entry, points: [] };
    currentSection.points.push(currentPoint);
  }
  if (entry.level < 3 || !currentSection) continue;
  sectionByRoute.set(entry.id, currentSection);
  for (const point of entry.outline ?? []) {
    const item = { id: entry.id + '/point-' + point.index, title: point.title, points: [] };
    if (point.level === 5 && currentPoint) currentPoint.points.push(item);
    else { currentSection.points.push(item); currentPoint = item; }
    sectionByRoute.set(item.id, currentSection);
  }
}
function topicLabel(title) {
  return title
    .replace('(\$u\\to0\$)', '')
    .replace('（$u\\to0$）', '（u → 0）')
    .replace('$\\ln(x+\\sqrt{x^2+c})$', 'ln(x + √(x² + c))')
    .replace("$f''-\\lambda^2 f=0$", 'f″ − λ²f = 0')
    .replace(/\$[^$]+\$/g, '公式');
}
const otherTopicOrder = [
  'midterm-sequences', 'lhopital-conditions', 'asymptote-patterns', 'log-radical-derivative',
  'related-rates', 'rolle-basics', 'mean-value-proofs', 'inequalities-roots',
  'taylor-composition', 'common-maclaurin', 'geometric-series', 'taylor-proofs',
];
const otherTopics = { id: 'other-topics', chapterId: 'other-topics', title: '其它考点', points: [] };
const otherTopicRanks = new Map(otherTopicOrder.map((id, index) => [id, index + 1]));
for (const chapter of groups) {
  for (const section of chapter.sections) {
    section.points = section.points.filter(point => {
      if (!otherTopicRanks.has(point.id)) return true;
      otherTopics.points.push(point);
      sectionByRoute.set(point.id, otherTopics);
      for (const child of point.points) sectionByRoute.set(child.id, otherTopics);
      return false;
    });
  }
}
otherTopics.points.sort((a, b) => otherTopicRanks.get(a.id) - otherTopicRanks.get(b.id));

function numberedTopicTitle(id, title) {
  const rank = otherTopicRanks.get(id);
  const label = topicLabel(title);
  return rank ? `考点 ${rank}：${label.replace(/^考点\s*\d+[：:]\s*/, '')}` : label;
}
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
  const title = otherTopicRanks.has(entry.id) ? numberedTopicTitle(entry.id, entry.title) : entry.title;
  return `<a class="row" href="#${entry.id}"><strong>${safe(title)}</strong>${meta ? `<span class="row-meta${metaClass(meta)}">${safe(meta)}</span>` : ''}</a>`;
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
  const finishedExamples = examples.filter(entry => state.done.includes(entry.id)).length;
  return `<section class="hero"><div class="hero-copy"><div class="overline">数学分析 / 高等数学</div><h1>数分复习簿</h1><p>查考点，顺着例题推一遍，再做几道自测。</p><div class="actions">${button(visited[0]?.id ?? 'topics', visited.length ? '继续上次复习' : '开始复习', 'primary')}${button('quiz-small', '做一组小测', 'quiet')}${button('papers', '刷历年真题', 'quiet')}</div></div><figure class="hero-graph"><canvas id="curve-art" role="img" aria-label="抛物线 y=x² 及其在 (1,1) 处的切线"></canvas><figcaption>y = x² <span>在 (1, 1) 处的切线</span></figcaption></figure></section>
    <section class="section"><div class="section-heading"><h2>按章节复习</h2><a href="#topics">查看全部考点</a></div>${groupCards()}</section>
    <section class="section"><div class="section-heading"><h2>${visited.length ? '最近复习' : '先从这几个考点开始'}</h2></div><div class="row-list">${(visited.length ? visited : starter).map(entry => row(entry)).join('')}</div></section>
    <section class="section card progress-card"><h2>代表例题进度</h2><span class="row-meta is-done">已完成 ${finishedExamples} / ${examples.length}</span><progress value="${finishedExamples}" max="${examples.length}" aria-label="代表例题完成进度"></progress><p>可在例题里标记完成或加入待复习。</p><a href="#examples">打开例题库</a></section>`;
}

function drawHero() {
  const canvas = document.querySelector('#curve-art');
  if (!canvas || !canvas.clientWidth) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  const unit = Math.min(width / 5.6, height / 4.5);
  const x = value => width * .45 + value * unit;
  const y = value => height * .73 - value * unit;
  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x(x1), y(y1));
    ctx.lineTo(x(x2), y(y2));
    ctx.stroke();
  }
  ctx.strokeStyle = '#b0cde32b';
  for (let tick = -3; tick <= 4; tick++) {
    line(tick, -2, tick, 5);
    line(-4, tick, 5, tick);
  }
  ctx.strokeStyle = '#c8dceb8c';
  line(-4, 0, 5, 0);
  line(0, -2, 0, 5);
  ctx.strokeStyle = '#f3aa99';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  line(-1, -3, 3, 5);
  ctx.setLineDash([]);
  ctx.strokeStyle = '#9fd6ea';
  ctx.lineWidth = 2.75;
  ctx.beginPath();
  ctx.moveTo(x(-2.3), y(2.3 ** 2));
  for (let t = -2.27; t <= 2.3; t += .03) ctx.lineTo(x(t), y(t * t));
  ctx.stroke();
  ctx.fillStyle = '#f3aa99';
  ctx.beginPath();
  ctx.arc(x(1), y(1), 4.5, 0, 2 * Math.PI);
  ctx.fill();
}

function pointLinks(points, active = '') {
  if (!points.length) return '';
  return `<ul class="directory-points">${points.map(point => {
    const title = otherTopicRanks.has(point.id) ? numberedTopicTitle(point.id, point.title) : topicLabel(point.title).replace(/^考点\s*\d+[：:]\s*/, '');
    return `<li><a href="#${point.id}"${point.id === active ? ' aria-current="location"' : ''}>${safe(title)}</a>${pointLinks(point.points, active)}</li>`;
  }).join('')}</ul>`;
}

function sectionLink(section) {
  const title = topicLabel(section.title);
  const [, number, label] = title.match(/^(\d+\.\d+)\s+(.+)$/) ?? ['', '', title];
  return `<a class="directory-section-link" href="#${section.id}">${number ? '<span class="directory-number">' + number + '</span>' : ''}<span>${safe(label)}</span></a>`;
}

function directoryChapter(chapter, isOverview) {
  return `<section class="directory-chapter">
    ${isOverview ? `<header><h2><a href="#${chapter.id}">${safe(chapter.title)}</a></h2><p>${safe(chapter.summary)}</p></header>` : ''}
    <ul class="directory-sections">${chapter.sections.map(section => `<li>${sectionLink(section)}
      ${section.points.length ? `<details class="directory-details"><summary aria-label="${safe(topicLabel(section.title))}的小考点">${section.points.length} 个考点</summary>
        ${pointLinks(section.points)}</details>` : ''}</li>`).join('')}</ul></section>`;
}

function topicList(group) {
  if (group) return heading(group.title, group.summary, '<p class="breadcrumb"><a href="#topics">复习目录</a></p>') + directoryChapter(group, false);
  return heading('复习目录') + `<div class="directory-overview">${groups.map(chapter => directoryChapter(chapter, true)).join('')}${otherTopicPanel(true)}</div>`;
}

function otherTopicPanel(isOverview) {
  return `<section class="directory-chapter directory-other">
    ${isOverview ? '<header><h2><a href="#other-topics">其它考点</a></h2></header>' : ''}
    ${pointLinks(otherTopics.points)}
  </section>`;
}

function readingDirectory(id) {
  const section = sectionByRoute.get(id);
  if (!section?.points.length) return '';
  if (section === otherTopics) {
    const point = otherTopics.points.find(item => item.id === id || item.points.some(child => child.id === id));
    if (!point?.points.length) return '';
    return `<details class="reading-directory"><summary>本考点小节</summary>${pointLinks(point.points, id)}</details>`;
  }
  return `<details class="reading-directory"><summary>本节考点</summary>${pointLinks(section.points, id)}</details>`;
}

function exampleList() {
  return heading('例题库') + `<section class="example-sources">
    <a class="card" href="#papers"><h2>历年真题</h2><p>${examPapers.count} 套试卷 · ${examPapers.questionCount} 个题号可查</p></a>
    <a class="card" href="#example-topics"><h2>代表例题</h2><p>${examples.length} 道带解析例题 · 按题型复习</p></a>
  </section><div class="field section"><input id="example-query" type="search" aria-label="筛选代表例题" placeholder="搜索代表例题，例如「二阶导数」「2.2.91」"></div><div class="filters" aria-label="例题状态">${Object.entries({ all: '全部代表例题', saved: '待复习', done: '已完成' }).map(([id, label]) => `<button type="button" class="button" data-filter="${id}" aria-pressed="${exampleFilter === id}">${label}</button>`).join('')}</div><div id="example-results" class="section row-list"></div>`;
}

function normalize(value) {
  return value.normalize('NFKC').toLowerCase().replace(/\s/g, '');
}

function matches(entry, query) {
  return normalize(`${numberedTopicTitle(entry.id, entry.title)} ${entry.text}`).includes(normalize(query));
}

function renderExampleResults() {
  const query = document.querySelector('#example-query').value;
  const result = examples.filter(entry => (exampleFilter === 'all' || state[exampleFilter].includes(entry.id)) && matches(entry, query));
  const papers = exampleFilter === 'all' ? [] : examPapers.marked(state[exampleFilter], query);
  document.querySelector('#example-results').innerHTML = [...result, ...papers].map(entry => row(entry, state.done.includes(entry.id) ? '已完成' : state.saved.includes(entry.id) ? '待复习' : '')).join('') || '<p class="muted">这里暂时没有符合条件的例题。</p>';
  for (const filter of main.querySelectorAll('[data-filter]')) filter.setAttribute('aria-pressed', filter.dataset.filter === exampleFilter);
}

function article(entry, id) {
  const isExample = examples.includes(entry);
  const section = sectionByRoute.get(id);
  const chapter = section === otherTopics ? otherTopics : groups.find(group => group.id === section?.chapterId);
  const back = isExample ? '<p class="breadcrumb"><a href="#examples">例题库</a></p>' :
    `<p class="breadcrumb"><a href="#topics">复习目录</a>${chapter ? `<span aria-hidden="true"> / </span><a href="#${chapter.id}">${safe(chapter.title)}</a>` : ''}</p>`;
  const related = [];
  if (!isExample) {
    for (const candidate of examples) if (candidate.text.includes(`](#${entry.id})`)) related.push(candidate);
  }
  const relatedHtml = related.length ? `<section class="section"><div class="section-heading"><h2>配套例题</h2></div><div class="row-list">${related.map(candidate => row(candidate, '例题')).join('')}</div></section>` : '';
  const previous = examples[examples.indexOf(entry) - 1];
  const next = examples[examples.indexOf(entry) + 1];
  return heading(numberedTopicTitle(entry.id, entry.title), '', back) + readingDirectory(id) + `<article class="article">${entry.html}${entry.solution ? `<details><summary>展开思路与解析</summary>${entry.solution}</details>` : ''}</article>` + (isExample ? `<div class="actions article-actions example-actions"><div class="actions"><button type="button" class="button" data-toggle="saved" aria-pressed="${state.saved.includes(entry.id)}">${state.saved.includes(entry.id) ? '已加入待复习' : '加入待复习'}</button><button type="button" class="button" data-toggle="done" aria-pressed="${state.done.includes(entry.id)}">${state.done.includes(entry.id) ? '已完成' : '标记完成'}</button></div><div class="actions">${previous ? button(previous.id, '上一题') : ''}${next ? button(next.id, '下一题') : ''}</div></div>` : relatedHtml);
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
    if (!history.length) return heading('历次成绩') + `<section class="article">${onlineNote}<p>交卷后，这里会显示分数和答错的考点。</p>${button('quiz-small', '返回随堂小测', 'primary')}</section>`;
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
      <div class="actions article-actions">${button('quiz-small', '返回随堂小测')}</div>`;
  }

  if (id.startsWith('quiz-result/') || round?.complete) {
    const record = reviewQuiz.record(id.startsWith('quiz-result/') ? id.slice('quiz-result/'.length) : round.id);
    if (!record) return heading('自测结果') + `<section class="article"><p>在当前浏览器里找不到这轮记录。</p>${historyLink}</section>`;
    return heading('自测结果', `${score(record)} 分 · 答对 ${record.correct} / ${record.total} 题 · ${date(record.time)}`) +
      `<section class="article">${onlineNote}${record.missed.length ? `<h2>本轮答错的考点</h2>${record.missed.map(item =>
        `<details class="quiz-mistake"><summary>第 ${item.number} 题 · ${safe(item.title)}</summary><p>${safe(item.prompt)}</p><p>你的答案：${safe(item.chosen)}<br>正确答案：${safe(item.correct)}</p><p>${safe(item.feedback)}</p><a href="#${item.topic}">回看考点笔记</a></details>`).join('')}` : '<p>本轮全部答对。</p>'}
        <div class="actions article-actions">${id === 'quiz-small' ? start('再抽 10 题') : button('quiz-small', '返回随堂小测', 'primary')}${historyLink}</div>
      </section>`;
  }

  if (!round) {
    return heading('随堂小测', `题库有 ${reviewQuiz.count} 道题，每轮抽 ${reviewQuiz.size} 道。单题 10 分，交卷后可回看错题。`) +
      `<section class="article">${onlineNote}<p>本轮分数和做错的考点会记录在当前浏览器。</p><div class="actions">${start('开始抽题')}${historyLink}</div></section>`;
  }

  const entry = round.items[round.index];
  const item = reviewQuiz.question(entry.questionId);
  const answered = entry.choice !== null;
  const answeredCount = round.items.filter(question => question.choice !== null).length;
  const correct = entry.order[entry.choice] === item.answer;
  const last = round.index === round.items.length - 1;
  const answerLetter = 'ABCD'[entry.order.indexOf(item.answer)];
  return heading('随堂小测', `第 ${round.index + 1} / ${round.items.length} 题 · ${item.title}`) +
    `<article class="article">${onlineNote}<p class="muted">已答 ${answeredCount} / ${round.items.length}</p><h2>${safe(item.prompt)}</h2>
    <div class="quiz-options">${entry.order.map((index, position) => {
      const style = answered && index === item.answer ? 'correct' : answered && position === entry.choice ? 'wrong' : '';
      return `<button type="button" data-option="${position}" class="button option ${style}" ${answered ? 'disabled' : ''}><b>${'ABCD'[position]}</b><span>${safe(item.options[index])}</span></button>`;
    }).join('')}</div><div class="feedback" aria-live="polite">${answered ? `<strong>${correct ? '答对了。' : '正确答案是 ' + answerLetter + '。'}</strong> ${safe(item.feedback)} <a href="#${item.topic}">回看考点</a>` : ''}</div>
    <div class="actions quiz-actions">${round.index > 0 ? '<button type="button" class="button" data-quiz="previous">上一题</button>' : ''}
      <button type="button" class="button primary" data-quiz="${last ? 'submit' : 'next'}" ${answered ? '' : 'disabled'}>${last ? '交卷并查看结果' : '下一题'}</button>${historyLink}</div></article>`;
}

function currentRoute() {
  const hash = location.hash.slice(1);
  try { return decodeURIComponent(hash); } catch { return hash; }
}

function route(resetScroll = true) {
  const hash = currentRoute();
  const id = hash === 'worked-examples' ? 'examples' : hash || 'home';
  const topicRoute = id.match(/^([\w-]+)\/(point-\d+)$/);
  const entry = byId.get(topicRoute?.[1] ?? id);
  const group = groups.find(item => item.id === id);
  const isQuiz = id === 'quiz' || id === 'quiz-small' || id === 'quiz-history' || id.startsWith('quiz-result/');
  const isMajor = id === 'quiz-major';
  const isPaper = id === 'papers' || id.startsWith('paper/');
  const tab = isQuiz || isMajor ? 'quiz' : isPaper || id === 'examples' || examples.includes(entry) || indexes.includes(id) ? 'examples' : id === 'topics' || id === otherTopics.id || entry ? 'topics' : 'home';
  for (const link of document.querySelectorAll('[data-tab]')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const sectionId = sectionByRoute.get(id)?.id;
  for (const link of document.querySelectorAll('.sidebar a')) {
    if (link.hash === `#${id}` || (sectionId && link.hash === `#${sectionId}`)) {
      link.setAttribute('aria-current', link.hash === `#${id}` ? 'page' : 'location');
      const section = link.closest('details');
      if (section) section.open = true;
    } else link.removeAttribute('aria-current');
  }
  for (const chapter of document.querySelectorAll('#chapter-nav details')) {
    if (chapter.dataset.chapter === id || chapter.dataset.chapter === sectionByRoute.get(id)?.chapterId || (id === 'topics' && !document.querySelector('#chapter-nav details[open]'))) chapter.open = true;
  }
  if (id === 'quiz') main.innerHTML = heading('随堂测验') + `<div class="example-sources">
    <a class="card" href="#quiz-small"><h2>随堂小测</h2><p>从原有题库抽 10 题，作答后立即看解析。</p></a>
    <a class="card" href="#quiz-major"><h2>随堂大测</h2><p>按考点从历年真题抽 10 道选择、10 道填空。</p></a>
  </div>`;
  else if (isQuiz) main.innerHTML = quizView(id);
  else if (isMajor) main.innerHTML = majorQuiz.view();
  else if (isPaper) { main.innerHTML = examPapers.view(id); examPapers.renderList(); }
  else if (id === 'examples') { main.innerHTML = exampleList(); renderExampleResults(); }
  else if (id === 'topics' || group) main.innerHTML = topicList(group);
  else if (id === otherTopics.id) main.innerHTML = heading(otherTopics.title, '', '<p class="breadcrumb"><a href="#topics">复习目录</a></p>') + otherTopicPanel(false);
  else if (entry) {
    state.recent = [entry.id, ...state.recent.filter(key => key !== entry.id)].slice(0, 6);
    persist();
    main.innerHTML = article(entry, id);
  }
  else { main.innerHTML = home(); drawHero(); }
  for (const table of main.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.before(wrap); wrap.append(table);
  }
  document.title = entry ? `${numberedTopicTitle(entry.id, entry.title)} · 数分复习簿` : id === otherTopics.id ? '其它考点 · 数分复习簿' : '数分复习簿';
  if (resetScroll) {
    window.scrollTo(0, 0);
    if (topicRoute && sectionByRoute.has(id)) document.getElementById(topicRoute[2])?.scrollIntoView();
  }
}

function updateSearch() {
  const query = search.value.trim();
  const entries = query ? notes.filter(entry => entry.id !== 'study-navigation' && matches(entry, query)) : ['continuity', 'common-maclaurin', 'example-08'].map(id => byId.get(id)).filter(Boolean);
  if (query && normalize(otherTopics.title).includes(normalize(query.replace('其他', '其它')))) {
    entries.unshift({ ...otherTopics, text: '' });
  }
  if (query) entries.sort((a, b) => Number(normalize(numberedTopicTitle(b.id, b.title)).includes(normalize(query))) - Number(normalize(numberedTopicTitle(a.id, a.title)).includes(normalize(query))));
  searchResults.innerHTML = entries.slice(0, 12).map(entry => row(entry, entry.id === otherTopics.id ? '目录' : examples.includes(entry) ? '例题' : '笔记')).join('') || '<p class="muted">没有匹配内容。可以换个关键词或输入题号。</p>';
}

function openSearch() {
  updateSearch();
  dialog.showModal();
  search.focus();
}

document.querySelector('#chapter-nav').innerHTML = groups.map(chapter => `<details class="side-chapter" name="review-directory" data-chapter="${chapter.id}">
  <summary>${safe(chapter.title)}</summary>
  <div class="side-chapter-body">${chapter.sections.map(sectionLink).join('')}</div>
</details>`).join('') + `<details class="side-chapter" name="review-directory" data-chapter="${otherTopics.id}">
  <summary>其它考点</summary>
  <div class="side-chapter-body"><a href="#${otherTopics.id}">查看全部</a>${pointLinks(otherTopics.points)}</div>
</details>`;
document.querySelector('#index-nav').innerHTML = '<a href="#papers">历年真题</a>' + indexes.map(id => byId.get(id)).filter(Boolean).map(entry => `<a href="#${entry.id}">${safe(entry.title)}</a>`).join('');
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
    const id = currentRoute();
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
window.addEventListener('hashchange', () => { route(); main.focus({ preventScroll: true }); });
window.addEventListener('resize', drawHero);
syncThemeIcon();
examPapers.bind(main);
majorQuiz.bind(main);
route();

const majorQuiz = (() => {
  const perType = 10;
  const storageKey = 'calculus-review-major-quiz';
  const areas = [
    ['极限与连续', [
      ['basic-limits', '极限与等价无穷小'], ['estimates', '数列与夹逼'],
      ['lhopital-conditions', '洛必达法则'], ['limit-constraints', '由极限反推参数'], ['continuity', '连续与间断点'],
    ]],
    ['导数、微分与函数性态', [
      ['derivative-definition', '导数定义与可导性'], ['differentiation', '求导与隐函数'],
      ['higher-derivatives', '高阶导数'], ['inverse-functions', '反函数'],
      ['curves', '参数曲线与切线'], ['differentials', '微分'], ['related-rates', '相关变化率'], ['curvature', '曲率'],
      ['asymptote-patterns', '渐近线'], ['proof-techniques', '中值定理'], ['taylor-methods', '泰勒公式'],
      ['function-behavior', '单调性与极值'], ['optimization', '最值'], ['concavity', '凹凸性与拐点'],
    ]],
    ['积分、级数与多元微积分', [
      ['one-integral', '一元积分'], ['ode', '微分方程'], ['series', '级数与傅里叶级数'],
      ['multivariable', '多元微分与空间几何'], ['multiple-integrals', '重积分'], ['vector-integrals', '曲线曲面积分与向量场'],
    ]],
    ['待细分真题', [['other', '其他或尚待细分的考点']]],
  ];
  const topicNames = new Map(areas.flatMap(([, topics]) => topics));
  const bank = globalThis.papersIndex.flatMap(paper => paper.questions
    .filter(question => question.kind)
    .map(question => ({
      ...question, key: paper.id + '/' + question.id, paperId: paper.id,
      paperTitle: paper.title, answerPage: paper.answer,
    })));
  const bankById = new Map(bank.map(item => [item.key, item]));
  let selected = new Set(topicNames.keys());
  let round = null;
  let history = [];
  let showHistory = false;
  let reviewing = false;
  let message = '';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.round?.items?.length === perType * 2 && saved.round.items.every(key => bankById.has(key))) round = saved.round;
    if (Array.isArray(saved?.history)) history = saved.history;
    if (Array.isArray(saved?.selected)) selected = new Set(saved.selected.filter(id => topicNames.has(id)));
  } catch {}

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ round, history, selected: [...selected] })); }
    catch { message = '浏览器暂时无法保存大测进度。'; }
  }

  function eligible() {
    const candidates = bank.filter(item => selected.has(item.topic));
    return {
      choice: candidates.filter(item => item.kind === 'choice'),
      fill: candidates.filter(item => item.kind === 'fill'),
    };
  }

  function draw(items) {
    const pool = [...items];
    for (let i = 0; i < perType; i++) {
      const next = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[next]] = [pool[next], pool[i]];
    }
    return pool.slice(0, perType).map(item => item.key);
  }

  function start() {
    const { choice, fill } = eligible();
    if (choice.length < perType || fill.length < perType) return;
    round = { items: [...draw(choice), ...draw(fill)], answers: {}, checked: {}, index: 0, phase: 'answer' };
    save();
  }

  function action(name, button) {
    message = '';
    if (name === 'start') start();
    if (name === 'history') showHistory = !showHistory;
    if (name === 'review') {
      reviewing = !reviewing;
      if (!reviewing) save();
    }
    if (name === 'new') { round = null; reviewing = false; save(); }
    if (name === 'jump' && round) { round.index = Number(button.dataset.index); save(); }
    if (name === 'previous' && round?.index > 0) { round.index--; save(); }
    if (name === 'next' && round?.index < round.items.length - 1) { round.index++; save(); }
    if (name === 'answer' && round?.phase === 'answer') { round.answers[round.index] = button.dataset.value; save(); }
    if (name === 'submit' && round?.phase === 'answer') {
      if (Object.values(round.answers).filter(value => value.trim()).length !== round.items.length) {
        message = '还有题目没有作答。可以通过题号返回检查。';
        return;
      }
      round.phase = 'check';
      round.index = 0;
      save();
    }
    if (name === 'check' && round?.phase === 'check') { round.checked[round.index] = button.dataset.value === 'correct'; save(); }
    if (name === 'finish' && round?.phase === 'check') {
      if (Object.keys(round.checked).length !== round.items.length) {
        message = '还有题目没有核对。核对完后再保存成绩。';
        return;
      }
      const missed = round.items.filter((_, index) => !round.checked[index]);
      const record = { time: Date.now(), score: (round.items.length - missed.length) * 5, missed };
      round.phase = 'done';
      round.result = record;
      history.unshift(record);
      save();
    }
  }

  const control = (label, action, modifier = '', attrs = '') =>
    `<button type="button" class="button ${modifier}" data-major-action="${action}" ${attrs}>${label}</button>`;

  function setup() {
    const { choice, fill } = eligible();
    const ready = choice.length >= perType && fill.length >= perType;
    return `<section class="article">
      <h2>划定知识点范围</h2>
      <p>在选定范围内随机抽 10 道选择题和 10 道填空题。题面来自例题库的历年真题。</p>
      <div class="actions">${control('全选', 'all')}${control('清空', 'none')}</div>
      <div class="major-scope">${areas.map(([label, topics]) => `<fieldset><legend>${label}</legend>
        <label><input type="checkbox" data-major-group="${safe(label)}" ${topics.every(([id]) => selected.has(id)) ? 'checked' : ''}> 选中本组</label>
        ${topics.map(([id, title]) => `<label><input type="checkbox" data-major-topic="${id}" ${selected.has(id) ? 'checked' : ''}> ${title}</label>`).join('')}
      </fieldset>`).join('')}</div>
      <p role="status">当前范围有 ${choice.length} 道选择题、${fill.length} 道填空题。${ready ? '' : '两种题型各需要至少 10 道，请扩大范围。'}</p>
      ${control('抽取 20 题', 'start', 'primary', ready ? '' : 'disabled')}
    </section>`;
  }

  function result(record) {
    const missed = new Map();
    for (const key of record.missed) {
      const item = bankById.get(key);
      if (item) missed.set(item.topic, (missed.get(item.topic) ?? 0) + 1);
    }
    const topics = [...missed].sort((a, b) => b[1] - a[1]);
    return `<p><strong>${record.score} 分</strong> · 答对 ${record.score / 5} / ${perType * 2} 题</p>
      ${topics.length ? `<p>本轮错题考点</p><ul>${topics.map(([id, count]) =>
        `<li>${byId.has(id) ? '<a href="#' + id + '">' + safe(topicNames.get(id)) + '</a>' : safe(topicNames.get(id))} · ${count} 题</li>`).join('')}</ul>
        <details><summary>查看错题原卷</summary><div class="row-list">${record.missed.map(key => {
          const item = bankById.get(key);
          return item ? row({ id: 'paper/' + key, title: `卷 ${item.paperId} · ${item.label}` }, topicNames.get(item.topic)) : '';
        }).join('')}</div></details>` : '<p>本轮全部答对。</p>'}`;
  }

  function view() {
    const title = heading('随堂大测', '10 道选择题 + 10 道填空题。交卷后对照原卷答案核对，每题 5 分。', '<p class="breadcrumb"><a href="#quiz">随堂测验</a></p>');
    const toolbar = `<div class="actions major-toolbar">
      <button class="button" type="button" data-paper-open>${examPapers.fileName ? '更换本地 PDF' : '选取本地 PDF'}</button>
      <a class="button" href="${examPapers.original}" target="_blank" rel="noopener">下载官方 PDF</a>
      ${control(showHistory ? '返回大测' : '大测记录', 'history')}
    </div>`;
    const notice = message ? `<p class="feedback" role="status">${safe(message)}</p>` : '';
    if (showHistory) {
      return title + toolbar + `<section class="article"><h2>大测记录</h2>${history.length ? history.map(record =>
        `<details><summary>${new Date(record.time).toLocaleString('zh-CN')} · ${record.score} 分</summary>${result(record)}</details>`).join('') :
        '<p>完成并核对一轮后，成绩会显示在这里。</p>'}</section>`;
    }
    if (!round) return title + toolbar + notice + setup();
    if (round.phase === 'done' && !reviewing) {
      return title + toolbar + `<section class="article"><h2>本轮成绩</h2>${result(round.result)}
        <div class="actions major-toolbar">${control('再抽一套', 'new', 'primary')}${control('回看整套', 'review')}</div></section>`;
    }
    const item = bankById.get(round.items[round.index]);
    const answering = round.phase === 'answer';
    const checking = round.phase === 'check';
    const supplied = round.answers[round.index] ?? '';
    const isChoice = item.kind === 'choice';
    const progress = Object.values(answering ? round.answers : round.checked).filter(value => typeof value === 'boolean' || value.trim()).length;
    return title + toolbar + notice + `<nav class="major-numbering" aria-label="题号">
      ${round.items.map((_, index) => control(String(index + 1), 'jump', index === round.index ? 'primary' : '',
        `data-index="${index}" aria-label="第 ${index + 1} 题${(answering ? round.answers[index]?.trim() : Object.hasOwn(round.checked, index)) ? '，已完成' : ''}" ${index === round.index ? 'aria-current="step"' : ''}`)).join('')}
    </nav><article class="article major-question">
      <p class="muted">${answering ? '已作答' : '已核对'} ${progress} / ${round.items.length} · ${isChoice ? '选择题' : '填空题'}</p>
      <h2>第 ${round.index + 1} 题 · ${safe(topicNames.get(item.topic))}</h2>
      <p>${safe(item.paperTitle)} · 卷 ${item.paperId} · ${item.label} · PDF 第 ${item.page} 页</p>
      <div class="actions">${examPapers.sourceLink(item.page, '查看原题', 'primary')}
        ${answering ? '' : examPapers.sourceLink(item.answerPage, '查看原卷答案')}</div>
      ${answering ? isChoice ? `<div class="actions major-answer" aria-label="填写选择题答案">${['A','B','C','D','E'].map(letter =>
        control(letter, 'answer', '', `data-value="${letter}" aria-pressed="${supplied === letter}"`)).join('')}</div>` :
        `<label class="major-answer">填写答案 <input id="major-fill" type="text" autocomplete="off" placeholder="有多个空时，按顺序填写" value="${safe(supplied)}"></label>` :
        `<div class="major-answer"><p>你的答案：${safe(supplied)}</p>${checking ? `<div class="actions" aria-label="核对本题">
          ${control('答对', 'check', '', `data-value="correct" aria-pressed="${round.checked[round.index] === true}"`)}
          ${control('答错', 'check', '', `data-value="wrong" aria-pressed="${round.checked[round.index] === false}"`)}</div>` :
          `<p>${round.checked[round.index] ? '已核对：答对' : '已核对：答错'}</p>`}</div>`}
      <div class="actions quiz-actions major-actions">
        ${control('上一题', 'previous', '', round.index ? '' : 'disabled')}
        ${control('下一题', 'next', '', round.index < round.items.length - 1 ? '' : 'disabled')}
        ${answering ? control('交卷', 'submit', 'primary') : checking ? control('保存成绩', 'finish', 'primary') : control('返回成绩', 'review', 'primary')}
      </div></article>`;
  }

  function bind(main) {
    main.addEventListener('click', event => {
      const button = event.target.closest('[data-major-action]');
      if (!button) return;
      const name = button.dataset.majorAction;
      if (name === 'all' || name === 'none') {
        selected = new Set(name === 'all' ? topicNames.keys() : []);
        save();
      } else action(name, button);
      route(['start','submit','finish','history','new'].includes(name) && !message);
      const selectedAnswer = ['answer','check'].includes(name) ? main.querySelector(`[data-major-action="${name}"][aria-pressed=true]`) : null;
      (selectedAnswer ?? main).focus({ preventScroll: true });
    });
    main.addEventListener('input', event => {
      if (event.target.id !== 'major-fill' || round?.phase !== 'answer') return;
      round.answers[round.index] = event.target.value;
      save();
    });
    main.addEventListener('change', event => {
      const { majorTopic, majorGroup } = event.target.dataset;
      if (!majorTopic && !majorGroup) return;
      const keys = majorTopic ? [majorTopic] : areas.find(([label]) => label === majorGroup)[1].map(([id]) => id);
      for (const key of keys) {
        if (event.target.checked) selected.add(key);
        else selected.delete(key);
      }
      save();
      route(false);
      main.querySelector(majorTopic ? `[data-major-topic="${majorTopic}"]` : `[data-major-group="${majorGroup}"]`)?.focus({ preventScroll: true });
    });
  }

  return { view, bind };
})();

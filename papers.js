const examPapers = (() => {
  const papers = globalThis.papersIndex;
  const official = 'https://github.com/ArtveFlinaInBupt/bump-archive/releases/tag/v1.5.0';
  const original = 'https://github.com/ArtveFlinaInBupt/bump-archive/releases/download/v1.5.0/bump-1.5.0.pdf';
  const courses = ['数学分析', '工科数学分析', '高等数学'];
  const filters = { course: '', year: '', kind: '', query: '' };
  let pdf = '';
  let pdfName = '';
  let localFile;
  let documentTask;
  let drawTask;
  let pageNumber = 0;
  let renderVersion = 0;

  function options(values, active) {
    return values.map(([value, label]) => `<option value="${safe(value)}"${value === active ? ' selected' : ''}>${safe(label)}</option>`).join('');
  }

  function matching() {
    const query = normalize(filters.query);
    return papers.filter(paper => (
      (!filters.course || paper.course === filters.course) &&
      (!filters.year || String(paper.year) === filters.year) &&
      (!filters.kind || paper.term + paper.exam === filters.kind) &&
      (!query || normalize(`${paper.title} ${paper.course}`).includes(query) || /^(?:卷)?\d+$/.test(query) && paper.id === query.replace(/^卷/, ''))
    ));
  }

  function renderList() {
    const results = matching();
    const target = document.querySelector('#paper-results');
    if (!target) return;
    target.innerHTML = `<p class="muted">${results.length} 套试卷</p>` + (results.map(paper => row({
      id: 'paper/' + paper.id, title: paper.title,
    }, `卷 ${paper.id} · ${paper.questions.length} 题`)).join('') || '<p>没有符合条件的试卷。</p>');
  }

  function list() {
    const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);
    const last = state.lastPaper;
    return heading('历年真题', `${papers.length} 套 · 2020–2021 学年起 · 按原卷题号练习`, '<p class="breadcrumb"><a href="#examples">例题库</a></p>') +
      `<section class="article paper-controls">
        <div class="actions">${last ? button(last, '继续上次真题', 'primary') : ''}
          <a class="button" href="${official}" target="_blank" rel="noopener">官方原 PDF</a>
          <button class="button paper-file-trigger" type="button" data-paper-open>打开本地 PDF</button>
          <span class="muted" data-paper-file-label>${safe(pdfName || '适配《大邮数学集》v1.5.0')}</span>
        </div>
        <div class="paper-filters">
          <label>课程<select data-paper-filter="course">${options([['','全部课程'], ...courses.map(name => [name,name])], filters.course)}</select></label>
          <label>学年<select data-paper-filter="year">${options([['','全部学年'], ...years.map(year => [String(year), `${year}–${year + 1}`])], filters.year)}</select></label>
          <label>考试<select data-paper-filter="kind">${options([['','全部考试'], ...['上期中','上期末','下期中','下期末'].map(kind => [kind,kind])], filters.kind)}</select></label>
        </div>
        <input type="search" data-paper-filter="query" aria-label="搜索真题试卷" placeholder="搜索学年、课名或卷号" value="${safe(filters.query)}">
      </section><div id="paper-results" class="section row-list" aria-live="polite"></div>`;
  }

  function sourceLink(page, label, kind = '') {
    if (pdf && location.protocol === 'file:') {
      return `<a class="button ${kind}" href="${pdf}#page=${page}" target="_blank" rel="noopener">${label}</a>`;
    }
    return `<button class="button ${kind}" type="button" data-paper-page="${page}">${label}</button>`;
  }

  function view(route) {
    if (route === 'papers') return list();
    const [, paperId, questionId] = route.split('/');
    const paper = papers.find(item => item.id === paperId);
    if (!paper) return list();
    const back = '<p class="breadcrumb"><a href="#papers">历年真题</a></p>';
    const root = 'paper/' + paper.id;
    if (!questionId) {
      return heading(paper.title, `卷 ${paper.id} · PDF 第 ${paper.first}–${paper.last} 页 · ${paper.questions.length} 题`, back) +
        `<div class="actions">${sourceLink(paper.first, '打开整套试卷', 'primary')}${pdf ? sourceLink(paper.answer, '打开答案页') : '<button class="button" type="button" data-paper-open>选取已下载的 PDF</button>'}</div>
         <section class="section row-list">${paper.questions.map(question => {
           const id = root + '/' + question.id;
           const status = state.done.includes(id) ? '已完成' : state.saved.includes(id) ? '待复习' : '第 ' + question.page + ' 页';
           return row({id, title: question.label}, status);
         }).join('')}</section>`;
    }

    const index = paper.questions.findIndex(item => item.id === questionId);
    if (index < 0) return view(root);
    const question = paper.questions[index];
    state.lastPaper = route;
    persist();
    const progress = `<span class="row-meta">${index + 1} / ${paper.questions.length}</span>`;
    return heading(question.label, `卷 ${paper.id} · ${paper.title}`, `<p class="breadcrumb"><a href="#papers">历年真题</a> / <a href="#${root}">本卷目录</a></p>`) +
      `<article class="article">
        <p>题目在原 PDF 第 ${question.page} 页，按原卷题号查找。跨页题请继续往下读。</p>
        <div class="actions">${sourceLink(question.page, '打开题目页', 'primary')}
          <a class="button" href="${original}" target="_blank" rel="noopener">下载官方 PDF</a>
        </div>
        <p class="muted paper-source" data-paper-file-label>${safe(pdfName || '题源：fa_555 等编，大邮数学集 v1.5.0')}</p>
        <details><summary>做完后查看原卷答案</summary><p>本卷答案从 PDF 第 ${paper.answer} 页开始。</p>${sourceLink(paper.answer, '打开答案页')}</details>
      </article>
      <div class="actions article-actions paper-actions">
        <div class="actions">${['saved','done'].map(key => {
          const selected = state[key].includes(route);
          const label = key === 'saved' ? selected ? '已加入待复习' : '加入待复习' : selected ? '已完成' : '标记完成';
          return `<button type="button" class="button" data-toggle="${key}" aria-pressed="${selected}">${label}</button>`;
        }).join('')}</div>
        <nav class="actions" aria-label="本卷题目导航">${index > 0 ? button(root + '/' + paper.questions[index - 1].id, '上一题') : ''}
          ${progress}${index + 1 < paper.questions.length ? button(root + '/' + paper.questions[index + 1].id, '下一题', 'primary') : button(root, '回到试卷目录', 'primary')}
        </nav>
      </div>`;
  }

  function bind(main) {
    const input = document.querySelector('#paper-file');
    const dialog = document.querySelector('#paper-reader');
    const status = document.querySelector('#paper-reader-status');
    const nativeLink = document.querySelector('#paper-native-link');
    const canvas = document.querySelector('#paper-canvas');
    const zoom = document.querySelector('#paper-zoom');
    let pendingPage = 0;
    let enlarged = false;

    async function showPage(number) {
      const version = ++renderVersion;
      const previousDraw = drawTask;
      previousDraw?.cancel();
      pageNumber = Math.max(1, Math.min(639, number));
      document.querySelector('#paper-page').textContent = `第 ${pageNumber} / 639 页`;
      for (const step of dialog.querySelectorAll('[data-page-step]')) {
        step.disabled = Number(step.dataset.pageStep) < 0 ? pageNumber === 1 : pageNumber === 639;
      }
      nativeLink.href = `${pdf}#page=${pageNumber}`;
      status.textContent = '正在打开页面…';
      canvas.hidden = true;
      if (!dialog.open) dialog.showModal();
      try {
        await previousDraw?.promise.catch(() => {});
        documentTask ??= (async () => {
          const file = localFile;
          const pdfjs = await import('./pdf/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf/pdf.worker.min.mjs', document.baseURI).href;
          return pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false, enableXfa: false });
        })();
        const documentHandle = await (await documentTask).promise;
        if (documentHandle.numPages !== 639) throw new Error('页数不符');
        const page = await documentHandle.getPage(pageNumber);
        if (version !== renderVersion) return;
        const width = canvas.parentElement.clientWidth * (enlarged ? 1.6 : 1);
        const scale = width / page.getViewport({scale: 1}).width;
        const viewport = page.getViewport({ scale: scale * Math.min(devicePixelRatio || 1, 2) });
        canvas.style.width = `${width}px`;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        drawTask = page.render({ canvas, viewport });
        await drawTask.promise;
        if (version !== renderVersion) return;
        status.textContent = '';
        canvas.hidden = false;
        canvas.parentElement.scrollTop = 0;
      } catch {
        if (version === renderVersion) status.textContent = '无法在这里预览。请确认选择的是 v1.5.0，或在新标签页打开。';
      }
    }

    dialog.addEventListener('click', event => {
      const button = event.target.closest('[data-page-step]');
      if (button) showPage(pageNumber + Number(button.dataset.pageStep));
    });
    zoom.addEventListener('click', () => {
      enlarged = !enlarged;
      zoom.textContent = enlarged ? '适应宽度' : '放大';
      zoom.setAttribute('aria-pressed', String(enlarged));
      showPage(pageNumber);
    });
    document.querySelector('#paper-reader-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { renderVersion++; drawTask?.cancel(); });
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      if (pdf) URL.revokeObjectURL(pdf);
      documentTask?.then(task => task.destroy()).catch(() => {});
      documentTask = undefined;
      localFile = file;
      pdf = URL.createObjectURL(file);
      pdfName = file.name;
      input.value = '';
      route(false);
      if (pendingPage && location.protocol !== 'file:') showPage(pendingPage);
      pendingPage = 0;
    });
    main.addEventListener('click', event => {
      const page = Number(event.target.closest('[data-paper-page]')?.dataset.paperPage);
      if (page && pdf) showPage(page);
      else if (page || event.target.closest('[data-paper-open]')) {
        pendingPage = page || 0;
        input.click();
      }
    });
    function filter(event) {
      const key = event.target.dataset.paperFilter;
      if (!Object.hasOwn(filters, key)) return;
      filters[key] = event.target.value;
      renderList();
    }
    main.addEventListener('input', event => { if (event.target.type === 'search') filter(event); });
    main.addEventListener('change', event => { if (event.target.tagName === 'SELECT') filter(event); });
  }

  function marked(ids, query) {
    return ids.filter(id => id.startsWith('paper/')).flatMap(id => {
      const [, paperId, questionId] = id.split('/');
      const paper = papers.find(item => item.id === paperId);
      const question = paper?.questions.find(item => item.id === questionId);
      if (!question) return [];
      const title = `卷 ${paperId} · ${question.label} · ${paper.title}`;
      return normalize(title).includes(normalize(query)) ? [{ id, title }] : [];
    });
  }

  return {
    count: papers.length, questionCount: papers.reduce((count, paper) => count + paper.questions.length, 0),
    view, renderList, bind, marked, sourceLink, original,
    get fileName() { return pdfName; },
  };
})();

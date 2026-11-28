# 数分复习簿

下载本仓库的 ZIP 后，解压并用浏览器打开 `web/dist/index.html`。公式、搜索、例题和自测均可离线使用。

复习进度保存在当前浏览器。修改根目录的笔记后，在 `web` 目录运行 `node build.mjs ../calculus-exam-review-notes.md` 重新生成网页内容。

## 历年真题

索引含 2020–2021 学年起 50 套试卷。网页可以选取对应版本的本地 PDF。题源为 [fa_555 等编，《大邮数学集》v1.5.0](https://github.com/ArtveFlinaInBupt/bump-archive/releases/tag/v1.5.0)。

在 web 目录安装 pypdf 后运行 python import-papers.py 原卷路径，即可重新生成试卷索引。

随堂大测的题面截取自《大邮数学集》v1.5.0。题干、选项和跨页内容随离线包提供，解压后即可读题。在 `web` 目录安装 `pypdfium2` 和 `Pillow` 后，运行 `python render-paper-questions.py 原卷路径` 可按索引重新生成题面。

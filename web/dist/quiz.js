const reviewQuiz = (() => {
  const size = 10;
  const bank = globalThis.reviewQuestionBank;
  const questions = new Map(bank.map(item => [item.id, item]));
  const concepts = new Map();
  for (const item of bank) {
    const group = concepts.get(item.title) ?? [];
    group.push(item);
    concepts.set(item.title, group);
  }
  const draftKey = 'calculus-review-quiz-draft';
  const recordPrefix = 'calculus-review-quiz-result:';
  const records = new Map();
  let storageAvailable = true;
  let round;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(recordPrefix)) continue;
      const record = JSON.parse(localStorage.getItem(key));
      if (record?.id && Array.isArray(record.missed)) records.set(record.id, record);
    }
    const saved = JSON.parse(localStorage.getItem(draftKey));
    if (saved?.items?.length === size && saved.items.every(item => questions.has(item.questionId))) round = saved;
  } catch {
    storageAvailable = false;
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      storageAvailable = false;
    }
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function start() {
    const previous = new Set(round?.items.map(item => item.questionId));
    const items = shuffle([...concepts.values()].map(group => group.filter(item => !previous.has(item.id))))
      .filter(group => group.length)
      .slice(0, size)
      .map(group => ({
        questionId: group[Math.floor(Math.random() * group.length)].id,
        order: shuffle([0, 1, 2, 3]),
        choice: null,
      }));
    round = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, index: 0, items, complete: false };
    save(draftKey, round);
  }

  function answer(choice) {
    const entry = round?.items[round.index];
    if (!entry || round.complete || entry.choice !== null || !Number.isInteger(choice) || choice < 0 || choice >= entry.order.length) return;
    entry.choice = choice;
    save(draftKey, round);
  }

  function move(offset) {
    if (!round || round.complete) return;
    const next = round.index + offset;
    if (next < 0 || next >= size || (offset > 0 && round.items[round.index].choice === null)) return;
    round.index = next;
    save(draftKey, round);
  }

  function submit() {
    if (!round || round.complete || round.items.some(item => item.choice === null)) return;
    if (!records.has(round.id)) {
      const missed = round.items.flatMap((item, index) => {
        const question = questions.get(item.questionId);
        if (item.order[item.choice] === question.answer) return [];
        return [{
          number: index + 1, topic: question.topic, title: question.title, prompt: question.prompt,
          chosen: question.options[item.order[item.choice]], correct: question.options[question.answer],
          feedback: question.feedback,
        }];
      });
      const record = { id: round.id, time: Date.now(), total: size, correct: size - missed.length, missed };
      records.set(record.id, record);
      save(recordPrefix + record.id, record);
    }
    round.complete = true;
    save(draftKey, round);
  }

  window.addEventListener('storage', event => {
    if (!event.key?.startsWith(recordPrefix) || !event.newValue) return;
    const record = JSON.parse(event.newValue);
    if (record?.id && Array.isArray(record.missed)) records.set(record.id, record);
  });

  return {
    size, count: bank.length, start, answer, move, submit,
    get round() { return round; },
    get storageAvailable() { return storageAvailable; },
    get history() { return Array.from(records.values()).sort((a, b) => b.time - a.time); },
    question(id) { return questions.get(id); },
    record(id) { return records.get(id); },
  };
})();

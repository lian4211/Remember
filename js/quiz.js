// ==================== 试题测试模块 ====================
// 支持 choice(选择题,选项答题) 和 qa(问答题,点击显示答案) 两种题型

import { data, saveData, addQuizSet, deleteQuizSet, renameQuizSet } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast, escapeHtml } from './ui.js';
import { updateStats } from './stats.js';

let state = {
  quizSet: null,
  questions: [],
  currentIndex: 0,
  filter: 'all',
  shuffle: false,
  startTime: 0,
  correctCount: 0,     // choice 答对数
  answeredChoice: 0,   // choice 已答数
  revealedQA: 0,       // qa 已看答案数
  revealed: false,     // 当前 qa 是否已显示答案
  choiceAnswered: false // 当前 choice 是否已答
};

// ==================== 试题列表页 ====================
export function renderQuizListPage() {
  const c = document.getElementById('quiz-list-container');
  if (!c) return;
  if (data.quizSets.length === 0) {
    c.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-top:2rem">暂无试题集<br>点击下方"导入试题"加载 JSON 文件</p>';
    return;
  }
  c.innerHTML = data.quizSets.map(qs => {
    const cats = [...new Set(qs.questions.map(q => q.category || '未分类'))];
    const choiceCnt = qs.questions.filter(q => q.type === 'choice').length;
    const fillCnt = qs.questions.filter(q => q.type === 'fill').length;
    const qaCnt = qs.questions.length - choiceCnt - fillCnt;
    return `<div class="app-card" style="padding:1rem;margin-bottom:0.75rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
        <div style="flex:1;min-width:0">
          <p style="font-weight:700;font-size:1rem;word-break:break-all">${escapeHtml(qs.name)}</p>
          <p style="color:var(--text-secondary);font-size:0.8125rem;margin-top:0.25rem">
            共 ${qs.questions.length} 题${choiceCnt ? ` · 选择${choiceCnt}` : ''}${fillCnt ? ` · 填空${fillCnt}` : ''}${qaCnt ? ` · 问答${qaCnt}` : ''}
          </p>
          <p style="color:var(--text-muted);font-size:0.75rem;margin-top:0.25rem">${cats.map(escapeHtml).join(' / ')}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.25rem;flex-shrink:0">
          <button class="btn-primary" style="padding:0.4rem 0.875rem;font-size:0.875rem" onclick="window._quizStart(${qs.id})">开始测试</button>
          <button class="btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="window._quizEdit(${qs.id})">✏️</button>
          <button class="btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:var(--danger)" onclick="window._quizDel(${qs.id})">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');

  window._quizStart = (id) => {
    const qs = data.quizSets.find(x => x.id === id);
    if (qs) showQuizStartOptions(qs);
  };
  window._quizEdit = (id) => {
    const qs = data.quizSets.find(x => x.id === id);
    if (qs) showQuizEditModal(qs);
  };
  window._quizDel = (id) => {
    const qs = data.quizSets.find(x => x.id === id);
    if (qs) showQuizDeleteModal(qs);
  };
}

function showQuizStartOptions(qs) {
  const cats = [...new Set(qs.questions.map(q => q.category || '未分类'))];
  const catOpts = ['all', ...cats].map(c =>
    `<option value="${escapeHtml(c)}">${c === 'all' ? '全部分类' : escapeHtml(c)}</option>`).join('');
  showModal('开始测试 · ' + qs.name,
    `<div style="display:flex;flex-direction:column;gap:0.75rem">
      <div>
        <label style="display:block;font-weight:600;margin-bottom:0.25rem">分类筛选</label>
        <select id="quiz-filter" class="app-select">${catOpts}</select>
      </div>
      <div>
        <label style="display:block;font-weight:600;margin-bottom:0.25rem">出题顺序</label>
        <select id="quiz-order" class="app-select">
          <option value="seq">顺序出题</option>
          <option value="shuffle">随机出题</option>
        </select>
      </div>
    </div>`,
    [
      { text: '取消', onClick: hideModal, className: 'btn-ghost' },
      { text: '开始', onClick: () => {
        const f = document.getElementById('quiz-filter').value;
        const s = document.getElementById('quiz-order').value === 'shuffle';
        hideModal();
        startQuiz(qs, { filter: f, shuffle: s });
      }, className: 'btn-primary' }
    ]
  );
}

function showQuizEditModal(qs) {
  showModal('修改试题集名称',
    `<input type="text" id="quiz-edit-name" class="app-input" value="${escapeHtml(qs.name)}">`,
    [
      { text: '取消', onClick: hideModal, className: 'btn-ghost' },
      { text: '保存', onClick: () => {
        const n = document.getElementById('quiz-edit-name').value.trim();
        if (!n) return;
        renameQuizSet(qs, n); hideModal(); renderQuizListPage(); showToast('已修改');
      }, className: 'btn-primary' }
    ]
  );
}

function showQuizDeleteModal(qs) {
  showModal('确认删除', `确定要删除试题集"${escapeHtml(qs.name)}"吗？(${qs.questions.length}题)`,
    [
      { text: '取消', onClick: hideModal, className: 'btn-ghost' },
      { text: '删除', onClick: () => {
        deleteQuizSet(qs); hideModal(); renderQuizListPage(); showToast('已删除');
      }, className: 'btn-danger' }
    ]
  );
}

// ==================== 测试主流程 ====================
export function startQuiz(quizSet, opts = {}) {
  let qs = quizSet.questions.slice();
  if (opts.filter && opts.filter !== 'all') {
    qs = qs.filter(q => (q.category || '未分类') === opts.filter);
  }
  if (opts.shuffle) qs = qs.sort(() => Math.random() - 0.5);
  if (qs.length === 0) { showToast('该筛选下无题目'); return; }
  state = {
    quizSet, questions: qs, currentIndex: 0,
    filter: opts.filter || 'all', shuffle: !!opts.shuffle,
    startTime: Date.now(),
    correctCount: 0, answeredChoice: 0, revealedQA: 0, answeredFill: 0,
    revealed: false, choiceAnswered: false, fillAnswered: false
  };
  goToPage('quiz-test');
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) { finishQuiz(); return; }
  state.revealed = false;
  state.choiceAnswered = false;
  state.fillAnswered = false;

  const prog = document.getElementById('quiz-progress');
  prog.textContent = `进度: ${state.currentIndex + 1}/${state.questions.length} | ${q.category || '未分类'}`;

  const area = document.getElementById('quiz-test-area');
  const fb = document.getElementById('quiz-feedback');
  fb.textContent = ''; fb.className = '';

  if (q.type === 'choice') {
    const isMulti = Array.isArray(q.answer);  // 多选
    state.multiSelected = isMulti ? new Set() : null;
    area.innerHTML = `
      <div class="app-card" style="padding:1rem;margin-bottom:0.75rem">
        <p style="font-weight:600;margin-bottom:0.75rem;line-height:1.7">${escapeHtml(q.question)}</p>
        ${isMulti ? '<p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem">（多选，请选择所有正确选项后确认）</p>' : ''}
        <div id="quiz-options" style="display:flex;flex-direction:column;gap:0.5rem"></div>
      </div>
      ${isMulti ? '<button id="multi-confirm-btn" class="btn-primary" style="width:100%;margin-top:0.5rem" disabled>确认答案</button>' : ''}`;
    const od = document.getElementById('quiz-options');
    (q.options || []).forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option-btn';
      b.style.textAlign = 'left';
      b.innerHTML = `<span style="font-weight:700;margin-right:0.5rem">${String.fromCharCode(65 + i)}</span>${escapeHtml(opt)}`;
      if (isMulti) {
        b.onclick = () => toggleMultiOption(i, b);
        b.dataset.idx = i;
      } else {
        b.onclick = () => checkChoice(i, b);
      }
      od.appendChild(b);
    });
    if (isMulti) {
      document.getElementById('multi-confirm-btn').onclick = confirmMultiChoice;
    }
  } else if (q.type === 'fill') {
    // fill 填空题：把题目中的 ________ 替换为输入框，提交后判断对错
    const questionHTML = escapeHtml(q.question).replace(
      /_{2,}|（\s*）|\(\s*\)/g,
      '<span class="fill-blank">________</span>'
    );
    area.innerHTML = `
      <div class="app-card" style="padding:1.25rem;margin-bottom:0.75rem">
        <p style="font-weight:600;line-height:2;font-size:1.0625rem">${questionHTML}</p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <input type="text" id="fill-input" class="app-input" placeholder="在此输入答案..." autocomplete="off"
          style="flex:1;text-align:center;font-size:1.0625rem;padding:0.625rem 1rem">
        <button id="fill-submit-btn" class="btn-primary" style="white-space:nowrap;padding:0.625rem 1.25rem">提交</button>
      </div>
      <div id="fill-answer-area" class="hidden" style="margin-top:0.75rem"></div>
      <div style="margin-top:0.35rem">
        <button id="fill-hint-btn" class="btn-ghost" style="font-size:0.75rem;padding:0.2rem 0.5rem">💡 提示</button>
      </div>`;
    document.getElementById('fill-submit-btn').onclick = checkFill;
    document.getElementById('fill-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); checkFill(); }
    });
    document.getElementById('fill-hint-btn').onclick = () => {
      const q = state.questions[state.currentIndex];
      const ans = q.answer || '';
      const hint = ans.length > 6 ? ans.slice(0, 2) + '…' + ans.slice(-2) : ans[0] + '…';
      document.getElementById('fill-input').placeholder = hint;
      document.getElementById('fill-input').focus();
    };
    setTimeout(() => document.getElementById('fill-input')?.focus(), 50);
  } else {
    // qa 问答题：先显示题目，点击显示答案
    area.innerHTML = `
      <div class="app-card" style="padding:1.25rem;margin-bottom:0.75rem">
        <p style="font-weight:600;line-height:1.8;font-size:1.0625rem">${escapeHtml(q.question)}</p>
      </div>
      <div id="quiz-answer-area" class="hidden"></div>
      <button id="quiz-reveal-btn" class="btn-primary" style="width:100%">👁 点击显示答案</button>`;
    document.getElementById('quiz-reveal-btn').onclick = revealAnswer;
  }
  renderNav();
}

function revealAnswer() {
  if (state.revealed) { nextQuestion(); return; }
  state.revealed = true;
  state.revealedQA++;
  const q = state.questions[state.currentIndex];
  const a = document.getElementById('quiz-answer-area');
  a.classList.remove('hidden');
  a.innerHTML = `<div class="app-card" style="padding:1rem;border-left:3px solid var(--primary);background:var(--primary-bg)">
    <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem;font-weight:600">参考答案</p>
    <p style="line-height:1.85;white-space:pre-wrap;font-size:0.9375rem">${escapeHtml(q.answer || '（无答案）')}</p>
  </div>`;
  const btn = document.getElementById('quiz-reveal-btn');
  const isLast = state.currentIndex >= state.questions.length - 1;
  btn.textContent = isLast ? '完成 ✓' : '下一题 →';
  renderNav();
}

function toggleMultiOption(idx, btnEl) {
  if (state.choiceAnswered) return;
  const set = state.multiSelected;
  if (set.has(idx)) {
    set.delete(idx);
    btnEl.classList.remove('selected');
  } else {
    set.add(idx);
    btnEl.classList.add('selected');
  }
  const confirmBtn = document.getElementById('multi-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = set.size === 0;
}

function confirmMultiChoice() {
  if (state.choiceAnswered) return;
  state.choiceAnswered = true;
  state.answeredChoice++;
  const q = state.questions[state.currentIndex];
  const correctSet = new Set(q.answer);
  const selected = [...state.multiSelected].sort();
  // 必须完全匹配
  const correct = selected.length === correctSet.size &&
                  selected.every(i => correctSet.has(i));

  if (correct) state.correctCount++;

  const opts = document.querySelectorAll('#quiz-options .option-btn');
  opts.forEach((b, i) => {
    b.disabled = true;
    if (correctSet.has(i)) b.classList.add('correct');
    if (state.multiSelected.has(i) && !correctSet.has(i)) b.classList.add('wrong');
  });

  const confirmBtn = document.getElementById('multi-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = true;

  const correctLetters = q.answer.map(i => String.fromCharCode(65 + i)).join('');
  const fb = document.getElementById('quiz-feedback');
  fb.textContent = correct ? '✅ 回答正确' : `❌ 正确答案: ${correctLetters}`;
  fb.className = `feedback-text ${correct ? 'feedback-correct' : 'feedback-wrong'}`;
  renderNav();
  saveData();
}

function checkChoice(idx, btnEl) {
  if (state.choiceAnswered) return;
  state.choiceAnswered = true;
  const q = state.questions[state.currentIndex];
  const opts = document.querySelectorAll('#quiz-options .option-btn');
  opts.forEach(b => b.disabled = true);
  const correct = idx === q.answer;
  state.answeredChoice++;
  if (correct) state.correctCount++;
  if (q.options && q.answer >= 0) opts[q.answer].classList.add('correct');
  if (!correct && btnEl) btnEl.classList.add('wrong');
  const fb = document.getElementById('quiz-feedback');
  fb.textContent = correct ? '✅ 回答正确' : `❌ 正确答案: ${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`;
  fb.className = `feedback-text ${correct ? 'feedback-correct' : 'feedback-wrong'}`;
  renderNav();
  saveData();
}

function checkFill() {
  if (state.fillAnswered) return;
  const input = document.getElementById('fill-input');
  const userAnswer = (input?.value || '').trim();
  if (!userAnswer) { showToast('请先输入答案'); return; }
  state.fillAnswered = true;
  state.answeredFill++;
  input.disabled = true;
  document.getElementById('fill-submit-btn').disabled = true;

  const q = state.questions[state.currentIndex];
  // 规范化：去空格、全角转半角、大小写不敏感
  const normalize = s => s.trim().toLowerCase()
    .replace(/[\s\u3000]+/g, '')           // 去所有空格
    .replace(/[（）]/g, '()')               // 全角括号转半角
    .replace(/[，。；：、]/g, ',.;:,');      // 标点统一
  const correctRaw = (q.answer || '').trim();
  const userNorm = normalize(userAnswer);
  // 支持多答案（用 ；或 ; 或换行分隔），答对任意一个即可
  const answers = correctRaw.split(/[；;\n]/).map(s => normalize(s)).filter(Boolean);
  const isCorrect = answers.some(a =>
    userNorm === a ||                          // 完全一致
    (a.length >= 3 && userNorm.includes(a))    // 长答案(≥3字)：用户输入包含正确关键词
  );

  if (isCorrect) state.correctCount++;

  const area = document.getElementById('fill-answer-area');
  area.classList.remove('hidden');
  area.innerHTML = `<div class="app-card" style="padding:1rem;border-left:3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'};background:var(--primary-bg)">
    <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem;font-weight:600">${isCorrect ? '✅ 回答正确' : '❌ 回答错误'}</p>
    <p style="line-height:1.85;white-space:pre-wrap;font-size:0.9375rem;color:${isCorrect ? 'var(--success)' : 'var(--text)'}">参考答案：${escapeHtml(q.answer || '（无答案）')}</p>
  </div>`;

  const fb = document.getElementById('quiz-feedback');
  fb.textContent = isCorrect ? '✅ 回答正确' : `❌ 正确答案: ${q.answer}`;
  fb.className = `feedback-text ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
  renderNav();
  saveData();
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function prevQuestion() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
  }
}

function renderNav() {
  const nav = document.getElementById('quiz-nav-area');
  if (!nav) return;
  const q = state.questions[state.currentIndex];
  const isLast = state.currentIndex >= state.questions.length - 1;
  const isFirst = state.currentIndex === 0;
  const answered = q.type === 'choice' ? state.choiceAnswered : (q.type === 'fill' ? state.fillAnswered : state.revealed);
  nav.innerHTML = `
    <button class="btn-ghost" style="flex:1" onclick="window._quizPrev()" ${isFirst ? 'disabled' : ''}>← 上一题</button>
    ${answered
      ? `<button class="btn-primary" style="flex:1" onclick="window._quizNext()">${isLast ? '完成 ✓' : '下一题 →'}</button>`
      : `<button class="btn-ghost" style="flex:1" disabled>${q.type === 'choice' || q.type === 'fill' ? '请先答题' : '请先看答案'}</button>`}`;
}

window._quizPrev = prevQuestion;
window._quizNext = nextQuestion;

function finishQuiz() {
  const time = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: time });
  const total = state.questions.length;
  const choiceCnt = state.questions.filter(q => q.type === 'choice').length;
  const fillCnt = state.questions.filter(q => q.type === 'fill').length;
  const qaCnt = total - choiceCnt - fillCnt;
  let body = '<div style="text-align:center">' +
    '<p style="font-size:2.5rem;margin-bottom:0.5rem">🎉</p>' +
    '<p style="font-size:1.125rem">已完成 ' + total + ' 题</p>';
  if (choiceCnt > 0) {
    body += '<p style="color:var(--success);margin-top:0.5rem">选择题正确: ' + state.correctCount + '/' + choiceCnt + '</p>';
  }
  if (fillCnt > 0) {
    body += '<p style="color:var(--success);margin-top:0.25rem">填空题正确: ' + state.correctCount + '/' + fillCnt + '</p>';
  }
  if (qaCnt > 0) {
    body += '<p style="color:var(--info);margin-top:0.25rem">问答题已看: ' + state.revealedQA + '/' + qaCnt + '</p>';
  }
  body += '<p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem">用时: ' + Math.floor(time / 60) + '分' + time % 60 + '秒</p></div>';
  showModal('测试完成', body, [
    { text: '返回试题列表', onClick: () => { hideModal(); goToPage('quiz-list'); } },
    { text: '返回首页', onClick: () => { hideModal(); goHome(); }, className: 'btn-ghost' }
  ]);
}

// ==================== 导入试题 ====================
export function showQuizImportModal() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const obj = JSON.parse(txt);
      if (!obj.questions || !Array.isArray(obj.questions)) throw new Error('格式错误');
      const qs = addQuizSet(obj.name || f.name.replace(/\.json$/i, ''), obj.questions);
      renderQuizListPage();
      showToast(`导入成功：${qs.questions.length} 题`);
    } catch (err) {
      showToast('导入失败：' + (err.message || '格式错误'));
    }
  };
  input.click();
}

/** 加载内置试题集：检查是否已有同名试题集，没有则加载 */
export async function loadBuiltinQuizzes() {
  const builtin = [
    { file: 'data/quiz-maogai.json', name: '毛概复习资料（究极版）' },
    { file: 'data/quiz-java.json', name: 'Java期末复习资料' },
    { file: 'data/quiz-maogai-exam.json', name: '毛概复习资料（参考题）' },
    { file: 'data/quiz-maogai2.json', name: '毛概复习题库（填空+简答/论述）' },
    { file: 'data/quiz-maogai-exam-real.json', name: '毛概真题' }
  ];
  const existingNames = new Set(data.quizSets.map(q => q.name));
  for (const b of builtin) {
    if (existingNames.has(b.name)) continue;
    try {
      const resp = await fetch(b.file);
      if (!resp.ok) continue;
      const obj = await resp.json();
      if (obj.questions && obj.questions.length) {
        addQuizSet(b.name || obj.name || b.file, obj.questions);
      }
    } catch (e) { console.log('加载内置试题失败:', b.file, e); }
  }
  saveData();
}

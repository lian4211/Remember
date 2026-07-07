// ==================== 每日复习模块 (v3) ====================
// 支持跨列表复习所有到期单词

import { getAllDueWords, getAllWords, saveData, data, getAllMastery } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { fsrsAnswer } from './fsrs.js';
import { updateStats } from './stats.js';
import { showFlashcard } from './flashcard.js';

function safePlay(text) { try { playVoice(text); } catch(e) { console.log('TTS:', e); } }

let state = {
  dueItems: [], currentIndex: 0,
  correctAnswer: '', mode: 'ec',
  options: [], buttonsEnabled: true,
  startTime: 0, correctCount: 0, totalCount: 0
};

export function startReview() {
  const items = getAllDueWords();
  if (items.length === 0) { showToast('没有需要复习的单词，太棒了！🎉'); return; }
  state = {
    dueItems: [...items].sort(() => Math.random() - 0.5),
    currentIndex: 0, correctAnswer: '', mode: 'ec',
    options: [], buttonsEnabled: true,
    startTime: Date.now(), correctCount: 0, totalCount: items.length
  };
  goToPage('review');
  showReviewQuestion();
}

function showReviewQuestion() {
  const fb = document.getElementById('review-feedback');
  fb.textContent = ''; fb.className = '';
  state.buttonsEnabled = true;
  document.getElementById('review-test-area').classList.remove('hidden');
  document.getElementById('review-flashcard-area').classList.add('hidden');

  if (state.currentIndex >= state.dueItems.length) { finishReview(); return; }

  const item = state.dueItems[state.currentIndex];
  const word = item.word;
  const list = item.list;
  const modes = ['ec', 'ce'];
  state.mode = modes[Math.floor(Math.random() * modes.length)];

  document.getElementById('review-progress').textContent =
    `复习进度: ${state.currentIndex + 1}/${state.dueItems.length} | ✅${state.correctCount}`;

  const ecArea = document.getElementById('review-ec-area');
  const ceArea = document.getElementById('review-ce-area');
  const questionEl = document.getElementById('review-question-word');
  const modeLabel = document.getElementById('review-mode-label');
  const detail = document.getElementById('review-word-detail');
  if (detail) {
    detail.innerHTML = `<span style="color:var(--text-muted);font-size:0.75rem;">${list.name}</span>`;
    if (word.phonetic) detail.innerHTML += ` <span style="color:var(--text-muted);font-size:0.875rem;">${word.phonetic}</span>`;
  }

  safePlay(word.english);

  if (state.mode === 'ec') {
    modeLabel.textContent = '英 → 汉';
    questionEl.textContent = word.english;
    ecArea.classList.remove('hidden');
    ceArea.classList.add('hidden');
    generateReviewOptions(word);
  } else {
    modeLabel.textContent = '汉 → 英';
    questionEl.textContent = word.chinese;
    ecArea.classList.add('hidden');
    ceArea.classList.remove('hidden');
    document.getElementById('review-ce-input').value = '';
    document.getElementById('review-ce-input').focus();
  }
}

function generateReviewOptions(word) {
  // 从所有列表中取中文释义作为干扰项
  const allWords = getAllWords();
  const allChinese = [...new Set(allWords.map(w => w.word.chinese))];
  const others = allChinese.filter(c => c !== word.chinese);
  let choices;
  if (others.length >= 3) {
    choices = others.sort(() => Math.random() - 0.5).slice(0, 3);
  } else {
    // 不足3个干扰项则重复填充
    choices = [...others];
    while (choices.length < 3) {
      choices.push(allChinese[Math.floor(Math.random() * allChinese.length)]);
    }
  }
  state.options = [...choices, word.chinese].sort(() => Math.random() - 0.5);
  state.correctAnswer = word.chinese;
  const div = document.getElementById('review-ec-options');
  div.innerHTML = '';
  state.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn'; btn.textContent = opt;
    btn.onclick = () => checkReviewEC(i, btn);
    div.appendChild(btn);
  });
}

function checkReviewEC(index, btnEl) {
  if (!state.buttonsEnabled) return;
  state.buttonsEnabled = false;
  const word = state.dueItems[state.currentIndex].word;
  const isCorrect = state.options[index] === state.correctAnswer;

  document.querySelectorAll('#review-ec-options .option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (state.options[i] === state.correctAnswer) btn.classList.add('correct');
  });
  if (!isCorrect && btnEl) btnEl.classList.add('wrong');

  afterAnswer(word, isCorrect);
}

export function checkReviewCE() {
  const input = document.getElementById('review-ce-input').value.trim().toLowerCase();
  if (!input) return;
  const word = state.dueItems[state.currentIndex].word;
  const isCorrect = input === word.english.toLowerCase();
  afterAnswer(word, isCorrect);
}

function afterAnswer(word, isCorrect) {
  // 算法更新
  if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
  else sm2Answer(word, isCorrect);

  // 自动判定 passed：SM-2 间隔≥21天或重复≥5次
  if (data.algorithm === 'sm2') {
    if (!word.passed && (word.interval >= 21 || word.repetitions >= 5)) {
      word.passed = true;
      updateStats('new-word', { count: 1 });
    }
  } else {
    // FSRS: stability >= 30 视为已掌握
    if (!word.passed && word.stability >= 30) {
      word.passed = true;
      updateStats('new-word', { count: 1 });
    }
  }

  const fb = document.getElementById('review-feedback');
  if (isCorrect) {
    state.correctCount++;
    fb.textContent = '✅ 正确！'; fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });
    state.currentIndex++;
    saveData();
    setTimeout(showReviewQuestion, 1200);
  } else {
    fb.textContent = `❌ 正确答案: ${state.mode === 'ec' ? state.correctAnswer : word.english}`;
    fb.className = 'feedback-text feedback-wrong';
    updateStats('review', { count: 1, correct: false });
    state.currentIndex++;
    saveData();
    setTimeout(() => { showFlashcardCard(word); }, 2500);
  }
}

function showFlashcardCard(word) {
  document.getElementById('review-test-area').classList.add('hidden');
  document.getElementById('review-flashcard-area').classList.remove('hidden');
  document.getElementById('review-feedback').textContent = '';
  document.getElementById('review-feedback').className = '';
  showFlashcard(word, document.getElementById('review-flashcard-area'), () => {
    showReviewQuestion();
  });
}

export function handleReviewCEKeypress(e) { if (e.key === 'Enter') checkReviewCE(); }

export function playReviewVoice() {
  const w = state.dueItems[state.currentIndex]?.word;
  if (w) safePlay(w.english);
}

function finishReview() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  const pct = state.totalCount > 0 ? Math.round((state.correctCount / state.totalCount) * 100) : 0;
  const mastery = getAllMastery();
  showModal('复习完成',
    `<div style="text-align:center">
      <p style="font-size:2.5rem;margin-bottom:0.5rem">🎉</p>
      <p style="font-size:1.125rem">正确率: ${state.correctCount}/${state.totalCount} (${pct}%)</p>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem">用时: ${Math.floor(timeSpent/60)}分${timeSpent%60}秒</p>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.25rem">整体掌握度: ${mastery.mastered}/${mastery.total} (${mastery.percent}%)</p>
    </div>`,
    [{ text: '返回首页', onClick: () => { hideModal(); goHome(); } }]
  );
}

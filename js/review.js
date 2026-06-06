// ==================== 每日复习模块 (v2) ====================

import { currentList, getDueWords, saveData, data } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { fsrsAnswer } from './fsrs.js';
import { updateStats } from './stats.js';
import { showFlashcard } from './flashcard.js';

function safePlay(text) { try { playVoice(text); } catch(e) { console.log('TTS:', e); } }

let state = {
  dueWords: [], currentIndex: 0,
  correctAnswer: '', mode: 'ec',
  options: [], buttonsEnabled: true,
  startTime: 0, correctCount: 0, totalCount: 0
};

export function startReview() {
  if (!currentList) { showToast('请先选择一个列表'); return; }
  const due = getDueWords(currentList);
  if (due.length === 0) { showToast('没有需要复习的单词，太棒了！🎉'); return; }
  state = {
    dueWords: [...due].sort(() => Math.random() - 0.5),
    currentIndex: 0, correctAnswer: '', mode: 'ec',
    options: [], buttonsEnabled: true,
    startTime: Date.now(), correctCount: 0, totalCount: due.length
  };
  goToPage('review');
  showReviewQuestion();
}

function showReviewQuestion() {
  const fb = document.getElementById('review-feedback');
  fb.textContent = ''; fb.className = '';
  state.buttonsEnabled = true;
  // 恢复视图
  document.getElementById('review-test-area').classList.remove('hidden');
  document.getElementById('review-flashcard-area').classList.add('hidden');

  if (state.currentIndex >= state.dueWords.length) { finishReview(); return; }

  const word = state.dueWords[state.currentIndex];
  const modes = ['ec', 'ce'];
  state.mode = modes[Math.floor(Math.random() * modes.length)];

  document.getElementById('review-progress').textContent =
    `复习进度: ${state.currentIndex + 1}/${state.dueWords.length} | ✅${state.correctCount}`;

  const ecArea = document.getElementById('review-ec-area');
  const ceArea = document.getElementById('review-ce-area');
  const questionEl = document.getElementById('review-question-word');
  const modeLabel = document.getElementById('review-mode-label');
  const detail = document.getElementById('review-word-detail');
  if (detail) { detail.innerHTML = ''; if (word.phonetic) detail.innerHTML = `<span style="color:var(--text-muted);font-size:0.875rem;">${word.phonetic}</span>`; }

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
  const allChinese = [...new Set(currentList.words.map(w => w.chinese))];
  const others = allChinese.filter(c => c !== word.chinese);
  let choices = others.length >= 3 ? others.sort(() => Math.random() - 0.5).slice(0, 3) :
    [...others, ...Array(3 - others.length).fill(0).map(() => allChinese[Math.floor(Math.random() * allChinese.length)])];
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
  const word = state.dueWords[state.currentIndex];
  const isCorrect = state.options[index] === state.correctAnswer;

  document.querySelectorAll('#review-ec-options .option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (state.options[i] === state.correctAnswer) btn.classList.add('correct');
  });
  if (!isCorrect && btnEl) btnEl.classList.add('wrong');

  if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
  else sm2Answer(word, isCorrect);

  if (isCorrect && !word.passed) { word.passed = true; updateStats('new-word', { count: 1 }); }

  const fb = document.getElementById('review-feedback');
  if (isCorrect) {
    state.correctCount++;
    fb.textContent = '✅ 正确！'; fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });
    state.currentIndex++;
    saveData();
    setTimeout(showReviewQuestion, 1200);
  } else {
    fb.textContent = `❌ 正确答案: ${state.correctAnswer}`; fb.className = 'feedback-text feedback-wrong';
    updateStats('review', { count: 1, correct: false });
    state.currentIndex++;
    saveData();
    setTimeout(() => { showFlashcardCard(word); }, 2500);
  }
}

export function checkReviewCE() {
  const input = document.getElementById('review-ce-input').value.trim().toLowerCase();
  if (!input) return;
  const word = state.dueWords[state.currentIndex];
  const isCorrect = input === word.english.toLowerCase();

  if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
  else sm2Answer(word, isCorrect);

  if (isCorrect && !word.passed) { word.passed = true; updateStats('new-word', { count: 1 }); }

  const fb = document.getElementById('review-feedback');
  if (isCorrect) {
    state.correctCount++;
    fb.textContent = '✅ 正确！'; fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });
    state.currentIndex++; saveData();
    setTimeout(showReviewQuestion, 1200);
  } else {
    fb.textContent = `❌ 正确答案: ${word.english}`; fb.className = 'feedback-text feedback-wrong';
    updateStats('review', { count: 1, correct: false });
    state.currentIndex++; saveData();
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
  const w = state.dueWords[state.currentIndex];
  if (w) safePlay(w.english);
}

function finishReview() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  const pct = state.totalCount > 0 ? Math.round((state.correctCount / state.totalCount) * 100) : 0;
  showModal('复习完成',
    `<div style="text-align:center"><p style="font-size:2.5rem;margin-bottom:0.5rem">🎉</p>
     <p style="font-size:1.125rem">正确率: ${state.correctCount}/${state.totalCount} (${pct}%)</p>
     <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem">用时: ${Math.floor(timeSpent/60)}分${timeSpent%60}秒</p></div>`,
    [{ text: '返回首页', onClick: () => { hideModal(); goHome(); } }]
  );
}

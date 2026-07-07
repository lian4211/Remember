// ==================== 汉译英测试模块 (v3) ====================
// 增强错题：记录错误次数，不轻易移除

import { currentList, saveData, data } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { fsrsAnswer } from './fsrs.js';
import { updateStats } from './stats.js';
import { showFlashcard } from './flashcard.js';

function safePlay(text) { try { playVoice(text); } catch(e) { console.log('TTS:', e); } }

let state = {
  words: [], mistakes: [], currentIndex: 0,
  phase: 'learning', reviewQueue: [],
  correctAnswer: '', requireCorrectInput: false, requiredInput: '', startTime: 0
};

export function startCETest() {
  if (!currentList) { showToast('请先选择一个列表'); return; }
  if (currentList.words.length === 0) { showToast('该列表没有单词'); return; }
  currentList.ceMistakes.forEach(m => { if (m.errorCount === undefined) m.errorCount = 1; });
  state = {
    words: [...currentList.words].sort(() => Math.random() - 0.5),
    mistakes: [...currentList.ceMistakes],
    currentIndex: 0, phase: 'learning', reviewQueue: [],
    correctAnswer: '', requireCorrectInput: false, requiredInput: '', startTime: Date.now()
  };
  goToPage('ce');
  showCEQuestion();
}

function showCEQuestion() {
  const fb = document.getElementById('ce-feedback');
  fb.textContent = ''; fb.className = '';
  state.requireCorrectInput = false;
  document.getElementById('ce-submit-btn').textContent = '提交';
  document.getElementById('ce-input').value = '';
  document.getElementById('ce-input').focus();
  document.getElementById('ce-test-area').classList.remove('hidden');
  document.getElementById('ce-flashcard-area').classList.add('hidden');

  const detail = document.getElementById('ce-word-detail'); if (detail) detail.innerHTML = '';

  if (state.phase === 'learning') {
    if (state.currentIndex >= state.words.length) {
      if (state.mistakes.length > 0) { state.phase = 'review'; prepareCEReview(); return; }
      finishCETest(); return;
    }
    const word = state.words[state.currentIndex];
    state.correctAnswer = word.english;
    document.getElementById('ce-word').textContent = word.chinese;
    document.getElementById('ce-progress').textContent = `学习进度: ${state.currentIndex + 1}/${state.words.length}`;
    if (word.phonetic && detail) detail.innerHTML = `<span style="color:var(--text-muted);font-size:0.875rem;">${word.phonetic}</span>`;
    safePlay(word.english);
  } else {
    if (state.reviewQueue.length === 0) {
      if (state.mistakes.length > 0) { prepareCEReview(); return; }
      finishCETest(); return;
    }
    const entry = state.reviewQueue[0];
    state.correctAnswer = entry.word.english;
    document.getElementById('ce-word').textContent = entry.word.chinese;
    document.getElementById('ce-progress').textContent = `错题复习 - 剩余: ${state.reviewQueue.length}题`;
    safePlay(entry.word.english);
  }
}

const MISTAKE_REVIEW_MAX_CE = 5;

function prepareCEReview() {
  state.mistakes.sort((a, b) => (b.errorCount || 1) - (a.errorCount || 1));
  state.reviewQueue = [];
  state.mistakes.forEach(m => {
    const word = currentList.words.find(w => w.english === m.english && w.chinese === m.chinese)
      || { english: m.english, chinese: m.chinese };
    state.reviewQueue.push({ word, streak: m.streak || 0, errorCount: m.errorCount || 1, retries: 0 });
  });
  showCEQuestion();
}

function checkCEAnswer() {
  const input = document.getElementById('ce-input').value.trim().toLowerCase();
  if (!input) return;

  if (state.requireCorrectInput) {
    if (input === state.requiredInput.toLowerCase()) {
      document.getElementById('ce-feedback').textContent = '正确，请继续';
      document.getElementById('ce-feedback').className = 'feedback-text feedback-correct';
      setTimeout(nextCEQuestion, 800);
    } else {
      document.getElementById('ce-feedback').textContent = `请输入正确答案: ${state.requiredInput}`;
      document.getElementById('ce-feedback').className = 'feedback-text feedback-wrong';
      document.getElementById('ce-input').value = '';
    }
    return;
  }

  const isCorrect = input === state.correctAnswer.toLowerCase();
  let word;
  if (state.phase === 'learning') word = state.words[state.currentIndex];
  else word = state.reviewQueue[0]?.word;

  if (word) {
    if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
    else sm2Answer(word, isCorrect);

    if (isCorrect && !word.passed) {
      if (data.algorithm === 'sm2' && (word.interval >= 21 || word.repetitions >= 5)) {
        word.passed = true;
        updateStats('new-word', { count: 1 });
      } else if (data.algorithm === 'fsrs' && word.stability >= 30) {
        word.passed = true;
        updateStats('new-word', { count: 1 });
      }
    }
  }

  const fb = document.getElementById('ce-feedback');

  if (isCorrect) {
    fb.textContent = '✅ 回答正确！';
    fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });

    if (state.phase === 'learning') {
      state.currentIndex++;
    } else {
      const entry = state.reviewQueue.shift();
      entry.streak++;
      // 连续正确 >= 7 次则移出错题库（永久错题不移除）
      const masterMistake = state.mistakes.find(m => m.english === entry.word.english && m.chinese === entry.word.chinese);
      if (entry.streak >= 7 && masterMistake && !masterMistake.permanent) {
        state.mistakes = state.mistakes.filter(m => m !== masterMistake);
      } else if (masterMistake) {
        masterMistake.streak = entry.streak;
        state.reviewQueue.push(entry);
      }
    }
    currentList.ceMistakes = state.mistakes;
    saveData();
    setTimeout(nextCEQuestion, 1500);
  } else {
    fb.textContent = `❌ 错误！正确答案: ${state.correctAnswer}`;
    fb.className = 'feedback-text feedback-wrong';
    state.requireCorrectInput = true;
    state.requiredInput = state.correctAnswer;
    document.getElementById('ce-submit-btn').textContent = '输入正确答案后继续';
    document.getElementById('ce-input').value = '';
    updateStats('review', { count: 1, correct: false });

    if (state.phase === 'learning') {
      const w = state.words[state.currentIndex];
      const ex = state.mistakes.find(m => m.english === w.english && m.chinese === w.chinese);
      if (!ex) state.mistakes.push({ english: w.english, chinese: w.chinese, streak: 0, errorCount: 1, permanent: false });
      else { ex.streak = 0; ex.errorCount = (ex.errorCount || 1) + 1; if (ex.errorCount >= 5) ex.permanent = true; }
      state.currentIndex++;
    } else {
      const entry = state.reviewQueue.shift();
      const masterMistake = state.mistakes.find(m => m.english === entry.word.english && m.chinese === entry.word.chinese);
      if (masterMistake) { masterMistake.streak = 0; masterMistake.errorCount = (masterMistake.errorCount || 1) + 1; if (masterMistake.errorCount >= 5) masterMistake.permanent = true; }
      if (entry.retries < MISTAKE_REVIEW_MAX_CE) {
        entry.retries++; entry.streak = 0;
        state.reviewQueue.push(entry);
      }
    }
    currentList.ceMistakes = state.mistakes;
    saveData();

    setTimeout(() => {
      showFlashcardCard(word || { english: state.correctAnswer, chinese: '' });
    }, 2500);
  }
}

function showFlashcardCard(word) {
  document.getElementById('ce-test-area').classList.add('hidden');
  document.getElementById('ce-flashcard-area').classList.remove('hidden');
  document.getElementById('ce-feedback').textContent = '';
  document.getElementById('ce-feedback').className = '';
  const fullWord = currentList?.words.find(w => w.english === word.english) || word;
  showFlashcard(fullWord, document.getElementById('ce-flashcard-area'), () => {
    showCEQuestion();
  });
}

function nextCEQuestion() { showCEQuestion(); }

function finishCETest() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  const totalErrors = state.mistakes.reduce((sum, m) => sum + (m.errorCount || 1), 0);
  showModal('学习完成',
    `<div style="text-align:center">
      <p style="font-size:2.5rem;margin-bottom:0.5rem">🎉</p>
      <p style="font-weight:600">汉译英学习已全部完成！</p>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem">当前错题: ${state.mistakes.length} 个 | 总错误: ${totalErrors} 次</p>
    </div>`,
    [{ text: '返回首页', onClick: () => { hideModal(); goHome(); } }]
  );
}

export function handleCESubmit() { checkCEAnswer(); }
export function handleCEKeypress(e) { if (e.key === 'Enter') checkCEAnswer(); }
export function playCEVoice() { safePlay(state.correctAnswer); }

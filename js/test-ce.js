// ==================== 汉译英测试模块 (v2) ====================

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
  // 恢复视图
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
    const [word, streak] = state.reviewQueue[0];
    state.correctAnswer = word.english;
    document.getElementById('ce-word').textContent = word.chinese;
    document.getElementById('ce-progress').textContent = `错题复习 - 剩余: ${state.reviewQueue.length}题`;
    safePlay(word.english);
  }
}

const MAX_RETRIES_CE = 5;
function prepareCEReview() {
  state.reviewQueue = state.mistakes.map(m => [
    currentList.words.find(w => w.english === m.english && w.chinese === m.chinese) || { english: m.english, chinese: m.chinese },
    m.streak || 0,
    0
  ]).sort(() => Math.random() - 0.5);
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
  else word = state.reviewQueue[0]?.[0];

  // 算法分发
  if (word) {
    if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
    else sm2Answer(word, isCorrect);

    if (isCorrect && !word.passed) {
      word.passed = true;
      updateStats('new-word', { count: 1 });
    }
  }

  const fb = document.getElementById('ce-feedback');

  if (isCorrect) {
    fb.textContent = '✅ 回答正确！';
    fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });

    if (state.phase === 'learning') state.currentIndex++;
    else {
      const [rw, streak] = state.reviewQueue.shift();
      const newStreak = streak + 1;
      if (newStreak >= 3) state.mistakes = state.mistakes.filter(m => !(m.english === rw.english && m.chinese === rw.chinese));
      else { const m = state.mistakes.find(x => x.english === rw.english && x.chinese === rw.chinese); if (m) m.streak = newStreak; state.reviewQueue.push([rw, newStreak, 0]); }
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
      if (!ex) state.mistakes.push({ english: w.english, chinese: w.chinese, streak: 0 });
      else ex.streak = 0;
      state.currentIndex++;
    } else {
      const [rw, , retries = 0] = state.reviewQueue.shift();
      const m = state.mistakes.find(x => x.english === rw.english && x.chinese === rw.chinese);
      if (m) m.streak = 0;
      if (retries < MAX_RETRIES_CE) state.reviewQueue.push([rw, 0, retries + 1]);
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
  updateStats('time', { seconds: Math.round((Date.now() - state.startTime) / 1000) });
  showModal('学习完成', '汉译英学习已全部完成！🎉', [{ text: '返回首页', onClick: () => { hideModal(); goHome(); } }]);
}

export function handleCESubmit() { checkCEAnswer(); }
export function handleCEKeypress(e) { if (e.key === 'Enter') checkCEAnswer(); }
export function playCEVoice() { safePlay(state.correctAnswer); }

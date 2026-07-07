// ==================== 英译汉测试模块 (v3) ====================
// 增强错题：记录错误次数，不轻易移除

import { currentList, saveData, data } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { fsrsAnswer } from './fsrs.js';
import { updateStats } from './stats.js';
import { showFlashcard } from './flashcard.js';

function safePlay(text) {
  try { playVoice(text); } catch(e) { console.log('TTS:', e); }
}

let state = {
  words: [], mistakes: [], currentIndex: 0,
  phase: 'learning', reviewQueue: [],
  correctAnswer: '', options: [], buttonsEnabled: true, startTime: 0
};

export function startECTest() {
  if (!currentList) { showToast('请先选择一个列表'); return; }
  if (currentList.words.length < 4) { showToast('单词数不足4个'); return; }
  // 确保错题记录有 errorCount 字段
  currentList.ecMistakes.forEach(m => { if (m.errorCount === undefined) m.errorCount = 1; });
  state = {
    words: [...currentList.words].sort(() => Math.random() - 0.5),
    mistakes: [...currentList.ecMistakes],
    currentIndex: 0, phase: 'learning', reviewQueue: [],
    correctAnswer: '', options: [], buttonsEnabled: true, startTime: Date.now()
  };
  goToPage('ec');
  showECQuestion();
}

function showECQuestion() {
  const fb = document.getElementById('ec-feedback');
  fb.textContent = ''; fb.className = '';
  state.buttonsEnabled = true;
  document.getElementById('ec-test-area').classList.remove('hidden');
  document.getElementById('ec-flashcard-area').classList.add('hidden');

  if (state.phase === 'learning') {
    if (state.currentIndex >= state.words.length) {
      if (state.mistakes.length > 0) { state.phase = 'review'; prepareECReview(); return; }
      finishECTest(); return;
    }
    const word = state.words[state.currentIndex];
    state.correctAnswer = word.chinese;
    document.getElementById('ec-word').textContent = word.english;
    document.getElementById('ec-progress').textContent = `学习进度: ${state.currentIndex + 1}/${state.words.length}`;
    showWordDetail(word);
    safePlay(word.english);
  } else {
    if (state.reviewQueue.length === 0) {
      if (state.mistakes.length > 0) { prepareECReview(); return; }
      finishECTest(); return;
    }
    const entry = state.reviewQueue[0];
    state.correctAnswer = entry.word.chinese;
    document.getElementById('ec-word').textContent = entry.word.english;
    document.getElementById('ec-progress').textContent = `错题复习 - 剩余: ${state.reviewQueue.length}题`;
    showWordDetail(entry.word);
    safePlay(entry.word.english);
  }
  generateECOptions();
}

function showWordDetail(word) {
  const d = document.getElementById('ec-word-detail');
  if (!d) return;
  d.innerHTML = '';
  if (word.phonetic) d.innerHTML += `<span style="color:var(--text-muted);font-size:0.875rem;">${word.phonetic}</span>`;
}

function generateECOptions() {
  const allChinese = [...new Set(currentList.words.map(w => w.chinese))];
  const others = allChinese.filter(c => c !== state.correctAnswer);
  let choices = others.length >= 3 ? others.sort(() => Math.random() - 0.5).slice(0, 3) :
    [...others, ...Array(3 - others.length).fill(0).map(() => allChinese[Math.floor(Math.random() * allChinese.length)])];
  state.options = [...choices, state.correctAnswer].sort(() => Math.random() - 0.5);

  const div = document.getElementById('ec-options');
  div.innerHTML = '';
  state.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn'; btn.textContent = opt;
    btn.onclick = () => checkECAnswer(i, btn);
    div.appendChild(btn);
  });
}

const MISTAKE_REVIEW_MAX = 5; // 同一错题最多复习5轮

function prepareECReview() {
  // 按错误次数降序排列（错得多的优先）
  state.mistakes.sort((a, b) => (b.errorCount || 1) - (a.errorCount || 1));
  state.reviewQueue = [];
  state.mistakes.forEach(m => {
    const word = currentList.words.find(w => w.english === m.english && w.chinese === m.chinese)
      || { english: m.english, chinese: m.chinese };
    state.reviewQueue.push({ word, streak: m.streak || 0, errorCount: m.errorCount || 1, retries: 0 });
  });
  showECQuestion();
}

function checkECAnswer(index, btnEl) {
  if (!state.buttonsEnabled) return;
  state.buttonsEnabled = false;

  const isCorrect = state.options[index] === state.correctAnswer;

  document.querySelectorAll('#ec-options .option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (state.options[i] === state.correctAnswer) btn.classList.add('correct');
  });
  if (!isCorrect && btnEl) btnEl.classList.add('wrong');

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

  const fb = document.getElementById('ec-feedback');

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
        // 即使已移除错题池，仍然加入队尾再练一次巩固
        state.reviewQueue.push(entry);
      }
    }
    currentList.ecMistakes = state.mistakes;
    saveData();
    setTimeout(showECQuestion, 1500);
  } else {
    fb.textContent = `❌ 错误！正确答案: ${state.correctAnswer}`;
    fb.className = 'feedback-text feedback-wrong';
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
      if (entry.retries < MISTAKE_REVIEW_MAX) {
        entry.retries++; entry.streak = 0;
        state.reviewQueue.push(entry);
      }
    }
    currentList.ecMistakes = state.mistakes;
    saveData();

    setTimeout(() => {
      showFlashcardCard(word || { english: state.correctAnswer, chinese: state.correctAnswer });
    }, 2500);
  }
}

function showFlashcardCard(word) {
  document.getElementById('ec-test-area').classList.add('hidden');
  document.getElementById('ec-flashcard-area').classList.remove('hidden');
  document.getElementById('ec-feedback').textContent = '';
  document.getElementById('ec-feedback').className = '';
  const fullWord = currentList?.words.find(w => w.english === word.english) || word;
  showFlashcard(fullWord, document.getElementById('ec-flashcard-area'), () => {
    showECQuestion();
  });
}

function finishECTest() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  const totalErrors = state.mistakes.reduce((sum, m) => sum + (m.errorCount || 1), 0);
  showModal('学习完成',
    `<div style="text-align:center">
      <p style="font-size:2.5rem;margin-bottom:0.5rem">🎉</p>
      <p style="font-weight:600">英译汉学习已全部完成！</p>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem">当前错题: ${state.mistakes.length} 个 | 总错误: ${totalErrors} 次</p>
    </div>`,
    [{ text: '返回首页', onClick: () => { hideModal(); goHome(); } }]
  );
}

export function playECVoice() {
  const el = document.getElementById('ec-word');
  if (el?.textContent) safePlay(el.textContent);
}

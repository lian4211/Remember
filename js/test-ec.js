// ==================== 英译汉测试模块 (v2) ====================

import { currentList, saveData, data } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { fsrsAnswer } from './fsrs.js';
import { updateStats } from './stats.js';
import { showFlashcard } from './flashcard.js';

// 安全播放（带静默失败）
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
  // 恢复测试视图
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
    safePlay(word.english); // 自动朗读
  } else {
    if (state.reviewQueue.length === 0) {
      if (state.mistakes.length > 0) { prepareECReview(); return; }
      finishECTest(); return;
    }
    const [word, streak] = state.reviewQueue[0];
    state.correctAnswer = word.chinese;
    document.getElementById('ec-word').textContent = word.english;
    document.getElementById('ec-progress').textContent = `错题复习 - 剩余: ${state.reviewQueue.length}题`;
    showWordDetail(word);
    safePlay(word.english);
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

function prepareECReview() {
  state.reviewQueue = state.mistakes.map(m => [
    currentList.words.find(w => w.english === m.english && w.chinese === m.chinese) || { english: m.english, chinese: m.chinese },
    m.streak || 0
  ]).sort(() => Math.random() - 0.5);
  showECQuestion();
}

function checkECAnswer(index, btnEl) {
  if (!state.buttonsEnabled) return;
  state.buttonsEnabled = false;

  const isCorrect = state.options[index] === state.correctAnswer;

  // 标记所有按钮
  document.querySelectorAll('#ec-options .option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (state.options[i] === state.correctAnswer) btn.classList.add('correct');
  });
  if (!isCorrect && btnEl) btnEl.classList.add('wrong');

  // 获取当前单词
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

  const fb = document.getElementById('ec-feedback');

  if (isCorrect) {
    fb.textContent = '✅ 回答正确！';
    fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });

    if (state.phase === 'learning') state.currentIndex++;
    else {
      const [rw, streak] = state.reviewQueue.shift();
      const newStreak = streak + 1;
      if (newStreak >= 3) state.mistakes = state.mistakes.filter(m => !(m.english === rw.english && m.chinese === rw.chinese));
      else { const m = state.mistakes.find(x => x.english === rw.english && x.chinese === rw.chinese); if (m) m.streak = newStreak; state.reviewQueue.push([rw, newStreak]); }
    }
    currentList.ecMistakes = state.mistakes;
    saveData();
    // 延长：1500ms 后下一题
    setTimeout(showECQuestion, 1500);
  } else {
    fb.textContent = `❌ 错误！正确答案: ${state.correctAnswer}`;
    fb.className = 'feedback-text feedback-wrong';
    updateStats('review', { count: 1, correct: false });

    // 错误处理
    if (state.phase === 'learning') {
      const w = state.words[state.currentIndex];
      const ex = state.mistakes.find(m => m.english === w.english && m.chinese === w.chinese);
      if (!ex) state.mistakes.push({ english: w.english, chinese: w.chinese, streak: 0 });
      else ex.streak = 0;
      state.currentIndex++;
    } else {
      const [rw] = state.reviewQueue.shift();
      const m = state.mistakes.find(x => x.english === rw.english && x.chinese === rw.chinese);
      if (m) m.streak = 0;
      state.reviewQueue.push([rw, 0]);
    }
    currentList.ecMistakes = state.mistakes;
    saveData();

    // 延长：3000ms 后显示闪卡
    setTimeout(() => {
      showFlashcardCard(word || { english: state.correctAnswer, chinese: state.correctAnswer });
    }, 2500);
  }
}

/** 显示闪卡 */
function showFlashcardCard(word) {
  document.getElementById('ec-test-area').classList.add('hidden');
  document.getElementById('ec-flashcard-area').classList.remove('hidden');
  document.getElementById('ec-feedback').textContent = '';
  document.getElementById('ec-feedback').className = '';

  // 确保 word 有完整数据
  const fullWord = currentList?.words.find(w => w.english === word.english) || word;

  showFlashcard(fullWord, document.getElementById('ec-flashcard-area'), () => {
    showECQuestion();
  });
}

function finishECTest() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  showModal('学习完成', '英译汉学习已全部完成！🎉', [
    { text: '返回首页', onClick: () => { hideModal(); goHome(); } }
  ]);
}

export function playECVoice() {
  const el = document.getElementById('ec-word');
  if (el?.textContent) safePlay(el.textContent);
}

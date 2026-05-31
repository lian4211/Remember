// ==================== 汉译英测试模块 ====================

import { currentList, saveData } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { updateStats } from './stats.js';

let state = {
  words: [],
  mistakes: [],
  currentIndex: 0,
  phase: 'learning',
  reviewQueue: [],
  correctAnswer: '',
  requireCorrectInput: false,
  requiredInput: '',
  startTime: 0
};

/** 开始汉译英测试 */
export function startCETest() {
  if (!currentList) { showToast('请先选择一个列表'); return; }
  if (currentList.words.length === 0) { showToast('该列表没有单词'); return; }
  
  state = {
    words: [...currentList.words].sort(() => Math.random() - 0.5),
    mistakes: [...currentList.ceMistakes],
    currentIndex: 0,
    phase: 'learning',
    reviewQueue: [],
    correctAnswer: '',
    requireCorrectInput: false,
    requiredInput: '',
    startTime: Date.now()
  };
  goToPage('ce');
  showCEQuestion();
}

function showCEQuestion() {
  document.getElementById('ce-feedback').textContent = '';
  document.getElementById('ce-feedback').className = 'text-center text-2xl';
  state.requireCorrectInput = false;
  document.getElementById('ce-submit-btn').textContent = '提交';
  document.getElementById('ce-input').value = '';
  document.getElementById('ce-input').focus();
  
  // 清空详情
  const detail = document.getElementById('ce-word-detail');
  if (detail) detail.innerHTML = '';

  if (state.phase === 'learning') {
    if (state.currentIndex >= state.words.length) {
      if (state.mistakes.length > 0) {
        state.phase = 'review';
        prepareCEReview();
        return;
      } else {
        finishCETest();
        return;
      }
    }
    const word = state.words[state.currentIndex];
    state.correctAnswer = word.english;
    document.getElementById('ce-word').textContent = word.chinese;
    document.getElementById('ce-progress').textContent = `学习进度: ${state.currentIndex + 1}/${state.words.length}`;
    if (word.phonetic) {
      const wordDetail = document.getElementById('ce-word-detail');
      if (wordDetail) wordDetail.innerHTML = `<span class="text-gray-400 text-sm">${word.phonetic}</span>`;
    }
  } else {
    if (state.reviewQueue.length === 0) {
      if (state.mistakes.length > 0) {
        prepareCEReview();
        return;
      } else {
        finishCETest();
        return;
      }
    }
    const [word, streak] = state.reviewQueue[0];
    state.correctAnswer = word.english;
    document.getElementById('ce-word').textContent = word.chinese;
    document.getElementById('ce-progress').textContent = `错题复习 - 剩余: ${state.reviewQueue.length}题`;
  }
}

function prepareCEReview() {
  state.reviewQueue = state.mistakes.map(m => [
    currentList.words.find(w => w.english === m.english && w.chinese === m.chinese) || { english: m.english, chinese: m.chinese },
    m.streak || 0
  ]).sort(() => Math.random() - 0.5);
  showCEQuestion();
}

function checkCEAnswer() {
  const input = document.getElementById('ce-input').value.trim().toLowerCase();
  if (!input) return;

  if (state.requireCorrectInput) {
    if (input === state.requiredInput.toLowerCase()) {
      document.getElementById('ce-feedback').textContent = '正确，请继续';
      document.getElementById('ce-feedback').className = 'text-center text-2xl text-green-600';
      setTimeout(nextCEQuestion, 800);
    } else {
      document.getElementById('ce-feedback').textContent = `请输入正确答案: ${state.requiredInput}`;
      document.getElementById('ce-feedback').className = 'text-center text-2xl text-red-600';
      document.getElementById('ce-input').value = '';
    }
    return;
  }

  const isCorrect = input === state.correctAnswer.toLowerCase();
  
  // 获取当前单词对象
  let currentWord;
  if (state.phase === 'learning') {
    currentWord = state.words[state.currentIndex];
  } else {
    currentWord = state.reviewQueue[0]?.[0];
  }
  
  // 应用 SM-2 算法
  if (currentWord && currentWord.easeFactor !== undefined) {
    sm2Answer(currentWord, isCorrect);
  }

  if (isCorrect) {
    document.getElementById('ce-feedback').textContent = '✅ 回答正确！';
    document.getElementById('ce-feedback').className = 'text-center text-2xl text-green-600';
    
    if (state.phase === 'learning') {
      state.currentIndex++;
    } else {
      const [word, streak] = state.reviewQueue.shift();
      const newStreak = streak + 1;
      if (newStreak >= 3) {
        state.mistakes = state.mistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
        document.getElementById('ce-feedback').textContent = '✅ 连续3次正确，已移出错题库！';
      } else {
        const mistake = state.mistakes.find(m => m.english === word.english && m.chinese === word.chinese);
        if (mistake) mistake.streak = newStreak;
        state.reviewQueue.push([word, newStreak]);
      }
    }
    currentList.ceMistakes = state.mistakes;
    saveData();
    updateStats('review', { count: 1, correct: true });
    // 显示单词详情
    if (currentWord) showAnswerDetail(currentWord);
    setTimeout(nextCEQuestion, 1200);
  } else {
    document.getElementById('ce-feedback').textContent = `❌ 错误！正确答案是: ${state.correctAnswer}`;
    document.getElementById('ce-feedback').className = 'text-center text-2xl text-red-600';
    state.requireCorrectInput = true;
    state.requiredInput = state.correctAnswer;
    document.getElementById('ce-submit-btn').textContent = '输入正确答案后继续';
    document.getElementById('ce-input').value = '';
    
    if (state.phase === 'learning') {
      const word = state.words[state.currentIndex];
      const existing = state.mistakes.find(m => m.english === word.english && m.chinese === word.chinese);
      if (!existing) {
        state.mistakes.push({ english: word.english, chinese: word.chinese, streak: 0 });
      } else {
        existing.streak = 0;
      }
      state.currentIndex++;
    } else {
      const [word, _] = state.reviewQueue.shift();
      const mistake = state.mistakes.find(m => m.english === word.english && m.chinese === word.chinese);
      if (mistake) mistake.streak = 0;
      state.reviewQueue.push([word, 0]);
    }
    currentList.ceMistakes = state.mistakes;
    saveData();
    updateStats('review', { count: 1, correct: false });
    if (currentWord) showAnswerDetail(currentWord);
  }
}

function showAnswerDetail(word) {
  const detail = document.getElementById('ce-word-detail');
  if (!detail) return;
  let html = '';
  if (word.phonetic) html += `<span class="text-gray-400 text-sm mr-2">${word.phonetic}</span>`;
  if (word.example) html += `<p class="text-gray-500 text-xs mt-1 italic">"${word.example}"</p>`;
  detail.innerHTML = html;
}

function nextCEQuestion() {
  showCEQuestion();
}

function finishCETest() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  showModal('学习完成', '汉译英学习已全部完成！🎉', [
    { text: '返回首页', onClick: () => { hideModal(); goHome(); } }
  ]);
}

/** 提交按钮处理 */
export function handleCESubmit() {
  checkCEAnswer();
}

/** 键盘回车处理 */
export function handleCEKeypress(e) {
  if (e.key === 'Enter') checkCEAnswer();
}

/** 播放当前单词发音 */
export function playCEVoice() {
  playVoice(state.correctAnswer);
}

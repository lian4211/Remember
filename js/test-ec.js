// ==================== 英译汉测试模块 ====================

import { currentList, saveData } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { updateStats } from './stats.js';

let state = {
  words: [],
  mistakes: [],
  currentIndex: 0,
  phase: 'learning',  // 'learning' | 'review'
  reviewQueue: [],
  correctAnswer: '',
  options: [],
  buttonsEnabled: true,
  startTime: 0
};

/** 开始英译汉测试 */
export function startECTest() {
  if (!currentList) { showToast('请先选择一个列表'); return; }
  if (currentList.words.length < 4) { showToast('单词数不足4个，无法生成选项'); return; }
  
  state = {
    words: [...currentList.words].sort(() => Math.random() - 0.5),
    mistakes: [...currentList.ecMistakes],
    currentIndex: 0,
    phase: 'learning',
    reviewQueue: [],
    correctAnswer: '',
    options: [],
    buttonsEnabled: true,
    startTime: Date.now()
  };
  goToPage('ec');
  showECQuestion();
}

function showECQuestion() {
  document.getElementById('ec-feedback').textContent = '';
  document.getElementById('ec-feedback').className = 'text-center text-2xl';
  state.buttonsEnabled = true;

  if (state.phase === 'learning') {
    if (state.currentIndex >= state.words.length) {
      if (state.mistakes.length > 0) {
        state.phase = 'review';
        prepareECReview();
        return;
      } else {
        finishECTest();
        return;
      }
    }
    const word = state.words[state.currentIndex];
    state.correctAnswer = word.chinese;
    document.getElementById('ec-word').textContent = word.english;
    document.getElementById('ec-progress').textContent = `学习进度: ${state.currentIndex + 1}/${state.words.length}`;
    // 显示单词详情
    showWordDetail(word);
  } else {
    if (state.reviewQueue.length === 0) {
      if (state.mistakes.length > 0) {
        prepareECReview();
        return;
      } else {
        finishECTest();
        return;
      }
    }
    const [word, streak] = state.reviewQueue[0];
    state.correctAnswer = word.chinese;
    document.getElementById('ec-word').textContent = word.english;
    document.getElementById('ec-progress').textContent = `错题复习 - 剩余: ${state.reviewQueue.length}题`;
    showWordDetail(word);
  }
  generateECOptions();
}

function showWordDetail(word) {
  const detail = document.getElementById('ec-word-detail');
  if (!detail) return;
  let html = '';
  if (word.phonetic) html += `<span class="text-gray-400 text-sm mr-2">${word.phonetic}</span>`;
  if (word.example) html += `<p class="text-gray-500 text-xs mt-1 italic">"${word.example}"</p>`;
  detail.innerHTML = html;
}

function generateECOptions() {
  const allChinese = [...new Set(currentList.words.map(w => w.chinese))];
  const others = allChinese.filter(c => c !== state.correctAnswer);
  let choices;
  if (others.length >= 3) {
    choices = others.sort(() => Math.random() - 0.5).slice(0, 3);
  } else {
    choices = [...others, ...Array(3 - others.length).fill(0).map(() => allChinese[Math.floor(Math.random() * allChinese.length)])];
  }
  state.options = [...choices, state.correctAnswer].sort(() => Math.random() - 0.5);

  const optionsDiv = document.getElementById('ec-options');
  optionsDiv.innerHTML = '';
  state.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'w-full bg-white border border-gray-300 py-4 rounded-lg text-xl hover:bg-blue-50 transition';
    btn.textContent = option;
    btn.onclick = () => checkECAnswer(index);
    optionsDiv.appendChild(btn);
  });
}

function prepareECReview() {
  state.reviewQueue = state.mistakes.map(m => [
    currentList.words.find(w => w.english === m.english && w.chinese === m.chinese) || { english: m.english, chinese: m.chinese },
    m.streak || 0
  ]).sort(() => Math.random() - 0.5);
  showECQuestion();
}

function checkECAnswer(index) {
  if (!state.buttonsEnabled) return;
  state.buttonsEnabled = false;

  const selected = state.options[index];
  const isCorrect = selected === state.correctAnswer;
  
  // 获取当前单词对象
  let currentWord;
  if (state.phase === 'learning') {
    currentWord = state.words[state.currentIndex];
  } else {
    currentWord = state.reviewQueue[0][0];
  }
  
  // 应用 SM-2 算法
  if (currentWord && currentWord.easeFactor !== undefined) {
    sm2Answer(currentWord, isCorrect);
  }

  if (isCorrect) {
    document.getElementById('ec-feedback').textContent = '✅ 回答正确！';
    document.getElementById('ec-feedback').className = 'text-center text-2xl text-green-600';
    
    if (state.phase === 'learning') {
      state.currentIndex++;
    } else {
      const [word, streak] = state.reviewQueue.shift();
      const newStreak = streak + 1;
      if (newStreak >= 3) {
        state.mistakes = state.mistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
        document.getElementById('ec-feedback').textContent = '✅ 连续3次正确，已移出错题库！';
      } else {
        const mistake = state.mistakes.find(m => m.english === word.english && m.chinese === word.chinese);
        if (mistake) mistake.streak = newStreak;
        state.reviewQueue.push([word, newStreak]);
      }
    }
    currentList.ecMistakes = state.mistakes;
    saveData();
    updateStats('review', { count: 1, correct: true });
    setTimeout(showECQuestion, 800);
  } else {
    document.getElementById('ec-feedback').textContent = `❌ 错误！正确答案是: ${state.correctAnswer}`;
    document.getElementById('ec-feedback').className = 'text-center text-2xl text-red-600';
    
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
    currentList.ecMistakes = state.mistakes;
    saveData();
    updateStats('review', { count: 1, correct: false });
    setTimeout(showECQuestion, 1500);
  }
}

function finishECTest() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  showModal('学习完成', '英译汉学习已全部完成！🎉', [
    { text: '返回首页', onClick: () => { hideModal(); goHome(); } }
  ]);
}

/** 播放当前单词发音 */
export function playECVoice() {
  const word = document.getElementById('ec-word').textContent;
  if (word) playVoice(word);
}

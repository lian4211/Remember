// ==================== 每日复习模块（基于 SM-2）====================
// 混合英译汉、汉译英、听写模式，只出到期单词

import { currentList, getDueWords, saveData } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { updateStats } from './stats.js';

let state = {
  dueWords: [],
  currentIndex: 0,
  correctAnswer: '',
  mode: 'ec',       // 'ec' | 'ce' | 'dictation'
  options: [],
  buttonsEnabled: true,
  startTime: 0,
  correctCount: 0,
  totalCount: 0
};

/** 开始每日复习 */
export function startReview() {
  if (!currentList) { showToast('请先选择一个列表'); return; }
  
  const due = getDueWords(currentList);
  if (due.length === 0) {
    showToast('没有需要复习的单词，太棒了！🎉');
    return;
  }
  
  state = {
    dueWords: [...due].sort(() => Math.random() - 0.5),
    currentIndex: 0,
    correctAnswer: '',
    mode: 'ec',
    options: [],
    buttonsEnabled: true,
    startTime: Date.now(),
    correctCount: 0,
    totalCount: due.length
  };
  goToPage('review');
  showReviewQuestion();
}

function showReviewQuestion() {
  document.getElementById('review-feedback').textContent = '';
  document.getElementById('review-feedback').className = 'text-center text-xl';
  state.buttonsEnabled = true;

  if (state.currentIndex >= state.dueWords.length) {
    finishReview();
    return;
  }

  const word = state.dueWords[state.currentIndex];
  
  // 随机选择出题模式
  const modes = ['ec', 'ce'];
  state.mode = modes[Math.floor(Math.random() * modes.length)];
  
  document.getElementById('review-progress').textContent = 
    `复习进度: ${state.currentIndex + 1}/${state.dueWords.length} | ✅${state.correctCount}`;

  const ecArea = document.getElementById('review-ec-area');
  const ceArea = document.getElementById('review-ce-area');
  const questionEl = document.getElementById('review-question-word');
  const modeLabel = document.getElementById('review-mode-label');
  
  // 显示单词详情
  const detail = document.getElementById('review-word-detail');
  if (detail) {
    let html = '';
    if (word.phonetic) html += `<span class="text-gray-400 text-sm mr-2">${word.phonetic}</span>`;
    if (word.example) html += `<p class="text-gray-500 text-xs italic">"${word.example}"</p>`;
    detail.innerHTML = html;
  }
  
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
  let choices;
  if (others.length >= 3) {
    choices = others.sort(() => Math.random() - 0.5).slice(0, 3);
  } else {
    choices = [...others, ...Array(3 - others.length).fill(0).map(() => allChinese[Math.floor(Math.random() * allChinese.length)])];
  }
  state.options = [...choices, word.chinese].sort(() => Math.random() - 0.5);
  state.correctAnswer = word.chinese;

  const optionsDiv = document.getElementById('review-ec-options');
  optionsDiv.innerHTML = '';
  state.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'w-full bg-white border border-gray-300 py-4 rounded-lg text-xl hover:bg-blue-50 transition';
    btn.textContent = option;
    btn.onclick = () => checkReviewEC(index);
    optionsDiv.appendChild(btn);
  });
}

/** 英译汉选择 */
function checkReviewEC(index) {
  if (!state.buttonsEnabled) return;
  state.buttonsEnabled = false;
  
  const word = state.dueWords[state.currentIndex];
  const selected = state.options[index];
  const isCorrect = selected === state.correctAnswer;
  
  sm2Answer(word, isCorrect);
  
  if (isCorrect) {
    state.correctCount++;
    document.getElementById('review-feedback').textContent = '✅ 正确！';
    document.getElementById('review-feedback').className = 'text-center text-xl text-green-600';
    state.currentIndex++;
    saveData();
    updateStats('review', { count: 1, correct: true });
    setTimeout(showReviewQuestion, 700);
  } else {
    document.getElementById('review-feedback').textContent = `❌ 正确答案: ${state.correctAnswer}`;
    document.getElementById('review-feedback').className = 'text-center text-xl text-red-600';
    state.currentIndex++;
    saveData();
    updateStats('review', { count: 1, correct: false });
    setTimeout(showReviewQuestion, 1200);
  }
}

/** 汉译英输入 */
export function checkReviewCE() {
  const input = document.getElementById('review-ce-input').value.trim().toLowerCase();
  if (!input) return;
  
  const word = state.dueWords[state.currentIndex];
  const isCorrect = input === word.english.toLowerCase();
  
  sm2Answer(word, isCorrect);
  
  if (isCorrect) {
    state.correctCount++;
    document.getElementById('review-feedback').textContent = '✅ 正确！';
    document.getElementById('review-feedback').className = 'text-center text-xl text-green-600';
    state.currentIndex++;
    saveData();
    updateStats('review', { count: 1, correct: true });
    setTimeout(showReviewQuestion, 700);
  } else {
    document.getElementById('review-feedback').textContent = `❌ 正确答案: ${word.english}`;
    document.getElementById('review-feedback').className = 'text-center text-xl text-red-600';
    state.currentIndex++;
    saveData();
    updateStats('review', { count: 1, correct: false });
    setTimeout(showReviewQuestion, 1200);
  }
}

export function handleReviewCEKeypress(e) {
  if (e.key === 'Enter') checkReviewCE();
}

function finishReview() {
  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  
  const accuracy = state.totalCount > 0 ? Math.round((state.correctCount / state.totalCount) * 100) : 0;
  showModal('复习完成', 
    `<div class="text-center">
      <p class="text-4xl mb-2">🎉</p>
      <p class="text-lg">正确率: ${state.correctCount}/${state.totalCount} (${accuracy}%)</p>
      <p class="text-sm text-gray-500 mt-1">用时: ${Math.floor(timeSpent / 60)}分${timeSpent % 60}秒</p>
    </div>`,
    [{ text: '返回首页', onClick: () => { hideModal(); goHome(); } }]
  );
}

/** 播放复习单词发音 */
export function playReviewVoice() {
  const word = state.dueWords[state.currentIndex];
  if (word) playVoice(word.english);
}

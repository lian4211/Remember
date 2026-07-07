// ==================== 收藏夹模块 ====================
// 查看收藏词汇 + 收藏夹独立测试

import { getStarredWords, toggleStar, saveData, data } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast } from './ui.js';
import { playVoice } from './voice.js';
import { sm2Answer } from './sm2.js';
import { fsrsAnswer } from './fsrs.js';
import { updateStats } from './stats.js';
import { showFlashcard } from './flashcard.js';

function safePlay(text) { try { playVoice(text); } catch(e) { console.log('TTS:', e); } }

// ==================== 收藏夹列表页 ====================

export function renderStarredPage() {
  const c = document.getElementById('starred-container');
  if (!c) return;

  const items = getStarredWords();

  if (items.length === 0) {
    c.innerHTML = `
      <div style="text-align:center;padding:2rem">
        <p style="font-size:2.5rem;margin-bottom:1rem">⭐</p>
        <p style="font-weight:600;margin-bottom:0.5rem">还没有收藏的单词</p>
        <p style="color:var(--text-secondary);font-size:0.875rem">
          在学习过程中点击单词旁的 ☆ 即可收藏
        </p>
      </div>`;
    return;
  }

  c.innerHTML = `
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem">
      <button id="starred-test-ec-btn" class="btn-primary" style="flex:1">▶ 英译汉测试</button>
      <button id="starred-test-ce-btn" class="btn-primary" style="flex:1">▶ 汉译英测试</button>
    </div>
    <p style="text-align:center;color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem">
      共 ${items.length} 个收藏单词
    </p>
    <div id="starred-list"></div>`;

  document.getElementById('starred-test-ec-btn').addEventListener('click', () => startStarredTest('ec'));
  document.getElementById('starred-test-ce-btn').addEventListener('click', () => startStarredTest('ce'));

  const listEl = document.getElementById('starred-list');
  listEl.innerHTML = items.map(({ word, list }) => `
    <div class="app-card starred-card" data-en="${esc(word.english)}" style="padding:0.75rem;margin-bottom:0.5rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <p style="font-weight:600">${esc(word.english)}</p>
          <p style="color:var(--text-secondary);font-size:0.9rem">${esc(word.chinese)}</p>
          <p style="color:var(--text-muted);font-size:0.7rem;margin-top:0.2rem">📂 ${esc(list.name)}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.25rem;margin-left:0.5rem;flex-shrink:0">
          <button class="btn-icon starred-play-btn" data-en="${esc(word.english)}" style="font-size:1.1rem;border:none;background:none;cursor:pointer" title="朗读">🔊</button>
          <button class="btn-icon starred-unstar-btn" data-en="${esc(word.english)}" data-cn="${esc(word.chinese)}" style="font-size:1.1rem;border:none;background:none;cursor:pointer" title="取消收藏">⭐</button>
        </div>
      </div>
    </div>`).join('');

  // 绑定朗读
  document.querySelectorAll('.starred-play-btn').forEach(btn => {
    btn.addEventListener('click', () => safePlay(btn.dataset.en));
  });
  // 绑定取消收藏
  document.querySelectorAll('.starred-unstar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const items2 = getStarredWords();
      const found = items2.find(i => i.word.english === btn.dataset.en && i.word.chinese === btn.dataset.cn);
      if (found) {
        toggleStar(found.word);
        renderStarredPage();
        showToast('已取消收藏');
      }
    });
  });
}

// ==================== 收藏夹测试 ====================

let starredTestState = null;

export function startStarredTest(mode) {
  const items = getStarredWords();
  if (items.length < 2) { showToast('收藏夹至少需要2个单词'); return; }

  starredTestState = {
    mode, // 'ec' | 'ce'
    items: [...items].sort(() => Math.random() - 0.5),
    index: 0,
    correctAnswer: '',
    options: [],
    buttonsEnabled: true,
    correctCount: 0,
    totalCount: items.length,
    startTime: Date.now()
  };

  // 跳转到测试页（复用现有的题型）
  if (mode === 'ec') {
    goToPage('ec');
    showStarredEC();
  } else {
    goToPage('ce');
    showStarredCE();
  }
}

function showStarredEC() {
  if (!starredTestState) return;
  const st = starredTestState;
  if (st.index >= st.items.length) { finishStarredTest(); return; }

  const { word } = st.items[st.index];
  st.correctAnswer = word.chinese;

  document.getElementById('ec-feedback').textContent = '';
  document.getElementById('ec-feedback').className = '';
  st.buttonsEnabled = true;
  document.getElementById('ec-test-area').classList.remove('hidden');
  document.getElementById('ec-flashcard-area').classList.add('hidden');

  document.getElementById('ec-word').textContent = word.english;
  document.getElementById('ec-progress').textContent =
    `⭐ 收藏夹测试 ${st.index + 1}/${st.items.length} | ✅${st.correctCount}`;

  const d = document.getElementById('ec-word-detail');
  if (d) d.innerHTML = word.phonetic
    ? `<span style="color:var(--text-muted);font-size:0.875rem;">${word.phonetic}</span>`
    : '';

  safePlay(word.english);

  // 从收藏单词中取干扰项
  const allChinese = [...new Set(st.items.map(i => i.word.chinese))];
  const others = allChinese.filter(c => c !== st.correctAnswer);
  let choices;
  if (others.length >= 3) {
    choices = others.sort(() => Math.random() - 0.5).slice(0, 3);
  } else {
    choices = [...others];
    while (choices.length < 3) {
      choices.push(allChinese[Math.floor(Math.random() * allChinese.length)]);
    }
  }
  st.options = [...choices, st.correctAnswer].sort(() => Math.random() - 0.5);

  const div = document.getElementById('ec-options');
  div.innerHTML = '';
  st.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn'; btn.textContent = opt;
    btn.onclick = () => checkStarredEC(i, btn);
    div.appendChild(btn);
  });
}

function checkStarredEC(index, btnEl) {
  if (!starredTestState || !starredTestState.buttonsEnabled) return;
  const st = starredTestState;
  st.buttonsEnabled = false;

  const isCorrect = st.options[index] === st.correctAnswer;

  document.querySelectorAll('#ec-options .option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (st.options[i] === st.correctAnswer) btn.classList.add('correct');
  });
  if (!isCorrect && btnEl) btnEl.classList.add('wrong');

  const { word } = st.items[st.index];
  if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
  else sm2Answer(word, isCorrect);

  const fb = document.getElementById('ec-feedback');
  if (isCorrect) {
    st.correctCount++;
    fb.textContent = '✅ 正确！'; fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });
  } else {
    fb.textContent = `❌ 正确答案: ${st.correctAnswer}`;
    fb.className = 'feedback-text feedback-wrong';
    updateStats('review', { count: 1, correct: false });
  }

  st.index++;
  saveData();
  setTimeout(() => {
    if (isCorrect) showStarredEC();
    else { flashcardStarred(word); }
  }, isCorrect ? 1500 : 2500);
}

function showStarredCE() {
  if (!starredTestState) return;
  const st = starredTestState;
  if (st.index >= st.items.length) { finishStarredTest(); return; }

  const { word } = st.items[st.index];
  st.correctAnswer = word.english;

  document.getElementById('ce-feedback').textContent = '';
  document.getElementById('ce-feedback').className = '';
  document.getElementById('ce-test-area').classList.remove('hidden');
  document.getElementById('ce-flashcard-area').classList.add('hidden');
  document.getElementById('ce-input').value = '';
  document.getElementById('ce-input').focus();

  document.getElementById('ce-word').textContent = word.chinese;
  document.getElementById('ce-progress').textContent =
    `⭐ 收藏夹测试 ${st.index + 1}/${st.items.length} | ✅${st.correctCount}`;

  const d = document.getElementById('ce-word-detail');
  if (d) d.innerHTML = word.phonetic
    ? `<span style="color:var(--text-muted);font-size:0.875rem;">${word.phonetic}</span>`
    : '';

  safePlay(word.english);
  document.getElementById('ce-submit-btn').textContent = '提交';
  // 替换提交处理为收藏夹版本
  document.getElementById('ce-submit-btn').onclick = checkStarredCE;
  document.getElementById('ce-input').onkeypress = (e) => {
    if (e.key === 'Enter') checkStarredCE();
  };
}

function checkStarredCE() {
  if (!starredTestState || !starredTestState.buttonsEnabled) return;
  const input = document.getElementById('ce-input').value.trim().toLowerCase();
  if (!input) return;

  const st = starredTestState;
  st.buttonsEnabled = false;
  const { word } = st.items[st.index];
  const isCorrect = input === st.correctAnswer.toLowerCase();

  if (data.algorithm === 'fsrs') fsrsAnswer(word, isCorrect);
  else sm2Answer(word, isCorrect);

  const fb = document.getElementById('ce-feedback');
  if (isCorrect) {
    st.correctCount++;
    fb.textContent = '✅ 正确！'; fb.className = 'feedback-text feedback-correct';
    updateStats('review', { count: 1, correct: true });
    st.index++;
    saveData();
    setTimeout(showStarredCE, 1500);
  } else {
    fb.textContent = `❌ 正确答案: ${st.correctAnswer}`;
    fb.className = 'feedback-text feedback-wrong';
    updateStats('review', { count: 1, correct: false });
    st.index++;
    saveData();
    setTimeout(() => flashcardStarred(word), 2500);
  }
}

function flashcardStarred(word) {
  const areaId = starredTestState?.mode === 'ec' ? 'ec' : 'ce';
  document.getElementById(`${areaId}-test-area`).classList.add('hidden');
  document.getElementById(`${areaId}-flashcard-area`).classList.remove('hidden');
  document.getElementById(`${areaId}-feedback`).textContent = '';
  document.getElementById(`${areaId}-feedback`).className = '';

  const fullWord = word; // word from starred items is the actual word object
  showFlashcard(fullWord, document.getElementById(`${areaId}-flashcard-area`), () => {
    if (starredTestState?.mode === 'ec') showStarredEC();
    else showStarredCE();
  });
}

function finishStarredTest() {
  if (!starredTestState) return;
  const timeSpent = Math.round((Date.now() - starredTestState.startTime) / 1000);
  updateStats('time', { seconds: timeSpent });
  const pct = starredTestState.totalCount > 0
    ? Math.round((starredTestState.correctCount / starredTestState.totalCount) * 100) : 0;
  showModal('收藏夹测试完成',
    `<div style="text-align:center">
      <p style="font-size:2.5rem;margin-bottom:0.5rem">⭐</p>
      <p style="font-size:1.125rem">正确率: ${starredTestState.correctCount}/${starredTestState.totalCount} (${pct}%)</p>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem">用时: ${Math.floor(timeSpent/60)}分${timeSpent%60}秒</p>
    </div>`,
    [{ text: '返回收藏夹', onClick: () => { hideModal(); goToPage('starred'); } }]
  );
  starredTestState = null;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

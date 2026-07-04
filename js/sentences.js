// ==================== 长难句背诵模块 ====================

import { showToast, goToPage } from './ui.js';
import { playVoice } from './voice.js';

const STORAGE_KEY = 'sentence_progress';
const API_KEY = 'sentence_data';

let sentencesData = null;
let progress = {};
let studyState = null;

/** 加载长难句数据 */
async function loadSentences() {
  if (sentencesData) return sentencesData;
  try {
    const resp = await fetch('data/sentences.json');
    const data = await resp.json();
    sentencesData = data.sentences;
    return sentencesData;
  } catch (e) {
    console.error('加载长难句数据失败', e);
    return [];
  }
}

/** 加载学习进度 */
function loadProgress() {
  try {
    progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { progress = {}; }
}

/** 保存学习进度 */
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** 获取句子进度 */
function getProgress(sid) {
  return progress[sid] || { starred: false, mastered: false, reviewCount: 0 };
}

/** 更新句子进度 */
function updateProgress(sid, updates) {
  const cur = getProgress(sid);
  progress[sid] = { ...cur, ...updates };
  saveProgress();
}

// ==================== 列表页 ====================

export async function renderSentencesPage() {
  const c = document.getElementById('sentences-container');
  if (!c) return;

  const sentences = await loadSentences();
  loadProgress();

  if (!sentences.length) {
    c.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-top:2rem">暂无长难句数据</p>';
    return;
  }

  // 过滤栏
  const filterBar = `
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
      <button id="s-filter-all" class="btn-ghost" style="flex:1;font-weight:700;color:var(--primary)">全部</button>
      <button id="s-filter-starred" class="btn-ghost" style="flex:1">⭐ 收藏</button>
      <button id="s-filter-review" class="btn-ghost" style="flex:1">🔄 待复习</button>
      <button id="s-study-btn" class="btn-primary" style="flex:1">▶ 开始学习</button>
    </div>`;

  c.innerHTML = filterBar + '<div id="sentences-list"></div>';

  // 绑定过滤
  document.getElementById('s-filter-all').addEventListener('click', () => renderSentenceCards('all'));
  document.getElementById('s-filter-starred').addEventListener('click', () => renderSentenceCards('starred'));
  document.getElementById('s-filter-review').addEventListener('click', () => renderSentenceCards('review'));
  document.getElementById('s-study-btn').addEventListener('click', () => startStudy());

  renderSentenceCards('all');
}

let currentFilter = 'all';

function renderSentenceCards(filter) {
  currentFilter = filter;
  const c = document.getElementById('sentences-list');
  if (!c) return;

  let list = sentencesData;
  if (filter === 'starred') list = list.filter(s => getProgress(s.id).starred);
  else if (filter === 'review') list = list.filter(s => getProgress(s.id).reviewCount > 0 && !getProgress(s.id).mastered);

  // 更新按钮高亮
  const btns = ['all', 'starred', 'review'];
  btns.forEach(f => {
    const btn = document.getElementById(`s-filter-${f}`);
    if (btn) {
      btn.style.fontWeight = f === filter ? '700' : '400';
      btn.style.color = f === filter ? 'var(--primary)' : 'var(--text-secondary)';
    }
  });

  if (!list.length) {
    c.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-top:1rem">这里还没有句子</p>';
    return;
  }

  c.innerHTML = list.map(s => {
    const p = getProgress(s.id);
    const starIcon = p.starred ? '⭐' : '☆';
    const statusIcon = p.mastered ? '✅' : (p.reviewCount > 0 ? '🔄' : '⬜');
    return `
      <div class="app-card sent-card" data-id="${s.id}" style="padding:0.75rem;margin-bottom:0.5rem;cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:0.25rem;margin-bottom:0.25rem">
              <span class="badge badge-primary">#${s.id}</span>
              <span style="font-size:0.7rem;color:var(--text-muted)">${s.source}</span>
            </div>
            <p class="sent-english" style="font-weight:500;line-height:1.5">${esc(s.english)}</p>
            <p class="sent-chinese hidden" style="color:var(--text-secondary);font-size:0.9rem;margin-top:0.25rem">${esc(s.chinese)}</p>
            ${s.vocab.length ? `<div class="sent-vocab hidden" style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.25rem">${s.vocab.map(v => `<span class="badge badge-info">${esc(v.word)} ${esc(v.meaning)}</span>`).join('')}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.25rem;margin-left:0.5rem;flex-shrink:0">
            <button class="btn-icon sent-play-btn" data-id="${s.id}" style="font-size:1.1rem" title="朗读">🔊</button>
            <button class="btn-icon sent-star-btn" data-id="${s.id}" style="font-size:1.1rem;border:none;background:none;cursor:pointer" title="收藏">${starIcon}</button>
            <span style="font-size:0.85rem">${statusIcon}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  // 绑定事件
  document.querySelectorAll('.sent-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sent-play-btn') || e.target.closest('.sent-star-btn')) return;
      card.querySelector('.sent-chinese').classList.toggle('hidden');
      card.querySelector('.sent-vocab')?.classList.toggle('hidden');
    });
  });

  document.querySelectorAll('.sent-play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const s = sentencesData.find(x => x.id === id);
      if (s) playVoice(s.english);
    });
  });

  document.querySelectorAll('.sent-star-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const p = getProgress(id);
      const newStarred = !p.starred;
      updateProgress(id, { starred: newStarred });
      btn.textContent = newStarred ? '⭐' : '☆';
      showToast(newStarred ? '已收藏' : '取消收藏');
    });
  });
}

// ==================== 学习模式 ====================

/** 开始学习 */
export async function startStudy(filterType) {
  const sentences = await loadSentences();
  loadProgress();

  // 根据当前过滤决定学习内容
  let list = [...sentences];
  if (filterType === 'starred') list = list.filter(s => getProgress(s.id).starred);
  else if (filterType === 'review') list = list.filter(s => getProgress(s.id).reviewCount > 0 && !getProgress(s.id).mastered);

  if (!list.length) {
    showToast('没有可学习的句子');
    return;
  }

  studyState = {
    list,
    index: 0,
    revealChinese: false
  };

  goToPage('sentence-study');
  renderStudyCard();
}

function renderStudyCard() {
  if (!studyState || !studyState.list.length) return;

  const s = studyState.list[studyState.index];
  const total = studyState.list.length;
  const p = getProgress(s.id);

  document.getElementById('study-progress').textContent = `第 ${studyState.index + 1}/${total} 句`;

  let statusIcons = '';
  if (p.mastered) statusIcons = '✅ 已掌握';
  else if (p.reviewCount > 0) statusIcons = `🔄 已复习${p.reviewCount}次`;

  const area = document.getElementById('study-test-area');
  area.innerHTML = `
    <div class="app-card" style="padding:1.25rem;margin-bottom:1rem">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
        <span class="badge badge-primary">#${s.id}</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">${s.source}</span>
        ${statusIcons ? `<span style="font-size:0.75rem">${statusIcons}</span>` : ''}
      </div>

      <div style="text-align:center;margin-bottom:1rem">
        <p style="font-size:1.1rem;font-weight:600;line-height:1.6;margin-bottom:0.5rem">${esc(s.english)}</p>
        <button id="study-play-main" class="btn-icon" style="font-size:1.5rem">🔊</button>
      </div>

      <div id="study-translation-area" style="text-align:center;margin-bottom:1rem">
        ${studyState.revealChinese ? `<p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.5">${esc(s.chinese)}</p>` : ''}
      </div>

      ${s.vocab.length ? `
      <div id="study-vocab-area" style="margin-bottom:1rem">
        <p style="font-weight:600;font-size:0.85rem;margin-bottom:0.5rem;color:var(--text-secondary)">核心词汇</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
          ${s.vocab.map(v => `<span class="badge badge-info">${esc(v.word)} ${esc(v.meaning)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  // 操作区
  const nav = document.getElementById('study-nav-area');
  if (studyState.revealChinese) {
    nav.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;width:100%">
        <button id="study-mastered-btn" class="btn-primary">✅ 已掌握</button>
        <button id="study-review-btn" class="btn-ghost">🔄 还需复习</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;width:100%;margin-top:0.5rem">
        <button id="study-prev-btn" class="btn-ghost" ${studyState.index === 0 ? 'disabled style="opacity:0.3"' : ''}>◀ 上一句</button>
        <button id="study-star-btn" class="btn-ghost">${p.starred ? '⭐ 取消收藏' : '☆ 收藏'}</button>
        <button id="study-next-btn" class="btn-primary">下一句 ▶</button>
      </div>`;
  } else {
    nav.innerHTML = `
      <button id="study-reveal-btn" class="btn-primary" style="width:100%">👁 显示中文翻译</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;width:100%;margin-top:0.5rem">
        <button id="study-prev-btn" class="btn-ghost" ${studyState.index === 0 ? 'disabled style="opacity:0.3"' : ''}>◀ 上一句</button>
        <button id="study-next-btn" class="btn-ghost">跳过 ▶</button>
      </div>`;
  }

  // 绑定事件
  document.getElementById('study-play-main')?.addEventListener('click', () => playVoice(s.english));

  if (studyState.revealChinese) {
    document.getElementById('study-mastered-btn')?.addEventListener('click', () => {
      updateProgress(s.id, { mastered: true, reviewCount: 0 });
      showToast('标记为已掌握');
      nextStudyCard();
    });
    document.getElementById('study-review-btn')?.addEventListener('click', () => {
      updateProgress(s.id, { reviewCount: (p.reviewCount || 0) + 1, mastered: false });
      showToast('标记为需复习');
      nextStudyCard();
    });
    document.getElementById('study-star-btn')?.addEventListener('click', () => {
      const np = !p.starred;
      updateProgress(s.id, { starred: np });
      showToast(np ? '已收藏' : '取消收藏');
      renderStudyCard(); // 刷新状态
    });
  } else {
    document.getElementById('study-reveal-btn')?.addEventListener('click', () => {
      studyState.revealChinese = true;
      renderStudyCard();
    });
  }

  document.getElementById('study-prev-btn')?.addEventListener('click', () => {
    if (studyState.index > 0) {
      studyState.index--;
      studyState.revealChinese = false;
      renderStudyCard();
    }
  });

  document.getElementById('study-next-btn')?.addEventListener('click', () => nextStudyCard());
}

function nextStudyCard() {
  if (!studyState) return;
  if (studyState.index < studyState.list.length - 1) {
    studyState.index++;
    studyState.revealChinese = false;
    renderStudyCard();
  } else {
    // 学习完成
    const area = document.getElementById('study-test-area');
    const nav = document.getElementById('study-nav-area');
    document.getElementById('study-progress').textContent = '';
    area.innerHTML = `
      <div class="app-card" style="padding:2rem;text-align:center">
        <p style="font-size:2rem;margin-bottom:1rem">🎉</p>
        <p style="font-size:1.125rem;font-weight:600;margin-bottom:0.5rem">学习完成！</p>
        <p style="color:var(--text-secondary);font-size:0.9rem">共学习了 ${studyState.list.length} 句</p>
      </div>`;
    nav.innerHTML = `<button id="study-back-btn" class="btn-primary" style="width:100%;margin-top:0.5rem">← 返回列表</button>`;
    document.getElementById('study-back-btn')?.addEventListener('click', () => goToPage('sentences'));
    studyState = null;
  }
}

// ==================== 工具 ====================
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ==================== 学习统计模块 (v2) ====================
// passed-based 统计：只有通过(passed==true)才算已学习

import { data, saveData, todayStr, getMastery } from './data.js';

function getTodayStats() {
  const today = todayStr();
  if (!data.stats.daily[today]) data.stats.daily[today] = { newWords: 0, reviews: 0, correct: 0, timeSpent: 0 };
  return data.stats.daily[today];
}

/** 更新统计数据 */
export function updateStats(type, extra = {}) {
  const today = todayStr();
  const stats = getTodayStats();
  switch (type) {
    case 'new-word': stats.newWords = (stats.newWords || 0) + (extra.count || 1); break;
    case 'review': stats.reviews = (stats.reviews || 0) + (extra.count || 1); if (extra.correct) stats.correct = (stats.correct || 0) + 1; break;
    case 'time': stats.timeSpent = (stats.timeSpent || 0) + (extra.seconds || 0); break;
  }
  updateStreak(today);
  saveData();
}

function updateStreak(today) {
  if (!data.stats.lastStudyDate) { data.stats.streak = 1; data.stats.lastStudyDate = today; return; }
  if (data.stats.lastStudyDate === today) return;
  const diff = Math.round((new Date(today) - new Date(data.stats.lastStudyDate)) / 86400000);
  data.stats.streak = diff === 1 ? data.stats.streak + 1 : 1;
  data.stats.lastStudyDate = today;
}

export function getRecentStats(days = 7) {
  const res = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const s = data.stats.daily[key] || { newWords: 0, reviews: 0, correct: 0, timeSpent: 0 };
    res.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, ...s });
  }
  return res;
}

export function getTodayStatsData() {
  return data.stats.daily[todayStr()] || { newWords: 0, reviews: 0, correct: 0, timeSpent: 0 };
}

export function getStreak() { return data.stats.streak || 0; }

export function formatTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

/** 获取总的已通过单词数 */
export function getTotalPassed() {
  let count = 0;
  data.lists.forEach(l => l.words.forEach(w => { if (w.passed) count++; }));
  return count;
}

export function renderStatsPage() {
  const ts = getTodayStatsData();
  document.getElementById('stats-today-new').textContent = ts.newWords || 0;
  document.getElementById('stats-today-review').textContent = ts.reviews || 0;
  const tot = ts.reviews || 0, cor = ts.correct || 0;
  document.getElementById('stats-today-accuracy').textContent = tot > 0 ? Math.round((cor / tot) * 100) + '%' : '0%';
  document.getElementById('stats-today-time').textContent = formatTime(ts.timeSpent || 0);
  document.getElementById('stats-streak').textContent = getStreak();
  document.getElementById('stats-total-passed').textContent = getTotalPassed();
  renderChart(getRecentStats(7));
  renderMasteryList();
}

function renderChart(recent) {
  const canvas = document.getElementById('stats-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (window._statsChart) window._statsChart.destroy();
  const ctx = canvas.getContext('2d');
  window._statsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: recent.map(s => s.label),
      datasets: [
        { label: '新词', data: recent.map(s => s.newWords), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.3 },
        { label: '复习', data: recent.map(s => s.reviews), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

function renderMasteryList() {
  const c = document.getElementById('stats-mastery-list');
  if (!c) return;
  if (data.lists.length === 0) { c.innerHTML = '<p style="color:var(--text-muted);text-align:center">暂无列表</p>'; return; }
  c.innerHTML = data.lists.map(l => {
    const m = getMastery(l);
    return `<div style="margin-bottom:0.75rem">
      <div style="display:flex;justify-content:space-between;font-size:0.875rem;margin-bottom:0.25rem">
        <span>${l.name}</span><span style="color:var(--text-secondary)">${m.mastered}/${m.total} (${m.percent}%)</span>
      </div>
      <div style="background:var(--border);border-radius:999px;height:6px">
        <div class="progress-bar" style="width:${m.percent}%;height:6px;border-radius:999px;background:var(--primary)"></div>
      </div>
    </div>`;
  }).join('');
}

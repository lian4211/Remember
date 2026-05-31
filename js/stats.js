// ==================== 学习统计模块 ====================

import { data, saveData, todayStr, getMastery } from './data.js';

/** 获取今日统计（不存在则创建空记录） */
function getTodayStats() {
  const today = todayStr();
  if (!data.stats.daily[today]) {
    data.stats.daily[today] = { newWords: 0, reviews: 0, correct: 0, timeSpent: 0 };
  }
  return data.stats.daily[today];
}

/** 更新统计数据 */
export function updateStats(type, extra = {}) {
  const today = todayStr();
  const stats = getTodayStats();
  
  switch (type) {
    case 'new-word':
      stats.newWords = (stats.newWords || 0) + (extra.count || 1);
      break;
    case 'review':
      stats.reviews = (stats.reviews || 0) + (extra.count || 1);
      if (extra.correct) stats.correct = (stats.correct || 0) + 1;
      break;
    case 'test':
      stats.reviews = (stats.reviews || 0) + (extra.total || 0);
      stats.correct = (stats.correct || 0) + (extra.correct || 0);
      break;
    case 'time':
      stats.timeSpent = (stats.timeSpent || 0) + (extra.seconds || 0);
      break;
  }
  
  // 更新连续打卡
  updateStreak(today);
  
  saveData();
}

/** 更新连续打卡天数 */
function updateStreak(today) {
  if (!data.stats.lastStudyDate) {
    data.stats.streak = 1;
    data.stats.lastStudyDate = today;
    return;
  }
  
  if (data.stats.lastStudyDate === today) return; // 今天已经打过卡
  
  const lastDate = new Date(data.stats.lastStudyDate);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    data.stats.streak += 1;
  } else if (diffDays > 1) {
    data.stats.streak = 1; // 断了
  }
  
  data.stats.lastStudyDate = today;
}

/** 获取近 N 天的统计数据数组 */
export function getRecentStats(days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayStats = data.stats.daily[key] || { newWords: 0, reviews: 0, correct: 0, timeSpent: 0 };
    result.push({
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      ...dayStats
    });
  }
  return result;
}

/** 获取今日统计 */
export function getTodayStatsData() {
  const today = todayStr();
  return data.stats.daily[today] || { newWords: 0, reviews: 0, correct: 0, timeSpent: 0 };
}

/** 获取连续打卡天数 */
export function getStreak() {
  return data.stats.streak || 0;
}

/** 格式化时间（秒 → mm:ss） */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 渲染统计页面 */
export function renderStatsPage() {
  const todayStats = getTodayStatsData();
  const streak = getStreak();
  const recentStats = getRecentStats(7);
  
  // 今日概览
  document.getElementById('stats-today-new').textContent = todayStats.newWords || 0;
  document.getElementById('stats-today-review').textContent = todayStats.reviews || 0;
  
  const total = todayStats.reviews || 0;
  const correct = todayStats.correct || 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  document.getElementById('stats-today-accuracy').textContent = accuracy + '%';
  document.getElementById('stats-today-time').textContent = formatTime(todayStats.timeSpent || 0);
  document.getElementById('stats-streak').textContent = streak;
  
  // 折线图（使用 Chart.js）
  renderChart(recentStats);
  
  // 列表掌握度
  renderMasteryList();
}

/** 渲染 Chart.js 折线图 */
function renderChart(recentStats) {
  const canvas = document.getElementById('stats-chart');
  if (!canvas) return;
  
  // 如果已有图表实例，先销毁
  if (window._statsChart) {
    window._statsChart.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  window._statsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: recentStats.map(s => s.label),
      datasets: [
        {
          label: '新词',
          data: recentStats.map(s => s.newWords),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: '复习',
          data: recentStats.map(s => s.reviews),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

/** 渲染列表掌握度 */
function renderMasteryList() {
  const container = document.getElementById('stats-mastery-list');
  if (!container) return;
  
  if (data.lists.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">暂无列表</p>';
    return;
  }
  
  container.innerHTML = data.lists.map(list => {
    const m = getMastery(list);
    return `
      <div class="mb-3">
        <div class="flex justify-between text-sm mb-1">
          <span>${list.name}</span>
          <span class="text-gray-500">${m.mastered}/${m.total} (${m.percent}%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full progress-bar" style="width:${m.percent}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

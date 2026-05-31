// ==================== 学习计划模块 ====================

import { data, saveData, todayStr } from './data.js';
import { showModal, hideModal, showToast } from './ui.js';

/** 设置/更新学习计划 */
export function showPlanSettings() {
  const current = data.plan || { totalWords: 0, startDate: null, dailyNew: 0 };
  
  showModal('学习计划',
    `<div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">目标单词总数</label>
        <input type="number" id="plan-total" class="w-full p-2 border rounded-lg" value="${current.totalWords || 500}" min="30" max="10000">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">计划天数</label>
        <input type="number" id="plan-days" class="w-full p-2 border rounded-lg" value="${current.dailyNew ? Math.ceil(current.totalWords / current.dailyNew) : 30}" min="7" max="365">
      </div>
      <p id="plan-preview" class="text-sm text-gray-500"></p>
    </div>`,
    [
      { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '保存', onClick: savePlan, className: 'px-4 py-2 rounded-lg bg-blue-600 text-white' }
    ]
  );
  
  // 实时预览
  setTimeout(() => {
    const totalEl = document.getElementById('plan-total');
    const daysEl = document.getElementById('plan-days');
    const previewEl = document.getElementById('plan-preview');
    const update = () => {
      const total = parseInt(totalEl.value) || 0;
      const days = parseInt(daysEl.value) || 30;
      const daily = Math.ceil(total / days);
      previewEl.textContent = `预计每天需学习 ${daily} 个新单词`;
    };
    totalEl.addEventListener('input', update);
    daysEl.addEventListener('input', update);
    update();
  }, 100);
}

function savePlan() {
  const total = parseInt(document.getElementById('plan-total').value) || 500;
  const days = parseInt(document.getElementById('plan-days').value) || 30;
  const dailyNew = Math.ceil(total / days);
  
  data.plan = {
    totalWords: total,
    startDate: todayStr(),
    dailyNew
  };
  saveData();
  hideModal();
  showToast(`计划已保存：每天 ${dailyNew} 个新单词`);
  window.dispatchEvent(new CustomEvent('data-changed'));
}

/** 获取计划进度信息 */
export function getPlanProgress() {
  const plan = data.plan;
  if (!plan || !plan.totalWords || !plan.startDate) return null;
  
  // 计算已过去天数
  const start = new Date(plan.startDate);
  const today = new Date(todayStr());
  const elapsedDays = Math.max(1, Math.round((today - start) / (1000 * 60 * 60 * 24)) + 1);
  const expectedWords = Math.min(plan.totalWords, elapsedDays * plan.dailyNew);
  
  // 统计总新词数
  let totalLearned = 0;
  data.lists.forEach(list => {
    totalLearned += list.words.length;
  });
  
  return {
    total: plan.totalWords,
    learned: totalLearned,
    expected: expectedWords,
    dailyNew: plan.dailyNew,
    percent: Math.min(100, Math.round((totalLearned / plan.totalWords) * 100)),
    onTrack: totalLearned >= expectedWords
  };
}

/** 渲染计划进度到首页 */
export function renderPlanProgress() {
  const container = document.getElementById('plan-progress-area');
  if (!container) return;
  
  const progress = getPlanProgress();
  if (!progress) {
    container.innerHTML = `
      <div class="bg-white rounded-lg p-4 border border-gray-200 mb-4">
        <p class="text-gray-500 text-center">尚未设置学习计划</p>
        <button id="setup-plan-btn-home" class="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg">设置30天学习计划</button>
      </div>`;
    document.getElementById('setup-plan-btn-home').addEventListener('click', showPlanSettings);
    return;
  }
  
  container.innerHTML = `
    <div class="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <div class="flex justify-between items-center mb-2">
        <span class="font-medium">📅 学习计划</span>
        <button id="edit-plan-btn" class="text-sm text-blue-600">修改</button>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div class="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full progress-bar" style="width:${progress.percent}%"></div>
      </div>
      <div class="flex justify-between text-sm text-gray-600">
        <span>已学 ${progress.learned}/${progress.total} (${progress.percent}%)</span>
        <span>${progress.onTrack ? '✅ 进度正常' : '⚠️ 进度落后'}</span>
      </div>
      <p class="text-xs text-gray-500 mt-1">今日目标新词：${progress.dailyNew} | 预期进度：${progress.expected}/${progress.total}</p>
    </div>`;
  
  document.getElementById('edit-plan-btn').addEventListener('click', showPlanSettings);
}

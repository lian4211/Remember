// ==================== 全局设置模块 ====================
// 算法切换、主题管理

import { data, saveData, resetAlgorithmData } from './data.js';
import { showToast } from './ui.js';

/** 切换算法（sm2 ↔ fsrs），重置所有复习数据 */
export function switchAlgorithm(to) {
  if (data.algorithm === to) return;
  data.algorithm = to;
  resetAlgorithmData();
  saveData();
  showToast(`已切换至 ${to === 'fsrs' ? 'FSRS' : 'SM-2'} 算法，复习数据已重置`);
  window.dispatchEvent(new CustomEvent('data-changed'));
}

/** 获取当前算法名称 */
export function getAlgorithmLabel() {
  return data.algorithm === 'fsrs' ? 'FSRS' : 'SM-2';
}

// ==================== 主题管理 ====================

const THEME_KEY = 'wordLearnerTheme';

/** 应用主题 */
export function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/** 初始化主题 */
export function initTheme() {
  // 优先从独立 localStorage 读取（兼容旧数据）
  const saved = localStorage.getItem(THEME_KEY) || data.theme || 'auto';
  data.theme = saved;
  applyTheme(saved);

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (data.theme === 'auto') {
      applyTheme('auto');
    }
  });
}

/** 设置主题并保存 */
export function setTheme(theme) {
  data.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  saveData();
}

/** 获取当前主题 */
export function getTheme() {
  return data.theme || 'auto';
}

/** 切换深色/浅色（三态循环：auto→dark→light→auto） */
export function cycleTheme() {
  const map = { auto: 'dark', dark: 'light', light: 'auto' };
  setTheme(map[getTheme()] || 'auto');
}

/** 获取主题图标 */
export function getThemeIcon() {
  const effective = document.documentElement.getAttribute('data-theme');
  return effective === 'dark' ? '☀️' : '🌙';
}

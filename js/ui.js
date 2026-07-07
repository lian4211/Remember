// ==================== UI 工具模块 ====================
// DOM 操作：页面导航、弹窗、Toast、模板渲染

/** 页面标题映射 */
const PAGE_TITLES = {
  'home': '单词背诵助手',
  'add-word': '添加单词',
  'word-list': '单词列表',
  'ec': '英译汉',
  'ce': '汉译英',
  'mistakes': '错题库',
  'voice-settings': '语音设置',
  'stats': '学习统计',
  'review': '今日复习',
  'roots': '词根分组',
  'plan': '学习计划',
  'settings': '设置',
  'quiz-list': '试题测试',
  'quiz-test': '答题中',
  'java-crash': '☕ Java速成',
  'java-mistakes': 'Java错题库',
  'sentences': '长难句',
  'sentence-study': '长难句学习',
  'starred': '⭐ 收藏夹'
};

/** 切换到指定页面 */
export function goToPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`${pageName}-page`);
  if (pageEl) pageEl.classList.add('active');
  
  const backBtn = document.getElementById('back-btn');
  if (pageName === 'home') {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = '';
  }
  
  document.getElementById('page-title').textContent = PAGE_TITLES[pageName] || '单词背诵助手';
  
  // 返回事件回调注册
  window._onPageEnter && window._onPageEnter(pageName);
}

/** 返回首页 */
export function goHome() {
  goToPage('home');
}

/** 显示模态弹窗 */
export function showModal(title, content, buttons) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = content;
  const buttonsDiv = document.getElementById('modal-buttons');
  buttonsDiv.innerHTML = '';
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.className = 'px-4 py-2 rounded-lg bg-blue-600 text-white';
    if (btn.className) button.className = btn.className;
    button.textContent = btn.text;
    button.onclick = btn.onClick;
    buttonsDiv.appendChild(button);
  });
  document.getElementById('modal').classList.remove('hidden');
}

/** 隐藏模态弹窗 */
export function hideModal() {
  document.getElementById('modal').classList.add('hidden');
}

/** 显示 Toast 提示 */
export function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

/** 完成测试的弹窗 */
export function finishTest(type) {
  showModal('学习完成', `${type}学习已全部完成！🎉`, [
    { text: '返回首页', onClick: () => { hideModal(); goHome(); } }
  ]);
}

/** 确认对话框 */
export function confirmDialog(title, message, onConfirm) {
  showModal(title, `<p>${message}</p>`, [
    { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
    { text: '确认', onClick: () => { hideModal(); onConfirm(); }, className: 'px-4 py-2 rounded-lg bg-red-600 text-white' }
  ]);
}

/** HTML 转义（防 XSS） */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** 注册页面进入回调 */
export function onPageEnter(fn) {
  window._onPageEnter = fn;
}

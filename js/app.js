// ==================== 应用主入口 ====================
// 负责初始化、全局事件绑定、页面路由

import { data, loadData, saveData, currentList, setCurrentList, addWord, renameList, deleteList, getDueCount } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast, onPageEnter } from './ui.js';
import { initVoiceSettings, playVoice } from './voice.js';
import { startECTest, playECVoice } from './test-ec.js';
import { startCETest, handleCESubmit, handleCEKeypress, playCEVoice } from './test-ce.js';
import { startReview, checkReviewCE, handleReviewCEKeypress, playReviewVoice } from './review.js';
import { updateStats, renderStatsPage } from './stats.js';
import { showPasteImport, showFileImport, showBatchEdit } from './import.js';
import { fetchWordInfo, analyzeRoots } from './dictionary.js';
import { showPlanSettings, renderPlanProgress, getPlanProgress } from './plan.js';

// ==================== 初始化 ====================
function init() {
  loadData();
  initVoiceSettings();
  bindEvents();
  renderHomePage();
  registerServiceWorker();
}

// ==================== 事件绑定 ====================
function bindEvents() {
  // 返回按钮
  document.getElementById('back-btn').addEventListener('click', goHome);

  // 列表选择
  const listSelect = document.getElementById('list-select');
  listSelect.addEventListener('change', (e) => {
    const id = parseInt(e.target.value);
    setCurrentList(data.lists.find(l => l.id === id) || null);
  });

  // 新建列表
  document.getElementById('new-list-btn').addEventListener('click', () => {
    showModal('新建单词列表',
      '<input type="text" id="new-list-name" class="w-full p-2 border rounded-lg" placeholder="输入列表名称">',
      [
        { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
        { text: '创建', onClick: () => {
          const name = document.getElementById('new-list-name').value.trim();
          if (!name) return;
          if (data.lists.some(l => l.name === name)) { showToast('列表名称已存在'); return; }
          const list = { id: data.nextId++, name, words: [], ecMistakes: [], ceMistakes: [] };
          data.lists.push(list);
          setCurrentList(list);
          saveData();
          refreshListSelect();
          hideModal();
          showToast('列表创建成功');
        }, className: 'px-4 py-2 rounded-lg bg-blue-600 text-white' }
      ]
    );
  });

  // 编辑/删除列表
  document.getElementById('edit-list-btn').addEventListener('click', () => {
    if (!currentList) { showToast('请先选择一个列表'); return; }
    showModal('修改列表名称',
      `<input type="text" id="edit-list-name" class="w-full p-2 border rounded-lg" value="${currentList.name}">`,
      [
        { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
        { text: '保存', onClick: () => {
          const newName = document.getElementById('edit-list-name').value.trim();
          if (!newName) return;
          if (data.lists.some(l => l.name === newName && l.id !== currentList.id)) { showToast('列表名称已存在'); return; }
          renameList(currentList, newName);
          refreshListSelect();
          hideModal();
          showToast('列表名称已修改');
        }, className: 'px-4 py-2 rounded-lg bg-blue-600 text-white' }
      ]
    );
  });

  document.getElementById('delete-list-btn').addEventListener('click', () => {
    if (!currentList) { showToast('请先选择一个列表'); return; }
    showModal('确认删除', `确定要删除列表"${currentList.name}"吗？\n所有单词和错题数据将永久丢失！`,
      [
        { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
        { text: '删除', onClick: () => {
          deleteList(currentList);
          setCurrentList(data.lists[0] || null);
          refreshListSelect();
          hideModal();
          showToast('列表已删除');
        }, className: 'px-4 py-2 rounded-lg bg-red-600 text-white' }
      ]
    );
  });

  // 添加单词
  document.getElementById('add-word-btn').addEventListener('click', () => {
    const english = document.getElementById('english-input').value.trim();
    const chinese = document.getElementById('chinese-input').value.trim();
    if (!english || !chinese) { showToast('请填写完整信息'); return; }
    if (!currentList) { showToast('请先选择一个列表'); return; }
    
    addWord(currentList, english, chinese);
    updateStats('new-word', { count: 1 });
    refreshListSelect();
    updateAddWordUI();
    document.getElementById('english-input').value = '';
    document.getElementById('chinese-input').value = '';
    showToast('单词添加成功');
  });

  // 查找按钮（添加单词时查询词典）
  const lookupBtn = document.getElementById('lookup-btn');
  if (lookupBtn) {
    lookupBtn.addEventListener('click', async () => {
      const english = document.getElementById('english-input').value.trim();
      if (!english) { showToast('请先输入英文单词'); return; }
      const info = await fetchWordInfo(english);
      if (info) {
        if (info.phonetic) {
          document.getElementById('lookup-phonetic').textContent = info.phonetic;
        }
        if (info.example) {
          document.getElementById('lookup-example').textContent = `"${info.example}"`;
        }
        showToast('已获取词典信息');
      } else {
        showToast('未找到该单词');
      }
    });
  }

  // 数据变更监听（列表选择器刷新）
  window.addEventListener('data-changed', () => {
    refreshListSelect();
    renderHomePage();
  });

  // 页面进入回调
  onPageEnter((pageName) => {
    if (pageName === 'add-word') updateAddWordUI();
    else if (pageName === 'word-list') renderWordListPage('');
    else if (pageName === 'mistakes') renderMistakesList();
    else if (pageName === 'stats') renderStatsPage();
    else if (pageName === 'home') renderHomePage();
    else if (pageName === 'roots') renderRootsPage();
    else if (pageName === 'plan') renderPlanPage();
  });

  // 全局按钮绑定（首页按钮通过 onclick 属性，这里不再重复绑定）
  // 部分需要额外绑定的：
  bindTestButtons();
}

function bindTestButtons() {
  // EC 播放按钮
  const ecPlayBtn = document.getElementById('ec-play-btn');
  if (ecPlayBtn) ecPlayBtn.addEventListener('click', playECVoice);

  // CE 提交和播放
  const ceSubmitBtn = document.getElementById('ce-submit-btn');
  if (ceSubmitBtn) ceSubmitBtn.addEventListener('click', handleCESubmit);
  const ceInput = document.getElementById('ce-input');
  if (ceInput) ceInput.addEventListener('keypress', handleCEKeypress);
  const cePlayBtn = document.getElementById('ce-play-btn');
  if (cePlayBtn) cePlayBtn.addEventListener('click', playCEVoice);

  // 复习按钮
  const reviewCEBtn = document.getElementById('review-ce-submit');
  if (reviewCEBtn) reviewCEBtn.addEventListener('click', checkReviewCE);
  const reviewCEInput = document.getElementById('review-ce-input');
  if (reviewCEInput) reviewCEInput.addEventListener('keypress', handleReviewCEKeypress);
  const reviewPlayBtn = document.getElementById('review-play-btn');
  if (reviewPlayBtn) reviewPlayBtn.addEventListener('click', playReviewVoice);

  // 错题标签切换
  document.getElementById('ec-mistakes-tab')?.addEventListener('click', () => switchMistakeTab('ec'));
  document.getElementById('ce-mistakes-tab')?.addEventListener('click', () => switchMistakeTab('ce'));
}

// ==================== 首页渲染 ====================
function renderHomePage() {
  refreshListSelect();
  renderPlanProgress();
  
  // 更新今日复习数量
  const dueCount = currentList ? getDueCount(currentList) : 0;
  const reviewBadge = document.getElementById('review-badge');
  if (reviewBadge) {
    reviewBadge.textContent = dueCount;
    reviewBadge.style.display = dueCount > 0 ? 'inline' : 'none';
  }
  
  // 更新计划进度
  const planProgress = getPlanProgress();
  const planArea = document.getElementById('plan-progress-area');
  if (planArea && planProgress) {
    renderPlanProgress();
  }
}

// ==================== 列表选择器 ====================
function refreshListSelect() {
  const select = document.getElementById('list-select');
  const previousListId = currentList ? currentList.id : null;
  
  select.innerHTML = '';
  if (data.lists.length === 0) {
    select.innerHTML = '<option value="">暂无列表</option>';
    setCurrentList(null);
    return;
  }
  
  data.lists.forEach(list => {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = `${list.name} (${list.words.length}个单词)`;
    select.appendChild(option);
  });
  
  if (previousListId) {
    const found = data.lists.find(l => l.id === previousListId);
    if (found) {
      setCurrentList(found);
      select.value = found.id;
    } else {
      setCurrentList(data.lists[0]);
      select.value = data.lists[0].id;
    }
  } else {
    setCurrentList(data.lists[0]);
    select.value = data.lists[0].id;
  }
}

// ==================== 添加单词页面 ====================
function updateAddWordUI() {
  document.getElementById('add-word-count').textContent = currentList
    ? `当前列表已有 ${currentList.words.length} 个单词`
    : '请先选择一个列表';
}

// ==================== 单词列表页面 ====================
let currentWordFilter = '';

function renderWordListPage(filter = '') {
  currentWordFilter = filter;
  const container = document.getElementById('word-list-container');
  const countEl = document.getElementById('word-list-count');
  
  if (!currentList || currentList.words.length === 0) {
    countEl.textContent = '当前列表没有单词';
    container.innerHTML = '';
    return;
  }
  
  let words = currentList.words;
  if (filter) {
    const q = filter.toLowerCase();
    words = words.filter(w => w.english.toLowerCase().includes(q) || w.chinese.includes(q));
  }
  
  countEl.textContent = filter 
    ? `搜索"${filter}"：找到 ${words.length} 个单词`
    : `共 ${currentList.words.length} 个单词`;
  
  container.innerHTML = words.map((word, index) => {
    const realIndex = currentList.words.indexOf(word);
    let badges = '';
    if (word.phonetic) badges += `<span class="text-xs text-gray-400 mr-2">${word.phonetic}</span>`;
    if (word.nextReview) badges += `<span class="text-xs bg-blue-100 text-blue-700 px-1 rounded">复习:${word.nextReview}</span>`;
    
    return `
      <div class="bg-white p-3 rounded-lg border border-gray-200">
        <div class="flex justify-between items-center">
          <div>
            <p class="text-lg font-medium">${word.english} <span class="text-gray-600">${word.chinese}</span></p>
            <div class="mt-1">${badges}</div>
            ${word.example ? `<p class="text-xs text-gray-400 italic mt-1">"${word.example}"</p>` : ''}
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="px-2 py-1 bg-blue-500 text-white rounded text-sm" onclick="window._editWordDetail(${realIndex})">详情</button>
            <button class="px-2 py-1 bg-yellow-500 text-white rounded text-sm" onclick="window._editWord(${realIndex})">修改</button>
            <button class="px-2 py-1 bg-red-500 text-white rounded text-sm" onclick="window._deleteWord(${realIndex})">删除</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // 挂载全局函数
  window._editWord = editWordHandler;
  window._deleteWord = deleteWordHandler;
  window._editWordDetail = editWordDetailHandler;
}

function editWordHandler(index) {
  const word = currentList.words[index];
  showModal('修改单词',
    `<div class="space-y-3">
      <input type="text" id="edit-english" class="w-full p-2 border rounded-lg" value="${word.english}">
      <input type="text" id="edit-chinese" class="w-full p-2 border rounded-lg" value="${word.chinese}">
      <input type="text" id="edit-note" class="w-full p-2 border rounded-lg" placeholder="笔记（可选）" value="${word.note || ''}">
    </div>`,
    [
      { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '保存', onClick: () => {
        const newEnglish = document.getElementById('edit-english').value.trim();
        const newChinese = document.getElementById('edit-chinese').value.trim();
        const newNote = document.getElementById('edit-note').value.trim();
        if (!newEnglish || !newChinese) { showToast('请填写完整信息'); return; }
        word.english = newEnglish;
        word.chinese = newChinese;
        word.note = newNote;
        saveData();
        renderWordListPage(currentWordFilter);
        refreshListSelect();
        hideModal();
        showToast('单词已修改');
      }, className: 'px-4 py-2 rounded-lg bg-blue-600 text-white' }
    ]
  );
}

function editWordDetailHandler(index) {
  const word = currentList.words[index];
  showModal(`单词详情: ${word.english}`,
    `<div class="space-y-3 text-sm">
      ${word.phonetic ? `<p><span class="font-medium">音标:</span> ${word.phonetic}</p>` : ''}
      <p><span class="font-medium">中文:</span> ${word.chinese}</p>
      ${word.example ? `<p><span class="font-medium">例句:</span> <span class="italic">"${word.example}"</span></p>` : ''}
      ${word.note ? `<p><span class="font-medium">笔记:</span> ${word.note}</p>` : ''}
      <p><span class="font-medium">SM-2:</span> EF=${word.easeFactor?.toFixed(1)} 间隔=${word.interval}天 重复=${word.repetitions}次</p>
      ${word.nextReview ? `<p><span class="font-medium">下次复习:</span> ${word.nextReview}</p>` : '<p class="text-gray-400">尚未安排复习</p>'}
      <div class="space-y-2 mt-2">
        <input type="text" id="detail-note" class="w-full p-2 border rounded-lg" placeholder="添加笔记" value="${word.note || ''}">
        <input type="text" id="detail-synonyms" class="w-full p-2 border rounded-lg" placeholder="近义词（逗号分隔）" value="${(word.synonyms || []).join(', ')}">
        <input type="text" id="detail-antonyms" class="w-full p-2 border rounded-lg" placeholder="反义词（逗号分隔）" value="${(word.antonyms || []).join(', ')}">
        <button id="detail-lookup-btn" class="w-full bg-green-500 text-white py-1 rounded-lg text-sm">查询词典信息</button>
      </div>
    </div>`,
    [
      { text: '关闭', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '朗读', onClick: () => playVoice(word.english), className: 'px-4 py-2 rounded-lg bg-blue-600 text-white' },
      { text: '保存', onClick: () => {
        word.note = document.getElementById('detail-note').value.trim();
        word.synonyms = document.getElementById('detail-synonyms').value.split(',').map(s => s.trim()).filter(Boolean);
        word.antonyms = document.getElementById('detail-antonyms').value.split(',').map(s => s.trim()).filter(Boolean);
        saveData();
        hideModal();
        showToast('已保存');
        renderWordListPage(currentWordFilter);
      }, className: 'px-4 py-2 rounded-lg bg-green-600 text-white' }
    ]
  );
  
  // 延迟绑定查询按钮
  setTimeout(() => {
    const btn = document.getElementById('detail-lookup-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.textContent = '查询中...';
        btn.disabled = true;
        const info = await fetchWordInfo(word.english);
        if (info) {
          if (info.phonetic) word.phonetic = info.phonetic;
          if (info.example) word.example = info.example;
          saveData();
          hideModal();
          showToast('词典信息已更新');
          setTimeout(() => editWordDetailHandler(index), 100);
        } else {
          btn.textContent = '未找到';
          btn.disabled = false;
        }
      });
    }
  }, 100);
}

function deleteWordHandler(index) {
  const word = currentList.words[index];
  showModal('确认删除', `确定要删除单词"${word.english} - ${word.chinese}"吗？`,
    [
      { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '删除', onClick: () => {
        deleteWord(currentList, index);
        renderWordListPage(currentWordFilter);
        refreshListSelect();
        hideModal();
        showToast('单词已删除');
      }, className: 'px-4 py-2 rounded-lg bg-red-600 text-white' }
    ]
  );
}

// 搜索功能
const searchInput = document.getElementById('word-search');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    renderWordListPage(e.target.value.trim());
  });
}

// ==================== 错题库 ====================
let currentMistakeTab = 'ec';

function switchMistakeTab(tab) {
  currentMistakeTab = tab;
  document.getElementById('ec-mistakes-tab').className = tab === 'ec'
    ? 'flex-1 py-2 text-lg font-medium text-blue-600 border-b-2 border-blue-600'
    : 'flex-1 py-2 text-lg font-medium text-gray-500';
  document.getElementById('ce-mistakes-tab').className = tab === 'ce'
    ? 'flex-1 py-2 text-lg font-medium text-blue-600 border-b-2 border-blue-600'
    : 'flex-1 py-2 text-lg font-medium text-gray-500';
  renderMistakesList();
}

function renderMistakesList() {
  const listDiv = document.getElementById('mistakes-list');
  const mistakes = currentMistakeTab === 'ec'
    ? (currentList?.ecMistakes || [])
    : (currentList?.ceMistakes || []);
  
  if (mistakes.length === 0) {
    listDiv.innerHTML = '<p class="text-center text-gray-500 text-lg mt-8">暂无错题 🎉</p>';
    return;
  }
  listDiv.innerHTML = mistakes.map(m => `
    <div class="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
      <div>
        <p class="text-lg">${m.english} - ${m.chinese}</p>
        <p class="text-sm text-gray-500">连续正确: ${m.streak || 0}/3</p>
      </div>
      <button class="px-3 py-1 bg-blue-500 text-white rounded text-sm" onclick="playVoice('${m.english}')">🔊</button>
    </div>
  `).join('');
}

// ==================== 数据导出 ====================
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `单词数据_${new Date().toLocaleDateString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据导出成功');
}

// ==================== 词根分析页面 ====================
async function renderRootsPage() {
  const container = document.getElementById('roots-container');
  if (!container) return;
  
  // 收集所有单词
  const allWords = [];
  data.lists.forEach(list => {
    list.words.forEach(w => allWords.push(w));
  });
  
  if (allWords.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 mt-8">尚无单词数据</p>';
    return;
  }
  
  container.innerHTML = '<p class="text-center text-gray-400 mb-4">正在分析词根...</p>';
  
  const rootGroups = await analyzeRoots(allWords);
  
  container.innerHTML = rootGroups.map(group => `
    <div class="mb-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="bg-blue-50 px-4 py-2 font-medium text-blue-700 flex justify-between items-center">
        <span>📚 ${group.root}</span>
        <span class="text-sm text-gray-500">${group.words.length}个单词</span>
      </div>
      <div class="p-3">
        ${group.words.map(w => `<span class="inline-block bg-gray-100 rounded px-2 py-1 m-1 text-sm">${w.english} <span class="text-gray-400">${w.chinese}</span></span>`).join('')}
      </div>
    </div>
  `).join('');
  
  if (rootGroups.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 mt-8">未检测到词根关联</p>';
  }
}

// ==================== 学习计划页面 ====================
function renderPlanPage() {
  const container = document.getElementById('plan-page-content');
  if (!container) return;
  
  const progress = getPlanProgress();
  if (!progress) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-500 mb-4">尚未设置学习计划</p>
        <button id="plan-setup-btn" class="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg">设置学习计划</button>
      </div>`;
    document.getElementById('plan-setup-btn').addEventListener('click', showPlanSettings);
    return;
  }
  
  container.innerHTML = `
    <div class="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-lg">📅 30天学习计划</h3>
        <button id="plan-edit-btn" class="text-blue-600 text-sm">修改</button>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4 mb-3">
        <div class="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full progress-bar" style="width:${progress.percent}%"></div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-center">
        <div class="bg-blue-50 rounded-lg p-3">
          <p class="text-2xl font-bold text-blue-600">${progress.learned}</p>
          <p class="text-sm text-gray-500">已学单词</p>
        </div>
        <div class="bg-green-50 rounded-lg p-3">
          <p class="text-2xl font-bold text-green-600">${progress.total - progress.learned}</p>
          <p class="text-sm text-gray-500">剩余单词</p>
        </div>
      </div>
      <div class="mt-3 text-sm text-gray-600">
        <p>📌 每日目标：${progress.dailyNew} 个新单词</p>
        <p>📊 预期进度：${progress.expected}/${progress.total}</p>
        <p>${progress.onTrack ? '✅ 进度正常，继续保持！' : '⚠️ 进度落后，加油！'}</p>
      </div>
    </div>`;
  document.getElementById('plan-edit-btn').addEventListener('click', showPlanSettings);
}

// ==================== Service Worker ====================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/word/service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('SW registration failed:', err));
    });
  }
}

// ==================== 全局暴露（供 HTML onclick 调用）====================
window.goToPage = goToPage;
window.goHome = goHome;
window.startECTest = startECTest;
window.startCETest = startCETest;
window.startReview = startReview;
window.exportData = exportData;
window.showPasteImport = showPasteImport;
window.showFileImport = showFileImport;
window.showBatchEdit = () => showBatchEdit(currentList);
window.showPlanSettings = showPlanSettings;

// 启动应用
init();

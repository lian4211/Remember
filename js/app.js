// ==================== 应用主入口 (v2) ====================

import { data, loadData, saveData, currentList, setCurrentList, addWord, renameList, deleteList, getDueCount } from './data.js';
import { goToPage, goHome, showModal, hideModal, showToast, onPageEnter } from './ui.js';
import { initVoiceSettings, playVoice } from './voice.js';
import { startECTest, playECVoice } from './test-ec.js';
import { startCETest, handleCESubmit, handleCEKeypress, playCEVoice } from './test-ce.js';
import { startReview, checkReviewCE, handleReviewCEKeypress, playReviewVoice } from './review.js';
import { updateStats, renderStatsPage } from './stats.js';
import { showPasteImport, showFileImport, showBatchEdit } from './import.js';
import { fetchWordInfo as lookupAPI } from './dictionary.js';
import { showPlanSettings, renderPlanProgress, getPlanProgress } from './plan.js';
import { analyzeRoots } from './dictionary.js';
import { initTheme, cycleTheme, getThemeIcon, getAlgorithmLabel, switchAlgorithm, getTheme, setTheme } from './settings.js';
import { globalSearch as doGlobalSearch } from './search.js';

// ==================== 全局暴露 ====================
window.goToPage = goToPage;
window.goHome = goHome;
window.startECTest = startECTest;
window.startCETest = startCETest;
window.startReview = startReview;
window.exportData = exportDataFn;
window.showPasteImport = showPasteImport;
window.showFileImport = showFileImport;
window.showBatchEdit = () => showBatchEdit(currentList);
window.showPlanSettings = showPlanSettings;
window.globalSearchStart = globalSearchStart;
window.playVoice = playVoice;

function init() {
  loadData();
  initTheme();
  initVoiceSettings();
  bindEvents();
  renderHomePage();
  registerSW();
  updateThemeIcon();
}

// ==================== 事件绑定 ====================
function bindEvents() {
  document.getElementById('back-btn').addEventListener('click', goHome);
  document.getElementById('theme-btn').addEventListener('click', () => {
    cycleTheme();
    updateThemeIcon();
  });

  // 列表选择
  const ls = document.getElementById('list-select');
  ls.addEventListener('change', e => {
    setCurrentList(data.lists.find(l => l.id === parseInt(e.target.value)) || null);
  });

  // 新建列表
  document.getElementById('new-list-btn').addEventListener('click', () => {
    showModal('新建单词列表',
      '<input type="text" id="new-list-name" class="app-input" placeholder="输入列表名称">',
      [
        { text: '取消', onClick: hideModal, className: 'btn-ghost' },
        { text: '创建', onClick: () => {
          const name = document.getElementById('new-list-name').value.trim();
          if (!name) return;
          if (data.lists.some(l => l.name === name)) { showToast('列表名称已存在'); return; }
          const list = { id: data.nextId++, name, words: [], ecMistakes: [], ceMistakes: [] };
          data.lists.push(list); setCurrentList(list); saveData();
          refreshListSelect(); hideModal(); showToast('列表创建成功');
        }, className: 'btn-primary' }
      ]
    );
  });

  // 编辑列表
  document.getElementById('edit-list-btn').addEventListener('click', () => {
    if (!currentList) { showToast('请先选择一个列表'); return; }
    showModal('修改列表名称', `<input type="text" id="edit-list-name" class="app-input" value="${currentList.name}">`,
      [
        { text: '取消', onClick: hideModal, className: 'btn-ghost' },
        { text: '保存', onClick: () => {
          const n = document.getElementById('edit-list-name').value.trim();
          if (!n) return;
          if (data.lists.some(l => l.name === n && l.id !== currentList.id)) { showToast('列表名称已存在'); return; }
          renameList(currentList, n); refreshListSelect(); hideModal(); showToast('列表名称已修改');
        }, className: 'btn-primary' }
      ]
    );
  });

  // 删除列表
  document.getElementById('delete-list-btn').addEventListener('click', () => {
    if (!currentList) { showToast('请先选择一个列表'); return; }
    showModal('确认删除', `确定要删除列表"${currentList.name}"吗？`,
      [
        { text: '取消', onClick: hideModal, className: 'btn-ghost' },
        { text: '删除', onClick: () => {
          deleteList(currentList); setCurrentList(data.lists[0] || null);
          refreshListSelect(); hideModal(); showToast('列表已删除');
        }, className: 'btn-danger' }
      ]
    );
  });

  // 添加单词
  document.getElementById('add-word-btn').addEventListener('click', () => {
    const en = document.getElementById('english-input').value.trim();
    const cn = document.getElementById('chinese-input').value.trim();
    if (!en || !cn) { showToast('请填写完整信息'); return; }
    if (!currentList) { showToast('请先选择一个列表'); return; }
    addWord(currentList, en, cn);
    refreshListSelect(); updateAddWordUI();
    document.getElementById('english-input').value = '';
    document.getElementById('chinese-input').value = '';
    showToast('单词添加成功');
  });

  // 查询按钮
  document.getElementById('lookup-btn').addEventListener('click', async () => {
    const en = document.getElementById('english-input').value.trim();
    if (!en) { showToast('请先输入英文单词'); return; }
    const info = await lookupAPI(en);
    if (info) {
      document.getElementById('lookup-phonetic').textContent = info.phonetic || '';
      document.getElementById('lookup-example').textContent = info.example ? `"${info.example}"` : '';
      showToast('已获取');
    } else showToast('未找到');
  });

  // 搜索框
  const si = document.getElementById('word-search');
  if (si) si.addEventListener('input', e => renderWordListPage(e.target.value.trim()));

  // 测试按钮
  const ecPlay = document.getElementById('ec-play-btn'); if (ecPlay) ecPlay.addEventListener('click', playECVoice);
  const ceSubmit = document.getElementById('ce-submit-btn'); if (ceSubmit) ceSubmit.addEventListener('click', handleCESubmit);
  const ceInput = document.getElementById('ce-input'); if (ceInput) ceInput.addEventListener('keypress', handleCEKeypress);
  const cePlay = document.getElementById('ce-play-btn'); if (cePlay) cePlay.addEventListener('click', playCEVoice);
  const rvCE = document.getElementById('review-ce-submit'); if (rvCE) rvCE.addEventListener('click', checkReviewCE);
  const rvCI = document.getElementById('review-ce-input'); if (rvCI) rvCI.addEventListener('keypress', handleReviewCEKeypress);
  const rvPlay = document.getElementById('review-play-btn'); if (rvPlay) rvPlay.addEventListener('click', playReviewVoice);

  // 错题标签
  document.getElementById('ec-mistakes-tab')?.addEventListener('click', () => switchMistakeTab('ec'));
  document.getElementById('ce-mistakes-tab')?.addEventListener('click', () => switchMistakeTab('ce'));

  // 设置页：算法切换
  document.getElementById('algo-sm2-btn')?.addEventListener('click', () => { switchAlgorithm('sm2'); updateAlgoUI(); });
  document.getElementById('algo-fsrs-btn')?.addEventListener('click', () => { switchAlgorithm('fsrs'); updateAlgoUI(); });

  // 设置页：主题切换
  document.getElementById('theme-auto-btn')?.addEventListener('click', () => { setTheme('auto'); updateThemeUI(); updateThemeIcon(); });
  document.getElementById('theme-dark-btn')?.addEventListener('click', () => { setTheme('dark'); updateThemeUI(); updateThemeIcon(); });
  document.getElementById('theme-light-btn')?.addEventListener('click', () => { setTheme('light'); updateThemeUI(); updateThemeIcon(); });

  // 设置页：全局搜索
  document.getElementById('global-search-btn')?.addEventListener('click', globalSearchStart);
  document.getElementById('gs-cancel-btn')?.addEventListener('click', () => { window._gsCancel = true; });

  // 数据变更
  window.addEventListener('data-changed', () => { refreshListSelect(); renderHomePage(); });

  // 页面进入回调
  onPageEnter(pageName => {
    if (pageName === 'add-word') updateAddWordUI();
    else if (pageName === 'word-list') renderWordListPage('');
    else if (pageName === 'mistakes') renderMistakesList();
    else if (pageName === 'stats') renderStatsPage();
    else if (pageName === 'home') renderHomePage();
    else if (pageName === 'roots') renderRootsPage();
    else if (pageName === 'plan') renderPlanPage();
    else if (pageName === 'settings') { updateAlgoUI(); updateThemeUI(); }
    else if (pageName === 'voice-settings') initVoiceSettings();
  });
}

// ==================== 首页 ====================
function renderHomePage() {
  refreshListSelect();
  renderPlanProgress();
  const due = currentList ? getDueCount(currentList) : 0;
  const badge = document.getElementById('review-badge');
  if (badge) { badge.textContent = due; badge.style.display = due > 0 ? 'inline-flex' : 'none'; }
  document.getElementById('page-title').textContent = '单词背诵助手';
}

function refreshListSelect() {
  const sel = document.getElementById('list-select');
  const prev = currentList?.id;
  sel.innerHTML = '';
  if (data.lists.length === 0) { sel.innerHTML = '<option value="">暂无列表</option>'; setCurrentList(null); return; }
  data.lists.forEach(l => { const o = document.createElement('option'); o.value = l.id; o.textContent = `${l.name} (${l.words.length})`; sel.appendChild(o); });
  const found = prev ? data.lists.find(l => l.id === prev) : null;
  setCurrentList(found || data.lists[0]);
  sel.value = (found || data.lists[0]).id;
}

function updateAddWordUI() {
  document.getElementById('add-word-count').textContent = currentList ? `当前列表已有 ${currentList.words.length} 个单词` : '请先选择一个列表';
}

// ==================== 单词列表 ====================
let wordFilter = '';
function renderWordListPage(filter = '') {
  wordFilter = filter;
  const c = document.getElementById('word-list-container'), cnt = document.getElementById('word-list-count');
  if (!currentList || currentList.words.length === 0) { cnt.textContent = '当前列表没有单词'; c.innerHTML = ''; return; }
  let words = currentList.words;
  if (filter) { const q = filter.toLowerCase(); words = words.filter(w => w.english.toLowerCase().includes(q) || w.chinese.includes(q)); }
  cnt.textContent = filter ? `搜索"${filter}"：${words.length} 个` : `共 ${currentList.words.length} 个单词`;
  c.innerHTML = words.map(w => {
    const idx = currentList.words.indexOf(w);
    return `<div class="app-card" style="padding:0.75rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <p style="font-weight:600">${esc(w.english)} <span style="color:var(--text-secondary);font-weight:400">${esc(w.chinese)}</span></p>
          <div style="margin-top:0.25rem;display:flex;gap:0.25rem;flex-wrap:wrap">
            ${w.phonetic ? `<span class="badge badge-primary">${esc(w.phonetic)}</span>` : ''}
            ${w.passed ? `<span class="badge badge-success">通过</span>` : ''}
            ${w.nextReview ? `<span class="badge badge-warning">${w.nextReview}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:0.25rem;flex-shrink:0">
          <button class="btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="window._ed=${idx};editWordDetail(${idx})">详情</button>
          <button class="btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="window._ew=${idx};editWordHandler(${idx})">修改</button>
          <button class="btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:var(--danger)" onclick="deleteWordHandler(${idx})">删除</button>
        </div>
      </div>
    </div>`;
  }).join('');
  window.editWordHandler = editWordHandlerFn;
  window.deleteWordHandler = deleteWordHandlerFn;
  window.editWordDetail = editWordDetailFn;
}

function editWordHandlerFn(idx) {
  const word = currentList.words[idx];
  showModal('修改单词',
    `<div style="display:flex;flex-direction:column;gap:0.75rem">
      <input type="text" id="edit-english" class="app-input" value="${esc(word.english)}">
      <input type="text" id="edit-chinese" class="app-input" value="${esc(word.chinese)}">
      <input type="text" id="edit-note" class="app-input" placeholder="笔记" value="${esc(word.note || '')}">
    </div>`,
    [
      { text: '取消', onClick: hideModal, className: 'btn-ghost' },
      { text: '保存', onClick: () => {
        const ne = document.getElementById('edit-english').value.trim();
        const nc = document.getElementById('edit-chinese').value.trim();
        const nn = document.getElementById('edit-note').value.trim();
        if (!ne || !nc) { showToast('请填写完整'); return; }
        word.english = ne; word.chinese = nc; word.note = nn;
        saveData(); renderWordListPage(wordFilter); refreshListSelect(); hideModal(); showToast('已修改');
      }, className: 'btn-primary' }
    ]
  );
}

function deleteWordHandlerFn(idx) {
  const word = currentList.words[idx];
  showModal('确认删除', `确定要删除"${esc(word.english)} - ${esc(word.chinese)}"吗？`,
    [
      { text: '取消', onClick: hideModal, className: 'btn-ghost' },
      { text: '删除', onClick: () => {
        currentList.words.splice(idx, 1);
        currentList.ecMistakes = currentList.ecMistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
        currentList.ceMistakes = currentList.ceMistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
        saveData(); renderWordListPage(wordFilter); refreshListSelect(); hideModal(); showToast('已删除');
      }, className: 'btn-danger' }
    ]
  );
}

function editWordDetailFn(idx) {
  const word = currentList.words[idx];
  showModal(`详情: ${esc(word.english)}`,
    `<div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.875rem">
      ${word.phonetic ? `<p><b>音标:</b> ${esc(word.phonetic)}</p>` : ''}
      <p><b>中文:</b> ${esc(word.chinese)}</p>
      ${word.example ? `<p><b>例句:</b> <i>"${esc(word.example)}"</i></p>` : ''}
      ${word.exampleCN ? `<p><b>译:</b> ${esc(word.exampleCN)}</p>` : ''}
      ${word.note ? `<p><b>笔记:</b> ${esc(word.note)}</p>` : ''}
      <p style="color:var(--text-secondary)">EF=${word.easeFactor?.toFixed(1)} 间隔=${word.interval}天 复=${word.repetitions}次 ${word.passed?'✅':'⬜'}</p>
      <input type="text" id="dtl-note" class="app-input" placeholder="笔记" value="${esc(word.note || '')}">
      <button id="dtl-lookup" class="btn-ghost" style="width:100%">查询词典</button>
    </div>`,
    [
      { text: '关闭', onClick: hideModal, className: 'btn-ghost' },
      { text: '朗读', onClick: () => playVoice(word.english), className: 'btn-primary' },
      { text: '保存', onClick: () => {
        word.note = document.getElementById('dtl-note').value.trim();
        saveData(); hideModal(); showToast('已保存'); renderWordListPage(wordFilter);
      }, className: 'btn-primary' }
    ]
  );
  setTimeout(() => {
    const btn = document.getElementById('dtl-lookup');
    if (btn) btn.addEventListener('click', async () => {
      btn.textContent = '查询中...'; btn.disabled = true;
      const info = await lookupAPI(word.english);
      if (info) { if (info.phonetic) word.phonetic = info.phonetic; if (info.example) word.example = info.example; saveData(); }
      hideModal(); showToast('已更新'); setTimeout(() => editWordDetailFn(idx), 100);
    });
  }, 100);
}

// ==================== 错题库 ====================
let mistakeTab = 'ec';
function switchMistakeTab(t) {
  mistakeTab = t;
  document.getElementById('ec-mistakes-tab').style.cssText = `flex:1;padding:0.5rem;font-weight:600;color:${t==='ec'?'var(--primary)':'var(--text-secondary)'};border-bottom:2px solid ${t==='ec'?'var(--primary)':'transparent'};background:transparent;border-top:none;border-left:none;border-right:none;cursor:pointer`;
  document.getElementById('ce-mistakes-tab').style.cssText = `flex:1;padding:0.5rem;font-weight:600;color:${t==='ce'?'var(--primary)':'var(--text-secondary)'};border-bottom:2px solid ${t==='ce'?'var(--primary)':'transparent'};background:transparent;border-top:none;border-left:none;border-right:none;cursor:pointer`;
  renderMistakesList();
}
function renderMistakesList() {
  const d = document.getElementById('mistakes-list');
  const mistakes = mistakeTab === 'ec' ? (currentList?.ecMistakes||[]) : (currentList?.ceMistakes||[]);
  if (mistakes.length === 0) { d.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-top:2rem">暂无错题 🎉</p>'; return; }
  d.innerHTML = mistakes.map(m =>
    `<div class="app-card" style="padding:0.75rem;display:flex;justify-content:space-between;align-items:center">
      <div><p style="font-weight:600">${esc(m.english)} - ${esc(m.chinese)}</p><p style="color:var(--text-secondary);font-size:0.75rem">连续正确: ${m.streak||0}/3</p></div>
      <button class="btn-icon" onclick="playVoice('${esc(m.english)}')">🔊</button>
    </div>`).join('');
}

// ==================== 导出 ====================
function exportDataFn() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `单词数据_${new Date().toLocaleDateString()}.json`; a.click();
  URL.revokeObjectURL(url); showToast('导出成功');
}

// ==================== 词根页面 ====================
async function renderRootsPage() {
  const c = document.getElementById('roots-container'); if (!c) return;
  const all = []; data.lists.forEach(l => l.words.forEach(w => all.push(w)));
  if (all.length === 0) { c.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-top:2rem">尚无单词</p>'; return; }
  c.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-bottom:1rem">分析中...</p>';
  const groups = await analyzeRoots(all);
  c.innerHTML = groups.map(g =>
    `<div class="root-group">
      <div class="root-header"><span>📚 ${esc(g.root)}</span><span style="font-size:0.75rem;color:var(--text-secondary)">${g.words.length}个</span></div>
      <div class="root-body">${g.words.map(w => `<span class="badge badge-primary" style="margin:0.125rem">${esc(w.english)} <span style="color:var(--text-muted)">${esc(w.chinese)}</span></span>`).join(' ')}</div>
    </div>`).join('');
  if (groups.length === 0) c.innerHTML = '<p style="text-align:center;color:var(--text-muted)">未检测到词根关联</p>';
}

// ==================== 计划页面 ====================
function renderPlanPage() {
  const c = document.getElementById('plan-page-content'); if (!c) return;
  const p = getPlanProgress();
  if (!p) {
    c.innerHTML = `<div style="text-align:center;padding:2rem"><p style="color:var(--text-secondary);margin-bottom:1rem">尚未设置学习计划</p><button id="plan-setup-btn" class="btn-primary">设置学习计划</button></div>`;
    document.getElementById('plan-setup-btn').addEventListener('click', showPlanSettings); return;
  }
  c.innerHTML = `
    <div class="app-card" style="padding:1rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
        <h3 style="font-weight:700;font-size:1.125rem">📅 学习计划</h3>
        <button id="plan-edit-btn" class="btn-ghost" style="font-size:0.75rem">修改</button>
      </div>
      <div style="background:var(--border);border-radius:999px;height:8px;margin-bottom:0.75rem">
        <div class="progress-bar" style="width:${p.percent}%;height:8px;border-radius:999px;background:var(--gradient)"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;text-align:center">
        <div class="stat-card" style="background:var(--primary-bg)"><p style="font-size:1.5rem;font-weight:800;color:var(--primary)">${p.learned}</p><p class="stat-label">已学单词</p></div>
        <div class="stat-card" style="background:var(--success-bg)"><p style="font-size:1.5rem;font-weight:800;color:var(--success)">${p.total-p.learned}</p><p class="stat-label">剩余单词</p></div>
      </div>
      <div style="margin-top:0.75rem;font-size:0.875rem;color:var(--text-secondary)">
        <p>📌 每日目标：${p.dailyNew} 个新词</p>
        <p>📊 预期进度：${p.expected}/${p.total}</p>
        <p>${p.onTrack?'✅ 进度正常！':'⚠️ 进度落后！'}</p>
      </div>
    </div>`;
  document.getElementById('plan-edit-btn').addEventListener('click', showPlanSettings);
}

// ==================== 设置页 UI ====================
function updateAlgoUI() {
  document.getElementById('algo-hint').textContent = `当前: ${getAlgorithmLabel()}`;
  const sm2Btn = document.getElementById('algo-sm2-btn');
  const fsrsBtn = document.getElementById('algo-fsrs-btn');
  if (data.algorithm === 'sm2') { sm2Btn.style.fontWeight='700'; fsrsBtn.style.fontWeight='400'; }
  else { fsrsBtn.style.fontWeight='700'; sm2Btn.style.fontWeight='400'; }
}

function updateThemeUI() {
  const t = getTheme();
  document.getElementById('theme-hint').textContent = `当前: ${t==='auto'?'自动':t==='dark'?'深色':'浅色'}`;
}

function updateThemeIcon() {
  document.getElementById('theme-btn').textContent = getThemeIcon();
}

// ==================== 全局搜索 ====================
let gsAbort = null;
async function globalSearchStart() {
  const div = document.getElementById('global-search-progress');
  const bar = document.getElementById('gs-progress-bar');
  const txt = document.getElementById('gs-progress-text');
  const btn = document.getElementById('global-search-btn');
  const cancel = document.getElementById('gs-cancel-btn');
  div.classList.remove('hidden'); btn.disabled = true;
  window._gsCancel = false;

  try {
    await doGlobalSearch(
      ({ done, total, updated }) => {
        if (window._gsCancel) return;
        bar.style.width = `${Math.round((done/total)*100)}%`;
        txt.textContent = `${done}/${total} — 新增 ${updated} 条例句`;
      },
      { get aborted() { return window._gsCancel; } }
    );
    if (!window._gsCancel) showToast('例句获取完成！');
  } catch(e) {
    showToast('获取失败: ' + e.message);
  }
  div.classList.add('hidden'); btn.disabled = false; window._gsCancel = false;
}

// ==================== SW ====================
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(() => console.log('SW registered')).catch(() => {});
    });
  }
}

// ==================== 工具 ====================
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// 启动
init();

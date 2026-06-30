// ==================== Java 独立错题库 ====================
// 独立于单词系统，专门存储 Java 试题错题

const JAVA_MISTAKE_KEY = 'javaQuizMistakes';

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function getMistakes() {
  try {
    const raw = localStorage.getItem(JAVA_MISTAKE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

export function getJavaMistakeCount() {
  return getMistakes().length;
}

export function clearJavaMistakes() {
  localStorage.removeItem(JAVA_MISTAKE_KEY);
}

/** 渲染 Java 错题复习页 */
export function renderJavaMistakesPage() {
  const c = document.getElementById('java-mistakes-container');
  if (!c) return;

  const mistakes = getMistakes();

  if (mistakes.length === 0) {
    c.innerHTML = `<div style="text-align:center;padding:2rem">
      <p style="font-size:3rem;margin-bottom:1rem">🎉</p>
      <p style="font-weight:700;font-size:1.125rem;margin-bottom:0.5rem">没有 Java 错题</p>
      <p style="color:var(--text-secondary);font-size:0.875rem">答错的 Java 试题会自动录入这里</p>
      <p style="color:var(--text-muted);font-size:0.75rem;margin-top:0.5rem">启用「记忆算法」模式后答错即触发</p>
    </div>`;
    return;
  }

  // 分类统计
  const cats = {};
  mistakes.forEach(m => {
    const cat = m.category || '未分类';
    cats[cat] = (cats[cat] || 0) + 1;
  });

  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <div>
        <p style="font-weight:700;font-size:1rem">📋 Java 错题库</p>
        <p style="color:var(--text-secondary);font-size:0.8125rem">共 ${mistakes.length} 道错题</p>
      </div>
      <button id="java-mistake-clear-btn" class="btn-ghost" style="font-size:0.75rem;color:var(--danger)">🗑️ 清空</button>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.75rem">
      ${Object.entries(cats).map(([cat, cnt]) =>
        `<span class="badge badge-warning" style="cursor:pointer" data-cat="${esc(cat)}">${esc(cat)}: ${cnt}</span>`
      ).join('')}
    </div>

    <div style="display:flex;flex-direction:column;gap:0.5rem" id="java-mistakes-list">
      ${mistakes.map((m, i) => renderMistakeCard(m, i)).join('')}
    </div>
  `;

  document.getElementById('java-mistake-clear-btn').addEventListener('click', () => {
    clearJavaMistakes();
    renderJavaMistakesPage();
  });

  // 点击展开/折叠
  document.querySelectorAll('.jm-card').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('expanded'));
  });
}

function renderMistakeCard(m, idx) {
  const typeLabel = m.type === 'choice' ? '选择' : m.type === 'fill' ? '填空' : '问答';
  const answerDisplay = m.type === 'choice' && m.options && m.options.length > 0
    ? String.fromCharCode(65 + m.answer) + '. ' + esc(m.options[m.answer] || '')
    : esc(m.answer || '');
  const time = m.time ? new Date(m.time).toLocaleDateString() : '';

  return `<div class="jm-card" style="background:var(--card);border:1px solid var(--border);border-radius:0.625rem;padding:0.75rem;cursor:pointer">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:0.25rem;align-items:center;margin-bottom:0.25rem">
          <span class="badge badge-danger">${typeLabel}</span>
          <span class="badge" style="background:var(--border);color:var(--text-secondary)">${esc(m.category || '')}</span>
          <span style="font-size:0.6875rem;color:var(--text-muted);margin-left:auto">${time}</span>
        </div>
        <p style="font-size:0.875rem;line-height:1.6;color:var(--text);margin-bottom:0.25rem">${esc(m.question).substring(0, 80)}${m.question.length > 80 ? '...' : ''}</p>
      </div>
      <span style="font-size:0.75rem;color:var(--text-muted)">▼</span>
    </div>
    <div class="jm-body" style="display:none;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border)">
      <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.25rem">题目全文：</p>
      <p style="font-size:0.8125rem;line-height:1.7;white-space:pre-wrap;margin-bottom:0.5rem">${esc(m.question)}</p>
      <p style="font-weight:600;color:var(--success);margin-bottom:0.25rem">✅ 正确答案: ${answerDisplay}</p>
      ${m.explanation ? `<div style="margin-top:0.5rem;padding:0.5rem;background:var(--info-bg);border-radius:6px;font-size:0.8125rem;line-height:1.6">
        <span style="font-weight:600;color:var(--info)">📖 </span>${esc(m.explanation)}</div>` : ''}
    </div>
  </div>`;
}

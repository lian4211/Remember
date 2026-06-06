// ==================== 答错闪卡组件 ====================
// 在测试页面内展示单词详情，替代直接跳下一题

import { playVoice } from './voice.js';

/**
 * 在指定容器中渲染闪卡
 * @param {Object} word - 单词对象
 * @param {HTMLElement} container - 渲染目标容器
 * @param {Function} onNext - 点击"下一题"回调
 */
export function showFlashcard(word, container, onNext) {
  container.innerHTML = `
    <div class="flashcard-overlay">
      <!-- 单词 + 音标 -->
      <p class="flashcard-word">${escapeHtml(word.english)}</p>
      ${word.phonetic ? `<p class="flashcard-phonetic">${escapeHtml(word.phonetic)}</p>` : ''}

      <!-- 中文释义 -->
      <p class="flashcard-meaning">${escapeHtml(word.chinese)}</p>

      <!-- 例句中英对照 -->
      ${word.example || word.exampleCN ? `
      <div class="flashcard-section">
        <p class="title">📖 例句</p>
        ${word.example ? `<p class="italic">"${escapeHtml(word.example)}"</p>` : ''}
        ${word.exampleCN ? `<p class="mt-1" style="color:var(--text-secondary);font-size:0.875rem;">${escapeHtml(word.exampleCN)}</p>` : ''}
      </div>` : ''}

      <!-- 笔记 -->
      ${word.note ? `
      <div class="flashcard-section">
        <p class="title">📝 笔记</p>
        <p>${escapeHtml(word.note)}</p>
      </div>` : ''}

      <!-- 近义词 / 反义词 -->
      ${(word.synonyms && word.synonyms.length > 0) || (word.antonyms && word.antonyms.length > 0) ? `
      <div class="flashcard-section">
        ${word.synonyms && word.synonyms.length > 0 ? `<p class="title">🔄 近义词</p><p>${word.synonyms.map(escapeHtml).join('、')}</p>` : ''}
        ${word.antonyms && word.antonyms.length > 0 ? `<p class="title mt-2">↔️ 反义词</p><p>${word.antonyms.map(escapeHtml).join('、')}</p>` : ''}
      </div>` : ''}

      <!-- 操作按钮 -->
      <div class="flex gap-2 mt-4">
        <button id="fc-play-btn" class="btn-ghost flex-1">
          🔊 朗读
        </button>
        <button id="fc-next-btn" class="btn-primary flex-1">
          👍 会了，下一题
        </button>
      </div>
    </div>
  `;

  // 绑定事件
  document.getElementById('fc-play-btn').addEventListener('click', () => {
    playVoice(word.english);
  });

  document.getElementById('fc-next-btn').addEventListener('click', () => {
    if (onNext) onNext();
  });
}

/** HTML 转义 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

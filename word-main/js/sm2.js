// ==================== SM-2 间隔重复算法模块 ====================

/** 
 * SM-2 算法核心：根据答题质量更新单词间隔数据
 * @param {Object} word - 单词对象（含 easeFactor/interval/repetitions/nextReview/lastReview）
 * @param {number} quality - 答题质量 0-5（0=完全错误，3=困难，5=完美）
 */
export function sm2Update(word, quality) {
  if (quality < 0) quality = 0;
  if (quality > 5) quality = 5;

  const today = new Date().toISOString().split('T')[0];

  if (quality >= 3) {
    // 答对：更新间隔和重复次数
    if (word.repetitions === 0) {
      word.interval = 1;
    } else if (word.repetitions === 1) {
      word.interval = 3;
    } else {
      word.interval = Math.round(word.interval * word.easeFactor);
    }
    word.repetitions += 1;
  } else {
    // 答错：重置
    word.repetitions = 0;
    word.interval = 1;
  }

  // 更新简易度因子（最低 1.3）
  word.easeFactor = Math.max(1.3, word.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  // 计算下次复习日期
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + word.interval);
  word.nextReview = nextDate.toISOString().split('T')[0];
  word.lastReview = today;
}

/** 
 * SM-2 简化版：直接传对/错
 * @param {Object} word - 单词对象
 * @param {boolean} correct - 是否正确
 */
export function sm2Answer(word, correct) {
  sm2Update(word, correct ? 4 : 1);
}

/** 新词学习：初次答对后设置第二天复习 */
export function sm2FirstCorrect(word) {
  const today = new Date().toISOString().split('T')[0];
  word.repetitions = 1;
  word.interval = 1;
  word.easeFactor = Math.max(1.3, word.easeFactor);
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  word.nextReview = nextDate.toISOString().split('T')[0];
  word.lastReview = today;
}

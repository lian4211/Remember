// ==================== FSRS-5 间隔重复算法 ====================
// 基于 open-spaced-repetition/fsrs.js 核心公式

const FSRS_W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01,
  1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
];
const DECAY = -0.5;

/** 计算可提取性 R */
function retrievability(elapsed, stability) {
  if (stability <= 0) return 1;
  return Math.exp(Math.log(0.9) * elapsed / stability);
}

/** 根据评分计算下一次稳定性 */
function nextStability(D, S, R, rating) {
  // rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  if (rating === 1) {
    return FSRS_W[0] * Math.pow(D, -FSRS_W[1]) *
      (Math.exp(FSRS_W[2] * (1 - R)) - 1);
  } else if (rating === 2) {
    return FSRS_W[3] * Math.pow(D, -FSRS_W[4]) *
      (Math.exp(FSRS_W[5] * (1 - R)) - 1);
  } else if (rating === 3) {
    return FSRS_W[6] * Math.pow(D, -FSRS_W[7]) *
      (Math.exp(FSRS_W[8] * (1 - R)) + Math.exp(FSRS_W[9] * (1 - R)) - 2);
  } else {
    return FSRS_W[10] * Math.pow(D, -FSRS_W[11]) *
      (Math.exp(FSRS_W[12] * (1 - R)) - 1);
  }
}

/** 更新难度 */
function nextDifficulty(D, rating) {
  const wIndex = rating === 1 ? 13 : rating === 2 ? 14 : rating === 3 ? 15 : 16;
  const delta = FSRS_W[wIndex];
  let newD = D + delta;
  // 限制在 0.01~1.0
  return Math.max(0.01, Math.min(1.0, newD));
}

/** 
 * 根据评分更新单词的 FSRS 数据
 * @param {Object} word - 单词对象
 * @param {number} rating - 1=Again 2=Hard 3=Good 4=Easy
 */
export function fsrsUpdate(word, rating) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (word.fsrsState === 0) {
    // 新卡片首次学习
    word.fsrsState = 1;
    word.fsrsReps = 1;
    word.difficulty = 0.3;
    // 初始稳定性基于评分
    if (rating <= 2) {
      word.stability = 0.5;  // Again/Hard → 短间隔
    } else {
      word.stability = rating === 3 ? 2.0 : 4.0;  // Good→2天 Easy→4天
    }
    word.fsrsLastReview = todayStr;
    return;
  }

  // 已有学习记录
  const lastReview = new Date(word.fsrsLastReview);
  lastReview.setHours(0, 0, 0, 0);
  const elapsed = Math.max(0, Math.round((today - lastReview) / (1000 * 60 * 60 * 24)));

  if (word.stability <= 0) word.stability = 0.5;

  const R = retrievability(elapsed, word.stability);
  const newD = nextDifficulty(word.difficulty, rating);
  const newS = nextStability(newD, word.stability, R, rating);

  word.difficulty = newD;
  word.stability = Math.max(0.1, newS);

  if (rating === 1) {
    // Again → 回到 Learning
    word.fsrsState = 1;
  } else {
    word.fsrsState = 2;  // Review
  }
  word.fsrsReps++;
  word.fsrsLastReview = todayStr;
}

/** 
 * FSRS 简化接口：传对/错 
 * 对→Rating 3(Good) 错→Rating 1(Again)
 */
export function fsrsAnswer(word, correct) {
  fsrsUpdate(word, correct ? 3 : 1);
}

/** 计算下次复习的推荐天数 */
export function fsrsScheduleDays(word) {
  if (word.stability <= 0) return 1;
  // 达到 90% 可提取性所需天数
  const targetR = 0.9;
  return Math.max(1, Math.round(word.stability * Math.log(targetR) / Math.log(0.9)));
}

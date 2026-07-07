// ==================== 数据管理模块 ====================
// 负责 localStorage 读写、列表/单词 CRUD、数据迁移

const STORAGE_KEY = 'wordLearnerData';

/** 全局数据对象（唯一数据源） */
export let data = {
  lists: [],
  nextId: 1,
  algorithm: "sm2",       // "sm2" | "fsrs"
  theme: "auto",          // "light" | "dark" | "auto"
  voiceSettings: { rate: "+0%", volume: "+0%", pitch: "+0Hz" },
  stats: { daily: {}, streak: 0, lastStudyDate: null },
  plan: { totalWords: 0, startDate: null, dailyNew: 0 },
  quizSets: []    // 试题集：[{ id, name, questions:[{type:'choice'|'qa', category, question, options?, answer, passed?}] }]
};

/** 当前选中的列表引用 */
export let currentList = null;

/** 创建一个空的单词对象（含所有默认字段） */
export function createWord(english, chinese) {
  return {
    english,
    chinese,
    // SM-2 字段
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: null,
    lastReview: null,
    // FSRS 字段
    stability: 0,
    difficulty: 0,
    fsrsState: 0,           // 0=New 1=Learning 2=Review 3=Relearning
    fsrsReps: 0,
    fsrsLastReview: null,
    // 辅助记忆字段
    phonetic: "",
    example: "",
    exampleCN: "",
    note: "",
    synonyms: [],
    antonyms: [],
    // 学习状态
    passed: false
  };
}

/** 迁移旧数据格式到新格式 */
function migrateWord(word) {
  // SM-2
  if (word.easeFactor === undefined) word.easeFactor = 2.5;
  if (word.interval === undefined) word.interval = 0;
  if (word.repetitions === undefined) word.repetitions = 0;
  if (word.nextReview === undefined) word.nextReview = null;
  if (word.lastReview === undefined) word.lastReview = null;
  // FSRS
  if (word.stability === undefined) word.stability = 0;
  if (word.difficulty === undefined) word.difficulty = 0;
  if (word.fsrsState === undefined) word.fsrsState = 0;
  if (word.fsrsReps === undefined) word.fsrsReps = 0;
  if (word.fsrsLastReview === undefined) word.fsrsLastReview = null;
  // 辅助
  if (word.phonetic === undefined) word.phonetic = "";
  if (word.example === undefined) word.example = "";
  if (word.exampleCN === undefined) word.exampleCN = "";
  if (word.note === undefined) word.note = "";
  if (word.synonyms === undefined) word.synonyms = [];
  if (word.antonyms === undefined) word.antonyms = [];
  // 状态
  if (word.passed === undefined) word.passed = false;
  if (word.starred === undefined) word.starred = false;
  return word;
}

function migrateList(list) {
  list.words = (list.words || []).map(migrateWord);
  if (!list.ecMistakes) list.ecMistakes = [];
  if (!list.ceMistakes) list.ceMistakes = [];
  // 迁移旧错题格式：添加 permanent 字段
  list.ecMistakes.forEach(m => {
    if (m.permanent === undefined) m.permanent = (m.errorCount || 1) >= PERMANENT_THRESHOLD;
    if (m.errorCount === undefined) m.errorCount = 1;
  });
  list.ceMistakes.forEach(m => {
    if (m.permanent === undefined) m.permanent = (m.errorCount || 1) >= PERMANENT_THRESHOLD;
    if (m.errorCount === undefined) m.errorCount = 1;
  });
  return list;
}

/** 从 localStorage 加载数据，自动迁移旧格式 */
export function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    data.lists = (parsed.lists || []).map(migrateList);
    data.nextId = parsed.nextId || 1;
    data.algorithm = parsed.algorithm || "sm2";
    data.theme = parsed.theme || "auto";
    data.voiceSettings = parsed.voiceSettings || { rate: "+0%", volume: "+0%", pitch: "+0Hz" };
    data.stats = parsed.stats || { daily: {}, streak: 0, lastStudyDate: null };
    data.plan = parsed.plan || { totalWords: 0, startDate: null, dailyNew: 0 };
  data.quizSets = (parsed.quizSets || []).map(migrateQuizSet);
  data._appVersion = parsed._appVersion || '';
  }
  return data;
}

/** 保存到 localStorage */
export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 设置当前列表 */
export function setCurrentList(list) { currentList = list; }

/** 获取当前列表（供闭包中使用，避免捕获过期引用）*/
export function getCurrentList() { return currentList; }

/** 重置所有单词的算法数据（切换算法时调用） */
export function resetAlgorithmData() {
  data.lists.forEach(list => {
    list.words.forEach(word => {
      // SM-2
      word.easeFactor = 2.5;
      word.interval = 0;
      word.repetitions = 0;
      word.nextReview = null;
      word.lastReview = null;
      // FSRS
      word.stability = 0;
      word.difficulty = 0;
      word.fsrsState = 0;
      word.fsrsReps = 0;
      word.fsrsLastReview = null;
      word.passed = false;
    });
  });
  saveData();
}

/** 根据当前算法获取到期单词（指定列表） */
export function getDueWords(list) {
  if (!list) return [];
  if (data.algorithm === 'fsrs') return getDueWordsFSRS(list);
  return getDueWordsSM2(list);
}

/** 获取所有列表中到期的单词（含来源列表信息） */
export function getAllDueWords() {
  const result = [];
  for (const list of data.lists) {
    const due = getDueWords(list);
    due.forEach(w => result.push({ word: w, list }));
  }
  return result;
}

/** 获取所有列表中到期单词的总数 */
export function getAllDueCount() {
  return getAllDueWords().length;
}

/** 获取所有列表中的所有单词（扁平） */
export function getAllWords() {
  const result = [];
  for (const list of data.lists) {
    list.words.forEach(w => result.push({ word: w, list }));
  }
  return result;
}

function getDueWordsSM2(list) {
  const today = todayStr();
  return list.words.filter(w => w.nextReview && w.nextReview <= today);
}

function getDueWordsFSRS(list) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return list.words.filter(w => {
    // 未学的新词不放进复习
    if (w.fsrsState === 0) return false;
    // 没有学习记录的不放
    if (!w.fsrsLastReview) return false;
    // Learning 状态（fsrsState===1）: 总是需要复习，直到毕业
    if (w.fsrsState === 1) return true;
    // Review 状态（fsrsState===2）: 检查 R 值是否低于 0.9
    const lastReview = new Date(w.fsrsLastReview);
    lastReview.setHours(0, 0, 0, 0);
    const elapsed = Math.round((today - lastReview) / (1000 * 60 * 60 * 24));
    if (elapsed <= 0) return false;
    if (w.stability <= 0) return elapsed >= 1;
    const R = Math.exp(Math.log(0.9) * elapsed / w.stability);
    return R < 0.9;
  });
}

/** 获取到期复习单词数量（指定列表） */
export function getDueCount(list) {
  if (!list) return 0;
  return getDueWords(list).length;
}

/** 获取所有列表中的收藏单词 */
export function getStarredWords() {
  const result = [];
  for (const list of data.lists) {
    list.words.forEach(w => {
      if (w.starred) result.push({ word: w, list });
    });
  }
  return result;
}

/** 切换单词收藏状态 */
export function toggleStar(word) {
  word.starred = !word.starred;
  saveData();
  return word.starred;
}

/** 获取全部列表的掌握度统计 */
export function getAllMastery() {
  let mastered = 0, total = 0;
  for (const list of data.lists) {
    for (const w of list.words) {
      total++;
      if (w.passed) mastered++;
    }
  }
  return { mastered, total, percent: total > 0 ? Math.round((mastered / total) * 100) : 0 };
}

/** 获取列表掌握度 */
export function getMastery(list) {
  if (!list || list.words.length === 0) return { mastered: 0, total: 0, percent: 0 };
  const mastered = list.words.filter(w => w.passed).length;
  return { mastered, total: list.words.length, percent: Math.round((mastered / list.words.length) * 100) };
}

/** 获取今日日期字符串 YYYY-MM-DD */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** 创建新列表 */
export function createList(name) {
  const list = { id: data.nextId++, name, words: [], ecMistakes: [], ceMistakes: [] };
  data.lists.push(list);
  saveData();
  return list;
}

/** 重命名列表 */
export function renameList(list, newName) { list.name = newName; saveData(); }

/** 删除列表 */
export function deleteList(list) {
  data.lists = data.lists.filter(l => l.id !== list.id);
  saveData();
}

/** 添加单词 */
export function addWord(list, english, chinese) {
  const word = createWord(english, chinese);
  list.words.push(word);
  saveData();
  return word;
}

/** 删除单词并清理关联 */
export function deleteWord(list, index) {
  const word = list.words[index];
  list.words.splice(index, 1);
  list.ecMistakes = list.ecMistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
  list.ceMistakes = list.ceMistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
  saveData();
}

/** 添加错题（新版：记录总错误次数，自动标记永久错题） */
export const PERMANENT_THRESHOLD = 5; // 错误次数达到此值标记为永久错题

export function addMistake(list, word, type) {
  const mistakes = type === 'ec' ? list.ecMistakes : list.ceMistakes;
  const existing = mistakes.find(m => m.english === word.english && m.chinese === word.chinese);
  if (!existing) {
    mistakes.push({ english: word.english, chinese: word.chinese, streak: 0, errorCount: 1, permanent: false });
  } else {
    existing.streak = 0;
    existing.errorCount = (existing.errorCount || 0) + 1;
    if (existing.errorCount >= PERMANENT_THRESHOLD) {
      existing.permanent = true;
    }
  }
  saveData();
}

// ==================== 试题集管理 ====================

/** 添加试题集（questions 已就绪） */
export function addQuizSet(name, questions) {
  const qs = { id: data.nextId++, name, questions: questions || [] };
  data.quizSets.push(qs);
  saveData();
  return qs;
}

/** 删除试题集 */
export function deleteQuizSet(qs) {
  data.quizSets = data.quizSets.filter(x => x.id !== qs.id);
  saveData();
}

/** 重命名试题集 */
export function renameQuizSet(qs, newName) { qs.name = newName; saveData(); }

/** 初始化试题的算法字段 */
function initQuizAlgo(q) {
  if (!q.sm2) q.sm2 = { easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: null, lastReview: null };
  if (!q.fsrs) q.fsrs = { stability: 0, difficulty: 0, fsrsState: 0, fsrsReps: 0, fsrsLastReview: null };
  return q;
}

/** 迁移试题集：给每题添加算法字段 */
function migrateQuizSet(qs) {
  if (qs.questions) qs.questions = qs.questions.map(initQuizAlgo);
  return qs;
}

/** 获取试题集到期题目ID列表 (SM-2) */
function getDueQuizIdsSM2(questions) {
  const today = new Date().toISOString().split('T')[0];
  return questions
    .map((q, i) => ({ idx: i, next: q.sm2?.nextReview }))
    .filter(q => q.next && q.next <= today)
    .map(q => q.idx);
}

/** 获取试题集到期题目ID列表 (FSRS) */
function getDueQuizIdsFSRS(questions) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = [];
  questions.forEach((q, i) => {
    const f = q.fsrs;
    if (!f?.fsrsLastReview) return;
    if (f.fsrsState === 1) { due.push(i); return; }
    const lr = new Date(f.fsrsLastReview); lr.setHours(0, 0, 0, 0);
    const elapsed = Math.max(0, Math.round((today - lr) / 86400000));
    if (f.stability <= 0) { if (elapsed >= 1) due.push(i); return; }
    const R = Math.exp(Math.log(0.9) * elapsed / f.stability);
    if (R < 0.9) due.push(i);
  });
  return due;
}

/** 按记忆算法排序试题：到期优先→未学→按下次复习日期 */
export function sortQuizByAlgo(questions) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const algo = data.algorithm;
  
  return questions.map((q, i) => {
    const sm2 = q.sm2;
    let score = 0; // higher = more urgent

    if (sm2?.nextReview) {
      const nr = new Date(sm2.nextReview); nr.setHours(0, 0, 0, 0);
      const daysOver = Math.round((today - nr) / 86400000);
      if (daysOver >= 0) {
        // Overdue: score increases with days
        score = 1000 + daysOver;
      } else {
        // Not due yet: negative score
        score = daysOver;
      }
    } else {
      // Never reviewed: medium priority (new cards first)
      score = 500;
    }
    return { question: q, origIdx: i, score };
  }).sort((a, b) => b.score - a.score)
    .map(item => item.question);
}

// ==================== 数据管理模块 ====================
// 负责 localStorage 读写、列表/单词 CRUD、数据迁移

const STORAGE_KEY = 'wordLearnerData';

/** 全局数据对象（唯一数据源） */
export let data = {
  lists: [],
  nextId: 1,
  voiceSettings: { rate: "+0%", volume: "+0%", pitch: "+0Hz" },
  stats: { daily: {}, streak: 0, lastStudyDate: null },
  plan: { totalWords: 0, startDate: null, dailyNew: 0 }
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
    // 辅助记忆字段
    phonetic: "",
    example: "",
    note: "",
    synonyms: [],
    antonyms: []
  };
}

/** 迁移旧数据格式到新格式 */
function migrateWord(word) {
  if (word.easeFactor === undefined) word.easeFactor = 2.5;
  if (word.interval === undefined) word.interval = 0;
  if (word.repetitions === undefined) word.repetitions = 0;
  if (word.nextReview === undefined) word.nextReview = null;
  if (word.lastReview === undefined) word.lastReview = null;
  if (word.phonetic === undefined) word.phonetic = "";
  if (word.example === undefined) word.example = "";
  if (word.note === undefined) word.note = "";
  if (word.synonyms === undefined) word.synonyms = [];
  if (word.antonyms === undefined) word.antonyms = [];
  return word;
}

function migrateList(list) {
  list.words = (list.words || []).map(migrateWord);
  if (!list.ecMistakes) list.ecMistakes = [];
  if (!list.ceMistakes) list.ceMistakes = [];
  return list;
}

/** 从 localStorage 加载数据，自动迁移旧格式 */
export function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    data.lists = (parsed.lists || []).map(migrateList);
    data.nextId = parsed.nextId || 1;
    data.voiceSettings = parsed.voiceSettings || { rate: "+0%", volume: "+0%", pitch: "+0Hz" };
    data.stats = parsed.stats || { daily: {}, streak: 0, lastStudyDate: null };
    data.plan = parsed.plan || { totalWords: 0, startDate: null, dailyNew: 0 };
  }
  return data;
}

/** 保存到 localStorage */
export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 刷新列表选择器（供外部调用时更新选中状态） */
export function setCurrentList(list) {
  currentList = list;
}

/** 获取到期需要复习的单词列表 */
export function getDueWords(list) {
  if (!list) return [];
  const today = new Date().toISOString().split('T')[0];
  return list.words.filter(w => w.nextReview && w.nextReview <= today);
}

/** 获取到期复习单词数量 */
export function getDueCount(list) {
  return getDueWords(list).length;
}

/** 获取列表掌握度（SM-2 中 repetitions>=3 视为掌握） */
export function getMastery(list) {
  if (!list || list.words.length === 0) return { mastered: 0, total: 0, percent: 0 };
  const mastered = list.words.filter(w => w.repetitions >= 3).length;
  return { mastered, total: list.words.length, percent: Math.round((mastered / list.words.length) * 100) };
}

/** 获取今日日期字符串 */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** 创建新列表 */
export function createList(name) {
  const list = {
    id: data.nextId++,
    name,
    words: [],
    ecMistakes: [],
    ceMistakes: []
  };
  data.lists.push(list);
  saveData();
  return list;
}

/** 重命名列表 */
export function renameList(list, newName) {
  list.name = newName;
  saveData();
}

/** 删除列表 */
export function deleteList(list) {
  data.lists = data.lists.filter(l => l.id !== list.id);
  saveData();
}

/** 向列表添加单词 */
export function addWord(list, english, chinese) {
  const word = createWord(english, chinese);
  list.words.push(word);
  saveData();
  return word;
}

/** 删除单词并清理关联错题 */
export function deleteWord(list, index) {
  const word = list.words[index];
  list.words.splice(index, 1);
  list.ecMistakes = list.ecMistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
  list.ceMistakes = list.ceMistakes.filter(m => !(m.english === word.english && m.chinese === word.chinese));
  saveData();
}

/** 将单词标记为错题 */
export function addMistake(list, word, type) {
  const mistakes = type === 'ec' ? list.ecMistakes : list.ceMistakes;
  const existing = mistakes.find(m => m.english === word.english && m.chinese === word.chinese);
  if (!existing) {
    mistakes.push({ english: word.english, chinese: word.chinese, streak: 0 });
  } else {
    existing.streak = 0;
  }
  saveData();
}



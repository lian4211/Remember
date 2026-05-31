// ==================== 字典 & 词根模块 ====================
// Free Dictionary API 查询 + 词根分析

import { saveData } from './data.js';
import { showToast } from './ui.js';

/** 从 Free Dictionary API 获取单词信息 */
export async function fetchWordInfo(english) {
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(english)}`);
    if (!resp.ok) return null;
    
    const data = await resp.json();
    if (!data || data.length === 0) return null;
    
    const entry = data[0];
    const result = {
      phonetic: entry.phonetic || '',
      example: '',
      meanings: []
    };
    
    // 提取音标（优先 text）
    if (!result.phonetic && entry.phonetics) {
      for (const p of entry.phonetics) {
        if (p.text) { result.phonetic = p.text; break; }
      }
    }
    
    // 提取第一个例句
    if (entry.meanings) {
      for (const meaning of entry.meanings) {
        if (meaning.definitions) {
          for (const def of meaning.definitions) {
            if (def.example) {
              result.example = def.example;
              break;
            }
          }
        }
        if (result.example) break;
      }
    }
    
    return result;
  } catch (e) {
    console.error('API 查询失败:', e);
    return null;
  }
}

/** 查询并填充单词信息 */
export async function lookupAndFill(word) {
  showToast('正在查询词典...');
  const info = await fetchWordInfo(word.english);
  if (info) {
    if (info.phonetic) word.phonetic = info.phonetic;
    if (info.example) word.example = info.example;
    saveData();
    showToast('词典信息已更新');
    return info;
  } else {
    showToast('未找到该单词的信息');
    return null;
  }
}

// ==================== 词根分析 ====================

/** 词根词典缓存 */
let rootMap = null;

/** 加载词根词典 */
export async function loadRootMap() {
  if (rootMap) return rootMap;
  try {
    const resp = await fetch('data/roots.json');
    rootMap = await resp.json();
    return rootMap;
  } catch (e) {
    console.error('词根词典加载失败:', e);
    rootMap = {};
    return rootMap;
  }
}

/** 在给定单词列表中匹配词根 */
export async function analyzeRoots(words) {
  const map = await loadRootMap();
  const result = {};
  
  for (const word of words) {
    let matched = false;
    for (const [root, examples] of Object.entries(map)) {
      // 检查单词是否包含词根（简单子串匹配）
      if (word.english.toLowerCase().includes(root.toLowerCase()) && root.length >= 3) {
        // 进一步验证：单词必须以词根开头或词根前不是字母
        const idx = word.english.toLowerCase().indexOf(root.toLowerCase());
        const beforeOk = idx === 0 || !/[a-z]/.test(word.english[idx - 1]);
        if (beforeOk) {
          if (!result[root]) result[root] = { root, words: [] };
          result[root].words.push(word);
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      if (!result['其他']) result['其他'] = { root: '其他', words: [] };
      result['其他'].words.push(word);
    }
  }
  
  return Object.values(result);
}

/** 搜索匹配词根的单词（跨列表） */
export async function searchByRoot(root, allWords) {
  if (root === '其他') return [];
  const map = await loadRootMap();
  const examples = map[root] || [];
  return allWords.filter(w => 
    examples.some(ex => w.english.toLowerCase() === ex.toLowerCase())
  );
}

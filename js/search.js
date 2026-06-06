// ==================== 词典搜索 & 例句翻译模块 ====================

import { data, saveData } from './data.js';
import { showToast } from './ui.js';

/** Free Dictionary API 获取单词信息 */
async function fetchWordInfo(english) {
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(english)}`);
    if (!resp.ok) return null;
    const result = await resp.json();
    if (!result || result.length === 0) return null;
    const entry = result[0];
    const info = { phonetic: '', example: '' };
    if (entry.phonetic) info.phonetic = entry.phonetic;
    else if (entry.phonetics) {
      for (const p of entry.phonetics) { if (p.text) { info.phonetic = p.text; break; } }
    }
    if (entry.meanings) {
      for (const m of entry.meanings) {
        if (m.definitions) {
          for (const d of m.definitions) { if (d.example) { info.example = d.example; break; } }
        }
        if (info.example) break;
      }
    }
    return info;
  } catch { return null; }
}

/** Google Translate 非官方 API（免费，无需 Key）*/
async function translateText(text, from = 'en', to = 'zh-CN') {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data && data[0]) {
      return data[0].map(seg => seg[0]).join('');
    }
    return null;
  } catch {
    // 备选：MyMemory API
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return data?.responseData?.translatedText || null;
    } catch {
      return null;
    }
  }
}

/** 扫描一个单词：获取音标+例句+中文翻译 */
async function scanWord(word) {
  const info = await fetchWordInfo(word.english);
  if (info) {
    if (info.phonetic && !word.phonetic) word.phonetic = info.phonetic;
    if (info.example && !word.example) {
      word.example = info.example;
      // 翻译例句
      const cn = await translateText(info.example);
      if (cn) word.exampleCN = cn;
    }
  }
}

/** 全局搜索：扫描所有单词，获取例句和翻译 */
export async function globalSearch(onProgress, signal) {
  const allWords = [];
  data.lists.forEach(list => {
    list.words.forEach(w => allWords.push(w));
  });

  const total = allWords.length;
  let done = 0;
  let updated = 0;

  for (const word of allWords) {
    if (signal?.aborted) break;

    const hadExample = !!word.example;
    await scanWord(word);

    if (!hadExample && word.example) updated++;
    done++;

    if (onProgress) onProgress({ done, total, updated });
  }

  saveData();
  return { total, updated };
}

/** 获取所有有例句的单词数 */
export function getExampleCount() {
  let count = 0;
  data.lists.forEach(list => {
    list.words.forEach(w => { if (w.example) count++; });
  });
  return count;
}

/** 查询单个单词（供添加单词时使用）*/
export async function lookupWord(english) {
  return fetchWordInfo(english);
}

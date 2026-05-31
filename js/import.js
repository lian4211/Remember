// ==================== 批量导入模块 ====================
// 支持 CSV、粘贴（textarea）、Excel（xlsx）导入

import { data, saveData, currentList, createWord, addWord } from './data.js';
import { showModal, hideModal, showToast } from './ui.js';

/** 粘贴导入：显示 textarea 弹窗 */
export function showPasteImport() {
  showModal('粘贴导入',
    `<p class="text-sm text-gray-500 mb-3">每行一对，格式：english,chinese（用逗号分隔）</p>
     <textarea id="paste-textarea" class="w-full p-3 border border-gray-300 rounded-lg h-48 batch-textarea" 
       placeholder="apple,苹果&#10;book,书&#10;cat,猫"></textarea>
     <div class="mt-3">
       <label class="text-sm">
         <input type="checkbox" id="paste-new-list" checked> 创建新列表
       </label>
       <input type="text" id="paste-list-name" class="w-full p-2 border rounded-lg mt-1" placeholder="新列表名称（默认：导入+日期）">
     </div>`,
    [
      { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '导入', onClick: doPasteImport, className: 'px-4 py-2 rounded-lg bg-green-600 text-white' }
    ]
  );
}

function doPasteImport() {
  const text = document.getElementById('paste-textarea').value.trim();
  if (!text) { showToast('请输入内容'); return; }
  
  const lines = text.split('\n').filter(l => l.trim());
  const words = [];
  for (const line of lines) {
    const sep = line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep);
    if (parts.length >= 2) {
      const english = parts[0].trim();
      const chinese = parts.slice(1).join(sep).trim();
      if (english && chinese) words.push({ english, chinese });
    }
  }
  
  if (words.length === 0) { showToast('未识别到有效单词'); return; }
  
  const createNew = document.getElementById('paste-new-list').checked;
  const listName = document.getElementById('paste-list-name').value.trim() || `导入 ${new Date().toLocaleDateString()}`;
  
  if (createNew) {
    const newList = {
      id: data.nextId++,
      name: listName,
      words: [],
      ecMistakes: [],
      ceMistakes: []
    };
    words.forEach(w => newList.words.push(createWord(w.english, w.chinese)));
    data.lists.push(newList);
  } else {
    if (!currentList) { showToast('请先选择一个列表'); return; }
    words.forEach(w => {
      if (!currentList.words.some(x => x.english === w.english && x.chinese === w.chinese)) {
        currentList.words.push(createWord(w.english, w.chinese));
      }
    });
  }
  
  saveData();
  hideModal();
  showToast(`成功导入 ${words.length} 个单词`);
  window.dispatchEvent(new CustomEvent('data-changed'));
}

/** 文件导入（CSV/JSON/Excel） */
export function showFileImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.json,.xlsx,.xls';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'json') {
      importJSON(file);
    } else if (ext === 'csv') {
      importCSVFile(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      importExcel(file);
    } else {
      showToast('不支持的文件格式');
    }
  };
  input.click();
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.lists && Array.isArray(imported.lists)) {
        imported.lists.forEach(importedList => {
          const existingList = data.lists.find(l => l.name === importedList.name);
          if (existingList) {
            (importedList.words || []).forEach(word => {
              if (!existingList.words.some(w => w.english === word.english && w.chinese === word.chinese)) {
                existingList.words.push(createWord(word.english, word.chinese));
              }
            });
            if (importedList.ecMistakes) {
              importedList.ecMistakes.forEach(m => {
                if (!existingList.ecMistakes.some(x => x.english === m.english && x.chinese === m.chinese)) {
                  existingList.ecMistakes.push(m);
                }
              });
            }
            if (importedList.ceMistakes) {
              importedList.ceMistakes.forEach(m => {
                if (!existingList.ceMistakes.some(x => x.english === m.english && x.chinese === m.chinese)) {
                  existingList.ceMistakes.push(m);
                }
              });
            }
          } else {
            data.lists.push({ ...importedList, id: data.nextId++ });
          }
        });
        saveData();
        showToast('数据导入成功（已自动合并同名列表）');
        window.dispatchEvent(new CustomEvent('data-changed'));
      }
    } catch (err) {
      showToast('导入失败，文件格式错误');
    }
  };
  reader.readAsText(file);
}

function importCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    const words = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const english = parts[0].trim();
        const chinese = parts.slice(1).join(',').trim();
        if (english && chinese) words.push({ english, chinese });
      }
    }
    if (words.length === 0) { showToast('未识别到有效数据'); return; }
    confirmImportWords(words);
  };
  reader.readAsText(file);
}

function importExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const words = [];
      for (const row of rows) {
        if (row.length >= 2) {
          const english = String(row[0] || '').trim();
          const chinese = String(row[1] || '').trim();
          if (english && chinese) words.push({ english, chinese });
        }
      }
      if (words.length === 0) { showToast('未识别到有效数据'); return; }
      confirmImportWords(words);
    } catch (err) {
      showToast('Excel 解析失败，请检查文件格式');
    }
  };
  reader.readAsArrayBuffer(file);
}

function confirmImportWords(words) {
  const preview = words.slice(0, 10).map(w => `${w.english} - ${w.chinese}`).join('<br>');
  const more = words.length > 10 ? `<br>... 等共 ${words.length} 条` : '';
  
  showModal('确认导入',
    `<p class="mb-2 text-sm text-gray-500">识别到 ${words.length} 个单词：</p>
     <div class="max-h-40 overflow-y-auto mb-4 p-2 bg-gray-50 rounded text-sm">${preview}${more}</div>
     <label class="text-sm">
       <input type="checkbox" id="import-new-list" checked> 创建新列表
     </label>
     <input type="text" id="import-list-name" class="w-full p-2 border rounded-lg mt-1" placeholder="列表名称">`,
    [
      { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '导入', onClick: () => doImportWords(words), className: 'px-4 py-2 rounded-lg bg-green-600 text-white' }
    ]
  );
}

function doImportWords(words) {
  const createNew = document.getElementById('import-new-list').checked;
  const listName = document.getElementById('import-list-name').value.trim() || `导入 ${new Date().toLocaleDateString()}`;
  
  if (createNew) {
    const newList = {
      id: data.nextId++,
      name: listName,
      words: [],
      ecMistakes: [],
      ceMistakes: []
    };
    words.forEach(w => newList.words.push(createWord(w.english, w.chinese)));
    data.lists.push(newList);
  } else {
    if (!currentList) { showToast('请先选择一个列表'); return; }
    let added = 0;
    words.forEach(w => {
      if (!currentList.words.some(x => x.english === w.english && x.chinese === w.chinese)) {
        currentList.words.push(createWord(w.english, w.chinese));
        added++;
      }
    });
  }
  
  saveData();
  hideModal();
  showToast(`成功导入 ${words.length} 个单词`);
  window.dispatchEvent(new CustomEvent('data-changed'));
}

/** 批量编辑（textarea JSON 模式） */
export function showBatchEdit(list) {
  if (!list) { showToast('请先选择一个列表'); return; }
  
  const text = JSON.stringify(list.words.map(w => ({
    english: w.english,
    chinese: w.chinese
  })), null, 2);
  
  showModal('批量编辑',
    `<p class="text-sm text-gray-500 mb-3">以 JSON 数组形式编辑，每项含 english/chinese 字段</p>
     <textarea id="batch-edit-textarea" class="w-full p-3 border border-gray-300 rounded-lg h-64 batch-textarea">${text}</textarea>`,
    [
      { text: '取消', onClick: hideModal, className: 'px-4 py-2 rounded-lg bg-gray-400 text-white' },
      { text: '保存', onClick: () => {
        try {
          const newWords = JSON.parse(document.getElementById('batch-edit-textarea').value);
          if (!Array.isArray(newWords)) throw new Error('格式错误');
          
          // 保留原有单词的 SM-2 等附加字段
          const oldMap = {};
          list.words.forEach(w => { oldMap[w.english] = w; });
          
          list.words = newWords.map(w => {
            const old = oldMap[w.english];
            if (old && old.chinese === w.chinese) {
              return { ...old, english: w.english, chinese: w.chinese };
            }
            return createWord(w.english, w.chinese);
          });
          
          saveData();
          hideModal();
          showToast(`已更新，共 ${list.words.length} 个单词`);
          window.dispatchEvent(new CustomEvent('data-changed'));
        } catch (err) {
          showToast('JSON 格式错误，请检查');
        }
      }, className: 'px-4 py-2 rounded-lg bg-green-600 text-white' }
    ]
  );
}

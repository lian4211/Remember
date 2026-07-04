// ==================== 语音播放模块 ====================
// 使用 Web Speech API，自动选择 Edge/微软高质量 Neural 语音

import { data, saveData } from './data.js';
import { showToast } from './ui.js';

let selectedVoice = null;
let voicesLoaded = false;

/** 等待语音列表加载完成 */
function waitForVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
}

/** 选择最佳英文语音：优先微软 Neural 语音 */
function findBestVoice(voices) {
  // 优先级：微软 Neural (Zira/Jenny/Aria) > 微软其他英文 > Google UK > 首个 en-US
  const priorityPatterns = [
    /Microsoft.*(?:Zira|Jenny|Aria|Nancy|Sara)/i,
    /Microsoft.*English/i,
    /Google UK/i,
    /Google US/i,
  ];
  const enVoices = voices.filter(v => v.lang && v.lang.startsWith('en'));
  for (const pattern of priorityPatterns) {
    const match = enVoices.find(v => pattern.test(v.name));
    if (match) return match;
  }
  // 找任何 en-US 或 en 语音
  return enVoices.find(v => v.lang === 'en-US') || enVoices[0] || null;
}

/** 解析语音设置值 */
function parseSetting(value, isPitch) {
  value = value.replace(/[+%Hz]/g, '');
  return parseInt(value) || 0;
}

/** 播放英文语音（自动选最佳语音） */
export async function playVoice(text) {
  try {
    if (!voicesLoaded) {
      const voices = await waitForVoices();
      selectedVoice = findBestVoice(voices);
      voicesLoaded = true;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const rate = parseSetting(data.voiceSettings.rate);
    const volume = parseSetting(data.voiceSettings.volume);
    const pitch = parseSetting(data.voiceSettings.pitch, true);

    utterance.rate = Math.max(0.5, Math.min(2, 1 + (rate / 100)));
    utterance.volume = Math.max(0, Math.min(1, 1 + (volume / 100)));
    utterance.pitch = Math.max(0, Math.min(2, 1 + (pitch / 20)));
    utterance.lang = 'en-US';
    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('语音播放失败:', e);
    showToast('语音播放失败，请开启浏览器语音权限');
  }
}

/** 获取当前使用的语音名称（供设置页显示） */
export function getCurrentVoiceName() {
  return selectedVoice?.name || '默认';
}

/** 初始化语音设置滑块 */
export function initVoiceSettings() {
  // 预加载语音
  waitForVoices().then(voices => {
    selectedVoice = findBestVoice(voices);
    voicesLoaded = true;
  });

  const rateSlider = document.getElementById('rate-slider');
  const volumeSlider = document.getElementById('volume-slider');
  const pitchSlider = document.getElementById('pitch-slider');

  const rate = parseSetting(data.voiceSettings.rate);
  const volume = parseSetting(data.voiceSettings.volume);
  const pitch = parseSetting(data.voiceSettings.pitch, true);

  rateSlider.value = rate;
  volumeSlider.value = volume;
  pitchSlider.value = pitch;
  document.getElementById('rate-value').textContent = `${rate}%`;
  document.getElementById('volume-value').textContent = `${volume}%`;
  document.getElementById('pitch-value').textContent = `${pitch}Hz`;

  // 滑块实时更新
  rateSlider.addEventListener('input', () => {
    document.getElementById('rate-value').textContent = `${rateSlider.value}%`;
  });
  volumeSlider.addEventListener('input', () => {
    document.getElementById('volume-value').textContent = `${volumeSlider.value}%`;
  });
  pitchSlider.addEventListener('input', () => {
    document.getElementById('pitch-value').textContent = `${pitchSlider.value}Hz`;
  });

  // 保存按钮
  document.getElementById('save-voice-btn').addEventListener('click', () => {
    data.voiceSettings = {
      rate: `${rateSlider.value >= 0 ? '+' : ''}${rateSlider.value}%`,
      volume: `${volumeSlider.value >= 0 ? '+' : ''}${volumeSlider.value}%`,
      pitch: `${pitchSlider.value >= 0 ? '+' : ''}${pitchSlider.value}Hz`
    };
    saveData();
    showToast('语音设置已保存');
  });

  // 显示当前语音
  const nameEl = document.getElementById('voice-name-display');
  if (nameEl) {
    const updateVoiceName = () => {
      nameEl.textContent = `当前语音: ${getCurrentVoiceName()}`;
    };
    updateVoiceName();
    setTimeout(updateVoiceName, 500); // 等语音列表加载完再更新一次
  }
}

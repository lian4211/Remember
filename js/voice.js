// ==================== 语音播放模块 ====================
// 基于 Web Speech API 的 TTS 播放

import { data, saveData } from './data.js';
import { showToast } from './ui.js';

/** 解析语音设置值 */
function parseSetting(value, isPitch) {
  value = value.replace(/[+%Hz]/g, '');
  return parseInt(value) || 0;
}

/** 播放英文语音 */
export async function playVoice(text) {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const rate = parseSetting(data.voiceSettings.rate);
    const volume = parseSetting(data.voiceSettings.volume);
    const pitch = parseSetting(data.voiceSettings.pitch, true);

    utterance.rate = Math.max(0.5, Math.min(2, 1 + (rate / 100)));
    utterance.volume = Math.max(0, Math.min(1, 1 + (volume / 100)));
    utterance.pitch = Math.max(0, Math.min(2, 1 + (pitch / 20)));
    utterance.lang = 'en-US';

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('语音播放失败:', e);
    showToast('语音播放失败，请开启浏览器语音权限');
  }
}

/** 初始化语音设置滑块 */
export function initVoiceSettings() {
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
}

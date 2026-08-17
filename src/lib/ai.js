import { toDataURL } from './imageUtils';

const SETTINGS_KEY = 'aiSettings';

export const DEFAULT_SETTINGS = {
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  protocol: 'gemini', // 'gemini' | 'openai'
  model: 'gemini-2.5-flash'
};

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function dataURLParts(dataURL) {
  const [mimeInfo, base64Data] = dataURL.split(',');
  const mimeType = (mimeInfo.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  return { mimeType, base64Data };
}

/* ---------------- Gemini 原生协议 ---------------- */
async function callGemini(settings, prompt, images) {
  const base = settings.baseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/v1beta/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;

  const parts = [{ text: prompt }];
  for (const img of images) {
    const dataURL = await toDataURL(img);
    const { mimeType, base64Data } = dataURLParts(dataURL);
    parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini 请求失败 (${response.status})`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 返回内容为空');
  return text;
}

/* ---------------- OpenAI 兼容协议 ---------------- */
async function callOpenAI(settings, prompt, images) {
  const base = settings.baseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/v1/chat/completions`;

  const content = [{ type: 'text', text: prompt }];
  for (const img of images) {
    const dataURL = await toDataURL(img);
    content.push({ type: 'image_url', image_url: { url: dataURL } });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({ model: settings.model, messages: [{ role: 'user', content }] })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI 兼容接口请求失败 (${response.status})`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('模型返回内容为空');
  return text;
}

/**
 * 统一 AI 调用入口
 * @param {string} prompt 文本提示词
 * @param {Array<Blob|string|{blob:Blob}>} images 可选多模态图片
 */
export async function generateAIResponse(prompt, images = []) {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error('请先在「AI与系统设置」中配置 API Key');
  if (!settings.baseUrl) throw new Error('请先配置接口地址 Base URL');

  return settings.protocol === 'openai'
    ? callOpenAI(settings, prompt, images)
    : callGemini(settings, prompt, images);
}

/** 测试连接：发送最小文本请求验证配置可用 */
export async function testConnection() {
  const reply = await generateAIResponse('请只回复两个字：正常');
  return reply.slice(0, 50);
}

export const generateAIResponse = async (prompt, images = []) => {
  const settings = JSON.parse(localStorage.getItem('aiSettings') || '{}');
  const url = settings.url || 'https://generativelanguage.googleapis.com';
  const key = settings.key;
  const model = settings.model || 'gemini-1.5-pro';

  if (!key) throw new Error("请先在设置中配置 API Key");

  const endpoint = `${url}/v1beta/models/${model}:generateContent?key=${key}`;

  const parts = [{ text: prompt }];

  // Handle images if any
  if (images && images.length > 0) {
    for (const img of images) {
       // assuming image is data:image/jpeg;base64,....
       const [mimeInfo, base64Data] = img.split(',');
       const mimeType = mimeInfo.match(/:(.*?);/)[1];
       parts.push({
         inline_data: {
           mime_type: mimeType,
           data: base64Data
         }
       });
    }
  }

  const payload = {
    contents: [{ parts }]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'AI 请求失败');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

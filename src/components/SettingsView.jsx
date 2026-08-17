import React, { useState, useEffect } from 'react';
import { Bot, Link, Key, Box } from 'lucide-react';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    url: 'https://generativelanguage.googleapis.com',
    key: '',
    model: 'gemini-1.5-pro'
  });
  
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('aiSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('aiSettings', JSON.stringify(settings));
    setSaveStatus('设置已安全保存到浏览器本地缓存！');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">前台 AI 代理设置</h2>
      
      <div className="card space-y-6">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3">
          <Bot className="shrink-0 mt-0.5" />
          <p className="text-sm">系统支持直接前台调用 AI大模型（如 Gemini 3.1 Pro 多模态），实现截图解析与数据复盘大盘生成。数据仅保存在您的浏览器本地。</p>
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Link size={16}/> 接口代理地址 (Base URL)</label>
          <input 
            type="text" 
            className="input-field" 
            value={settings.url} 
            onChange={e => setSettings({...settings, url: e.target.value})}
            placeholder="例如: https://your-proxy-domain.com" 
          />
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Key size={16}/> API Key</label>
          <input 
            type="password" 
            className="input-field" 
            value={settings.key} 
            onChange={e => setSettings({...settings, key: e.target.value})}
            placeholder="输入您的秘钥" 
          />
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Box size={16}/> 模型名称 (Model Protocol)</label>
          <input 
            type="text" 
            className="input-field" 
            value={settings.model} 
            onChange={e => setSettings({...settings, model: e.target.value})}
            placeholder="例如: gemini-1.5-pro" 
          />
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-4">
          保存配置 (Local Storage)
        </button>
        
        {saveStatus && <p className="text-green-600 text-center font-medium">{saveStatus}</p>}
      </div>
    </div>
  );
}

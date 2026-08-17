import React, { useState, useEffect, useRef } from 'react';
import { Bot, Link, Key, Box, Network, CheckCircle2, AlertCircle, Loader2, Download, Upload, Database } from 'lucide-react';
import { getSettings, saveSettings, testConnection, DEFAULT_SETTINGS } from '../lib/ai';
import { exportAllData, importData } from '../lib/backup';

export default function SettingsView() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState('');
  const [testState, setTestState] = useState({ loading: false, ok: '', err: '' });
  const [backupMsg, setBackupMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaveStatus('设置已保存到浏览器本地！');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleTest = async () => {
    saveSettings(settings);
    setTestState({ loading: true, ok: '', err: '' });
    try {
      const reply = await testConnection();
      setTestState({ loading: false, ok: `连接成功，模型响应：${reply}`, err: '' });
    } catch (e) {
      setTestState({ loading: false, ok: '', err: '连接失败：' + e.message });
    }
  };

  const handleExport = async () => {
    try {
      const count = await exportAllData();
      setBackupMsg(`已导出 ${count} 条复盘记录（含图片）。`);
    } catch (e) {
      setBackupMsg('导出失败：' + e.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = confirm(
      '点击「确定」= 合并导入（按日期跳过重复）\n点击「取消」= 中止导入'
    );
    if (!mode) { e.target.value = ''; return; }
    try {
      const text = await file.text();
      const { imported, skipped } = await importData(text, 'merge');
      setBackupMsg(`导入完成：新增 ${imported} 条，跳过重复 ${skipped} 条。刷新页面查看。`);
    } catch (err) {
      setBackupMsg('导入失败：' + err.message);
    }
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">AI 与系统设置</h2>

      <div className="card space-y-6">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3">
          <Bot className="shrink-0 mt-0.5" />
          <p className="text-sm">前台直连大模型（Gemini 多模态或 OpenAI 兼容接口），实现截图解析与复盘洞察。密钥仅保存在您的浏览器本地，不上传任何服务器。国内访问 Google 接口请将 Base URL 填为您的代理地址。</p>
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Network size={16}/> 模型协议 (Protocol)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSettings({
                ...settings,
                protocol: 'gemini',
                baseUrl: settings.baseUrl.includes('generativelanguage') || settings.protocol === 'gemini' ? settings.baseUrl : 'https://generativelanguage.googleapis.com',
                model: settings.protocol === 'gemini' ? settings.model : 'gemini-2.5-flash'
              })}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${settings.protocol === 'gemini' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="font-medium text-gray-800">Gemini 原生</p>
              <p className="text-xs text-gray-500 mt-1">generateContent 接口，支持多模态图片</p>
            </button>
            <button
              onClick={() => setSettings({
                ...settings,
                protocol: 'openai',
                baseUrl: settings.protocol === 'openai' ? settings.baseUrl : 'https://api.openai.com',
                model: settings.protocol === 'openai' ? settings.model : 'gpt-4o-mini'
              })}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${settings.protocol === 'openai' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="font-medium text-gray-800">OpenAI 兼容</p>
              <p className="text-xs text-gray-500 mt-1">chat/completions 接口（DeepSeek/通义等）</p>
            </button>
          </div>
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Link size={16}/> 接口地址 (Base URL)</label>
          <input
            type="text"
            className="input-field"
            value={settings.baseUrl}
            onChange={e => setSettings({...settings, baseUrl: e.target.value})}
            placeholder={settings.protocol === 'gemini' ? 'https://generativelanguage.googleapis.com 或你的反代地址' : 'https://api.openai.com 或兼容服务地址'}
          />
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Key size={16}/> API Key</label>
          <input
            type="password"
            className="input-field"
            value={settings.apiKey}
            onChange={e => setSettings({...settings, apiKey: e.target.value})}
            placeholder="输入您的密钥"
          />
        </div>

        <div>
          <label className="label-text flex items-center gap-2"><Box size={16}/> 模型名称 (Model)</label>
          <input
            type="text"
            className="input-field"
            value={settings.model}
            onChange={e => setSettings({...settings, model: e.target.value})}
            placeholder={settings.protocol === 'gemini' ? '例如: gemini-2.5-flash' : '例如: gpt-4o-mini'}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} className="btn-primary flex-1">保存配置</button>
          <button onClick={handleTest} disabled={testState.loading} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            {testState.loading && <Loader2 size={16} className="animate-spin"/>}
            测试连接
          </button>
        </div>

        {saveStatus && <p className="text-green-600 text-center font-medium flex items-center justify-center gap-1"><CheckCircle2 size={16}/>{saveStatus}</p>}
        {testState.ok && <p className="text-green-600 text-sm flex items-center gap-2 bg-green-50 p-3 rounded-lg"><CheckCircle2 size={16} className="shrink-0"/>{testState.ok}</p>}
        {testState.err && <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg"><AlertCircle size={16} className="shrink-0"/>{testState.err}</p>}
      </div>

      <div className="card space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Database size={18}/> 数据备份与迁移</h3>
        <p className="text-sm text-gray-500">数据保存在浏览器 IndexedDB 中，清除浏览器数据或更换设备/域名会丢失。建议定期导出 JSON 备份（图片已内嵌）。</p>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Download size={16}/> 导出全部数据 (JSON)
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Upload size={16}/> 从备份导入
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </div>
        {backupMsg && <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">{backupMsg}</p>}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { generateAIResponse } from '../lib/ai';
import { importSeedData } from '../lib/seedData';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sparkles, TrendingUp, AlertCircle, PlusCircle, Bot, DollarSign, ShoppingCart, Percent, FileInput, Activity } from 'lucide-react';
import DiffChip, { diffText, METRIC_LABELS } from './DiffChip';

const REPORT_KEY = 'graiAiReport';

function loadCachedReport(fingerprint) {
  try {
    const cached = JSON.parse(localStorage.getItem(REPORT_KEY) || 'null');
    return cached && cached.fingerprint === fingerprint ? cached : null;
  } catch {
    return null;
  }
}

export default function Dashboard({ onNavigate }) {
  const reflections = useLiveQuery(() => db.reflections.orderBy('date').reverse().toArray());
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [cacheInfo, setCacheInfo] = useState('');
  const [seedMsg, setSeedMsg] = useState('');

  if (!reflections) return <div>加载中...</div>;

  const fingerprint = `${reflections.length}-${reflections[0]?.updatedAt || 0}`;

  const generateSummary = async (force = false) => {
    if (reflections.length === 0) return;
    if (!force) {
      const cached = loadCachedReport(fingerprint);
      if (cached) {
        setAiSummary(cached.report);
        setCacheInfo(`缓存报告 · 生成于 ${new Date(cached.generatedAt).toLocaleString('zh-CN')}`);
        return;
      }
    }
    setLoadingAI(true);
    setCacheInfo('');
    try {
      const recentData = reflections.slice(0, 10).map((r) => ({
        date: r.date,
        metrics: r.metrics,
        goal: r.goal?.projectGoal,
        status: r.result?.status,
        highlights: r.result?.highlights,
        keyEvents: r.analysis?.keyEvents,
        countermeasures: r.insight?.countermeasures
      }));

      // JS 预计算最新一次 vs 上一次的指标 Diff，AI 不做算术只做诊断
      const latest = reflections[0];
      const prev = reflections[1];
      const diffLines = prev
        ? Object.keys(METRIC_LABELS).map((k) => diffText(k, latest.metrics?.[k], prev.metrics?.[k])).filter(Boolean)
        : [];

      const prompt = `你是资深跨境电商营销诊断专家（业务诊断大脑，不是总结工具）。以下是我最近的GRAI复盘数据（按时间倒序）：
${JSON.stringify(recentData)}

${prev ? `【最新复盘（${latest.date}）vs 上一次（${prev.date}）的指标 Diff，已预计算】\n${diffLines.length ? diffLines.join('\n') : '（暂无可对比数值）'}` : ''}

请严格按以下结构生成诊断报告：
1. **指标趋势对比表**：Markdown 表格对比各期关键指标（曝光、CTR、CPC、花费、转化量、ROAS），对显著恶化/改善的维度在表格后用一句话给出诊断结论。
2. **差异化诊断**：结合 Diff 数据指出当前最值得警惕的 1-2 个信号，并给出具体排查方向（如：CTR 骤降 → 优先检查广告竞价位置、主图吸引力或 Buybox 状态；曝光下降 → 检查预算消耗与竞价倍率；有点击无转化 → 检查价格力、Listing 内容质量与促销状态）。
3. **动作有效性分析**：最近采取的动作（如调整竞价倍率、改主图、调CPC）哪些有效应加持、哪些无效应下架停止。
4. **行动项 To-Do List**：3-5 条，每条必须带时间节点，格式为「- [ ] （时限：如 3天内 / 本周内）具体动作 — 预期验证指标」。
输出格式要求清晰、一目了然，多用表格，禁止长篇大论。`;

      const response = await generateAIResponse(prompt);
      setAiSummary(response);
      localStorage.setItem(REPORT_KEY, JSON.stringify({ fingerprint, report: response, generatedAt: Date.now() }));
    } catch (error) {
      alert('AI 生成失败: ' + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSeedImport = async () => {
    const { imported, skipped } = await importSeedData();
    setSeedMsg(imported > 0 ? `已导入 ${imported} 条历史复盘${skipped ? `，跳过重复 ${skipped} 条` : ''}。` : '历史复盘已全部存在，无需导入。');
  };

  const chartData = [...reflections].reverse().slice(-14).map((r) => ({
    date: r.date.slice(5),
    ctr: parseFloat(r.metrics?.ctr) || 0,
    spend: parseFloat(r.metrics?.spend) || 0,
    cpc: parseFloat(r.metrics?.cpc) || 0,
    orders: parseInt(r.metrics?.orders) || 0,
    roas: parseFloat(r.metrics?.roas) || 0,
    impressions: parseInt(r.metrics?.impressions) || 0
  }));

  const num = (v) => parseFloat(v) || 0;
  const totalSpend = reflections.reduce((s, r) => s + num(r.metrics?.spend), 0);
  const totalOrders = reflections.reduce((s, r) => s + (parseInt(r.metrics?.orders) || 0), 0);
  const last7 = reflections.slice(0, 7);
  const avgCtr7 = last7.length ? last7.reduce((s, r) => s + num(r.metrics?.ctr), 0) / last7.length : 0;
  const roasList = reflections.map((r) => num(r.metrics?.roas)).filter((v) => v > 0);
  const avgRoas = roasList.length ? roasList.reduce((s, v) => s + v, 0) / roasList.length : 0;

  const statCards = [
    { label: '近7次平均 CTR', value: avgCtr7.toFixed(2) + '%', icon: <Percent size={20}/>, color: 'text-blue-600 bg-blue-100' },
    { label: '累计花费', value: '$' + totalSpend.toFixed(2), icon: <DollarSign size={20}/>, color: 'text-orange-600 bg-orange-100' },
    { label: '累计转化单量', value: totalOrders + ' 单', icon: <ShoppingCart size={20}/>, color: 'text-purple-600 bg-purple-100' },
    { label: '平均 ROAS', value: avgRoas ? avgRoas.toFixed(2) : '-', icon: <Activity size={20}/>, color: 'text-green-600 bg-green-100' }
  ];

  // 最新一次 vs 上一次 的涨跌对比条
  const latestRec = reflections[0];
  const prevRec = reflections[1];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">概览与复盘大盘</h2>
          <p className="text-gray-500 mt-1">持续跟踪动作反馈，迭代营销策略</p>
        </div>
        <button onClick={() => onNavigate('new')} className="btn-primary flex items-center gap-2">
          <PlusCircle size={18}/> 记录今日复盘
        </button>
      </div>

      {reflections.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((c) => (
              <div key={c.label} className="card py-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${c.color}`}>{c.icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-xl font-bold text-gray-800">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {prevRec && (
            <div className="card py-4">
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-500"/>
                最新复盘（{latestRec.date}）vs 上一次（{prevRec.date}）· 红涨绿跌
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-800">{latestRec.metrics?.[key] || '-'}</span>
                    <DiffChip curr={latestRec.metrics?.[key]} prev={prevRec.metrics?.[key]} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card h-80">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> CTR 与 CPC 趋势</h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#2563eb" name="CTR (%)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="cpc" stroke="#16a34a" name="CPC ($)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card h-80">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-orange-500"/> 花费与转化量趋势</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12}/>
                  <YAxis yAxisId="left" fontSize={12}/>
                  <YAxis yAxisId="right" orientation="right" fontSize={12}/>
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="spend" fill="#f97316" name="花费 ($)" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="orders" fill="#8b5cf6" name="转化订单 (单)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card h-80">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-green-600"/> ROAS 走势</h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="roas" stroke="#16a34a" name="ROAS" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card h-80">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-600"/> 曝光量趋势</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12}/>
                  <YAxis fontSize={12}/>
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="impressions" fill="#0891b2" name="曝光量" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-xl flex items-center gap-2 text-blue-900">
                  <Sparkles className="text-blue-600"/> AI 深度策略对比洞察
                </h3>
                {cacheInfo && <p className="text-xs text-gray-500 mt-1">{cacheInfo}（数据有更新后会自动重新生成）</p>}
              </div>
              <div className="flex gap-2">
                {aiSummary && (
                  <button onClick={() => generateSummary(true)} disabled={loadingAI} className="btn-secondary text-sm">
                    强制重新生成
                  </button>
                )}
                <button onClick={() => generateSummary(false)} disabled={loadingAI} className="btn-primary flex items-center gap-2 shadow-md">
                  {loadingAI ? 'AI 分析中...' : aiSummary ? '查看/刷新报告' : '生成多维比对报告'}
                </button>
              </div>
            </div>
            {aiSummary ? (
              <div className="prose max-w-none bg-white p-6 rounded-lg shadow-inner">
                <ReactMarkdown>{aiSummary}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                <Bot size={48} className="text-gray-300 mb-4" />
                <p>点击按钮，AI 将根据您的多日复盘数据，输出指标对比表、动作有效性分析、下架建议与改进方向。</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card text-center py-20 flex flex-col items-center justify-center border-dashed border-2 border-gray-300">
          <AlertCircle size={48} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">暂无复盘数据</h3>
          <p className="text-gray-500 mb-6">建立并记录你的第一个 GRAI 复盘，开启系统化迭代之路。</p>
          <div className="flex gap-3">
            <button onClick={() => onNavigate('new')} className="btn-primary">开始记录</button>
            <button onClick={handleSeedImport} className="btn-secondary flex items-center gap-2">
              <FileInput size={16}/> 导入历史手动复盘 (fupan.txt)
            </button>
          </div>
          {seedMsg && <p className="text-green-600 text-sm mt-4">{seedMsg}</p>}
        </div>
      )}
    </div>
  );
}

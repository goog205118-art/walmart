import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { generateAIResponse } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sparkles, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const reflections = useLiveQuery(() => db.reflections.orderBy('date').reverse().toArray());
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const generateSummary = async () => {
    if (!reflections || reflections.length === 0) return;
    setLoadingAI(true);
    
    // Select latest 5 days for analysis
    const recentData = reflections.slice(0, 5).map(r => ({
      date: r.date,
      metrics: r.metrics,
      analysis: r.analysis.keyEvents,
      insight: r.insight.countermeasures
    }));

    const prompt = `你是一个资深的跨境电商营销专家。以下是我最近的GRAI复盘数据：
${JSON.stringify(recentData)}

请帮我生成一份深刻的洞察报告：
1. 用可视化表格对比关键指标的变化趋势（CTR, CPC, 花费, 转化量等）。
2. 分析我最近采取的动作（如调整竞价倍率）是否有效。
3. 给出明确的下一步建议：哪些策略应该加持，哪些应该下架或停止，下一步的优化方向是什么？输出格式要求清晰一目了然。`;

    try {
      const response = await generateAIResponse(prompt);
      setAiSummary(response);
    } catch (error) {
      alert("AI 生成失败: " + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!reflections) return <div>加载中...</div>;

  const chartData = [...reflections].reverse().slice(-14).map(r => ({
    date: r.date.split('T')[0],
    ctr: parseFloat(r.metrics.ctr) || 0,
    spend: parseFloat(r.metrics.spend) || 0,
    cpc: parseFloat(r.metrics.cpc) || 0,
    orders: parseInt(r.metrics.orders) || 0
  }));

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card h-80">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> CTR 与 CPC 趋势</h3>
              <ResponsiveContainer width="100%" height="100%">
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
              <ResponsiveContainer width="100%" height="100%">
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
          </div>

          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-xl flex items-center gap-2 text-blue-900">
                <Sparkles className="text-blue-600"/> AI 深度策略对比洞察
              </h3>
              <button onClick={generateSummary} disabled={loadingAI} className="btn-primary flex items-center gap-2 shadow-md">
                {loadingAI ? 'AI 分析中...' : '生成最新多维比对报告'}
              </button>
            </div>
            {aiSummary ? (
              <div className="prose max-w-none bg-white p-6 rounded-lg shadow-inner">
                <ReactMarkdown>{aiSummary}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                <Bot size={48} className="text-gray-300 mb-4" />
                <p>点击按钮，AI 将根据您的多日复盘数据，提取表格并分析动作的有效性。</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card text-center py-20 flex flex-col items-center justify-center border-dashed border-2 border-gray-300">
          <AlertCircle size={48} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">暂无复盘数据</h3>
          <p className="text-gray-500 mb-6">建立并记录你的第一个 GRAI 复盘，开启系统化迭代之路。</p>
          <button onClick={() => onNavigate('new')} className="btn-primary">开始记录</button>
        </div>
      )}
    </div>
  );
}

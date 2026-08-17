import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteReflection } from '../lib/db';
import { generateAIResponse } from '../lib/ai';
import { Calendar, Trash2, Pencil, ChevronDown, ChevronUp, Search, GitCompareArrows, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function RecordImages({ reflectionId }) {
  const images = useLiveQuery(() => db.images.where({ reflectionId }).toArray(), [reflectionId]);
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    if (!images) return;
    const list = images.map((img) => URL.createObjectURL(img.blob));
    setUrls(list);
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  if (!urls.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt={`截图${i + 1}`} className="h-28 w-auto rounded border shadow-sm object-cover hover:opacity-80 transition-opacity" />
        </a>
      ))}
    </div>
  );
}

function DetailBlock({ title, color, content }) {
  if (!content) return null;
  return (
    <div>
      <span className={`font-semibold ${color} block mb-1`}>{title}</span>
      <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{content}</p>
    </div>
  );
}

export default function HistoryView({ onEdit }) {
  const reflections = useLiveQuery(() => db.reflections.orderBy('date').reverse().toArray());
  const [expandedId, setExpandedId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', keyword: '' });
  const [aiLoadingId, setAiLoadingId] = useState(null);

  if (!reflections) return <div>加载中...</div>;

  const filtered = reflections.filter((r) => {
    if (filters.from && r.date < filters.from) return false;
    if (filters.to && r.date > filters.to) return false;
    if (filters.status && r.result?.isCompleted !== filters.status) return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const haystack = JSON.stringify([r.goal, r.result, r.analysis, r.insight, r.aiSummary, r.aiExtractNote]).toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除这条复盘记录吗？关联截图将一并删除。')) {
      await deleteReflection(id);
      setCompareIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleAiSummary = async (record) => {
    setAiLoadingId(record.id);
    try {
      const prompt = `你是资深跨境电商运营顾问。请对以下单条 GRAI 复盘生成一段式总结（150 字以内），包含：当日数据表现一句话、核心问题一句话、下一步动作一句话。直接输出总结文字。
${JSON.stringify({ date: record.date, metrics: record.metrics, goal: record.goal, result: record.result, analysis: record.analysis, insight: record.insight })}`;
      const summary = await generateAIResponse(prompt);
      await db.reflections.update(record.id, { aiSummary: summary });
    } catch (e) {
      alert('AI 总结失败：' + e.message);
    } finally {
      setAiLoadingId(null);
    }
  };

  const compareRecords = compareIds.map((id) => reflections.find((r) => r.id === id)).filter(Boolean);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">历史归档簿</h2>
        <span className="text-sm text-gray-500">共 {filtered.length} / {reflections.length} 条</span>
      </div>

      {/* 筛选栏 */}
      <div className="card py-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label-text">起始日期</label>
          <input type="date" className="input-field w-40" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <label className="label-text">结束日期</label>
          <input type="date" className="input-field w-40" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div>
          <label className="label-text">完成状态</label>
          <select className="input-field w-32" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">全部</option><option>是</option><option>否</option><option>部分完成</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label-text">关键词搜索</label>
          <div className="relative">
            <Search size={16} className="absolute left-2.5 top-3 text-gray-400" />
            <input type="text" className="input-field pl-8" placeholder="搜索目标/动作/措施..." value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          </div>
        </div>
        {(filters.from || filters.to || filters.status || filters.keyword) && (
          <button className="btn-secondary" onClick={() => setFilters({ from: '', to: '', status: '', keyword: '' })}>清空筛选</button>
        )}
      </div>

      {/* 对比面板 */}
      {compareRecords.length === 2 && (
        <div className="card border-2 border-indigo-200 bg-indigo-50/30">
          <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2 mb-4"><GitCompareArrows size={20}/> 复盘对比</h3>
          <div className="grid grid-cols-2 gap-4">
            {compareRecords.map((r) => (
              <div key={r.id} className="bg-white rounded-lg p-4 border">
                <p className="font-bold text-blue-700 mb-2 flex items-center gap-2"><Calendar size={16}/>{r.date}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['曝光', r.metrics?.impressions || '-'], ['花费', r.metrics?.spend ? '$' + r.metrics.spend : '-'],
                      ['CTR', r.metrics?.ctr ? r.metrics.ctr + '%' : '-'], ['CPC', r.metrics?.cpc ? '$' + r.metrics.cpc : '-'],
                      ['单量', r.metrics?.orders || '-'], ['ROAS', r.metrics?.roas || '-'],
                      ['完成', r.result?.isCompleted || '-']
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-100"><td className="py-1.5 text-gray-500 w-14">{k}</td><td className="py-1.5 font-medium">{v}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 text-sm space-y-2">
                  <DetailBlock title="【动作】" color="text-orange-600" content={r.analysis?.keyEvents} />
                  <DetailBlock title="【措施】" color="text-green-700" content={r.insight?.countermeasures} />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-3 text-sm text-indigo-600 hover:underline" onClick={() => setCompareIds([])}>退出对比</button>
        </div>
      )}

      {/* 记录列表 */}
      <div className="space-y-4">
        {filtered.map((record) => {
          const expanded = expandedId === record.id;
          return (
            <div key={record.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" title="选择两条进行对比" checked={compareIds.includes(record.id)} onChange={() => toggleCompare(record.id)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                  <div className="bg-blue-100 text-blue-700 p-2 rounded-lg"><Calendar size={20} /></div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {record.date} 复盘
                      <span className={`text-xs px-2 py-0.5 rounded-full ${record.result?.isCompleted === '是' ? 'bg-green-100 text-green-700' : record.result?.isCompleted === '部分完成' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                        {record.result?.isCompleted === '是' ? '已完成' : record.result?.isCompleted || '未完成'}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500">
                      曝光 {record.metrics?.impressions || '-'} | 消耗 ${record.metrics?.spend || '-'} | CTR {record.metrics?.ctr || '-'}% | CPC ${record.metrics?.cpc || '-'} | 单量 {record.metrics?.orders || '-'} | ROAS {record.metrics?.roas || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setExpandedId(expanded ? null : record.id)} className="text-gray-500 hover:bg-gray-100 p-2 rounded transition-colors" title={expanded ? '收起' : '展开详情'}>
                    {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                  </button>
                  <button onClick={() => onEdit(record.id)} className="text-blue-500 hover:bg-blue-50 p-2 rounded transition-colors" title="编辑">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(record.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="删除">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {expanded ? (
                <div className="space-y-4 text-sm text-gray-700">
                  <RecordImages reflectionId={record.id} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailBlock title="【Goal 项目目标】" color="text-blue-700" content={record.goal?.projectGoal} />
                    <DetailBlock title="【Goal 阶段目标】" color="text-blue-700" content={record.goal?.corePhaseGoal} />
                    <DetailBlock title="【预算投入】" color="text-blue-700" content={record.goal?.budget} />
                    <DetailBlock title="【完成情况】" color="text-purple-700" content={record.result?.status} />
                    <DetailBlock title="【目标差距】" color="text-purple-700" content={record.result?.gap} />
                    <DetailBlock title="【亮点与不足】" color="text-purple-700" content={record.result?.highlights} />
                    <DetailBlock title="【新增目标】" color="text-purple-700" content={record.result?.newGoals} />
                    <DetailBlock title="【Action 动作回顾】" color="text-orange-600" content={record.analysis?.keyEvents} />
                    <DetailBlock title="【主观原因】" color="text-orange-600" content={record.analysis?.subjective} />
                    <DetailBlock title="【客观原因】" color="text-orange-600" content={record.analysis?.objective} />
                    <DetailBlock title="【Insight 应对措施】" color="text-green-700" content={record.insight?.countermeasures} />
                    <DetailBlock title="【经验总结】" color="text-green-700" content={record.insight?.summary} />
                  </div>
                  {record.aiExtractNote && (
                    <p className="text-sm text-blue-800 bg-blue-50 p-2 rounded">AI 截图摘要：{record.aiExtractNote}</p>
                  )}
                  <div className="bg-indigo-50/60 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-indigo-800 flex items-center gap-1"><Bot size={16}/> AI 单条总结</span>
                      <button onClick={() => handleAiSummary(record)} disabled={aiLoadingId === record.id} className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-200">
                        {aiLoadingId === record.id ? <Loader2 size={12} className="animate-spin"/> : null}
                        {record.aiSummary ? '重新生成' : '生成总结'}
                      </button>
                    </div>
                    {record.aiSummary
                      ? <div className="prose text-sm"><ReactMarkdown>{record.aiSummary}</ReactMarkdown></div>
                      : <p className="text-xs text-gray-400">尚未生成，点击右侧按钮由 AI 总结本条复盘。</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <DetailBlock title="【Action 动作回顾】" color="text-orange-600" content={record.analysis?.keyEvents || '无'} />
                  <DetailBlock title="【Insight 应对措施】" color="text-green-700" content={record.insight?.countermeasures || '无'} />
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-10">{reflections.length === 0 ? '暂无历史归档记录' : '没有符合筛选条件的记录'}</p>
        )}
      </div>
    </div>
  );
}

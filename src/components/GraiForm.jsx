import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, EMPTY_REFLECTION } from '../lib/db';
import { generateAIResponse } from '../lib/ai';
import { compressImage, formatSize } from '../lib/imageUtils';
import DiffChip, { diffText, METRIC_LABELS } from './DiffChip';
import ReactMarkdown from 'react-markdown';
import { Bot, Loader2, X, Sparkles, UploadCloud, PanelRightClose, PanelRightOpen, History, ListTodo } from 'lucide-react';

let imgKey = 0;

export default function GraiForm({ onNavigate, editId }) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareResult, setCompareResult] = useState('');
  const [images, setImages] = useState([]); // {key, id?, blob, previewUrl, size}
  const [formData, setFormData] = useState(EMPTY_REFLECTION);
  const [dragging, setDragging] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const objectUrlsRef = useRef([]);
  const fileInputRef = useRef(null);

  const isEdit = !!editId;

  // 最近一条历史记录（排除自身、不晚于当前日期优先），供右侧对照面板与 AI Diff 使用
  const prevRecord = useLiveQuery(async () => {
    const all = await db.reflections.orderBy('date').reverse().toArray();
    const others = all.filter((r) => r.id !== editId);
    return others.find((r) => r.date <= formData.date) || others[0] || null;
  }, [editId, formData.date]);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const record = await db.reflections.get(editId);
      if (!record) return;
      setFormData({ ...EMPTY_REFLECTION, ...record });
      const imgs = await db.images.where({ reflectionId: editId }).toArray();
      setImages(imgs.map((img) => {
        const previewUrl = URL.createObjectURL(img.blob);
        objectUrlsRef.current.push(previewUrl);
        return { key: ++imgKey, id: img.id, blob: img.blob, previewUrl, size: img.size };
      }));
    })();
  }, [editId]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const set = (path, value) => {
    setFormData((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] = { ...obj[keys[i]] };
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const processFiles = async (files) => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const { blob, size } = await compressImage(file);
        const previewUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(previewUrl);
        setImages((prev) => [...prev, { key: ++imgKey, blob, previewUrl, size }]);
      } catch (err) {
        alert('图片处理失败：' + err.message);
      }
    }
  };

  const handleImageUpload = (e) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files || []));
  };

  const removeImage = (key) => {
    setImages((prev) => prev.filter((img) => img.key !== key));
  };

  const handleAIExtract = async () => {
    if (images.length === 0) {
      alert('请先上传后台截图');
      return;
    }
    setLoadingAI(true);
    try {
      const prompt = `作为跨境电商运营助手，请提取这张（些）广告后台截图中的关键数据。
以严格的 JSON 格式返回，不要包含其他任何文本或 markdown 代码块：
{
  "impressions": "曝光量数值(纯数字)",
  "spend": "花费数值(纯数字)",
  "ctr": "点击率数值(纯数字不带%)",
  "cpc": "单次点击花费(纯数字)",
  "orders": "订单/转化数(纯数字)",
  "roas": "广告投入产出比(纯数字，无则留空字符串)",
  "note": "用中文一两句话概括截图中值得注意的数据现象"
}
无法识别的字段留空字符串。`;
      const responseText = await generateAIResponse(prompt, images);
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(jsonStr);
      setFormData((prev) => ({
        ...prev,
        metrics: {
          impressions: extracted.impressions || prev.metrics.impressions,
          spend: extracted.spend || prev.metrics.spend,
          ctr: extracted.ctr || prev.metrics.ctr,
          cpc: extracted.cpc || prev.metrics.cpc,
          orders: extracted.orders || prev.metrics.orders,
          roas: extracted.roas || prev.metrics.roas
        },
        aiExtractNote: extracted.note || prev.aiExtractNote
      }));
      alert('数据提取成功！已自动填入指标字段。');
    } catch (error) {
      alert('提取失败：' + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCompareHistory = async () => {
    setLoadingCompare(true);
    setCompareResult('');
    try {
      const recent = await db.reflections.orderBy('date').reverse().limit(5).toArray();
      const historyBrief = recent
        .filter((r) => r.id !== editId)
        .map((r) => ({ date: r.date, metrics: r.metrics, keyEvents: r.analysis?.keyEvents, countermeasures: r.insight?.countermeasures }));

      // JS 预计算指标 Diff，AI 不做算术只做诊断
      const diffLines = prevRecord
        ? Object.keys(METRIC_LABELS).map((k) => diffText(k, formData.metrics[k], prevRecord.metrics?.[k])).filter(Boolean)
        : [];

      const prompt = `你是资深跨境电商营销诊断专家（不是总结工具，而是业务诊断大脑）。

【本次复盘表单内容（${formData.date}）】
${JSON.stringify({ metrics: formData.metrics, goal: formData.goal, result: formData.result, analysis: formData.analysis })}

${prevRecord ? `【与上一次复盘（${prevRecord.date}）的指标 Diff，已预计算】\n${diffLines.length ? diffLines.join('\n') : '（暂无可对比数值）'}` : ''}

【最近历史复盘记录】
${JSON.stringify(historyBrief)}

请严格按以下结构输出：
1. **指标 Diff 诊断表**：Markdown 表格（指标 | 上次 | 本次 | 变化 | 诊断结论）。对下降/异常维度，明确给出排查方向（如：CTR 骤降 → 优先检查广告竞价位置、主图吸引力或 Buybox 状态；曝光下降 → 检查预算消耗与竞价倍率）。
2. **动作连贯性分析**：本次动作与历史动作的延续/冲突之处。
3. **差异化诊断**：结合历史数据指出本次最值得警惕的 1-2 个信号。
4. **行动项 To-Do List**：3-5 条，每条必须带时间节点，格式为「- [ ] （时限：如 3天内 / 本周内）具体动作 — 预期验证指标」。
要求简明扼要、一目了然，禁止长篇大论。`;
      const reply = await generateAIResponse(prompt, images);
      setCompareResult(reply);
    } catch (error) {
      alert('对比分析失败：' + error.message);
    } finally {
      setLoadingCompare(false);
    }
  };

  const saveReflection = async () => {
    try {
      const data = { ...formData, updatedAt: Date.now() };
      let reflectionId;
      if (isEdit) {
        reflectionId = editId;
        await db.reflections.update(editId, data);
        const existingIds = (await db.images.where({ reflectionId: editId }).toArray()).map((i) => i.id);
        const keptIds = images.filter((i) => i.id).map((i) => i.id);
        for (const oldId of existingIds) {
          if (!keptIds.includes(oldId)) await db.images.delete(oldId);
        }
      } else {
        reflectionId = await db.reflections.add({ ...data, createdAt: Date.now() });
      }
      for (const img of images) {
        if (!img.id) {
          await db.images.add({ reflectionId, blob: img.blob, width: 0, size: img.size });
        }
      }
      alert(isEdit ? '修改已保存！' : '保存成功！');
      onNavigate('history');
    } catch (error) {
      alert('保存失败：' + error.message);
    }
  };

  const metricFields = [
    ['impressions', '曝光量'],
    ['spend', '花费 ($)'],
    ['ctr', 'CTR (%)'],
    ['cpc', 'CPC ($)'],
    ['orders', '转化单量'],
    ['roas', 'ROAS']
  ];

  return (
    <div className="pb-12 animate-fade-in">
      <div className="flex justify-between items-center mb-6 max-w-none">
        <h2 className="text-3xl font-bold text-gray-800">{isEdit ? '编辑复盘' : '录入 GRAI 复盘'}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="btn-secondary hidden lg:flex items-center gap-2 text-sm"
            title="显示/隐藏历史对照面板"
          >
            {showPanel ? <PanelRightClose size={16}/> : <PanelRightOpen size={16}/>}
            {showPanel ? '收起对照' : '历史对照'}
          </button>
          <button onClick={saveReflection} className="btn-primary">保存归档</button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* ============ 主录入区 ============ */}
        <div className="flex-1 min-w-0 max-w-4xl space-y-8">
          {/* 拖拽上传 + 核心指标 */}
          <section className="card">
            <h3 className="text-xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">核心指标 & 截图解析</h3>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors mb-4 ${
                dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40'
              }`}
            >
              <UploadCloud size={32} className={`mx-auto mb-2 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-600 font-medium">拖拽广告后台截图到此处，或点击上传</p>
              <p className="text-xs text-gray-400 mt-1">自动压缩存储 · 上传后可用 AI 一键提取指标</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex gap-3 overflow-x-auto py-1 flex-1">
                  {images.map((img) => (
                    <div key={img.key} className="relative shrink-0 group">
                      <img src={img.previewUrl} alt="upload" className="h-24 w-auto rounded border shadow-sm object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); removeImage(img.key); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14}/>
                      </button>
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white px-1 rounded">{formatSize(img.size)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleAIExtract} disabled={loadingAI} className="shrink-0 text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-blue-200 font-medium">
                  {loadingAI ? <Loader2 size={14} className="animate-spin"/> : <Bot size={14}/>}
                  {loadingAI ? '解析中...' : 'AI 提取数据'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="label-text">日期</label><input type="date" className="input-field" value={formData.date} onChange={e => set('date', e.target.value)} /></div>
              {metricFields.map(([key, label]) => (
                <div key={key}>
                  <label className="label-text flex items-center justify-between">
                    <span>{label}</span>
                    {prevRecord && <DiffChip curr={formData.metrics[key]} prev={prevRecord.metrics?.[key]} />}
                  </label>
                  <input type="number" className="input-field" value={formData.metrics[key]} onChange={e => set(`metrics.${key}`, e.target.value)} />
                </div>
              ))}
            </div>
            {prevRecord && (
              <p className="text-xs text-gray-400 mt-2">指标标签旁的涨跌为与 {prevRecord.date} 复盘的实时对比（红涨绿跌）</p>
            )}

            {formData.aiExtractNote && (
              <p className="mt-3 text-sm text-blue-800 bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                <Sparkles size={16} className="shrink-0 mt-0.5"/> AI 截图摘要：{formData.aiExtractNote}
              </p>
            )}
          </section>

          {/* Goal */}
          <section className="card bg-blue-50/30">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">Goal (目标回顾)</h3>
            <div className="space-y-4">
              <div><label className="label-text">项目目标是什么？</label><input type="text" className="input-field" placeholder="例如：通过广告达到日均三单转化" value={formData.goal.projectGoal} onChange={e => set('goal.projectGoal', e.target.value)} /></div>
              <div><label className="label-text">核心阶段目标是什么？</label><input type="text" className="input-field" placeholder="例如：达到合理点击率从而促成成单效果" value={formData.goal.corePhaseGoal} onChange={e => set('goal.corePhaseGoal', e.target.value)} /></div>
              <div><label className="label-text">投入预算是多少？</label><input type="text" className="input-field" placeholder="例如：每日$15, cpc设置$0.2" value={formData.goal.budget} onChange={e => set('goal.budget', e.target.value)} /></div>
            </div>
          </section>

          {/* Result */}
          <section className="card bg-purple-50/30">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-purple-500 pl-3">Result (结果比对)</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label-text">目标是否完成？</label>
                  <select className="input-field" value={formData.result.isCompleted} onChange={e => set('result.isCompleted', e.target.value)}>
                    <option>是</option><option>否</option><option>部分完成</option>
                  </select>
                </div>
                <div className="flex-[2]">
                  <label className="label-text">目标完成情况描述</label>
                  <input type="text" className="input-field" placeholder="例如：差，700+曝光 1次点击..." value={formData.result.status} onChange={e => set('result.status', e.target.value)} />
                </div>
              </div>
              <div><label className="label-text">完成结果和原定目标的差距</label><textarea className="input-field h-20" placeholder="预期与实际的差距..." value={formData.result.gap} onChange={e => set('result.gap', e.target.value)} /></div>
              <div><label className="label-text">亮点与不足</label><textarea className="input-field h-20" placeholder="亮点：点击率稳步提升... 不足：未能带来转化..." value={formData.result.highlights} onChange={e => set('result.highlights', e.target.value)} /></div>
              <div><label className="label-text">是否新增了原定没有的项目目标？</label><input type="text" className="input-field" placeholder="例如：新增目标ctr从0.13%提升至1%" value={formData.result.newGoals} onChange={e => set('result.newGoals', e.target.value)} /></div>
            </div>
          </section>

          {/* Analysis */}
          <section className="card bg-orange-50/30">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-orange-500 pl-3">Analysis (分析原因)</h3>
            <div className="space-y-4">
              <div><label className="label-text">关键事件/动作回顾 (Action)</label><textarea className="input-field h-24" placeholder={'例如：1. 更改搜索竞价+20%\n2. 选择降低cpc预算'} value={formData.analysis.keyEvents} onChange={e => set('analysis.keyEvents', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-text">形成差距的主观原因</label><textarea className="input-field h-24" placeholder="主观判断失误等..." value={formData.analysis.subjective} onChange={e => set('analysis.subjective', e.target.value)} /></div>
                <div><label className="label-text">形成差距的客观原因</label><textarea className="input-field h-24" placeholder="大盘流量、广告算法、页面吸引力等..." value={formData.analysis.objective} onChange={e => set('analysis.objective', e.target.value)} /></div>
              </div>
            </div>
          </section>

          {/* Insight */}
          <section className="card bg-green-50/30">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-green-500 pl-3">Insight (规律总结)</h3>
            <div className="space-y-4">
              <div><label className="label-text">通过原因分析出的对应应对措施 (下架/加持/测试)</label><textarea className="input-field h-24" placeholder="明确执行指令，例如：3天内成效差则停止跑量；增加竞价倍数..." value={formData.insight.countermeasures} onChange={e => set('insight.countermeasures', e.target.value)} /></div>
              <div><label className="label-text">本次项目经验总结提升</label><textarea className="input-field h-24" placeholder="行业知识模型沉淀..." value={formData.insight.summary} onChange={e => set('insight.summary', e.target.value)} /></div>
            </div>
          </section>

          {/* AI 诊断 */}
          <section className="card border-dashed border-2 border-indigo-200 bg-indigo-50/40">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Bot size={20}/> AI 差异化诊断（可选）</h3>
              <button onClick={handleCompareHistory} disabled={loadingCompare} className="btn-secondary flex items-center gap-2 text-indigo-700 border-indigo-300">
                {loadingCompare ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                {loadingCompare ? '诊断中...' : '生成诊断 + To-Do'}
              </button>
            </div>
            {compareResult ? (
              <div className="prose bg-white p-4 rounded-lg"><ReactMarkdown>{compareResult}</ReactMarkdown></div>
            ) : (
              <p className="text-sm text-gray-500">基于当前表单与最近 5 条历史复盘，输出指标 Diff 诊断表、异常排查方向与带时间节点的行动项清单。</p>
            )}
          </section>

          <div className="flex justify-end">
            <button onClick={saveReflection} className="btn-primary py-3 px-8 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
              {isEdit ? '保存修改' : '落库保存复盘'}
            </button>
          </div>
        </div>

        {/* ============ 右侧历史对照面板 ============ */}
        {showPanel && (
          <aside className="w-80 shrink-0 sticky top-0 space-y-4 hidden lg:block">
            <div className="card py-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <History size={16} className="text-blue-600"/> 历史对照
                {prevRecord && <span className="text-xs font-normal text-gray-400">{prevRecord.date}</span>}
              </h4>
              {prevRecord ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b">
                      <th className="text-left py-1 font-normal">指标</th>
                      <th className="text-right py-1 font-normal">上次</th>
                      <th className="text-right py-1 font-normal">本次</th>
                      <th className="text-right py-1 font-normal">涨跌</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(METRIC_LABELS).map(([key, label]) => {
                      const prevVal = prevRecord.metrics?.[key];
                      const currVal = formData.metrics[key];
                      return (
                        <tr key={key} className="border-b border-gray-50">
                          <td className="py-1.5 text-gray-500">{label}</td>
                          <td className="py-1.5 text-right text-gray-500">{prevVal || '-'}</td>
                          <td className="py-1.5 text-right font-medium text-gray-800">{currVal || '-'}</td>
                          <td className="py-1.5 text-right"><DiffChip curr={currVal} prev={prevVal} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400">暂无历史记录可对照</p>
              )}
            </div>

            {prevRecord?.insight?.countermeasures && (
              <div className="card py-4 bg-green-50/50">
                <h4 className="font-bold text-green-800 flex items-center gap-2 mb-2 text-sm">
                  <ListTodo size={15}/> 上次定下的应对措施
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{prevRecord.insight.countermeasures}</p>
              </div>
            )}

            {prevRecord?.insight?.summary && (
              <div className="card py-4 bg-amber-50/50">
                <h4 className="font-bold text-amber-800 text-sm mb-2">上次经验总结</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{prevRecord.insight.summary}</p>
              </div>
            )}

            {prevRecord?.aiSummary && (
              <div className="card py-4 bg-indigo-50/50">
                <h4 className="font-bold text-indigo-800 text-sm mb-2">上次 AI 总结</h4>
                <div className="prose text-sm"><ReactMarkdown>{prevRecord.aiSummary}</ReactMarkdown></div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

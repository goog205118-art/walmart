import React, { useState, useEffect, useRef } from 'react';
import { db, EMPTY_REFLECTION } from '../lib/db';
import { generateAIResponse } from '../lib/ai';
import { compressImage, formatSize } from '../lib/imageUtils';
import { Bot, Image as ImageIcon, Loader2, X, Sparkles } from 'lucide-react';

let imgKey = 0;

export default function GraiForm({ onNavigate, editId }) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareResult, setCompareResult] = useState('');
  const [images, setImages] = useState([]); // {key, id?, blob, previewUrl, size}
  const [formData, setFormData] = useState(EMPTY_REFLECTION);
  const objectUrlsRef = useRef([]);

  const isEdit = !!editId;

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
        return { key: ++imgKey, id: img.id, blob: img.blob, previewUrl, size: img.size, kept: true };
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const { blob, size } = await compressImage(file);
        const previewUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(previewUrl);
        setImages((prev) => [...prev, { key: ++imgKey, blob, previewUrl, size, kept: false }]);
      } catch (err) {
        alert('图片处理失败：' + err.message);
      }
    }
    e.target.value = '';
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
      const prompt = `你是资深跨境电商营销专家。这是我正在编写的今日复盘内容：
${JSON.stringify({ date: formData.date, metrics: formData.metrics, goal: formData.goal, result: formData.result, analysis: formData.analysis })}

以下是最近的历史复盘记录：
${JSON.stringify(historyBrief)}

请输出：
1. 今日数据与历史趋势的对比表（Markdown 表格，含 CTR/CPC/花费/单量变化）；
2. 今日动作与历史动作的连贯性分析；
3. 2-3 条具体的改进建议或风险提示。
要求简明扼要、一目了然。`;
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
    ['impressions', '曝光量', 'number'],
    ['spend', '花费 (Spend $)', 'number'],
    ['ctr', '点击率 (CTR %)', 'number'],
    ['cpc', '每次点击 (CPC $)', 'number'],
    ['orders', '转化单量', 'number'],
    ['roas', 'ROAS', 'number']
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">{isEdit ? '编辑复盘' : '录入 GRAI 复盘'}</h2>
        <button onClick={saveReflection} className="btn-primary">保存归档</button>
      </div>

      <div className="space-y-8">
        {/* Core Metrics & AI Upload */}
        <section className="card">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3">核心指标 & 截图解析</h3>
            <div className="flex flex-col items-end gap-2">
              <label className="btn-secondary cursor-pointer flex items-center gap-2">
                <ImageIcon size={18}/> 上传数据截图
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {images.length > 0 && (
                <button onClick={handleAIExtract} disabled={loadingAI} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-200">
                  {loadingAI ? <Loader2 size={14} className="animate-spin"/> : <Bot size={14}/>}
                  {loadingAI ? '解析中...' : 'AI 提取数据'}
                </button>
              )}
            </div>
          </div>

          {images.length > 0 && (
            <div className="flex gap-3 mb-4 overflow-x-auto py-2">
              {images.map((img) => (
                <div key={img.key} className="relative shrink-0 group">
                  <img src={img.previewUrl} alt="upload" className="h-24 w-auto rounded border shadow-sm object-cover" />
                  <button onClick={() => removeImage(img.key)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14}/>
                  </button>
                  <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white px-1 rounded">{formatSize(img.size)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="label-text">日期</label><input type="date" className="input-field" value={formData.date} onChange={e => set('date', e.target.value)} /></div>
            {metricFields.map(([key, label]) => (
              <div key={key}>
                <label className="label-text">{label}</label>
                <input type="number" className="input-field" value={formData.metrics[key]} onChange={e => set(`metrics.${key}`, e.target.value)} />
              </div>
            ))}
          </div>

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

        {/* AI 对照历史 */}
        <section className="card border-dashed border-2 border-indigo-200 bg-indigo-50/40">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Bot size={20}/> AI 对照历史复盘（可选）</h3>
            <button onClick={handleCompareHistory} disabled={loadingCompare} className="btn-secondary flex items-center gap-2 text-indigo-700 border-indigo-300">
              {loadingCompare ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
              {loadingCompare ? '分析中...' : '生成对比反馈'}
            </button>
          </div>
          {compareResult ? (
            <div className="prose bg-white p-4 rounded-lg text-sm">{compareResult.split('\n').map((line, i) => <p key={i} className="my-1">{line}</p>)}</div>
          ) : (
            <p className="text-sm text-gray-500">基于当前表单内容与最近 5 条历史复盘，生成趋势对比与改进建议。</p>
          )}
        </section>

        <div className="flex justify-end">
          <button onClick={saveReflection} className="btn-primary py-3 px-8 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
            {isEdit ? '保存修改' : '落库保存复盘'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { db } from '../lib/db';
import { generateAIResponse } from '../lib/ai';
import { Bot, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function GraiForm({ onNavigate }) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [images, setImages] = useState([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    metrics: { spend: '', ctr: '', cpc: '', orders: '', roas: '' },
    goal: { projectGoal: '', corePhaseGoal: '', budget: '' },
    result: { isCompleted: '否', status: '', gap: '', highlights: '', newGoals: '' },
    analysis: { keyEvents: '', subjective: '', objective: '' },
    insight: { countermeasures: '', summary: '' }
  });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAIExtract = async () => {
    if (images.length === 0) {
      alert("请先上传后台截图");
      return;
    }
    setLoadingAI(true);
    try {
      const prompt = `作为电商运营助手，请提取这张广告后台截图中的关键数据。
以严格的JSON格式返回，不要包含其他任何文本：
{
  "spend": "花费数值",
  "ctr": "点击率数值(不带%)",
  "cpc": "单次点击花费",
  "orders": "订单数"
}`;
      const responseText = await generateAIResponse(prompt, images);
      // Remove markdown json wrappers if exist
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(jsonStr);
      setFormData(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          spend: extracted.spend || prev.metrics.spend,
          ctr: extracted.ctr || prev.metrics.ctr,
          cpc: extracted.cpc || prev.metrics.cpc,
          orders: extracted.orders || prev.metrics.orders
        }
      }));
      alert("数据提取成功！已自动填入指标字段。");
    } catch (error) {
      alert("提取失败：" + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const saveReflection = async () => {
    try {
      const id = await db.reflections.add(formData);
      // Save images separately to avoid large reflection objects
      if (images.length > 0) {
        await Promise.all(images.map(img => db.images.add({ reflectionId: id, data: img })));
      }
      alert("保存成功！");
      onNavigate('dashboard');
    } catch (error) {
      alert("保存失败：" + error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">录入 GRAI 复盘</h2>
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
            <div className="flex gap-2 mb-4 overflow-x-auto py-2">
              {images.map((img, idx) => (
                <img key={idx} src={img} alt="upload" className="h-24 w-auto rounded border shadow-sm object-cover" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><label className="label-text">日期</label><input type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div><label className="label-text">花费 (Spend $)</label><input type="number" className="input-field" value={formData.metrics.spend} onChange={e => setFormData({...formData, metrics: {...formData.metrics, spend: e.target.value}})} /></div>
            <div><label className="label-text">点击率 (CTR %)</label><input type="number" className="input-field" value={formData.metrics.ctr} onChange={e => setFormData({...formData, metrics: {...formData.metrics, ctr: e.target.value}})} /></div>
            <div><label className="label-text">每次点击 (CPC $)</label><input type="number" className="input-field" value={formData.metrics.cpc} onChange={e => setFormData({...formData, metrics: {...formData.metrics, cpc: e.target.value}})} /></div>
            <div><label className="label-text">转化单量</label><input type="number" className="input-field" value={formData.metrics.orders} onChange={e => setFormData({...formData, metrics: {...formData.metrics, orders: e.target.value}})} /></div>
          </div>
        </section>

        {/* Goal */}
        <section className="card bg-blue-50/30">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">Goal (目标回顾)</h3>
          <div className="space-y-4">
            <div><label className="label-text">项目目标是什么？</label><input type="text" className="input-field" placeholder="例如：通过广告达到日均三单转化" value={formData.goal.projectGoal} onChange={e => setFormData({...formData, goal: {...formData.goal, projectGoal: e.target.value}})} /></div>
            <div><label className="label-text">核心阶段目标是什么？</label><input type="text" className="input-field" placeholder="例如：达到合理点击率从而促成成单效果" value={formData.goal.corePhaseGoal} onChange={e => setFormData({...formData, goal: {...formData.goal, corePhaseGoal: e.target.value}})} /></div>
            <div><label className="label-text">投入预算是多少？</label><input type="text" className="input-field" placeholder="例如：每日$15, cpc设置$0.2" value={formData.goal.budget} onChange={e => setFormData({...formData, goal: {...formData.goal, budget: e.target.value}})} /></div>
          </div>
        </section>

        {/* Result */}
        <section className="card bg-purple-50/30">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-purple-500 pl-3">Result (结果比对)</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="label-text">目标是否完成？</label>
                <select className="input-field" value={formData.result.isCompleted} onChange={e => setFormData({...formData, result: {...formData.result, isCompleted: e.target.value}})}>
                  <option>是</option><option>否</option><option>部分完成</option>
                </select>
              </div>
              <div className="flex-[2]">
                <label className="label-text">目标完成情况描述</label>
                <input type="text" className="input-field" placeholder="例如：差，700+曝光 1次点击..." value={formData.result.status} onChange={e => setFormData({...formData, result: {...formData.result, status: e.target.value}})} />
              </div>
            </div>
            <div><label className="label-text">完成结果和原定目标的差距</label><textarea className="input-field h-20" placeholder="预期与实际的差距..." value={formData.result.gap} onChange={e => setFormData({...formData, result: {...formData.result, gap: e.target.value}})} /></div>
            <div><label className="label-text">是否新增了原定没有的项目目标？</label><input type="text" className="input-field" placeholder="例如：新增目标ctr从0.13%提升至1%" value={formData.result.newGoals} onChange={e => setFormData({...formData, result: {...formData.result, newGoals: e.target.value}})} /></div>
          </div>
        </section>

        {/* Analysis */}
        <section className="card bg-orange-50/30">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-orange-500 pl-3">Analysis (分析原因)</h3>
          <div className="space-y-4">
            <div><label className="label-text">关键事件/动作回顾 (Action)</label><textarea className="input-field h-24" placeholder="例如：1. 更改搜索竞价+20% 
2. 选择降低cpc预算" value={formData.analysis.keyEvents} onChange={e => setFormData({...formData, analysis: {...formData.analysis, keyEvents: e.target.value}})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-text">形成差距的主观原因</label><textarea className="input-field h-24" placeholder="主观判断失误等..." value={formData.analysis.subjective} onChange={e => setFormData({...formData, analysis: {...formData.analysis, subjective: e.target.value}})} /></div>
              <div><label className="label-text">形成差距的客观原因</label><textarea className="input-field h-24" placeholder="大盘流量、广告算法、页面吸引力等..." value={formData.analysis.objective} onChange={e => setFormData({...formData, analysis: {...formData.analysis, objective: e.target.value}})} /></div>
            </div>
          </div>
        </section>

        {/* Insight */}
        <section className="card bg-green-50/30">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-green-500 pl-3">Insight (规律总结)</h3>
          <div className="space-y-4">
            <div><label className="label-text">通过原因分析出的对应应对措施 (下架/加持/测试)</label><textarea className="input-field h-24" placeholder="明确执行指令，例如：3天内成效差则停止跑量；增加竞价倍数..." value={formData.insight.countermeasures} onChange={e => setFormData({...formData, insight: {...formData.insight, countermeasures: e.target.value}})} /></div>
            <div><label className="label-text">本次项目经验总结提升</label><textarea className="input-field h-24" placeholder="行业知识模型沉淀..." value={formData.insight.summary} onChange={e => setFormData({...formData, insight: {...formData.insight, summary: e.target.value}})} /></div>
          </div>
        </section>
        
        <div className="flex justify-end">
          <button onClick={saveReflection} className="btn-primary py-3 px-8 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
            落库保存复盘
          </button>
        </div>
      </div>
    </div>
  );
}

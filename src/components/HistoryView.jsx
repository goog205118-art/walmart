import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Calendar, Trash2 } from 'lucide-react';

export default function HistoryView() {
  const reflections = useLiveQuery(() => db.reflections.orderBy('date').reverse().toArray());

  const deleteRecord = async (id) => {
    if(confirm("确定删除这条复盘记录吗？")) {
      await db.reflections.delete(id);
      // also delete associated images
      const associatedImgs = await db.images.where({ reflectionId: id }).toArray();
      for(let img of associatedImgs) {
        await db.images.delete(img.id);
      }
    }
  };

  if (!reflections) return <div>加载中...</div>;

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">历史归档簿</h2>
      <div className="space-y-4">
        {reflections.map(record => (
          <div key={record.id} className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{record.date} 复盘</h3>
                  <p className="text-sm text-gray-500">
                    指标简述: 消耗 ${record.metrics.spend} | CTR: {record.metrics.ctr}% | CPC: ${record.metrics.cpc} | 单量: {record.metrics.orders}
                  </p>
                </div>
              </div>
              <button onClick={() => deleteRecord(record.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-purple-700 block mb-1">【Action 动作回顾】</span>
                <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{record.analysis.keyEvents || '无'}</p>
              </div>
              <div>
                <span className="font-semibold text-green-700 block mb-1">【Insight 应对措施】</span>
                <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{record.insight.countermeasures || '无'}</p>
              </div>
            </div>
          </div>
        ))}
        {reflections.length === 0 && (
          <p className="text-center text-gray-500 py-10">暂无历史归档记录</p>
        )}
      </div>
    </div>
  );
}

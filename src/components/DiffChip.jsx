import React from 'react';

export const METRIC_LABELS = {
  impressions: '曝光',
  spend: '花费',
  ctr: 'CTR',
  cpc: 'CPC',
  orders: '单量',
  roas: 'ROAS'
};

/** 计算两个数值的差异，无效输入返回 null */
export function computeDiff(curr, prev) {
  const c = parseFloat(curr);
  const p = parseFloat(prev);
  if (isNaN(c) || isNaN(p)) return null;
  const delta = c - p;
  if (Math.abs(delta) < 1e-9) return { dir: 'flat', delta: 0, pct: 0 };
  const pct = p !== 0 ? (delta / Math.abs(p)) * 100 : null;
  return { dir: delta > 0 ? 'up' : 'down', delta, pct };
}

/** 格式化差异为一行文字（供 AI prompt 注入） */
export function diffText(key, curr, prev) {
  const d = computeDiff(curr, prev);
  if (!d) return null;
  const label = METRIC_LABELS[key] || key;
  if (d.dir === 'flat') return `${label}: ${prev} → ${curr}（持平）`;
  const arrow = d.dir === 'up' ? '↑' : '↓';
  const pctTxt = d.pct === null ? '' : `（${arrow}${Math.abs(d.pct).toFixed(1)}%）`;
  return `${label}: ${prev} → ${curr} ${pctTxt}`;
}

/**
 * 涨跌徽标：涨=红▲，跌=绿▼（A股惯例），持平=灰
 */
export default function DiffChip({ curr, prev, suffix = '' }) {
  const d = computeDiff(curr, prev);
  if (!d) return null;
  if (d.dir === 'flat') return <span className="text-gray-400 text-xs whitespace-nowrap">— 持平</span>;
  const color = d.dir === 'up' ? 'text-red-600' : 'text-green-600';
  const arrow = d.dir === 'up' ? '▲' : '▼';
  const pctTxt = d.pct === null ? '' : ` ${Math.abs(d.pct).toFixed(0)}%`;
  return (
    <span className={`${color} text-xs font-medium whitespace-nowrap`}>
      {arrow}{Math.abs(d.delta).toFixed(2)}{suffix}{pctTxt}
    </span>
  );
}

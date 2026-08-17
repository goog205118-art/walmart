import Dexie from 'dexie';

export const db = new Dexie('GraiFupanDB');

// v1 遗留（老库自动迁移）
db.version(1).stores({
  reflections: '++id, date, metrics.roas, metrics.ctr',
  images: '++id, reflectionId'
});

// v2：状态索引 + 创建时间索引；images 存压缩后的 Blob
db.version(2).stores({
  reflections: '++id, date, result.isCompleted, createdAt',
  images: '++id, reflectionId'
});

export const EMPTY_REFLECTION = {
  date: new Date().toISOString().split('T')[0],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metrics: { impressions: '', spend: '', ctr: '', cpc: '', orders: '', roas: '' },
  goal: { projectGoal: '', corePhaseGoal: '', budget: '' },
  result: { isCompleted: '否', status: '', gap: '', highlights: '', newGoals: '' },
  analysis: { keyEvents: '', subjective: '', objective: '' },
  insight: { countermeasures: '', summary: '' },
  aiSummary: '',
  aiExtractNote: ''
};

/** 级联删除复盘及其图片 */
export async function deleteReflection(id) {
  await db.transaction('rw', db.reflections, db.images, async () => {
    await db.reflections.delete(id);
    await db.images.where({ reflectionId: id }).delete();
  });
}

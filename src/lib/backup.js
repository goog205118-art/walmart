import { db } from './db';
import { blobToDataURL, dataURLToBlob } from './imageUtils';

/** 导出全部数据为 JSON 文件（图片内嵌 base64） */
export async function exportAllData() {
  const reflections = await db.reflections.toArray();
  const images = await db.images.toArray();

  const imgByRef = {};
  for (const img of images) {
    if (!imgByRef[img.reflectionId]) imgByRef[img.reflectionId] = [];
    imgByRef[img.reflectionId].push({
      data: await blobToDataURL(img.blob),
      width: img.width || 0,
      size: img.size || 0
    });
  }

  const payload = {
    app: 'grai-fupan-system',
    version: 2,
    exportedAt: new Date().toISOString(),
    count: reflections.length,
    reflections: reflections.map((r) => ({ ...r, images: imgByRef[r.id] || [] }))
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grai-fupan-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return payload.count;
}

/** 从 JSON 导入，mode: 'merge' 按 date 跳过重复 | 'overwrite' 清空后导入 */
export async function importData(jsonText, mode = 'merge') {
  const payload = JSON.parse(jsonText);
  if (!payload || !Array.isArray(payload.reflections)) {
    throw new Error('备份文件格式不正确');
  }

  let imported = 0;
  let skipped = 0;

  if (mode === 'overwrite') {
    await db.transaction('rw', db.reflections, db.images, async () => {
      await db.reflections.clear();
      await db.images.clear();
    });
  }

  const existingDates = new Set(
    (await db.reflections.toArray()).map((r) => r.date)
  );

  for (const record of payload.reflections) {
    const { images = [], ...data } = record;
    delete data.id;
    if (mode === 'merge' && existingDates.has(data.date)) {
      skipped++;
      continue;
    }
    const newId = await db.reflections.add({ ...data, updatedAt: Date.now() });
    for (const img of images) {
      const blob = await dataURLToBlob(img.data);
      await db.images.add({ reflectionId: newId, blob, width: img.width || 0, size: blob.size });
    }
    imported++;
  }

  return { imported, skipped };
}

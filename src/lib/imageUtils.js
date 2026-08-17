// 图片工具：上传压缩、Blob/DataURL 互转、ObjectURL 管理

const MAX_DIM = 1600;
const QUALITY = 0.8;

/** 将上传的 File 压缩为 JPEG Blob（最长边 1600px，质量 0.8） */
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, width, height, size: blob.size }) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      QUALITY
    );
  });
}

/** Blob -> dataURL（用于 AI 调用与备份导出） */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** dataURL -> Blob（用于备份导入） */
export async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

/** 统一把（Blob | dataURL 字符串）转为 dataURL，供 AI 多模态调用 */
export async function toDataURL(img) {
  if (typeof img === 'string') return img;
  if (img instanceof Blob) return blobToDataURL(img);
  if (img && img.blob instanceof Blob) return blobToDataURL(img.blob);
  throw new Error('不支持的图片格式');
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

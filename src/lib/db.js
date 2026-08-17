import Dexie from 'dexie';

export const db = new Dexie('GraiFupanDB');

db.version(1).stores({
  reflections: '++id, date, metrics.roas, metrics.ctr', // store reflections
  images: '++id, reflectionId' // separate store for large images
});

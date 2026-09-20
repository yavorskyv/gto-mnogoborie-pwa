/**
 * МОДУЛЬ ЛОКАЛЬНОГО ХРАНИЛИЩА ВИДЕОЗАПИСЕЙ (IndexedDB)
 * Федерация многоборья ГТО России · Модуль «Герой ГТО» 2026
 *
 * Хранит полные видео Blob и метаданные на устройстве атлета
 * для гарантированной сохранности при сбоях сети до подтверждения сервера.
 */

const DB_NAME = 'hero_gto_db_v1';
const DB_VERSION = 1;
const STORE_VIDEOS = 'videos';

let dbInstance = null;

export function openHeroDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB не поддерживается данным браузером'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        const store = db.createObjectStore(STORE_VIDEOS, { keyPath: 'localId' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('uploadStatus', 'uploadStatus', { unique: false });
        store.createIndex('athleteId', 'athleteId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Ошибка открытия базы:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Сохранить видеозапись локально
 * @param {Object} record
 * @returns {Promise<string>} localId
 */
export async function saveHeroVideo(record) {
  const db = await openHeroDatabase();
  const localId = record.localId || ('rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

  const data = {
    localId,
    athleteId: record.athleteId || 'default',
    athleteName: record.athleteName || 'Атлет',
    exerciseId: record.exerciseId || 'exercise',
    exerciseTitle: record.exerciseTitle || 'Упражнение',
    createdAt: record.createdAt || new Date().toISOString(),
    durationSec: Number(record.durationSec || 0),
    durationMs: Number(record.durationMs || 0),
    reps: Number(record.reps || 0),
    noReps: Number(record.noReps || 0),
    orientation: record.orientation || 'portrait',
    mimeType: record.mimeType || 'video/mp4',
    sourceType: record.sourceType || 'recorded', // 'recorded' | 'uploaded'
    width: Number(record.width || (record.orientation === 'landscape' ? 1920 : 1080)),
    height: Number(record.height || (record.orientation === 'landscape' ? 1080 : 1920)),
    status: record.status || 'RECORDED_LOCAL',
    uploadStatus: record.uploadStatus || 'RECORDED_LOCAL', // 'RECORDED_LOCAL' | 'UPLOADING' | 'UPLOADED' | 'FAILED'
    submittedForJudging: Boolean(record.submittedForJudging),
    blob: record.blob || null,
    serverId: record.serverId || null,
    serverUrl: record.serverUrl || null,
    error: record.error || null
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORE_VIDEOS);
    const req = store.put(data);

    req.onsuccess = () => resolve(localId);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Получить видео по localId
 */
export async function getHeroVideo(localId) {
  const db = await openHeroDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, 'readonly');
    const store = tx.objectStore(STORE_VIDEOS);
    const req = store.get(localId);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Получить все сохранённые видео (по убыванию даты)
 */
export async function getAllHeroVideos() {
  const db = await openHeroDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, 'readonly');
    const store = tx.objectStore(STORE_VIDEOS);
    const req = store.getAll();

    req.onsuccess = () => {
      const list = (req.result || []).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Обновить статус выгрузки видео
 */
export async function updateHeroVideoStatus(localId, status, extra = {}) {
  const db = await openHeroDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORE_VIDEOS);
    const req = store.get(localId);

    req.onsuccess = () => {
      const record = req.result;
      if (!record) {
        resolve(null);
        return;
      }
      record.uploadStatus = status;
      if (extra.serverId) record.serverId = extra.serverId;
      if (extra.serverUrl) record.serverUrl = extra.serverUrl;
      if (extra.error !== undefined) record.error = extra.error;

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Сохранить результат судейской проверки
 */
export async function saveJudgeResult(localId, judgeResult) {
  const db = await openHeroDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORE_VIDEOS);
    const req = store.get(localId);

    req.onsuccess = () => {
      const record = req.result;
      if (!record) {
        reject(new Error('Видеозапись не найдена'));
        return;
      }
      record.judgeResult = judgeResult;
      record.status = judgeResult.verdict || 'JUDGED';
      record.uploadStatus = judgeResult.verdict || 'JUDGED';
      record.reps = Number(judgeResult.validReps || 0);
      record.noReps = Number(judgeResult.noReps || 0);

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Удалить видеозапись
 */
export async function deleteHeroVideo(localId) {
  const db = await openHeroDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORE_VIDEOS);
    const req = store.delete(localId);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}


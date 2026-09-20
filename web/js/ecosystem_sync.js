/**
 * ЕДИНЫЙ МОДУЛЬ СИНХРОНИЗАЦИИ ЭКОСИСТЕМЫ ФМГТО РОССИИ (v125)
 * Обеспечивает сквозной синхрон:
 *  - Атлеты: Профиль «Герой ГТО» <-> Реестр участников админки <-> Очный чек-ин / допуск.
 *  - Рекорды: «Иду на рекорд» <-> Книга рекордов России <-> Панель судьи/организатора.
 *  - Заявки и комплексы: Онлайн WOD (3 видео) <-> Судейский отсмотр <-> Мои заявки.
 */

import { GTO_RECORDS } from './gto_data.js';

const CUSTOM_RECORDS_KEY = 'gto_custom_records_v1';
const HERO_STORE_KEY = 'hero_profiles_v1';
const HERO_DRAFT_KEY = 'gto_hero_active_draft_v1';
const ADMIN_STORE_KEY = 'gto_admin_store_v1';

/**
 * Получить полный динамический список рекордов России (базовые + утверждённые в системе)
 */
export function getUnifiedRecords() {
  let custom = [];
  try {
    const raw = localStorage.getItem(CUSTOM_RECORDS_KEY);
    if (raw) custom = JSON.parse(raw) || [];
  } catch (_) {}

  const base = Array.isArray(GTO_RECORDS) ? GTO_RECORDS : [];
  return [...custom, ...base];
}

/**
 * Добавить и официально зафиксировать новый Рекорд России
 */
export function addUnifiedRecord(recordData) {
  let custom = [];
  try {
    const raw = localStorage.getItem(CUSTOM_RECORDS_KEY);
    if (raw) custom = JSON.parse(raw) || [];
  } catch (_) {}

  const newRec = {
    id: recordData.id || ('REC-RU-' + Date.now().toString().slice(-6)),
    discipline: recordData.discipline || 'Многоборье ГТО',
    ex: recordData.discipline || 'Многоборье ГТО',
    holder: recordData.holder || recordData.athleteName || 'Атлет РФ',
    athlete: recordData.holder || recordData.athleteName || 'Атлет РФ',
    result: recordData.result || '0',
    res: recordData.result || '0',
    category: recordData.category || 'Профессионалы',
    gender: recordData.gender || 'M',
    sex: recordData.gender || 'M',
    age: recordData.age || '18-29',
    ageGroup: recordData.ageGroup || recordData.age || '18-29',
    city: recordData.city || recordData.region || 'Москва',
    region: recordData.region || recordData.city || 'Москва',
    tournament: recordData.tournament || 'Официальный зачёт «Иду на рекорд»',
    date: recordData.date || new Date().toLocaleDateString('ru-RU'),
    status: 'VERIFIED',
    verifiedAt: new Date().toISOString(),
    judge: recordData.judge || 'Главная судейская коллегия ФМГТО',
    videoUrl: recordData.videoUrl || '',
    isCustom: true
  };

  const existingIdx = custom.findIndex(r => 
    (r.id && r.id === newRec.id) || 
    (r.holder === newRec.holder && r.discipline === newRec.discipline)
  );

  if (existingIdx >= 0) {
    custom[existingIdx] = { ...custom[existingIdx], ...newRec };
  } else {
    custom.unshift(newRec);
  }

  try {
    localStorage.setItem(CUSTOM_RECORDS_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('[Ecosystem Sync] Failed to save custom record:', e);
  }

  window.dispatchEvent(new CustomEvent('gto-ecosystem-sync', {
    detail: { type: 'record_added', record: newRec }
  }));

  return newRec;
}

/**
 * Получить активного локального атлета из личного кабинета «Герой ГТО»
 */
export function getActiveHeroAthlete() {
  try {
    const raw = localStorage.getItem(HERO_STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.profiles) && data.profiles.length) {
        const p = data.profiles[data.active || 0] || data.profiles[0];
        return {
          id: p.athlete_id || (p.uin ? ('ATH-' + p.uin.replace(/\D/g, '')) : 'ath_local'),
          athlete_id: p.athlete_id || null,
          name: p.name || 'Алексей Смирнов',
          fio: p.name || 'Алексей Смирнов',
          uin: p.uin || '24-77-0019283',
          region: p.region || 'Москва',
          stage: p.stage || 'VI ступень',
          gender: p.gender || 'M',
          rank: 'ВФСК ГТО',
          role: p.role || 'Атлет',
          starts_count: p.starts_count || 0,
          podiums_count: p.podiums_count || 0,
          records_count: p.records_count || 0,
          competitions: p.competitions || [],
          records: p.records || [],
          isLocalProfile: true
        };
      }
    }
  } catch (_) {}
  return {
    id: 'ath_local',
    name: 'Алексей Смирнов (Вы)',
    fio: 'Алексей Смирнов (Вы)',
    uin: '24-77-0019283',
    region: 'Москва',
    stage: 'VI ступень',
    gender: 'M',
    rank: 'ВФСК ГТО',
    isLocalProfile: true
  };
}

/**
 * Синхронизация между «Герой ГТО» и Админ-панелью
 */
export function syncEcosystemState() {
  try {
    const rawAdmin = localStorage.getItem(ADMIN_STORE_KEY);
    let adminStore = rawAdmin ? JSON.parse(rawAdmin) : null;
    if (!adminStore) return;
    if (!Array.isArray(adminStore.applications)) adminStore.applications = [];

    const heroAthlete = getActiveHeroAthlete();
    const draftRaw = localStorage.getItem(HERO_DRAFT_KEY);
    
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      if (draft && draft.exercises && draft.exercises.length) {
        const draftAppId = 'APP-WOD-' + (draft.tournamentId || '2026').toString().slice(-6);
        let existing = adminStore.applications.find(a => a.id === draftAppId || (a.exercises && a.tournamentId === draft.tournamentId));
        
        const exs = draft.exercises.map(e => ({
          id: e.id,
          title: e.title,
          reps: e.reps || 0,
          judgeReps: e.judgeReps,
          videoLocalId: e.videoLocalId,
          videoUrl: e.videoUrl || '',
          status: e.status || (e.recorded ? 'recorded' : 'pending')
        }));

        if (!existing) {
          adminStore.applications.unshift({
            id: draftAppId,
            tournamentId: draft.tournamentId || 'gordost-i-slava-2026',
            tournamentName: draft.tournamentTitle || 'Всероссийский турнир «Гордость и Слава 2026»',
            athleteName: heroAthlete.name,
            uin: heroAthlete.uin,
            region: heroAthlete.region,
            format: 'online',
            discipline: 'Онлайн-комплекс WOD (3 упражнения)',
            claimedResult: exs.map(e => `${e.reps || 0} повт.`).join(' / '),
            status: draft.status === 'reshoot_requested' ? 'reshoot_requested' : 'judging',
            submittedDate: new Date().toLocaleDateString('ru-RU'),
            videoUrl: exs[0]?.videoUrl || '',
            selectedExerciseIdx: 0,
            exercises: exs,
            rawVideo: { reps: exs[0]?.reps || 0, noReps: 0 }
          });
        } else {
          existing.exercises = exs;
          existing.claimedResult = exs.map(e => `${e.reps || 0} повт.`).join(' / ');
          if (draft.status === 'reshoot_requested') existing.status = 'reshoot_requested';
        }
        localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(adminStore));
      }
    }
  } catch (e) {
    console.warn('[Ecosystem Sync] Sync state error:', e);
  }
}

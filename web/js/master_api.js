/**
 * MASTER DATA CLIENT API — ЕДИНЫЙ КЛИЕНТ МАСТЕР-ДАННЫХ ДЛЯ ФРОНТЕНДА
 * Федерация многоборья ГТО России · 2026
 *
 * Все разделы сайта (Герой ГТО, Календарь, Рекорды, Регионы, Админка)
 * используют этот модуль для чтения и записи сущностей.
 */

const API_BASE = '/api';

export async function fetchMasterAthlete(athleteId) {
  if (!athleteId) return null;
  try {
    const res = await fetch(`${API_BASE}/athletes/${encodeURIComponent(athleteId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.athlete || null;
    }
  } catch (e) {
    console.warn('[Master API] Failed to fetch athlete:', athleteId, e);
  }
  return null;
}

export async function searchMasterAthletes({ search = '', region = '', gender = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (region) params.set('region', region);
  if (gender) params.set('gender', gender);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  try {
    const res = await fetch(`${API_BASE}/athletes?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[Master API] Search athletes failed:', e);
  }
  return { ok: false, total: 0, athletes: [] };
}

export async function resolveAthleteIdentity(profileData) {
  try {
    const res = await fetch(`${API_BASE}/identity/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[Master API] Identity resolver failed:', e);
  }
  return { ok: false, match_level: 'NO_MATCH', top_score: 0, best_match: null, candidates: [] };
}

export async function registerOrLinkProfile(profileData) {
  try {
    const res = await fetch(`${API_BASE}/identity/register-or-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[Master API] Register or link failed:', e);
  }
  return { ok: false, error: 'Сетевая ошибка при регистрации' };
}

export async function mergeAthletesApi({ primaryAthleteId, duplicateAthleteId, reason, reviewer }) {
  try {
    const res = await fetch(`${API_BASE}/identity/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryAthleteId, duplicateAthleteId, reason, reviewer })
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function fetchMasterEvents({ program = '', format = '' } = {}) {
  const params = new URLSearchParams();
  if (program) params.set('program', program);
  if (format) params.set('format', format);

  try {
    const res = await fetch(`${API_BASE}/events?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.events || [];
    }
  } catch (e) {
    console.warn('[Master API] Fetch events failed:', e);
  }
  return [];
}

export async function fetchMasterRecords({ discipline = '', gender = '' } = {}) {
  const params = new URLSearchParams();
  if (discipline) params.set('discipline', discipline);
  if (gender) params.set('gender', gender);

  try {
    const res = await fetch(`${API_BASE}/records?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.records || [];
    }
  } catch (e) {
    console.warn('[Master API] Fetch records failed:', e);
  }
  return [];
}

export async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (res.ok) {
      const data = await res.json();
      return data.logs || [];
    }
  } catch (e) {
    console.warn('[Master API] Fetch audit logs failed:', e);
  }
  return [];
}

export async function createOrUpdateMasterEvent(eventData) {
  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[Master API] Create/update event failed:', e);
  }
  return { ok: false, error: 'Ошибка сохранения турнира на сервере' };
}

export async function fetchEventParticipants(eventId) {
  if (!eventId) return [];
  try {
    const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/participants`);
    if (res.ok) {
      const data = await res.json();
      return data.participants || [];
    }
  } catch (e) {
    console.warn('[Master API] Fetch event participants failed:', e);
  }
  return [];
}


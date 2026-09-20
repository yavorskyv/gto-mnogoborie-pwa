/**
 * GTO MASTER DATA & HERO API MICROSERVICE (Node.js built-in, zero dependencies)
 * Федерация многоборья ГТО России · 2026
 *
 * Эндпоинты Master Data:
 *  GET  /api/athletes              — Список спортсменов с фильтрацией и пагинацией
 *  GET  /api/athletes/:id          — Карточка спортсмена (постоянный athlete_id, legacy_id или alias)
 *  GET  /api/athletes/:id/events   — История соревнований спортсмена
 *  GET  /api/athletes/:id/records  — Официальные рекорды спортсмена
 *  POST /api/identity/resolve      — Athlete Identity Resolver (поиск совпадений, расчет confidence score)
 *  POST /api/identity/register-or-link — Регистрация или привязка профиля к архиву
 *  POST /api/identity/merge        — Слияние дубликатов профилей с сохранением alias
 *  GET  /api/events                — Список турниров единой сущности EVENT
 *  GET  /api/events/:id            — Карточка турнира
 *  GET  /api/records               — Единая книга рекордов России
 *  GET  /api/audit-logs            — Журнал аудита действий
 *
 * Эндпоинты видеофиксации и судейства Hero GTO:
 *  POST  /api/hero/videos          — Загрузка видео с метаданными (multipart/form-data)
 *  GET   /api/hero/videos          — Список видеозаписей атлетов для админки/судейства
 *  PATCH /api/hero/videos/:id      — Судейский вердикт (создаёт официальный RESULT при зачёте)
 *  GET   /api/hero/health          — Проверка работоспособности
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { masterDataService } = require('./master_data_service');

const PORT = process.env.PORT || 5055;
const HOST = '127.0.0.1';

const ROOT_DIR = process.env.GTO_ROOT || (fs.existsSync('/var/www/gto2026') ? '/var/www/gto2026' : path.resolve(__dirname, '..'));
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads', 'hero');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'hero_videos.json');

// Инициализация Master Data Layer
try {
  masterDataService.init(ROOT_DIR);
} catch (e) {
  console.error('[API Init] Master Data Service init warning:', e);
}

// Гарантируем наличие директорий
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  }
} catch (err) {
  console.error('[API Init Error]', err);
}

function loadVideos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error('[Load Videos Error]', err);
  }
  return [];
}

function saveVideos(videos) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Save Videos Error]', err);
    return false;
  }
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Парсер multipart/form-data в памяти и на диск
function parseMultipart(req, boundary, uploadDir) {
  return new Promise((resolve, reject) => {
    const boundaryBuffer = Buffer.from('--' + boundary);
    const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('error', err => reject(err));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      let offset = 0;
      const fields = {};
      let videoFile = null;

      while (offset < buffer.length) {
        const boundaryIdx = buffer.indexOf(boundaryBuffer, offset);
        if (boundaryIdx === -1) break;

        const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, boundaryIdx + boundaryBuffer.length);
        const partEnd = (nextBoundaryIdx !== -1) ? nextBoundaryIdx : buffer.length;

        const part = buffer.slice(boundaryIdx + boundaryBuffer.length, partEnd);
        offset = partEnd;

        const headerEndIdx = part.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEndIdx === -1) continue;

        const headerStr = part.slice(0, headerEndIdx).toString('utf8');
        let body = part.slice(headerEndIdx + 4);
        if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
          body = body.slice(0, body.length - 2);
        }

        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);

        if (nameMatch) {
          const fieldName = nameMatch[1];
          if (filenameMatch) {
            const rawFilename = filenameMatch[1];
            const extMatch = rawFilename.match(/\.([a-zA-Z0-9]+)$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
            const videoId = 'vid_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
            const savedFilename = `${videoId}.${ext}`;
            const targetPath = path.join(uploadDir, savedFilename);

            fs.writeFileSync(targetPath, body);
            videoFile = {
              videoId,
              filename: savedFilename,
              ext,
              path: targetPath,
              url: `/uploads/hero/${savedFilename}`,
              size: body.length
            };
          } else {
            fields[fieldName] = body.toString('utf8');
          }
        }
      }

      resolve({ fields, videoFile });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Health check
  if (pathname === '/api/hero/health' || pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      timestamp: new Date().toISOString(),
      athletes_count: masterDataService.athletes.size,
      events_count: masterDataService.events.size,
      records_count: masterDataService.records.length
    });
    return;
  }

  // ================= MASTER DATA API =================

  // GET /api/athletes — список спортсменов с фильтрацией и пагинацией
  if (pathname === '/api/athletes' && req.method === 'GET') {
    const search = url.searchParams.get('search') || '';
    const region = url.searchParams.get('region') || '';
    const gender = url.searchParams.get('gender') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const result = masterDataService.listAthletes({ search, region, gender, limit, offset });
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  // GET /api/athletes/:id — профиль спортсмена
  if (pathname.startsWith('/api/athletes/') && req.method === 'GET') {
    const subPath = pathname.replace('/api/athletes/', '').trim();
    const parts = subPath.split('/');
    const athleteId = parts[0];

    const athlete = masterDataService.getAthlete(athleteId);
    if (!athlete) {
      sendJson(res, 404, { ok: false, error: 'Спортсмен не найден' });
      return;
    }

    if (parts.length === 1) {
      sendJson(res, 200, { ok: true, athlete });
      return;
    }

    if (parts[1] === 'events' || parts[1] === 'competitions') {
      sendJson(res, 200, { ok: true, athlete_id: athlete.athlete_id, competitions: athlete.competitions || [] });
      return;
    }

    if (parts[1] === 'records') {
      sendJson(res, 200, { ok: true, athlete_id: athlete.athlete_id, records: athlete.records || [] });
      return;
    }

    if (parts[1] === 'results') {
      const results = (athlete.competitions || []).flatMap(c => (c.events || []).map(e => ({
        tournament_title: c.tournament_title,
        tournament_date: c.tournament_date,
        discipline: e.event_name,
        result: e.result,
        rank: e.rank,
        category: e.category
      })));
      sendJson(res, 200, { ok: true, athlete_id: athlete.athlete_id, results });
      return;
    }
  }

  // POST /api/identity/resolve — сопоставление атлета Identity Resolver
  if (pathname === '/api/identity/resolve' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const result = masterDataService.resolveIdentity(body);
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  // POST /api/identity/register-or-link — регистрация или связывание с архивом
  if (pathname === '/api/identity/register-or-link' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const result = masterDataService.registerOrLinkAthlete(body);
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  // POST /api/identity/merge — объединение дубликатов спортсменов с алиасом
  if (pathname === '/api/identity/merge' && req.method === 'POST') {
    const body = await readJsonBody(req);
    try {
      const result = masterDataService.mergeAthletes(body);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  // GET /api/events — все турниры единой сущности EVENT
  if (pathname === '/api/events' && req.method === 'GET') {
    const program = url.searchParams.get('program') || '';
    const format = url.searchParams.get('format') || '';
    let list = Array.from(masterDataService.events.values());
    if (program) {
      list = list.filter(e => e.program_id === program);
    }
    if (format) {
      list = list.filter(e => e.format === format.toUpperCase());
    }
    sendJson(res, 200, { ok: true, count: list.length, events: list });
    return;
  }

  // POST /api/events — создание или обновление турнира
  if (pathname === '/api/events' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const raw = JSON.parse(body || '{}');
        const created = masterDataService.createOrUpdateEvent(raw);
        sendJson(res, 200, { ok: true, event: created });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
    });
    return;
  }

  // GET /api/events/:id/participants — участники турнира (протокол + Герой ГТО видео)
  if (pathname.startsWith('/api/events/') && pathname.endsWith('/participants') && req.method === 'GET') {
    const eventId = pathname.replace('/api/events/', '').replace('/participants', '').trim();
    const videos = loadVideos();
    const participants = masterDataService.getEventParticipants(eventId, videos);
    sendJson(res, 200, { ok: true, count: participants.length, participants });
    return;
  }

  // GET /api/events/:id — конкретный турнир
  if (pathname.startsWith('/api/events/') && req.method === 'GET') {
    const eventId = pathname.replace('/api/events/', '').trim();
    let event = masterDataService.events.get(eventId);
    if (!event) {
      const rawNum = eventId.replace(/^EVT-0*/i, '');
      event = Array.from(masterDataService.events.values()).find(e => String(e.legacy_id) === rawNum || e.slug === eventId);
    }
    if (!event) {
      sendJson(res, 404, { ok: false, error: 'Турнир не найден' });
      return;
    }
    sendJson(res, 200, { ok: true, event });
    return;
  }

  // GET /api/records — единая книга рекордов России
  if (pathname === '/api/records' && req.method === 'GET') {
    const discipline = url.searchParams.get('discipline') || '';
    const gender = url.searchParams.get('gender') || '';
    let list = masterDataService.records;
    if (discipline) {
      const normDisc = masterDataService._normalizeName(discipline);
      list = list.filter(r => masterDataService._normalizeName(r.discipline).includes(normDisc));
    }
    if (gender) {
      const g = gender.toLowerCase();
      list = list.filter(r => (r.gender || '').toLowerCase().startsWith(g[0]));
    }
    sendJson(res, 200, { ok: true, count: list.length, records: list });
    return;
  }

  // GET /api/audit-logs — журнал аудита
  if (pathname === '/api/audit-logs' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, count: masterDataService.auditLogs.length, logs: masterDataService.auditLogs });
    return;
  }

  // ================= HERO GTO VIDEO & JUDGING API =================

  // GET /api/hero/videos — список всех видеозаписей
  if (pathname === '/api/hero/videos' && req.method === 'GET') {
    const videos = loadVideos();
    sendJson(res, 200, { ok: true, count: videos.length, videos });
    return;
  }

  // POST /api/hero/videos — выгрузка видеозаписи
  if (pathname === '/api/hero/videos' && req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      sendJson(res, 400, { ok: false, error: 'Expected multipart/form-data' });
      return;
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      sendJson(res, 400, { ok: false, error: 'Missing boundary in multipart form' });
      return;
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];

    try {
      const { fields, videoFile } = await parseMultipart(req, boundary, UPLOADS_DIR);
      if (!videoFile) {
        sendJson(res, 400, { ok: false, error: 'No video file provided' });
        return;
      }

      let metadata = {};
      try {
        if (fields.metadata) {
          metadata = JSON.parse(fields.metadata);
        }
      } catch (_) {}

      // Resolve or connect with Athlete ID
      let athleteId = metadata.athlete_id || fields.athlete_id || 'ATH-0000000';
      if (athleteId === 'default' || !masterDataService.getAthlete(athleteId)) {
        // Try identity resolve by athlete name
        const resolved = masterDataService.resolveIdentity({ name: metadata.athlete_name || fields.athlete_name || '' });
        if (resolved.best_match) {
          athleteId = resolved.best_match.athlete_id;
        }
      }

      const videoRecord = {
        id: videoFile.videoId,
        localId: metadata.local_id || null,
        athleteId: athleteId,
        athleteName: metadata.athlete_name || fields.athlete_name || 'Атлет',
        exerciseId: metadata.exercise_id || 'exercise',
        exerciseTitle: metadata.exercise_title || 'Упражнение',
        tournamentId: metadata.tournament_id || metadata.tournamentId || fields.tournament_id || fields.tournamentId || null,
        tournamentTitle: metadata.tournament_title || metadata.tournamentTitle || fields.tournament_title || fields.tournamentTitle || null,
        result: metadata.result || {
          reps: Number(fields.reps || 0),
          no_reps: Number(fields.no_reps || 0),
          duration_sec: Number(fields.duration_sec || 0)
        },
        orientation: metadata.orientation || 'portrait',
        recordedAt: metadata.recorded_at || new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        url: videoFile.url,
        filename: videoFile.filename,
        size: videoFile.size,
        status: 'pending_review',
        judgeDecision: null
      };

      const all = loadVideos();
      all.unshift(videoRecord);
      saveVideos(all);

      console.log('[API] New video uploaded successfully:', videoRecord.id, videoRecord.athleteName, athleteId);

      sendJson(res, 201, {
        ok: true,
        video_id: videoRecord.id,
        athlete_id: athleteId,
        status: 'uploaded',
        url: videoRecord.url,
        recorded_at: videoRecord.recordedAt
      });
      return;
    } catch (err) {
      console.error('[API Upload Error]', err);
      sendJson(res, 500, { ok: false, error: err.message });
      return;
    }
  }

  // PATCH /api/hero/videos/:id — судейский вердикт и порождение RESULT
  if (pathname.startsWith('/api/hero/videos/') && req.method === 'PATCH') {
    const videoId = pathname.replace('/api/hero/videos/', '').trim();
    let bodyStr = '';
    req.on('data', c => bodyStr += c);
    req.on('end', () => {
      try {
        const updateData = JSON.parse(bodyStr || '{}');
        const all = loadVideos();
        const item = all.find(v => v.id === videoId);
        if (!item) {
          sendJson(res, 404, { ok: false, error: 'Video not found' });
          return;
        }

        if (updateData.status) {
          item.status = updateData.status; // approved | rejected | pending_review
        }
        if (updateData.judgeDecision) {
          item.judgeDecision = {
            ...updateData.judgeDecision,
            updatedAt: new Date().toISOString()
          };
        }

        // Если видео одобрено и это зачет рекорда или комплекса, создаем официальный RESULT / RECORD
        if (updateData.status === 'approved' && updateData.isRecordAttempt) {
          try {
            const addedRecord = masterDataService.addVerifiedResultAndRecord({
              athleteId: item.athleteId,
              discipline: item.exerciseTitle,
              result: (item.result && item.result.reps) || updateData.judgeDecision?.verifiedReps || 0,
              resultType: 'REPS',
              eventTitle: updateData.eventTitle || 'Официальный зачёт «Герой ГТО»',
              category: updateData.category || 'Профессионалы',
              judge: updateData.judgeDecision?.judgeName || 'Судейская коллегия ФМГТО',
              videoUrl: item.url
            });
            item.generatedRecordId = addedRecord.record_id;
          } catch (recErr) {
            console.warn('[API] Record creation warning:', recErr);
          }
        }

        saveVideos(all);
        sendJson(res, 200, { ok: true, video: item });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[GTO Master API] Server running on http://${HOST}:${PORT}`);
  console.log(`[GTO Master API] Root: ${ROOT_DIR}, Uploads: ${UPLOADS_DIR}`);
});

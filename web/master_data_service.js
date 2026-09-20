/**
 * MASTER DATA SERVICE — ЕДИНЫЙ ЦЕНТРАЛИЗОВАННЫЙ СЛОЙ ДАННЫХ ЭКОСИСТЕМЫ «МНОГОБОРЬЕ ГТО»
 * Федерация многоборья ГТО России · 2026
 *
 * Главный принцип:
 * ОДИН ЧЕЛОВЕК = ОДИН ПРОФИЛЬ СПОРТСМЕНА (ATH-XXXXXXX) = ВСЯ ЕГО ИСТОРИЯ
 */

const fs = require('fs');
const path = require('path');

class MasterDataService {
  constructor() {
    this.initialized = false;
    this.athletes = new Map();             // athlete_id -> Athlete
    this.athletesByLegacyId = new Map();   // numeric id / legacy id -> Athlete
    this.aliases = new Map();              // alias_id -> primary athlete_id
    this.events = new Map();               // event_id -> Event
    this.records = [];                     // Array of Record
    this.mergeRequests = [];               // Array of ProfileMergeRequest
    this.auditLogs = [];                   // Array of AuditLog
    this.rootDir = '';
    this.dataPath = '';
  }

  init(rootDir) {
    this.rootDir = rootDir || path.resolve(__dirname, '..');
    this.dataPath = path.join(this.rootDir, 'data');
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }

    this._loadAliases();
    this._loadAuditLogs();
    this._loadAthletes();
    this._loadEvents();
    this._loadRecords();
    this._loadMergeRequests();
    this.initialized = true;

    console.log('[Master Data] Initialized: ' + this.athletes.size + ' athletes, ' + this.events.size + ' events, ' + this.records.length + ' records, ' + this.aliases.size + ' aliases.');
  }

  _normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _parseFio(fullName) {
    const parts = (fullName || '').trim().split(/\s+/);
    return {
      lastName: parts[0] || '',
      firstName: parts[1] || '',
      patronymic: parts.slice(2).join(' ') || ''
    };
  }

  _calculateStats(athlete) {
    const competitions = Array.isArray(athlete.competitions) ? athlete.competitions : [];
    let starts = competitions.length;
    let wins = 0;
    let podiums = 0;

    competitions.forEach(c => {
      const place = Number(c.overall_place || c.rank);
      const rankStr = String(c.rank || '').toLowerCase();
      if (place === 1 || rankStr.includes('золото') || rankStr === '1') {
        wins++;
        podiums++;
      } else if ((place === 2 || place === 3) || rankStr.includes('серебро') || rankStr.includes('бронза') || rankStr === '2' || rankStr === '3') {
        podiums++;
      }
    });

    const records = Array.isArray(athlete.records) ? athlete.records : [];
    return {
      starts_count: starts,
      wins_count: wins,
      podiums_count: podiums,
      records_count: records.length
    };
  }

  _loadAthletes() {
    let rawList = [];
    const masterPath = path.join(this.rootDir, 'web', 'data', 'master', 'athletes.json');
    const fallbackPath = path.join(this.rootDir, 'data', 'master', 'athletes.json');
    const targetFile = fs.existsSync(masterPath) ? masterPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

    if (targetFile) {
      try {
        const text = fs.readFileSync(targetFile, 'utf8');
        rawList = JSON.parse(text) || [];
      } catch (e) {
        console.error('[Master Data] Error reading athletes.json:', e);
      }
    }

    const customAthletesFile = path.join(this.dataPath, 'custom_athletes.json');
    let customList = [];
    if (fs.existsSync(customAthletesFile)) {
      try {
        customList = JSON.parse(fs.readFileSync(customAthletesFile, 'utf8')) || [];
      } catch (_) {}
    }

    const combined = [...rawList, ...customList];

    combined.forEach(raw => {
      const numId = raw.id || raw.legacy_id || 0;
      const athleteId = raw.athlete_id || ('ATH-' + String(numId).padStart(7, '0'));
      const fio = this._parseFio(raw.name);
      const calculated = this._calculateStats(raw);

      const athlete = {
        athlete_id: athleteId,
        legacy_id: numId,
        name: raw.name || '',
        first_name: raw.first_name || fio.firstName,
        last_name: raw.last_name || fio.lastName,
        patronymic: raw.patronymic || fio.patronymic,
        display_name: raw.name || (fio.lastName + ' ' + fio.firstName).trim(),
        gender: raw.gender || '',
        birth_date: raw.birth_date || raw.birthDate || '',
        birth_year: raw.birth_year || raw.birthYear || null,
        age: raw.age || null,
        region: raw.region || '',
        home_region_id: raw.home_region_id || raw.region_id || '',
        city: raw.city || (raw.region && raw.region.includes(',') ? raw.region.split(',')[1].trim() : ''),
        photo_url: raw.photo_url || '',
        uin: raw.uin || '',
        club: raw.club || raw.team_name || '',
        email: raw.email || '',
        phone: raw.phone || '',
        user_id: raw.user_id || null,
        starts_count: calculated.starts_count,
        wins_count: calculated.wins_count,
        podiums_count: calculated.podiums_count,
        records_count: calculated.records_count,
        records: Array.isArray(raw.records) ? raw.records : [],
        competitions: Array.isArray(raw.competitions) ? raw.competitions : [],
        created_at: raw.created_at || new Date().toISOString(),
        updated_at: raw.updated_at || new Date().toISOString(),
        is_custom: !!raw.is_custom
      };

      this.athletes.set(athleteId, athlete);
      if (numId) {
        this.athletesByLegacyId.set(String(numId), athlete);
      }
    });
  }

  _loadEvents() {
    const webEventsDir = path.join(this.rootDir, 'web', 'data', 'events');
    const directEventsDir = path.join(this.rootDir, 'data', 'events');
    const eventsDir = fs.existsSync(webEventsDir) ? webEventsDir : (fs.existsSync(directEventsDir) ? directEventsDir : null);
    if (eventsDir && fs.existsSync(eventsDir)) {
      try {
        const files = fs.readdirSync(eventsDir);
        files.forEach(f => {
          if (!f.endsWith('.json') || f === 'manifest.json') return;
          try {
            const raw = JSON.parse(fs.readFileSync(path.join(eventsDir, f), 'utf8'));
            const numId = raw.id || parseInt(f, 10) || 0;
            const eventId = 'EVT-' + String(numId).padStart(4, '0');
            const title = raw.title || raw.name || ('Турнир #' + numId);
            
            let programId = 'RUSSIAN_CHAMPIONSHIP';
            if (/народн|герой/i.test(title)) programId = 'HERO_GTO';
            else if (/кубок дальнего востока/i.test(title)) programId = 'FAR_EAST_CUP';
            else if (/кубок москвы/i.test(title)) programId = 'MOSCOW_CUP';

            const isOnline = /онлайн|online/i.test(title + ' ' + (raw.location || ''));

            const event = {
              event_id: eventId,
              legacy_id: numId,
              name: title,
              title: title,
              slug: raw.slug || ('event-' + numId),
              program_id: programId,
              period: raw.period || '',
              start_date: raw.start_date || '',
              end_date: raw.end_date || '',
              location: raw.location || 'Россия',
              host_region_id: raw.host_region_id || '',
              level: /всеросс|росси/i.test(title) ? 'NATIONAL' : 'REGIONAL',
              format: isOnline ? 'ONLINE' : 'OFFLINE',
              status: 'COMPLETED',
              source_url: raw.sourceUrl || '',
              cover: raw.cover || '',
              documents: raw.documents || [],
              about: raw.about || []
            };

            this.events.set(eventId, event);
          } catch (_) {}
        });
      } catch (err) {
        console.error('[Master Data] Error loading events:', err);
      }
    }

    // Also load dynamically created / custom events
    const customEventsFile = path.join(this.dataPath, 'custom_events.json');
    if (fs.existsSync(customEventsFile)) {
      try {
        const customEvents = JSON.parse(fs.readFileSync(customEventsFile, 'utf8')) || [];
        customEvents.forEach(ev => {
          if (ev && ev.event_id) {
            this.events.set(ev.event_id, ev);
          }
        });
      } catch (e) {
        console.error('[Master Data] Error loading custom events:', e);
      }
    }
  }

  _loadRecords() {
    const recordsFile = path.join(this.dataPath, 'unified_records.json');
    if (fs.existsSync(recordsFile)) {
      try {
        this.records = JSON.parse(fs.readFileSync(recordsFile, 'utf8')) || [];
        return;
      } catch (_) {}
    }

    const compiled = [];
    let recIdx = 1;
    for (const [_, athlete] of this.athletes) {
      if (Array.isArray(athlete.records)) {
        athlete.records.forEach(r => {
          compiled.push({
            record_id: 'REC-' + String(recIdx++).padStart(5, '0'),
            athlete_id: athlete.athlete_id,
            athlete_name: athlete.name,
            discipline: r.discipline || 'Многоборье ГТО',
            result: r.result || '0',
            result_value: parseFloat(String(r.result).replace(',', '.')) || 0,
            age_group: r.age_group || '',
            category: r.category || 'Общая категория',
            gender: athlete.gender || 'M',
            city: r.city || athlete.city || '',
            region: athlete.region || '',
            event: r.event || 'Официальный зачёт ФМГТО',
            date: r.date || '2025-2026',
            status: 'OFFICIAL',
            record_level: 'RUSSIA'
          });
        });
      }
    }
    this.records = compiled;
  }

  _loadAliases() {
    const aliasFile = path.join(this.dataPath, 'athlete_aliases.json');
    if (fs.existsSync(aliasFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(aliasFile, 'utf8')) || {};
        for (const [k, v] of Object.entries(raw)) {
          this.aliases.set(k, v);
        }
      } catch (_) {}
    }
  }

  _saveAliases() {
    const aliasFile = path.join(this.dataPath, 'athlete_aliases.json');
    const obj = {};
    for (const [k, v] of this.aliases) {
      obj[k] = v;
    }
    fs.writeFileSync(aliasFile, JSON.stringify(obj, null, 2), 'utf8');
  }

  _loadAuditLogs() {
    const auditFile = path.join(this.dataPath, 'audit_log.json');
    if (fs.existsSync(auditFile)) {
      try {
        this.auditLogs = JSON.parse(fs.readFileSync(auditFile, 'utf8')) || [];
      } catch (_) {}
    }
  }

  _logAudit(action, actor, details) {
    const entry = {
      id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      action,
      actor: actor || 'system',
      details
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) this.auditLogs.length = 500;
    try {
      const auditFile = path.join(this.dataPath, 'audit_log.json');
      fs.writeFileSync(auditFile, JSON.stringify(this.auditLogs, null, 2), 'utf8');
    } catch (_) {}
  }

  _loadMergeRequests() {
    const mergeFile = path.join(this.dataPath, 'merge_requests.json');
    if (fs.existsSync(mergeFile)) {
      try {
        this.mergeRequests = JSON.parse(fs.readFileSync(mergeFile, 'utf8')) || [];
      } catch (_) {}
    }
  }

  _saveMergeRequests() {
    const mergeFile = path.join(this.dataPath, 'merge_requests.json');
    fs.writeFileSync(mergeFile, JSON.stringify(this.mergeRequests, null, 2), 'utf8');
  }

  getAthlete(id) {
    if (!id) return null;
    const strId = String(id).trim();

    const primaryId = this.aliases.get(strId) || strId;

    if (this.athletes.has(primaryId)) {
      return this.athletes.get(primaryId);
    }

    if (this.athletesByLegacyId.has(primaryId)) {
      return this.athletesByLegacyId.get(primaryId);
    }

    const rawNum = primaryId.replace(/^ATH-0*/i, '');
    if (rawNum && this.athletesByLegacyId.has(rawNum)) {
      return this.athletesByLegacyId.get(rawNum);
    }

    return null;
  }

  listAthletes({ search, region, gender, limit = 50, offset = 0 }) {
    let result = Array.from(this.athletes.values());

    if (search) {
      const norm = this._normalizeName(search);
      result = result.filter(a => this._normalizeName(a.name).includes(norm) || a.athlete_id.toLowerCase().includes(norm));
    }

    if (region) {
      const normReg = this._normalizeName(region);
      result = result.filter(a => this._normalizeName(a.region).includes(normReg));
    }

    if (gender) {
      const g = gender.toLowerCase();
      result = result.filter(a => (a.gender || '').toLowerCase().startsWith(g[0]));
    }

    const total = result.length;
    const items = result.slice(Number(offset), Number(offset) + Number(limit));

    return { total, offset: Number(offset), limit: Number(limit), athletes: items };
  }

  resolveIdentity(criteria = {}) {
    const rawName = criteria.name || [criteria.last_name || criteria.lastName, criteria.first_name || criteria.firstName, criteria.patronymic].filter(Boolean).join(' ') || '';
    const name = String(rawName).trim();
    const birthDate = String(criteria.birth_date || criteria.birthDate || '').trim();
    const birthYear = criteria.birth_year || criteria.birthYear || (birthDate ? parseInt(birthDate.slice(0, 4), 10) : null);
    const gender = String(criteria.gender || '').trim();
    const region = String(criteria.region || criteria.home_region_id || '').trim();
    const city = String(criteria.city || '').trim();
    const email = String(criteria.email || '').trim();
    const phone = String(criteria.phone || '').trim();
    const uin = String(criteria.uin || '').trim();

    const normInputName = this._normalizeName(name);
    const inputFio = this._parseFio(name);
    const normLastName = this._normalizeName(inputFio.lastName);
    const normFirstName = this._normalizeName(inputFio.firstName);

    let candidates = [];

    for (const [_, athlete] of this.athletes) {
      let score = 0;
      const reasons = [];

      if (email && athlete.email && athlete.email.toLowerCase() === email.toLowerCase()) {
        score += 100;
        reasons.push('exact_email');
      }
      if (phone && athlete.phone && athlete.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) {
        score += 100;
        reasons.push('exact_phone');
      }
      if (uin && athlete.uin && athlete.uin.replace(/\D/g, '') === uin.replace(/\D/g, '')) {
        score += 100;
        reasons.push('exact_uin');
      }

      const normAthName = this._normalizeName(athlete.name);
      if (normInputName && normAthName) {
        if (normAthName === normInputName) {
          score += 40;
          reasons.push('exact_full_name');
        } else {
          const athFio = this._parseFio(athlete.name);
          const athLastName = this._normalizeName(athFio.lastName);
          const athFirstName = this._normalizeName(athFio.firstName);

          if (normLastName && athLastName === normLastName) {
            if (normFirstName && athFirstName === normFirstName) {
              score += 35;
              reasons.push('exact_last_and_first_name');
            } else {
              score += 15;
              reasons.push('last_name_match');
            }
          }
        }
      }

      if (birthDate && athlete.birth_date && birthDate === athlete.birth_date) {
        score += 50;
        reasons.push('exact_birth_date');
      } else if (birthYear && (athlete.birth_year === birthYear || (athlete.birth_date && athlete.birth_date.startsWith(String(birthYear))))) {
        score += 30;
        reasons.push('birth_year_match');
      }

      if (region && athlete.region) {
        const normReg = this._normalizeName(region);
        const normAthReg = this._normalizeName(athlete.region);
        if (normAthReg.includes(normReg) || normReg.includes(normAthReg)) {
          score += 20;
          reasons.push('region_match');
        }
      }
      if (city && athlete.city) {
        const normCity = this._normalizeName(city);
        const normAthCity = this._normalizeName(athlete.city);
        if (normCity && normAthCity && normCity === normAthCity) {
          score += 10;
          reasons.push('city_match');
        }
      }

      if (gender && athlete.gender) {
        const g1 = gender.toLowerCase()[0];
        const g2 = athlete.gender.toLowerCase()[0];
        if (g1 !== g2) {
          score -= 50;
        }
      }

      if (score >= 40) {
        candidates.push({
          score,
          reasons,
          athlete
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    let matchLevel = 'NO_MATCH';

    if (best) {
      if (best.score >= 100) matchLevel = 'EXACT';
      else if (best.score >= 70) matchLevel = 'HIGH_CONFIDENCE';
      else if (best.score >= 40) matchLevel = 'POSSIBLE_MATCH';
    }

    return {
      match_level: matchLevel,
      top_score: best ? best.score : 0,
      best_match: best ? best.athlete : null,
      reasons: best ? best.reasons : [],
      candidates_count: candidates.length,
      candidates: candidates.slice(0, 5).map(c => ({
        score: c.score,
        reasons: c.reasons,
        athlete_id: c.athlete.athlete_id,
        name: c.athlete.name,
        region: c.athlete.region,
        starts_count: c.athlete.starts_count,
        records_count: c.athlete.records_count,
        podiums_count: c.athlete.podiums_count
      }))
    };
  }

  registerOrLinkAthlete(profileData, actor = 'athlete') {
    const resolved = this.resolveIdentity(profileData);

    if (profileData.confirmed_athlete_id) {
      const existing = this.getAthlete(profileData.confirmed_athlete_id);
      if (existing) {
        if (profileData.email) existing.email = profileData.email;
        if (profileData.phone) existing.phone = profileData.phone;
        if (profileData.uin) existing.uin = profileData.uin;
        if (profileData.user_id) existing.user_id = profileData.user_id;
        existing.updated_at = new Date().toISOString();

        this._logAudit('LINK_ATHLETE_PROFILE', actor, {
          athlete_id: existing.athlete_id,
          name: existing.name
        });

        return {
          status: 'linked_existing',
          athlete: existing,
          is_new: false
        };
      }
    }

    if (resolved.match_level === 'EXACT' && resolved.best_match) {
      const existing = resolved.best_match;
      if (profileData.email) existing.email = profileData.email;
      if (profileData.phone) existing.phone = profileData.phone;
      if (profileData.uin) existing.uin = profileData.uin;
      if (profileData.user_id) existing.user_id = profileData.user_id;
      existing.updated_at = new Date().toISOString();

      this._logAudit('AUTO_LINK_EXACT_MATCH', actor, {
        athlete_id: existing.athlete_id,
        name: existing.name,
        score: resolved.top_score
      });

      return {
        status: 'linked_existing',
        athlete: existing,
        is_new: false
      };
    }

    if (resolved.match_level === 'HIGH_CONFIDENCE' && !profileData.force_create) {
      return {
        status: 'requires_confirmation',
        match_level: 'HIGH_CONFIDENCE',
        confidence_score: resolved.top_score,
        existing_candidate: resolved.best_match,
        is_new: false
      };
    }

    const newLegacyId = this.athletes.size + 1000;
    const newAthleteId = 'ATH-' + String(newLegacyId).padStart(7, '0');
    const fio = this._parseFio(profileData.name);

    const newAthlete = {
      athlete_id: newAthleteId,
      legacy_id: newLegacyId,
      name: profileData.name || '',
      first_name: fio.firstName,
      last_name: fio.lastName,
      patronymic: fio.patronymic,
      display_name: profileData.name,
      gender: profileData.gender || '',
      birth_date: profileData.birth_date || profileData.birthDate || '',
      birth_year: profileData.birth_year || null,
      region: profileData.region || '',
      home_region_id: profileData.home_region_id || '',
      city: profileData.city || '',
      photo_url: profileData.photo_url || '',
      uin: profileData.uin || '',
      club: profileData.club || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      user_id: profileData.user_id || null,
      starts_count: 0,
      wins_count: 0,
      podiums_count: 0,
      records_count: 0,
      records: [],
      competitions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_custom: true
    };

    this.athletes.set(newAthleteId, newAthlete);
    this.athletesByLegacyId.set(String(newLegacyId), newAthlete);

    this._persistCustomAthletes();

    this._logAudit('CREATE_ATHLETE', actor, {
      athlete_id: newAthleteId,
      name: newAthlete.name
    });

    return {
      status: 'created_new',
      athlete: newAthlete,
      is_new: true
    };
  }

  _persistCustomAthletes() {
    try {
      const customList = Array.from(this.athletes.values()).filter(a => a.is_custom);
      const customFile = path.join(this.dataPath, 'custom_athletes.json');
      fs.writeFileSync(customFile, JSON.stringify(customList, null, 2), 'utf8');
    } catch (e) {
      console.error('[Master Data] Failed to persist custom athletes:', e);
    }
  }

  mergeAthletes({ primaryAthleteId, duplicateAthleteId, reason, reviewer }) {
    const primary = this.getAthlete(primaryAthleteId);
    const duplicate = this.getAthlete(duplicateAthleteId);

    if (!primary || !duplicate) {
      throw new Error('Один из профилей спортсмена не найден');
    }
    if (primary.athlete_id === duplicate.athlete_id) {
      throw new Error('Нельзя объединить профиль с самим собой');
    }

    const existingTournSlugs = new Set((primary.competitions || []).map(c => c.tournament_slug || c.tournament_title));
    (duplicate.competitions || []).forEach(comp => {
      const key = comp.tournament_slug || comp.tournament_title;
      if (!existingTournSlugs.has(key)) {
        primary.competitions.push(comp);
      }
    });

    const existingRecs = new Set((primary.records || []).map(r => r.discipline + '__' + r.event));
    (duplicate.records || []).forEach(rec => {
      const key = rec.discipline + '__' + rec.event;
      if (!existingRecs.has(key)) {
        primary.records.push(rec);
      }
    });

    if (!primary.email && duplicate.email) primary.email = duplicate.email;
    if (!primary.phone && duplicate.phone) primary.phone = duplicate.phone;
    if (!primary.uin && duplicate.uin) primary.uin = duplicate.uin;
    if (!primary.photo_url && duplicate.photo_url) primary.photo_url = duplicate.photo_url;

    const stats = this._calculateStats(primary);
    primary.starts_count = stats.starts_count;
    primary.wins_count = stats.wins_count;
    primary.podiums_count = stats.podiums_count;
    primary.records_count = stats.records_count;
    primary.updated_at = new Date().toISOString();

    this.aliases.set(duplicate.athlete_id, primary.athlete_id);
    if (duplicate.legacy_id) {
      this.aliases.set(String(duplicate.legacy_id), primary.athlete_id);
    }
    this._saveAliases();

    this._logAudit('MERGE_ATHLETES', reviewer || 'admin', {
      primary_id: primary.athlete_id,
      duplicate_id: duplicate.athlete_id,
      reason
    });

    return {
      success: true,
      primary_athlete: primary
    };
  }

  addVerifiedResultAndRecord({ athleteId, discipline, result, resultType = 'REPS', eventTitle, category, gender, ageGroup, judge, videoUrl }) {
    const athlete = this.getAthlete(athleteId);
    if (!athlete) throw new Error('Athlete not found');

    const recId = 'REC-' + Date.now().toString().slice(-6);
    const newRec = {
      record_id: recId,
      athlete_id: athlete.athlete_id,
      athlete_name: athlete.name,
      discipline,
      result: String(result),
      result_value: parseFloat(String(result).replace(',', '.')) || 0,
      category: category || 'Профессионалы',
      gender: gender || athlete.gender || 'M',
      age_group: ageGroup || '18-29',
      city: athlete.city || 'Москва',
      region: athlete.region || 'Москва',
      event: eventTitle || 'Официальный зачёт ФМГТО',
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'OFFICIAL',
      record_level: 'RUSSIA',
      judge: judge || 'Главная судейская коллегия ФМГТО',
      video_url: videoUrl || ''
    };

    this.records.unshift(newRec);
    athlete.records.unshift({
      discipline,
      age_group: ageGroup || '',
      result: String(result),
      event: eventTitle || 'Официальный зачёт ФМГТО',
      city: athlete.city || ''
    });

    athlete.records_count = athlete.records.length;
    athlete.updated_at = new Date().toISOString();

    try {
      const recordsFile = path.join(this.dataPath, 'unified_records.json');
      fs.writeFileSync(recordsFile, JSON.stringify(this.records, null, 2), 'utf8');
    } catch (_) {}

    this._logAudit('ADD_VERIFIED_RECORD', judge || 'judge', {
      record_id: recId,
      athlete_id: athlete.athlete_id,
      discipline,
      result
    });

    return newRec;
  }

  _saveCustomEvents() {
    try {
      const customEventsFile = path.join(this.dataPath, 'custom_events.json');
      const customEvents = Array.from(this.events.values()).filter(e => e.is_custom || e.event_id?.startsWith('EVT-CUST') || e.format === 'ONLINE');
      fs.writeFileSync(customEventsFile, JSON.stringify(customEvents, null, 2), 'utf8');
    } catch (e) {
      console.error('[Master Data] Error saving custom events:', e);
    }
  }

  createOrUpdateEvent(raw = {}) {
    if (!raw) throw new Error('Данные турнира обязательны');
    let eventId = raw.event_id || raw.id;
    let numId;
    if (eventId && String(eventId).startsWith('EVT-')) {
      numId = parseInt(String(eventId).replace('EVT-', ''), 10) || (this.events.size + 1);
    } else if (typeof eventId === 'number' || (typeof eventId === 'string' && /^\d+$/.test(eventId))) {
      numId = parseInt(eventId, 10);
      eventId = 'EVT-' + String(numId).padStart(4, '0');
    } else {
      numId = this.events.size + 1;
      eventId = 'EVT-' + String(numId).padStart(4, '0');
    }

    const title = raw.title || raw.name || ('Турнир #' + numId);
    let programId = raw.program_id || 'RUSSIAN_CHAMPIONSHIP';
    if (/народн|герой/i.test(title)) programId = 'HERO_GTO';
    else if (/кубок дальнего востока/i.test(title)) programId = 'FAR_EAST_CUP';
    else if (/кубок москвы/i.test(title)) programId = 'MOSCOW_CUP';

    const isOnline = raw.format === 'ONLINE' || raw.hasOnline || /онлайн|online/i.test(title + ' ' + (raw.location || ''));

    const event = {
      event_id: eventId,
      id: numId,
      legacy_id: numId,
      name: title,
      title: title,
      slug: raw.slug || ('event-' + numId),
      program_id: programId,
      period: raw.period || raw.dates || '',
      start_date: raw.start_date || '',
      end_date: raw.end_date || '',
      location: raw.location || raw.city || 'Россия',
      city: raw.city || raw.location || 'Россия',
      host_region_id: raw.host_region_id || '',
      level: raw.level || (/всеросс|росси/i.test(title) ? 'NATIONAL' : 'REGIONAL'),
      format: isOnline ? 'ONLINE' : (raw.format || 'OFFLINE'),
      status: raw.status || 'UPCOMING',
      hasOnsite: raw.hasOnsite !== false,
      hasOnline: Boolean(raw.hasOnline || isOnline),
      wodExercises: Array.isArray(raw.wodExercises) && raw.wodExercises.length ? raw.wodExercises : [
        'Подтягивания на перекладине (строгие)',
        'Отжимания в упоре лёжа',
        'Рывок гири (16 / 24 кг)'
      ],
      description: raw.description || '',
      source_url: raw.source_url || raw.url || '',
      cover: raw.cover || raw.poster || 'assets/events/event_default.jpg',
      documents: Array.isArray(raw.documents) ? raw.documents : [],
      about: Array.isArray(raw.about) ? raw.about : [],
      is_custom: true,
      updated_at: new Date().toISOString()
    };

    this.events.set(eventId, event);
    this._saveCustomEvents();

    this._logAudit('CREATE_OR_UPDATE_EVENT', 'admin', {
      event_id: eventId,
      title,
      format: event.format
    });

    return event;
  }

  getEventParticipants(eventId, videos = []) {
    const cleanId = String(eventId || '').replace(/^EVT-0*/i, '') || String(eventId);
    const numId = parseInt(cleanId, 10);
    const event = this.events.get(eventId) || Array.from(this.events.values()).find(e => String(e.legacy_id) === cleanId || e.slug === eventId);
    const participantsMap = new Map();

    // 1. Check protocol file in web/data/results/ or data/results/
    const resultsPaths = [
      path.join(this.rootDir, 'web', 'data', 'results', `${numId}.json`),
      path.join(this.rootDir, 'data', 'results', `${numId}.json`)
    ];

    for (const rp of resultsPaths) {
      if (fs.existsSync(rp)) {
        try {
          const protocol = JSON.parse(fs.readFileSync(rp, 'utf8'));
          if (protocol && Array.isArray(protocol.results)) {
            protocol.results.forEach(r => {
              const name = (r.participant || '').trim();
              if (!name || name.length < 3) return;
              if (!participantsMap.has(name)) {
                // Find athlete if exists
                const resolved = this.resolveIdentity({ name });
                const matchedAth = resolved.best_match;
                participantsMap.set(name, {
                  athlete_id: matchedAth ? matchedAth.athlete_id : ('ATH-' + Math.abs(this._hashString(name) % 10000000).toString().padStart(7, '0')),
                  name,
                  region: r.region || (matchedAth ? matchedAth.region : 'Россия'),
                  category: r.category || 'Любители',
                  rank: r.rank || '—',
                  result: r.result || '—',
                  status: 'confirmed',
                  source: 'protocol',
                  videos: []
                });
              }
            });
          }
          break;
        } catch (_) {}
      }
    }

    // 2. Attach video attempts and participants from Hero GTO
    const eventTitle = (event?.title || '').toLowerCase();
    const eventSlug = (event?.slug || '').toLowerCase();

    videos.forEach(v => {
      const vTid = String(v.tournamentId || v.tournament_id || '');
      const vTitle = (v.tournamentTitle || v.tournament_title || '').toLowerCase();
      const isMatch = (vTid && (vTid === String(eventId) || vTid === String(numId))) ||
                      (eventSlug && vTid.toLowerCase().includes(eventSlug)) ||
                      (eventTitle && vTitle && (eventTitle.includes(vTitle) || vTitle.includes(eventTitle)));

      if (isMatch) {
        const name = (v.athleteName || 'Атлет').trim();
        let p = participantsMap.get(name);
        if (!p) {
          p = {
            athlete_id: v.athleteId || ('ATH-' + Math.abs(this._hashString(name) % 10000000).toString().padStart(7, '0')),
            name,
            region: 'Россия',
            category: 'Онлайн (Герой ГТО)',
            rank: '—',
            result: v.result?.reps ? `${v.result.reps} повт.` : 'На судействе',
            status: v.status || 'video_uploaded',
            source: 'herogto',
            videos: []
          };
          participantsMap.set(name, p);
        }
        p.videos.push({
          video_id: v.id,
          url: v.url,
          exercise: v.exerciseTitle,
          reps: v.result?.reps || 0,
          status: v.status || 'pending_review'
        });
      }
    });

    return Array.from(participantsMap.values());
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

const masterDataService = new MasterDataService();
module.exports = { masterDataService, MasterDataService };

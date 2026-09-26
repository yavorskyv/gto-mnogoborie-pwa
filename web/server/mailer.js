/**
 * GTO MAILER — отправка писем с сайта без внешних зависимостей (Node.js tls/net)
 * Федерация многоборья ГТО России · 2026
 *
 * Поддерживаемые провайдеры (выбираются переменными окружения):
 *  - Яндекс 360 для бизнеса: smtp.yandex.ru:465 (SSL) или :587 (STARTTLS),
 *    логин = полный адрес ящика, пароль = «пароль приложения» (не пароль от Яндекс ID).
 *    Лимит: 300 писем (получателей) в сутки на ящик, независимо от тарифа.
 *  - Yandex Cloud Postbox: postbox.cloud.yandex.net:465, логин = ID API-ключа,
 *    пароль = секрет API-ключа. 2 000 писем/мес бесплатно, квота 200/сутки по умолчанию.
 *  - Любой другой SMTP-сервер с AUTH PLAIN / AUTH LOGIN.
 *
 * Переменные окружения:
 *  MAIL_ENABLED   — "1"/"true" включает реальную отправку; иначе письма только логируются (dry-run)
 *  SMTP_HOST      — по умолчанию smtp.yandex.ru
 *  SMTP_PORT      — по умолчанию 465
 *  SMTP_SECURE    — "1" = TLS с первого байта (порт 465); "0" = STARTTLS (порт 587); по умолчанию зависит от порта
 *  SMTP_USER      — логин SMTP (для Яндекс 360 — полный адрес, напр. noreply@gto.com.ru)
 *  SMTP_PASS      — пароль приложения / секрет API-ключа
 *  MAIL_FROM      — адрес отправителя, напр. "Федерация многоборья ГТО <noreply@gto.com.ru>" (по умолчанию SMTP_USER)
 *  MAIL_ADMIN     — куда слать уведомления федерации (по умолчанию info@gto.com.ru); несколько адресов через запятую
 *  MAIL_DAILY_LIMIT — предохранитель на число получателей в сутки (по умолчанию 280 — чуть ниже лимита Яндекса 300)
 *  MAIL_LOG_FILE  — путь к журналу отправок (JSON), по умолчанию <ROOT>/data/mail_log.json
 *  SMTP_LOOPBACK_PLAINTEXT — "1" разрешает соединение без TLS ТОЛЬКО с 127.0.0.1/localhost
 *                   (локальный Mailpit/MailHog для разработки, порт 1025)
 */

const tls = require('tls');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULTS = {
  host: 'smtp.yandex.ru',
  port: 465,
  admin: 'info@gto.com.ru',
  dailyLimit: 280,
  timeoutMs: 20000,
  maxLogEntries: 500
};

function envBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function parseAddressList(value) {
  return String(value || '')
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Извлекает голый адрес из "Имя <addr@host>" */
function bareAddress(value) {
  const m = String(value || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(value || '')).trim();
}

function isValidEmail(value) {
  const addr = bareAddress(value);
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(addr) && addr.length <= 254;
}

/** RFC 2047: кодирование заголовков с кириллицей */
function encodeHeaderWord(text) {
  const str = String(text || '');
  if (/^[\x20-\x7e]*$/.test(str)) return str;
  return '=?UTF-8?B?' + Buffer.from(str, 'utf8').toString('base64') + '?=';
}

/** "Имя <addr>" → "=?UTF-8?B?...?= <addr>" */
function encodeAddressHeader(value) {
  const str = String(value || '').trim();
  const m = str.match(/^(.*?)\s*<([^>]+)>$/);
  if (!m) return str;
  const name = m[1].replace(/^"|"$/g, '').trim();
  if (!name) return `<${m[2]}>`;
  return `${encodeHeaderWord(name)} <${m[2]}>`;
}

function base64Lines(str) {
  return Buffer.from(String(str), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Собирает MIME-письмо (text + optional html) */
function buildMime({ from, to, cc, replyTo, subject, text, html, messageId, headers }) {
  const toList = Array.isArray(to) ? to : [to];
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
  const domain = bareAddress(from).split('@')[1] || os.hostname();
  const boundary = '----=_GTO_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  const lines = [
    `From: ${encodeAddressHeader(from)}`,
    `To: ${toList.map(encodeAddressHeader).join(', ')}`
  ];
  if (ccList.length) lines.push(`Cc: ${ccList.map(encodeAddressHeader).join(', ')}`);
  if (replyTo) lines.push(`Reply-To: ${encodeAddressHeader(replyTo)}`);
  lines.push(`Subject: ${encodeHeaderWord(subject)}`);
  lines.push(`Date: ${new Date().toUTCString()}`);
  lines.push(`Message-ID: <${messageId || (Date.now().toString(36) + '.' + Math.random().toString(36).slice(2) + '@' + domain)}>`);
  lines.push('MIME-Version: 1.0');
  lines.push('X-Mailer: GTO-Mnogoborie-PWA/1.0');
  if (headers) for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${encodeHeaderWord(v)}`);

  if (html) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(base64Lines(text || ''));
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(base64Lines(html));
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(base64Lines(text || ''));
  }
  return lines.join('\r\n') + '\r\n';
}

/**
 * Минимальный SMTP-клиент: EHLO → (STARTTLS) → AUTH → MAIL FROM → RCPT TO → DATA → QUIT
 */
function smtpSend(config, envelope, rawMessage) {
  return new Promise((resolve, reject) => {
    const { host, port, secure, user, pass, timeoutMs } = config;
    let socket = null;
    let buffer = '';
    let finished = false;
    const transcript = [];
    const queue = [];
    const pendingLines = [];

    const fail = (err) => {
      if (finished) return;
      finished = true;
      try { socket && socket.destroy(); } catch (_) {}
      err.transcript = transcript.slice(-12);
      reject(err);
    };
    const done = (info) => {
      if (finished) return;
      finished = true;
      try { socket && socket.end(); } catch (_) {}
      resolve(info);
    };

    const attach = (sock) => {
      socket = sock;
      socket.setEncoding('utf8');
      socket.setTimeout(timeoutMs, () => fail(new Error('SMTP timeout')));
      socket.on('error', fail);
      socket.on('close', () => { if (!finished) fail(new Error('SMTP connection closed unexpectedly')); });
      socket.on('data', onData);
    };

    const onData = (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        transcript.push('S: ' + line);
        // Многострочный ответ: "250-..." продолжается, "250 ..." — последняя строка
        if (/^\d{3}-/.test(line)) { pendingLines.push(line); continue; }
        pendingLines.push(line);
        const full = pendingLines.slice();
        pendingLines.length = 0;
        const code = parseInt(line.slice(0, 3), 10);
        const handler = queue.shift();
        if (handler) handler(code, full);
      }
    };

    const expect = (okCodes) => new Promise((res, rej) => {
      queue.push((code, lines) => {
        if (okCodes.includes(code)) res({ code, lines });
        else rej(new Error(`SMTP ${code}: ${lines.join(' | ')}`));
      });
    });
    const send = (cmd, okCodes, masked) => {
      transcript.push('C: ' + (masked || cmd));
      socket.write(cmd + '\r\n');
      return expect(okCodes);
    };

    const run = async () => {
      await expect([220]);
      const ehloName = os.hostname() || 'gto-mnogoborie';
      let ehlo = await send(`EHLO ${ehloName}`, [250]);
      if (!secure) {
        const supportsStartTls = ehlo.lines.some(l => /STARTTLS/i.test(l));
        if (!supportsStartTls && !config.loopbackPlaintext) {
          throw new Error('SMTP server does not offer STARTTLS; use SMTP_SECURE=1 with port 465');
        }
      }
      if (!secure && !(config.loopbackPlaintext && !ehlo.lines.some(l => /STARTTLS/i.test(l)))) {
        await send('STARTTLS', [220]);
        await new Promise((res, rej) => {
          const plain = socket;
          plain.removeAllListeners('data');
          plain.removeAllListeners('close');
          plain.removeAllListeners('error');
          plain.setTimeout(0);
          const tlsSock = tls.connect({ socket: plain, servername: host, host }, () => res());
          tlsSock.once('error', rej);
          attach(tlsSock);
        });
        ehlo = await send(`EHLO ${ehloName}`, [250]);
      }
      const authLine = ehlo.lines.find(l => /\bAUTH\b/i.test(l)) || '';
      if (user && pass) {
        if (/PLAIN/i.test(authLine) || !/LOGIN/i.test(authLine)) {
          const token = Buffer.from(`\u0000${user}\u0000${pass}`, 'utf8').toString('base64');
          await send(`AUTH PLAIN ${token}`, [235], 'AUTH PLAIN ****');
        } else {
          await send('AUTH LOGIN', [334]);
          await send(Buffer.from(user, 'utf8').toString('base64'), [334], '<user>');
          await send(Buffer.from(pass, 'utf8').toString('base64'), [235], '<pass>');
        }
      }
      await send(`MAIL FROM:<${bareAddress(envelope.from)}>`, [250]);
      for (const rcpt of envelope.to) {
        await send(`RCPT TO:<${bareAddress(rcpt)}>`, [250, 251]);
      }
      await send('DATA', [354]);
      // Dot-stuffing: строки, начинающиеся с ".", удваиваются
      const body = rawMessage.replace(/\r\n\./g, '\r\n..');
      transcript.push('C: <DATA ' + body.length + ' bytes>');
      socket.write(body + (body.endsWith('\r\n') ? '' : '\r\n') + '.\r\n');
      const result = await expect([250]);
      try { await send('QUIT', [221]); } catch (_) { /* сервер мог закрыть соединение сам */ }
      done({ response: result.lines.join(' '), transcript });
    };

    const initial = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    attach(initial);
    run().catch(fail);
  });
}

class Mailer {
  constructor(options = {}) {
    const env = options.env || process.env;
    const port = Number(env.SMTP_PORT || options.port || DEFAULTS.port);
    this.config = {
      enabled: envBool(env.MAIL_ENABLED, options.enabled === undefined ? false : options.enabled),
      host: env.SMTP_HOST || options.host || DEFAULTS.host,
      port,
      secure: envBool(env.SMTP_SECURE, options.secure === undefined ? port === 465 : options.secure),
      user: env.SMTP_USER || options.user || '',
      pass: env.SMTP_PASS || options.pass || '',
      from: env.MAIL_FROM || options.from || env.SMTP_USER || options.user || '',
      admin: parseAddressList(env.MAIL_ADMIN || options.admin || DEFAULTS.admin),
      dailyLimit: Number(env.MAIL_DAILY_LIMIT || options.dailyLimit || DEFAULTS.dailyLimit),
      timeoutMs: Number(env.SMTP_TIMEOUT_MS || options.timeoutMs || DEFAULTS.timeoutMs),
      // Локальный dev-сервер (Mailpit/MailHog на 127.0.0.1:1025) без TLS. Работает только для loopback-адресов.
      loopbackPlaintext: /^(127\.0\.0\.1|localhost|::1)$/i.test(env.SMTP_HOST || options.host || '') && envBool(env.SMTP_LOOPBACK_PLAINTEXT, Boolean(options.loopbackPlaintext)),
      logFile: env.MAIL_LOG_FILE || options.logFile || null,
      transport: options.transport || null // для тестов: async (config, envelope, raw) => info
    };
    this.stats = { day: '', sentRecipients: 0, failed: 0, queued: 0 };
    this.log = [];
    this._loadLog();
  }

  get provider() {
    const h = this.config.host;
    if (/yandex\.(ru|com)$/i.test(h)) return 'yandex360';
    if (/postbox\.cloud\.yandex\.net$/i.test(h)) return 'yandex-postbox';
    if (/mail\.ru$/i.test(h)) return 'vk-workmail';
    if (/google|gmail/i.test(h)) return 'google';
    if (/zoho/i.test(h)) return 'zoho';
    return 'custom';
  }

  isConfigured() {
    return Boolean(this.config.host && this.config.from && (this.config.user && this.config.pass || !this.config.enabled));
  }

  status() {
    this._rollDay();
    return {
      enabled: this.config.enabled,
      configured: this.isConfigured(),
      provider: this.provider,
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      from: this.config.from,
      admin: this.config.admin,
      daily_limit: this.config.dailyLimit,
      sent_today: this.stats.sentRecipients,
      failed_today: this.stats.failed,
      recent: this.log.slice(0, 20)
    };
  }

  _rollDay() {
    const day = new Date().toISOString().slice(0, 10);
    if (this.stats.day !== day) {
      this.stats = { day, sentRecipients: 0, failed: 0, queued: 0 };
    }
  }

  _loadLog() {
    if (!this.config.logFile) return;
    try {
      if (fs.existsSync(this.config.logFile)) {
        const parsed = JSON.parse(fs.readFileSync(this.config.logFile, 'utf8'));
        if (Array.isArray(parsed)) this.log = parsed.slice(0, DEFAULTS.maxLogEntries);
        const day = new Date().toISOString().slice(0, 10);
        this.stats.day = day;
        this.stats.sentRecipients = this.log
          .filter(e => e.status === 'sent' && String(e.at || '').slice(0, 10) === day)
          .reduce((n, e) => n + (e.recipients || 1), 0);
      }
    } catch (err) {
      console.warn('[Mailer] log load warning:', err.message);
    }
  }

  _appendLog(entry) {
    this.log.unshift(entry);
    if (this.log.length > DEFAULTS.maxLogEntries) this.log.length = DEFAULTS.maxLogEntries;
    if (!this.config.logFile) return;
    try {
      fs.mkdirSync(path.dirname(this.config.logFile), { recursive: true });
      fs.writeFileSync(this.config.logFile, JSON.stringify(this.log, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Mailer] log write warning:', err.message);
    }
  }

  /**
   * Отправка письма. Никогда не бросает исключение наружу — возвращает { ok, status, error }.
   * @param {{to:string|string[], subject:string, text:string, html?:string, replyTo?:string, cc?:string|string[], kind?:string}} msg
   */
  async send(msg) {
    this._rollDay();
    const toList = (Array.isArray(msg.to) ? msg.to : parseAddressList(msg.to)).filter(isValidEmail);
    const ccList = (msg.cc ? (Array.isArray(msg.cc) ? msg.cc : parseAddressList(msg.cc)) : []).filter(isValidEmail);
    const recipients = [...toList, ...ccList];
    const entry = {
      id: 'mail_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      at: new Date().toISOString(),
      kind: msg.kind || 'generic',
      to: toList.map(bareAddress),
      subject: String(msg.subject || '').slice(0, 200),
      recipients: recipients.length,
      status: 'pending',
      error: null
    };

    if (!recipients.length) {
      entry.status = 'skipped';
      entry.error = 'no valid recipients';
      this._appendLog(entry);
      return { ok: false, status: entry.status, error: entry.error, id: entry.id };
    }
    if (!this.config.enabled) {
      entry.status = 'dry-run';
      this._appendLog(entry);
      console.log(`[Mailer] dry-run → ${entry.to.join(', ')} · ${entry.subject}`);
      return { ok: true, status: entry.status, id: entry.id };
    }
    if (!this.isConfigured()) {
      entry.status = 'failed';
      entry.error = 'SMTP_USER/SMTP_PASS/MAIL_FROM are not configured';
      this._appendLog(entry);
      return { ok: false, status: entry.status, error: entry.error, id: entry.id };
    }
    if (this.stats.sentRecipients + recipients.length > this.config.dailyLimit) {
      entry.status = 'deferred';
      entry.error = `daily limit ${this.config.dailyLimit} reached`;
      this._appendLog(entry);
      console.warn('[Mailer] daily limit reached, message deferred:', entry.subject);
      return { ok: false, status: entry.status, error: entry.error, id: entry.id };
    }

    const raw = buildMime({
      from: this.config.from,
      to: toList,
      cc: ccList,
      replyTo: msg.replyTo && isValidEmail(msg.replyTo) ? msg.replyTo : undefined,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      headers: msg.headers
    });
    const envelope = { from: this.config.from, to: recipients };
    const transport = this.config.transport || smtpSend;
    try {
      const info = await transport(this.config, envelope, raw);
      entry.status = 'sent';
      entry.response = info && info.response ? String(info.response).slice(0, 200) : null;
      this.stats.sentRecipients += recipients.length;
      this._appendLog(entry);
      return { ok: true, status: 'sent', id: entry.id, response: entry.response };
    } catch (err) {
      entry.status = 'failed';
      entry.error = String(err && err.message || err).slice(0, 300);
      this.stats.failed += 1;
      this._appendLog(entry);
      console.error('[Mailer] send failed:', entry.error, err && err.transcript ? err.transcript.join(' / ') : '');
      return { ok: false, status: 'failed', id: entry.id, error: entry.error };
    }
  }

  /** Письмо администраторам федерации (MAIL_ADMIN) */
  async notifyAdmin(msg) {
    return this.send({ ...msg, to: this.config.admin });
  }
}

// ================= ШАБЛОНЫ ПИСЕМ =================

const BRAND = {
  name: 'Федерация многоборья ГТО России',
  site: 'https://gto.com.ru/',
  color: '#0EA5E9'
};

function layout(title, bodyHtml) {
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#0f172a;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e2e8f0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1e293b;border-radius:14px;overflow:hidden;border:1px solid #334155">
<tr><td style="background:linear-gradient(135deg,#0EA5E9,#ef4444);padding:18px 24px;color:#fff;font-weight:800;font-size:16px">${escapeHtml(BRAND.name)}</td></tr>
<tr><td style="padding:22px 24px"><h1 style="margin:0 0 12px;font-size:20px;color:#fff">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:14px 24px;font-size:12px;color:#94a3b8;border-top:1px solid #334155">Это автоматическое письмо платформы «Многоборье ГТО». Вопросы: <a href="mailto:info@gto.com.ru" style="color:#38bdf8">info@gto.com.ru</a> · <a href="${BRAND.site}" style="color:#38bdf8">gto.com.ru</a></td></tr>
</table></td></tr></table></body></html>`;
}

function kv(rows) {
  return '<table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.5;margin:8px 0 16px">' +
    rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([k, v]) => `<tr><td style="color:#94a3b8;padding:3px 14px 3px 0;white-space:nowrap">${escapeHtml(k)}</td><td style="color:#fff;font-weight:600">${escapeHtml(v)}</td></tr>`).join('') +
    '</table>';
}

const templates = {
  /** Подтверждение заявки участнику */
  applicationConfirmation(app) {
    const rows = [
      ['Номер заявки', app.regNumber],
      ['Турнир', app.eventTitle],
      ['Сроки', app.eventPeriod],
      ['Место', app.eventLocation],
      ['Участник', app.name],
      ['Категория', app.category],
      ['Регион', app.region],
      ['УИН ГТО', app.uin]
    ];
    const text = [
      `Здравствуйте, ${app.name}!`,
      '',
      'Ваша заявка на участие в соревнованиях принята.',
      ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      '',
      'Статус заявки и результаты будут доступны в приложении «Многоборье ГТО».',
      `${BRAND.name} · ${BRAND.site}`
    ].join('\n');
    const html = layout('Заявка принята', `<p style="margin:0 0 10px">Здравствуйте, <b>${escapeHtml(app.name)}</b>! Ваша заявка на участие в соревнованиях принята оргкомитетом.</p>${kv(rows)}<p style="margin:0;color:#cbd5e1">Статус заявки и результаты будут доступны в приложении «Многоборье ГТО».</p>`);
    return { subject: `Заявка ${app.regNumber}: ${app.eventTitle}`, text, html, kind: 'application_confirmation' };
  },

  /** Уведомление федерации о новой заявке */
  applicationAdminNotice(app) {
    const rows = [
      ['Номер', app.regNumber],
      ['Турнир', app.eventTitle],
      ['Сроки', app.eventPeriod],
      ['ФИО', app.name],
      ['Телефон', app.phone],
      ['Email', app.email],
      ['Регион', app.region],
      ['Категория', app.category],
      ['УИН', app.uin],
      ['Подана', app.dateSubmitted]
    ];
    const text = ['Новая заявка на турнир', '', ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join('\n');
    const html = layout('Новая заявка на турнир', kv(rows));
    return { subject: `[Заявка] ${app.regNumber} · ${app.name} · ${app.eventTitle}`, text, html, kind: 'application_admin', replyTo: app.email || undefined };
  },

  /** Обращение через форму обратной связи */
  contactForm(form) {
    const rows = [['Имя', form.name], ['Email', form.email], ['Телефон', form.phone], ['Тема', form.topic]];
    const text = [...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '', form.message].join('\n');
    const html = layout('Обращение с сайта', kv(rows) + `<p style="white-space:pre-wrap;margin:0;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px">${escapeHtml(form.message)}</p>`);
    return { subject: `[Сайт] ${form.topic || 'Обращение'} · ${form.name}`, text, html, kind: 'contact', replyTo: form.email || undefined };
  },

  /** Вердикт судьи по видео «Герой ГТО» */
  heroVerdict(video) {
    const approved = video.status === 'approved';
    const title = approved ? 'Результат засчитан' : (video.status === 'rejected' ? 'Результат не засчитан' : 'Статус видео обновлён');
    const rows = [
      ['Упражнение', video.exerciseTitle],
      ['Результат', video.result && video.result.reps ? `${video.result.reps} повт.` : undefined],
      ['Турнир', video.tournamentTitle],
      ['Судья', video.judgeDecision && video.judgeDecision.judgeName],
      ['Комментарий', video.judgeDecision && (video.judgeDecision.comment || video.judgeDecision.note)],
      ['Рекорд', video.generatedRecordId ? `внесён в книгу рекордов (${video.generatedRecordId})` : undefined]
    ];
    const text = [`Здравствуйте, ${video.athleteName}!`, '', `${title}.`, ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '', `${BRAND.name} · ${BRAND.site}`].join('\n');
    const html = layout(title, `<p style="margin:0 0 10px">Здравствуйте, <b>${escapeHtml(video.athleteName)}</b>! Судейская коллегия рассмотрела вашу видеозапись.</p>${kv(rows)}`);
    return { subject: `Герой ГТО: ${title} — ${video.exerciseTitle || 'упражнение'}`, text, html, kind: 'hero_verdict' };
  }
};

let sharedMailer = null;
function getMailer(options) {
  if (!sharedMailer) sharedMailer = new Mailer(options);
  return sharedMailer;
}

module.exports = { Mailer, getMailer, templates, buildMime, smtpSend, isValidEmail, bareAddress, encodeHeaderWord };

#!/usr/bin/env node
/**
 * Тест почтового модуля web/server/mailer.js без внешних зависимостей.
 * Поднимает фиктивный SMTP-сервер на 127.0.0.1 и проверяет полный диалог
 * (EHLO → AUTH PLAIN → MAIL FROM → RCPT TO → DATA → QUIT), MIME-кодирование
 * кириллицы, шаблоны писем, dry-run и суточный предохранитель.
 *
 *   node scripts/test_mailer.js
 */
const net = require('net');
const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { Mailer, templates, buildMime, encodeHeaderWord, isValidEmail } = require('../web/server/mailer');

function startFakeSmtp() {
  const received = { commands: [], data: '' };
  const server = net.createServer((sock) => {
    let buf = '';
    let inData = false;
    sock.write('220 fake.smtp ESMTP ready\r\n');
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let idx;
      while ((idx = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (inData) {
          if (line === '.') { inData = false; sock.write('250 2.0.0 OK queued as FAKE123\r\n'); }
          else received.data += line + '\r\n';
          continue;
        }
        received.commands.push(line);
        const cmd = line.split(' ')[0].toUpperCase();
        if (cmd === 'EHLO') sock.write('250-fake.smtp\r\n250-SIZE 52428800\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        else if (cmd === 'AUTH') sock.write(line.includes('AUTH PLAIN') ? '235 2.7.0 Authentication successful\r\n' : '334 VXNlcm5hbWU6\r\n');
        else if (cmd === 'MAIL' || cmd === 'RCPT') sock.write('250 2.1.0 OK\r\n');
        else if (cmd === 'DATA') { inData = true; sock.write('354 End data with <CR><LF>.<CR><LF>\r\n'); }
        else if (cmd === 'QUIT') { sock.write('221 Bye\r\n'); sock.end(); }
        else sock.write('250 OK\r\n');
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, received })));
}

(async () => {
  // 1. Кодирование заголовков и валидация адресов
  assert.strictEqual(encodeHeaderWord('Hello'), 'Hello');
  assert.ok(encodeHeaderWord('Заявка').startsWith('=?UTF-8?B?'));
  assert.ok(isValidEmail('athlete@mail.ru'));
  assert.ok(isValidEmail('Иван <ivan@gto.com.ru>'));
  assert.ok(!isValidEmail('not-an-email'));
  assert.ok(!isValidEmail('a@b'));

  // 2. MIME: multipart/alternative, base64, Reply-To
  const mime = buildMime({ from: 'Федерация <noreply@gto.com.ru>', to: ['a@b.ru'], replyTo: 'x@y.ru', subject: 'Тест', text: 'Привет', html: '<b>Привет</b>' });
  assert.ok(/^From: =\?UTF-8\?B\?.+\?= <noreply@gto\.com\.ru>/m.test(mime));
  assert.ok(/^Reply-To: x@y\.ru/m.test(mime));
  assert.ok(/multipart\/alternative/.test(mime));
  assert.ok(mime.includes(Buffer.from('Привет').toString('base64')));

  // 3. Шаблоны
  const app = { regNumber: 'ГТО-2026-1234', eventTitle: 'Кубок России', eventPeriod: '10–12 октября 2026', eventLocation: 'Москва', name: 'Иван Петров', phone: '+7 999 000-00-00', email: 'ivan@mail.ru', region: 'Москва', category: 'Любители', uin: '26-77-0001234', dateSubmitted: '26.09.2026' };
  const t1 = templates.applicationConfirmation(app);
  assert.ok(t1.subject.includes('ГТО-2026-1234') && t1.html.includes('Иван Петров') && t1.text.includes('Кубок России'));
  const t2 = templates.applicationAdminNotice(app);
  assert.strictEqual(t2.replyTo, 'ivan@mail.ru');
  const t3 = templates.contactForm({ name: 'Ольга', email: 'o@x.ru', message: '<script>alert(1)</script> Вопрос' });
  assert.ok(t3.html.includes('&lt;script&gt;'), 'HTML в обращении должен экранироваться');
  const t4 = templates.heroVerdict({ status: 'approved', athleteName: 'Пётр', exerciseTitle: 'Подтягивания', result: { reps: 25 }, judgeDecision: { judgeName: 'Судья' } });
  assert.ok(t4.subject.includes('засчитан') && t4.text.includes('25 повт.'));

  // 4. Dry-run без MAIL_ENABLED
  const tmpLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gto-mail-')), 'mail_log.json');
  const dry = new Mailer({ env: {}, from: 'noreply@gto.com.ru', logFile: tmpLog });
  const dryRes = await dry.send({ to: 'a@b.ru', subject: 'x', text: 'y' });
  assert.strictEqual(dryRes.status, 'dry-run');
  assert.strictEqual(JSON.parse(fs.readFileSync(tmpLog, 'utf8'))[0].status, 'dry-run');
  const noRcpt = await dry.send({ to: 'bad', subject: 'x', text: 'y' });
  assert.strictEqual(noRcpt.status, 'skipped');

  // 5. Реальный SMTP-диалог с фиктивным сервером на loopback
  const fake = await startFakeSmtp();
  const mailer = new Mailer({
    env: {},
    enabled: true,
    host: '127.0.0.1',
    port: fake.port,
    secure: false,
    loopbackPlaintext: true,
    user: 'noreply@gto.com.ru',
    pass: 'app-password',
    from: 'Федерация многоборья ГТО <noreply@gto.com.ru>',
    admin: 'info@gto.com.ru, sport@gto.com.ru',
    dailyLimit: 3,
    logFile: null
  });
  assert.strictEqual(mailer.provider, 'custom');
  assert.deepStrictEqual(mailer.config.admin, ['info@gto.com.ru', 'sport@gto.com.ru']);

  const res = await mailer.send({ ...templates.applicationConfirmation(app), to: app.email });
  assert.strictEqual(res.status, 'sent', JSON.stringify(res));
  assert.ok(res.response.includes('FAKE123'));
  const cmds = fake.received.commands;
  assert.ok(cmds[0].startsWith('EHLO '));
  assert.ok(cmds[1].startsWith('AUTH PLAIN '));
  const authToken = Buffer.from(cmds[1].slice('AUTH PLAIN '.length), 'base64').toString('utf8');
  assert.strictEqual(authToken, '\u0000noreply@gto.com.ru\u0000app-password');
  assert.strictEqual(cmds[2], 'MAIL FROM:<noreply@gto.com.ru>');
  assert.strictEqual(cmds[3], 'RCPT TO:<ivan@mail.ru>');
  assert.strictEqual(cmds[4], 'DATA');
  assert.strictEqual(cmds[5], 'QUIT');
  assert.ok(fake.received.data.includes('Subject: =?UTF-8?B?'));
  assert.ok(fake.received.data.includes('To: ivan@mail.ru'));

  // 6. notifyAdmin → два получателя; затем суточный предохранитель (лимит 3)
  fake.received.commands.length = 0;
  const adminRes = await mailer.notifyAdmin(templates.applicationAdminNotice(app));
  assert.strictEqual(adminRes.status, 'sent');
  assert.deepStrictEqual(fake.received.commands.filter(c => c.startsWith('RCPT')), ['RCPT TO:<info@gto.com.ru>', 'RCPT TO:<sport@gto.com.ru>']);
  assert.strictEqual(mailer.status().sent_today, 3);
  const deferred = await mailer.send({ to: 'z@z.ru', subject: 'over', text: 'limit' });
  assert.strictEqual(deferred.status, 'deferred');

  // 7. Ошибка соединения не бросает исключение наружу, а возвращает status=failed
  await new Promise((r) => fake.server.close(r));
  const broken = new Mailer({ env: {}, enabled: true, host: '127.0.0.1', port: fake.port, secure: false, loopbackPlaintext: true, user: 'u', pass: 'p', from: 'noreply@gto.com.ru', logFile: null });
  const failRes = await broken.send({ to: 'q@q.ru', subject: 'x', text: 'y' });
  assert.strictEqual(failRes.status, 'failed');
  assert.ok(failRes.error);

  console.log('✓ mailer tests passed');
})().catch((err) => {
  console.error('✗ mailer test failed:', err);
  process.exit(1);
});

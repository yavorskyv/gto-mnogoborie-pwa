#!/usr/bin/env python3
"""
Простое сравнение цен корпоративной почты — одна таблица, PDF.
  python3 scripts/build_email_prices_simple.py
Результат: docs/EMAIL_PRICES_SIMPLE.pdf
"""
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "EMAIL_PRICES_SIMPLE.pdf"

# (провайдер, тариф, как платят, за 10 ящиков в год ₽, за 25 ящиков ₽, макс. ящиков, оплата из РФ, группа,
#  серверы, надёжность 1–5, обоснование)
ROWS = [
    ("VK WorkSpace", "С рекламой", "бесплатно", 0, None, "5", "да", "ru", "РФ, 3 ДЦ VK", 4, "SLA 99,5 %, 152-ФЗ, реестр ПО; поддержка по форме"),
    ("Jino", "Почта 100 ГБ", "900 ₽/год за всё", 900, 900, "∞", "да", "ru", "РФ, Москва (аренда)", 3, "бэкап раз в 2 дня; поддержка только в рабочие часы, до 48 ч; гарантий в оферте нет"),
    ("Timeweb", "Почтовый", "950 ₽/год за всё", 950, 950, "∞", "да", "ru", "РФ, СПб, Tier III", 4, "аптайм 99,98 %, 24/7, 152-ФЗ, 400 тыс. клиентов; сбои сети 2025–26"),
    ("SpaceWeb", "Почтовый 10", "1 008 ₽/год за всё", 1008, 1008, "∞", "да", "ru", "РФ, СПб/Москва, Tier III", 4, "аптайм 99,98 %, ежедневный бэкап, 24/7, с 2001 г."),
    ("ihc.ru", "Хостинг IHC-2 + почта", "1 470 ₽/год за всё", 1470, 1470, "∞", "да", "ru", "РФ, Москва, Tier III", 3, "аптайм 99,9 %, 24/7, ежедневный бэкап; небольшая компания"),
    ("Webnames", "Хостинг «Старт» + почта", "1 728 ₽/год за всё", 1728, 1728, "н/н", "да", "ru", "РФ (ДЦ не раскрыт)", 2, "поддержка по телефону 8–13 МСК, SLA не публикуется"),
    ("Рег.ру", "Mail-1", "1 836 ₽/год за всё", 1836, 1836, "1 000", "да", "ru", "РФ, Москва/СПб", 4, "аптайм 99,9 %, 30 резервных копий, антиспам Kaspersky, тикеты 24/7"),
    ("Hostland", "Хостинг Green + почта", "2 364 ₽/год за всё", 2364, 2364, "∞", "да", "ru", "РФ, СПб (аренда)", 3, "поддержка 24/7, реестр хостингов; SLA и бэкап почты не публикуются"),
    ("RU-CENTER", "Почта 1", "237 ₽/мес за всё", 2844, 2844, "∞", "да", "ru", "РФ, Москва, Tier III", 3, "Kaspersky, бэкап 2 раза в неделю; сбой почты 14.11.2025 (~1 ч)"),
    ("Beget", "Хостинг Blog + почта", "5 040 ₽/год за всё", 5040, 5040, "1 000", "да", "ru", "РФ, СПб/Москва, Tier III", 4, "24/7, 152-ФЗ + ФСТЭК, PCI DSS, 1,5 млн клиентов; SLA только для облака"),
    ("Purelymail", "Simple", "10 $/год за всё", 843, 843, "∞", "нет", "foreign", "США", 2, "один человек в команде, гарантий нет"),
    ("Migadu", "Mini", "90 $/год за всё", 7590, 7590, "∞", "BTC", "foreign", "Швейцария", 3, "небольшая компания, лимит 100 писем/сутки"),
    ("Zoho Mail", "Mail Lite", "1 $/мес за ящик", 10121, 25302, "∞", "нет", "foreign", "ЕС/США/Индия", 4, "крупный вендор, SLA 99,9 %"),
    ("Timeweb", "Почта для бизнеса", "120 ₽/мес за ящик", 14400, 36000, "500", "да", "ru", "РФ, СПб, Tier III", 4, "100 ГБ на ящик, 24/7, 152-ФЗ"),
    ("Hostinger", "Mail Starter", "1,59 $/мес за ящик", 16090, 40225, "∞", "крипта", "foreign", "ЕС/США", 3, "крупный хостер, ящик 5 ГБ"),
    ("Ростелеком", "Корпоративная почта", "146 ₽/мес за ящик", 17520, 43800, "н/н", "да", "ru", "РФ (ДЦ не раскрыт)", 3, "госоператор; SLA, бэкап и ДЦ публично не раскрыты"),
    ("Яндекс 360", "Почта и файлы", "279 ₽/мес за ящик, от 10", 33480, 83700, "250", "да", "ru", "РФ, свои ДЦ Яндекса", 5, "ISO 27001, 152-ФЗ УЗ-2, ежедневный бэкап в разных ДЦ, 24/7, 185 тыс. организаций"),
    ("Cloud4Y", "Exchange", "288 ₽/мес за ящик, от 5", 34560, 86400, "н/н", "да", "ru", "РФ, свои ДЦ Tier IV", 5, "единственный с SLA 99,982 % и финансовой ответственностью; 24/7; 152-ФЗ, ФСТЭК"),
    ("VK WorkSpace", "Базовый", "309 ₽/мес за ящик, от 10", 37080, 92700, "300", "да", "ru", "РФ, 3 ДЦ VK", 4, "SLA 99,5 %, 152-ФЗ, реестр ПО, 150 ГБ на ящик"),
    ("Яндекс 360", "Минимальный", "319 ₽/мес за ящик", 38280, 95700, "250", "да", "ru", "РФ, свои ДЦ Яндекса", 5, "как «Почта и файлы», без минимума по числу пользователей"),
    ("Р7", "Пространство", "330 ₽/мес за ящик", 39600, 99000, "50", "да", "ru", "РФ (ДЦ не раскрыт)", 2, "сервис запущен в феврале 2026, SLA и ДЦ не раскрыты"),
    ("Fastmail", "Business Standard", "5 $/мес за ящик", 50605, 126512, "∞", "нет", "foreign", "США/Австралия", 4, "с 1999 г., SLA 99,9 %"),
    ("Яндекс 360", "Основной", "549 ₽/мес за ящик", 65880, 164700, "250", "да", "ru", "РФ, свои ДЦ Яндекса", 5, "1 ТБ на ящик, SSO, архив писем"),
    ("Proton Mail", "Essentials", "6,99 $/мес за ящик", 70740, 176850, "∞", "UnionPay", "foreign", "Швейцария", 4, "шифрование, SLA 99,95 %"),
    ("Google Workspace", "Business Starter", "7 $/мес за ящик", 70847, 177117, "∞", "нет", "foreign", "США/ЕС", 5, "SLA 99,9 %, крупнейший вендор"),
]
ROWS.sort(key=lambda r: r[3])
MAX = max(r[3] for r in ROWS)
BEST = {id(r) for r in ROWS if (r[0], r[1]) in {("Timeweb", "Почтовый"), ("SpaceWeb", "Почтовый 10"), ("Рег.ру", "Mail-1"), ("Яндекс 360", "Минимальный"), ("Cloud4Y", "Exchange")}}


def fmt(n):
    return "—" if n is None else f"{n:,}".replace(",", " ")


def row_html(i, r):
    prov, tariff, how, y10, y25, boxes, pay, group, servers, rel, why = r
    pct = max(1.5, y10 / MAX * 100) if y10 else 0
    color = "#0ea5e9" if group == "ru" else "#a78bfa"
    best = id(r) in BEST
    cls = ' class="best"' if best else ""
    limit = f'<span class="note">до {boxes} ящиков</span>' if boxes not in ("∞", "н/н") else ""
    stars = "★" * rel + "☆" * (5 - rel)
    srv_cls = "ru" if group == "ru" else "fo"
    badge = '<span class="badge">выгодно и надёжно</span>' if best else ""
    return f"""<tr{cls}>
      <td class="n">{i}</td>
      <td><b>{prov}</b><br><span class="t">{tariff}</span>{badge}</td>
      <td>{how}{('<br>' + limit) if limit else ''}</td>
      <td class="num">{fmt(y10)}</td>
      <td class="num">{fmt(y25)}</td>
      <td class="bar"><div style="width:{pct:.1f}%;background:{color}"></div></td>
      <td class="srv {srv_cls}">{servers}</td>
      <td class="rel"><span class="stars">{stars}</span><br><span class="why">{why}</span></td>
      <td class="pay {'ok' if pay == 'да' else ('no' if pay == 'нет' else 'alt')}">{pay}</td>
    </tr>"""


rows_html = "\n".join(row_html(i, r) for i, r in enumerate(ROWS, 1))

HTML = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Корпоративная почта: цены</title>
<style>
@page {{ size: A4; margin: 12mm 12mm 14mm 12mm; }}
body {{ font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif; color: #111827; font-size: 10pt; margin: 0; }}
h1 {{ font-size: 19pt; margin: 0 0 4pt; }}
.sub {{ color: #475569; font-size: 9.5pt; margin: 0 0 10pt; }}
table {{ border-collapse: collapse; width: 100%; table-layout: fixed; }}
th {{ background: #0f172a; color: #fff; font-size: 8.5pt; text-align: left; padding: 6pt 6pt; }}
td {{ padding: 4pt 5pt; border-bottom: 1px solid #e2e8f0; vertical-align: middle; font-size: 8.6pt; }}
tr.best td {{ background: #ecfdf5; }}
td.srv {{ font-size: 8pt; }} td.srv.ru {{ color: #047857; font-weight: 700; }} td.srv.fo {{ color: #6d28d9; }}
td.rel .stars {{ color: #f59e0b; letter-spacing: 1px; font-size: 9pt; }} td.rel .why {{ color: #475569; font-size: 7.6pt; line-height: 1.25; }}
.badge {{ display: inline-block; margin-top: 2pt; padding: 1pt 5pt; border-radius: 6pt; background: #059669; color: #fff; font-size: 7pt; font-weight: 700; }}
td.n {{ color: #64748b; width: 5%; }}
td .t {{ color: #475569; font-size: 8.5pt; }}
td .note {{ color: #64748b; font-size: 8pt; }}
td.num {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }}
th.num {{ text-align: right; }}
td.bar div {{ height: 9pt; border-radius: 3pt; }}
td.pay {{ text-align: center; font-size: 8.5pt; white-space: nowrap; }}
td.ok {{ color: #047857; }} td.no {{ color: #b91c1c; }} td.alt {{ color: #b45309; }}
.legend {{ display: flex; gap: 14pt; font-size: 8.5pt; color: #475569; margin: 8pt 0 0; }}
.legend i {{ display: inline-block; width: 10pt; height: 7pt; border-radius: 2pt; margin-right: 4pt; vertical-align: middle; }}
.picks {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin: 12pt 0 0; }}
.pick {{ border: 1px solid #cbd5e1; border-radius: 8pt; padding: 8pt 10pt; }}
.pick b {{ display: block; font-size: 10pt; }}
.pick .p {{ font-size: 15pt; font-weight: 800; color: #0369a1; margin: 3pt 0; }}
.pick small {{ color: #475569; font-size: 8.5pt; }}
.foot {{ color: #64748b; font-size: 8pt; margin-top: 10pt; line-height: 1.4; }}
</style></head><body>
<h1>Корпоративная почта на своём домене: сравнение цен</h1>
<p class="sub">Сколько стоит почта вида info@ваш-домен.ru. Отсортировано по стоимости 10 ящиков в год. Цены на 26.09.2026, курс ЦБ 1 $ = 84,3 ₽.</p>

<div class="picks">
  <div class="pick"><b>Выгодно и надёжно, любое число ящиков</b><div class="p">950–1 008 ₽/год</div><small>Timeweb «Почтовый» или SpaceWeb «Почтовый 10»: серверы Tier III в России, аптайм 99,98 %, поддержка 24/7, 152-ФЗ. Рег.ру Mail-1 за 1 836 ₽ — 30 резервных копий и Kaspersky</small></div>
  <div class="pick"><b>Надёжнее всего, облачный офис</b><div class="p">3 828 ₽/год за ящик</div><small>Яндекс 360 «Минимальный»: свои дата-центры в РФ, ISO 27001, 152-ФЗ, ежедневный бэкап в разных ДЦ, 185 тыс. организаций</small></div>
  <div class="pick"><b>Единственный с SLA под финансовую ответственность</b><div class="p">3 456 ₽/год за ящик</div><small>Cloud4Y Exchange: 99,982 % в договоре, свои ДЦ Tier IV, 24/7, минимум 5 ящиков</small></div>
</div>

<table>
<thead><tr>
  <th style="width:3.5%">#</th>
  <th style="width:15%">Провайдер / тариф</th>
  <th style="width:14%">Как платят</th>
  <th class="num" style="width:8%">10 ящиков, ₽/год</th>
  <th class="num" style="width:8%">25 ящиков, ₽/год</th>
  <th style="width:8%">Шкала</th>
  <th style="width:12%">Серверы</th>
  <th style="width:25%">Надёжность</th>
  <th style="width:6.5%; text-align:center">Оплата из РФ</th>
</tr></thead>
<tbody>
{rows_html}
</tbody></table>
<div class="legend"><span><i style="background:#0ea5e9"></i>российский провайдер</span><span><i style="background:#a78bfa"></i>зарубежный</span><span><i style="background:#ecfdf5;border:1px solid #a7f3d0"></i>выгодно и надёжно</span><span>★ надёжность 1–5: SLA в договоре, уровень ДЦ, поддержка 24/7, бэкап, 152-ФЗ, возраст и масштаб компании</span></div>
<p class="foot">«За всё» — фиксированная цена за аккаунт, число ящиков на неё не влияет (общий диск 10–100 ГБ). «За ящик» — цена умножается на число сотрудников. «От 10» — минимальное число оплачиваемых пользователей. Оплата из РФ: «да» — рубли, счёт или карта РФ; «нет» — только иностранная карта; «крипта», «BTC», «UnionPay» — доступный обходной способ. Бесплатный тариф Яндекс 360 закрыт с ноября 2025 (кроме НКО). Microsoft 365 организациям из РФ не продаётся. Зарубежные серверы не подходят для писем с персональными данными спортсменов (152-ФЗ). Jino дешевле всех, но поддержка только в рабочие часы и без гарантий в оферте — для некритичной почты. Р7 и Ростелеком не раскрывают SLA и дата-центры.</p>
</body></html>"""


def main():
    html_path = OUT.with_suffix(".html")
    html_path.write_text(HTML, encoding="utf-8")
    npm_root = subprocess.check_output(["npm", "root", "-g"], text=True).strip()
    script = f"""
const {{ chromium }} = require({npm_root!r} + '/playwright');
(async () => {{
  const browser = await chromium.launch({{ headless: true }});
  const page = await browser.newPage();
  await page.goto('file://' + {str(html_path)!r}, {{ waitUntil: 'load' }});
  await page.pdf({{ path: {str(OUT)!r}, format: 'A4', printBackground: true,
    margin: {{ top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' }},
    displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:8px;color:#64748b;width:100%;text-align:center;font-family:sans-serif">Федерация многоборья ГТО России · стр. <span class="pageNumber"></span> из <span class="totalPages"></span></div>' }});
  await browser.close();
}})().catch(e => {{ console.error(e); process.exit(1); }});
"""
    subprocess.run(["node", "-e", script], check=True, env={**os.environ, "PLAYWRIGHT_BROWSERS_PATH": os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")})
    html_path.unlink(missing_ok=True)
    print(f"PDF: {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

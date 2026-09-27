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

# (провайдер, тариф, как платят, за 10 ящиков в год ₽, за 25 ящиков ₽, макс. ящиков, оплата из РФ, группа)
ROWS = [
    ("VK WorkSpace", "С рекламой", "бесплатно", 0, None, "5", "да", "ru"),
    ("Jino", "Почта 100 ГБ", "900 ₽/год за всё", 900, 900, "∞", "да", "ru"),
    ("Timeweb", "Почтовый", "950 ₽/год за всё", 950, 950, "∞", "да", "ru"),
    ("SpaceWeb", "Почтовый 10", "1 008 ₽/год за всё", 1008, 1008, "∞", "да", "ru"),
    ("ihc.ru", "Хостинг IHC-2 + почта", "1 470 ₽/год за всё", 1470, 1470, "∞", "да", "ru"),
    ("Webnames", "Хостинг «Старт» + почта", "1 728 ₽/год за всё", 1728, 1728, "н/н", "да", "ru"),
    ("Рег.ру", "Mail-1", "1 836 ₽/год за всё", 1836, 1836, "1 000", "да", "ru"),
    ("Hostland", "Хостинг Green + почта", "2 364 ₽/год за всё", 2364, 2364, "∞", "да", "ru"),
    ("RU-CENTER", "Почта 1", "237 ₽/мес за всё", 2844, 2844, "∞", "да", "ru"),
    ("Beget", "Хостинг Blog + почта", "5 040 ₽/год за всё", 5040, 5040, "1 000", "да", "ru"),
    ("Purelymail", "Simple", "10 $/год за всё", 843, 843, "∞", "нет", "foreign"),
    ("Migadu", "Mini", "90 $/год за всё", 7590, 7590, "∞", "BTC", "foreign"),
    ("Zoho Mail", "Mail Lite", "1 $/мес за ящик", 10121, 25302, "∞", "нет", "foreign"),
    ("Timeweb", "Почта для бизнеса", "120 ₽/мес за ящик", 14400, 36000, "500", "да", "ru"),
    ("Hostinger", "Mail Starter", "1,59 $/мес за ящик", 16090, 40225, "∞", "крипта", "foreign"),
    ("Ростелеком", "Корпоративная почта", "146 ₽/мес за ящик", 17520, 43800, "н/н", "да", "ru"),
    ("Яндекс 360", "Почта и файлы", "279 ₽/мес за ящик, от 10", 33480, 83700, "250", "да", "ru"),
    ("Cloud4Y", "Exchange", "288 ₽/мес за ящик, от 5", 34560, 86400, "н/н", "да", "ru"),
    ("VK WorkSpace", "Базовый", "309 ₽/мес за ящик, от 10", 37080, 92700, "300", "да", "ru"),
    ("Яндекс 360", "Минимальный", "319 ₽/мес за ящик", 38280, 95700, "250", "да", "ru"),
    ("Р7", "Пространство", "330 ₽/мес за ящик", 39600, 99000, "50", "да", "ru"),
    ("Fastmail", "Business Standard", "5 $/мес за ящик", 50605, 126512, "∞", "нет", "foreign"),
    ("Яндекс 360", "Основной", "549 ₽/мес за ящик", 65880, 164700, "250", "да", "ru"),
    ("Proton Mail", "Essentials", "6,99 $/мес за ящик", 70740, 176850, "∞", "UnionPay", "foreign"),
    ("Google Workspace", "Business Starter", "7 $/мес за ящик", 70847, 177117, "∞", "нет", "foreign"),
]
ROWS.sort(key=lambda r: r[3])
MAX = max(r[3] for r in ROWS)
TOP_RU = {id(r) for r in [x for x in ROWS if x[7] == "ru"][:3]}


def fmt(n):
    return "—" if n is None else f"{n:,}".replace(",", " ")


def row_html(i, r):
    prov, tariff, how, y10, y25, boxes, pay, group = r
    pct = max(1.5, y10 / MAX * 100) if y10 else 0
    color = "#0ea5e9" if group == "ru" else "#a78bfa"
    top = ' class="top"' if id(r) in TOP_RU else ""
    limit = f'<span class="note">до {boxes} ящиков</span>' if boxes not in ("∞", "н/н") else ""
    return f"""<tr{top}>
      <td class="n">{i}</td>
      <td><b>{prov}</b><br><span class="t">{tariff}</span></td>
      <td>{how}{('<br>' + limit) if limit else ''}</td>
      <td class="num">{fmt(y10)}</td>
      <td class="num">{fmt(y25)}</td>
      <td class="bar"><div style="width:{pct:.1f}%;background:{color}"></div></td>
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
td {{ padding: 5pt 6pt; border-bottom: 1px solid #e2e8f0; vertical-align: middle; font-size: 9.3pt; }}
tr.top td {{ background: #ecfdf5; }}
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
  <div class="pick"><b>До 5 ящиков</b><div class="p">0 ₽</div><small>VK WorkSpace «С рекламой»: свой домен, реклама в интерфейсе, 3 ГБ на всех</small></div>
  <div class="pick"><b>Любое число ящиков</b><div class="p">900–950 ₽/год</div><small>Jino «Почта 100 ГБ» или Timeweb «Почтовый»: одна цена за всё, ящиков без ограничения</small></div>
  <div class="pick"><b>Облачный офис (почта + диск + звонки)</b><div class="p">3 828 ₽/год за ящик</div><small>Яндекс 360 «Минимальный»: в 40 раз дороже хостинга, но 100 ГБ на каждого и сервисы</small></div>
</div>

<table>
<thead><tr>
  <th style="width:5%">#</th>
  <th style="width:22%">Провайдер / тариф</th>
  <th style="width:24%">Как платят</th>
  <th class="num" style="width:11%">10 ящиков, ₽/год</th>
  <th class="num" style="width:11%">25 ящиков, ₽/год</th>
  <th style="width:17%">Шкала цены</th>
  <th style="width:10%; text-align:center">Оплата из РФ</th>
</tr></thead>
<tbody>
{rows_html}
</tbody></table>
<div class="legend"><span><i style="background:#0ea5e9"></i>российский провайдер</span><span><i style="background:#a78bfa"></i>зарубежный</span><span><i style="background:#ecfdf5;border:1px solid #a7f3d0"></i>три самых дешёвых российских</span></div>
<p class="foot">«За всё» — фиксированная цена за аккаунт, число ящиков на неё не влияет (общий диск 10–100 ГБ). «За ящик» — цена умножается на число сотрудников. «От 10» — минимальное число оплачиваемых пользователей. Оплата из РФ: «да» — рубли, счёт или карта РФ; «нет» — только иностранная карта; «крипта», «BTC», «UnionPay» — доступный обходной способ. Бесплатный тариф Яндекс 360 закрыт с ноября 2025 (кроме НКО). Microsoft 365 организациям из РФ не продаётся. Зарубежные серверы не подходят для писем с персональными данными спортсменов (152-ФЗ).</p>
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

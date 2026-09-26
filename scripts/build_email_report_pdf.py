#!/usr/bin/env python3
"""
Собирает PDF из docs/EMAIL_YANDEX360_INTEGRATION.md.
Markdown → HTML (python-markdown) → PDF (headless Chromium через Playwright, локально, без сети).

  python3 scripts/build_email_report_pdf.py [выходной.pdf]
"""
import html
import os
import re
import subprocess
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "EMAIL_YANDEX360_INTEGRATION.md"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "EMAIL_YANDEX360_INTEGRATION.pdf"

CSS = """
@page { size: A4; margin: 16mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111827; }
h1 { font-size: 20pt; margin: 0 0 6pt; color: #0f172a; border-bottom: 3px solid #0ea5e9; padding-bottom: 6pt; }
h2 { font-size: 14.5pt; margin: 18pt 0 6pt; color: #0369a1; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; color: #111827; page-break-after: avoid; }
p { margin: 4pt 0 6pt; }
a { color: #0369a1; text-decoration: none; word-break: break-all; }
blockquote { margin: 6pt 0; padding: 6pt 10pt; background: #fff7ed; border-left: 4px solid #f97316; color: #7c2d12; }
blockquote p { margin: 2pt 0; }
code { font-family: "Liberation Mono", "DejaVu Sans Mono", monospace; font-size: 9pt; background: #f1f5f9; padding: 0 3px; border-radius: 3px; }
pre { background: #f1f5f9; padding: 8pt; border-radius: 6px; font-size: 8.5pt; white-space: pre-wrap; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 8.6pt; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 3.5pt 5pt; vertical-align: top; text-align: left; }
th { background: #e0f2fe; color: #0c4a6e; font-weight: 700; }
tbody tr:nth-child(even) td { background: #f8fafc; }
ul, ol { margin: 4pt 0 6pt 18pt; padding: 0; }
li { margin: 2pt 0; }
hr { border: 0; border-top: 1px solid #cbd5e1; margin: 12pt 0; }
.cover { margin-bottom: 14pt; color: #475569; font-size: 9.5pt; }
"""


def build_html(md_text: str) -> str:
    body = markdown.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    # Заголовок и подзаголовок
    return f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Почта Федерации: анализ, интеграция, тарифы</title><style>{CSS}</style></head>
<body>{body}</body></html>"""


def main() -> None:
    md_text = SRC.read_text(encoding="utf-8")
    html_path = OUT.with_suffix(".html")
    html_path.write_text(build_html(md_text), encoding="utf-8")

    npm_root = subprocess.check_output(["npm", "root", "-g"], text=True).strip()
    script = f"""
const {{ chromium }} = require({npm_root!r} + '/playwright');
(async () => {{
  const browser = await chromium.launch({{ headless: true }});
  const page = await browser.newPage();
  await page.goto('file://' + {str(html_path)!r}, {{ waitUntil: 'load' }});
  // Короткие ячейки (числа, цены) не переносим по словам
  await page.evaluate(() => {{
    document.querySelectorAll('td, th').forEach(td => {{ if (td.textContent.trim().length <= 14) td.style.whiteSpace = 'nowrap'; }});
  }});
  await page.pdf({{
    path: {str(OUT)!r}, format: 'A4', printBackground: true,
    margin: {{ top: '16mm', right: '14mm', bottom: '18mm', left: '14mm' }},
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:8px;color:#64748b;width:100%;text-align:center;font-family:sans-serif">Федерация многоборья ГТО России · Почта: анализ и тарифы · стр. <span class="pageNumber"></span> из <span class="totalPages"></span></div>'
  }});
  await browser.close();
}})().catch(e => {{ console.error(e); process.exit(1); }});
"""
    subprocess.run(["node", "-e", script], check=True, env={**os.environ, "PLAYWRIGHT_BROWSERS_PATH": os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")})
    html_path.unlink(missing_ok=True)
    print(f"PDF: {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

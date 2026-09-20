#!/usr/bin/env python3
"""Import public tournament details from gto.com.ru into lazy-loaded local JSON."""
import html
import json
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "data" / "events"
BASE = "https://gto.com.ru"


def event_catalog():
    script = "import('./web/js/gto_data.js').then(m=>console.log(JSON.stringify(m.GTO_CALENDAR_EVENTS)))"
    raw = subprocess.check_output(["node", "--input-type=module", "-e", script], cwd=ROOT, text=True)
    return json.loads(raw)


def fetch(url):
    req = Request(url, headers={"User-Agent": "GTO-Mobile-Importer/1.0 (+https://gto.com.ru/)"})
    with urlopen(req, timeout=25) as response:
        return response.read().decode("utf-8", "replace")


def text(node):
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip() if node else ""


def table_data(table):
    rows = []
    for tr in table.find_all("tr"):
        cells = [text(cell) for cell in tr.find_all(["th", "td"], recursive=False)]
        if any(cells):
            rows.append(cells)
    return rows


def section_data(block, fallback):
    title_node = block.select_one(".events_info_tab_title")
    title = text(title_node) or fallback
    tables = [table_data(t) for t in block.find_all("table")]
    body = block.select_one(".events_info_tab_txt") or block
    paragraphs = []
    for node in body.find_all(["p", "li"], recursive=True):
        value = text(node)
        if value and value not in paragraphs:
            paragraphs.append(value)
    if not paragraphs:
        value = text(body)
        if value and value != title:
            paragraphs = [value]
    return {"title": title, "paragraphs": paragraphs, "tables": tables}


def parse_event(event):
    url = event.get("url", "")
    if not url.startswith(BASE):
        return event["id"], None, "invalid url"
    soup = BeautifulSoup(fetch(url), "html.parser")
    contents = soup.select(".events_info_content")
    about = [section_data(x, "О соревновании") for x in (contents[1].select(":scope > .event_small") if len(contents) > 1 else [])]
    results = [section_data(x, "Результаты") for x in (contents[2].select(":scope > .event_small") if len(contents) > 2 else [])]
    documents = []
    registrations = []
    seen = set()
    for a in soup.select("a[href]"):
        href = urljoin(BASE, a.get("href", ""))
        label = text(a)
        if re.search(r"регистра|подать заявку|участв", label, re.I) or re.search(r"forms\.|form=|register|registration", href, re.I):
            if href.startswith("http") and not any(item["url"] == href for item in registrations):
                registrations.append({"title": label or "Регистрация", "url": href})
        if href in seen or not re.search(r"\.(pdf|docx?|xlsx?|zip)(\?|$)", href, re.I):
            continue
        seen.add(href)
        documents.append({"title": label or Path(href.split("?")[0]).name, "url": href})
    media = []
    if contents:
        for image in contents[0].select("img[src]"):
            src = urljoin(BASE, image.get("src", ""))
            if src not in media:
                media.append(src)
    cover = soup.select_one(".events_main_img")
    payload = {
        "id": event["id"], "title": event.get("title", ""), "period": event.get("period", ""),
        "location": event.get("location", ""), "sourceUrl": url,
        "cover": urljoin(BASE, cover.get("src", "")) if cover else event.get("img", ""),
        "about": about, "results": results, "documents": documents, "registrations": registrations, "media": media[:24],
        "importedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    return event["id"], payload, None


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    events = [e for e in event_catalog() if e.get("url")]
    manifest = {"importedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "events": {}, "errors": {}}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(parse_event, event): event for event in events}
        for done in as_completed(futures):
            event = futures[done]
            try:
                event_id, payload, error = done.result()
                if payload:
                    target = OUT / f"{event_id}.json"
                    target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
                    manifest["events"][str(event_id)] = {"results": len(payload["results"]), "documents": len(payload["documents"]), "registrations": len(payload["registrations"])}
                else:
                    manifest["errors"][str(event_id)] = error
            except Exception as exc:
                manifest["errors"][str(event["id"])] = str(exc)
            print(f"[{len(manifest['events'])}/{len(events)}] {event['id']} {event['title'][:55]}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Imported {len(manifest['events'])}; errors {len(manifest['errors'])}")


if __name__ == "__main__":
    main()

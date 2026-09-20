#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер полного каталога соревнований и турниров с gto.com.ru
Обходит все 123 соревнования, извлекая даты, регламенты, комплексы и описания.
"""

import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json
import csv
import os
import re
import time

BASE_URL = "https://gto.com.ru"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database_dumps")

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def get_tournament_slugs():
    url = f"{BASE_URL}/sitemap.xml"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    root = ET.fromstring(urllib.request.urlopen(req, timeout=15).read())
    urls = [elem.text for elem in root.iter() if elem.tag.endswith('loc')]
    
    tournaments = {}
    for u in urls:
        path = urllib.parse.urlparse(u).path.strip('/')
        parts = path.split('/')
        if len(parts) >= 2 and parts[0] == 'sorevnovaniya':
            slug = parts[1]
            tournaments.setdefault(slug, []).append(u)
            
    print(f"Найдено уникальных турниров в sitemap: {len(tournaments)}")
    return tournaments

def parse_tournament(slug, urls):
    main_url = f"{BASE_URL}/sorevnovaniya/{slug}/"
    
    data = {
        "slug": slug,
        "main_url": main_url,
        "title": "",
        "dates": "",
        "city": "",
        "venue": "",
        "discipline": "",
        "description": "",
        "banner_url": "",
        "documents": [],
        "sub_pages": []
    }
    
    # 1. Загрузка главной страницы турнира
    try:
        req = urllib.request.Request(main_url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
        soup = BeautifulSoup(html, "html.parser")
        
        # Заголовок
        h1 = soup.find("h1")
        if h1:
            data["title"] = clean_text(h1.get_text())
        elif soup.title:
            t = soup.title.string.strip()
            data["title"] = t.replace(" - Официальный сайт", "").replace("Соревнования - ", "")
            
        # Баннер
        og_img = soup.find("meta", property="og:image")
        if og_img and og_img.get("content"):
            data["banner_url"] = og_img["content"]
            
        # Текст описания
        desc_el = soup.find(class_=re.compile(r'about|desc|content|text|info', re.I))
        if desc_el:
            data["description"] = clean_text(desc_el.get_text())[:1500]
        else:
            paragraphs = [p.get_text() for p in soup.find_all("p")]
            data["description"] = clean_text(" ".join(paragraphs))[:1500]
            
        # Поиск дат, городов, дисциплины по ключевым словам
        page_text = soup.get_text()
        date_match = re.search(r'(?:Даты?\s*(?:проведения)?|Сроки?\s*(?:проведения)?):?\s*([0-9]{2}[\.\-][0-9]{2}[\.\-][0-9]{2,4}(?:\s*[-—]\s*[0-9]{2}[\.\-][0-9]{2}[\.\-][0-9]{2,4})?)', page_text, re.I)
        if date_match:
            data["dates"] = date_match.group(1).strip()
            
        city_match = re.search(r'(?:Место\s*проведения|Город):?\s*([^\n\r,\.]+)', page_text, re.I)
        if city_match:
            data["city"] = city_match.group(1).strip()
            
        disc_match = re.search(r'(?:Дисциплина|Вид\s*программы):?\s*([^\n\r,\.]+)', page_text, re.I)
        if disc_match:
            data["discipline"] = disc_match.group(1).strip()
            
        # Ссылки на документы (PDF/XLSX)
        docs = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if any(ext in href.lower() for ext in [".pdf", ".xlsx", ".docx", ".doc"]) and "soglasie" not in href.lower():
                full_doc_url = f"{BASE_URL}{href}" if not href.startswith("http") else href
                doc_title = clean_text(a.get_text()) or os.path.basename(href)
                docs.append({"title": doc_title, "url": full_doc_url})
        data["documents"] = docs
        
    except Exception as e:
        print(f"  Ошибка парсинга главной страницы {main_url}: {e}")
        
    # Список подстраниц
    data["sub_pages"] = [u for u in urls if u != main_url]
    return data

def main():
    tournaments = get_tournament_slugs()
    all_tournaments = []
    
    print(f"Начинаем сбор метаданных {len(tournaments)} соревнований...")
    for idx, (slug, urls) in enumerate(sorted(tournaments.items())):
        t_data = parse_tournament(slug, urls)
        all_tournaments.append(t_data)
        if (idx + 1) % 10 == 0 or idx == len(tournaments) - 1:
            print(f"  Обработано: {idx + 1}/{len(tournaments)} ({t_data.get('title') or slug})")
        time.sleep(0.05)
        
    # Сохранение в JSON
    json_path = os.path.join(OUTPUT_DIR, "gto_all_tournaments.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_tournaments, f, ensure_ascii=False, indent=2)
    print("Сохранено турниров в JSON:", json_path)
    
    # Сохранение в CSV
    csv_path = os.path.join(OUTPUT_DIR, "gto_all_tournaments.csv")
    if all_tournaments:
        csv_rows = []
        for t in all_tournaments:
            csv_rows.append({
                "slug": t.get("slug", ""),
                "title": t.get("title", ""),
                "dates": t.get("dates", ""),
                "city": t.get("city", ""),
                "discipline": t.get("discipline", ""),
                "main_url": t.get("main_url", ""),
                "banner_url": t.get("banner_url", ""),
                "sub_pages_count": len(t.get("sub_pages", [])),
                "docs_count": len(t.get("documents", [])),
                "description_preview": (t.get("description", "")[:120] + "...") if t.get("description") else ""
            })
            
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
            writer.writeheader()
            writer.writerows(csv_rows)
        print("Сохранено турниров в CSV:", csv_path)
        
    print("Каталог турниров успешно собран!")

if __name__ == "__main__":
    main()

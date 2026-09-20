#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер официальной Книги рекордов многоборья ГТО с gto.com.ru
Извлекает все рекорды по всем 24 дисциплинам для мужчин и женщин.
"""

import urllib.request
import urllib.parse
import json
import csv
import os
import sys
import time
from bs4 import BeautifulSoup

BASE_URL = "https://gto.com.ru"
RECORDS_PAGE_URL = f"{BASE_URL}/rekordy/"
RECORDS_AJAX_URL = f"{BASE_URL}/extore/frontend/themes/gto/records.php"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database_dumps")

def get_disciplines():
    print("[1/3] Загрузка списка дисциплин с", RECORDS_PAGE_URL)
    req = urllib.request.Request(RECORDS_PAGE_URL, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
    soup = BeautifulSoup(html, "html.parser")
    
    items = soup.find_all("div", class_="records_left_item")
    disciplines = []
    for it in items:
        rec_id = it.get("id", "").replace("id", "").strip()
        title = it.contents[0].strip() if it.contents else it.get_text(strip=True)
        sub = it.find("div")
        desc = sub.get_text(strip=True) if sub else ""
        disciplines.append({
            "id": rec_id,
            "title": title,
            "description": desc
        })
    print(f"Найдено дисциплин: {len(disciplines)}")
    return disciplines

def fetch_records_for_discipline(disc_id, title, sex_val, gender_name):
    data = urllib.parse.urlencode({
        "getrek": 1,
        "id": disc_id,
        "title": title,
        "sex": sex_val,
        "hash": "0.123456789"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        RECORDS_AJAX_URL,
        data=data,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )
    
    try:
        res = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
    except Exception as e:
        print(f"  Ошибка при запросе {title} ({gender_name}): {e}")
        return []
        
    soup = BeautifulSoup(res, "html.parser")
    persons = soup.find_all("div", class_="r_person")
    records = []
    for p in persons:
        cont = p.find(class_="r_person__cont")
        data_img = cont.get("data-img") if cont else None
        serial = cont.get("data-serial") if cont else None
        
        name_el = p.find(class_="r_person_name")
        year_el = p.find(class_="r_person_year")
        prize_el = p.find(class_="r_person_prize")
        city_el = p.find(class_="r_person_city")
        time_el = p.find(class_="r_person_time")
        
        full_img_url = ""
        if data_img:
            full_img_url = f"{BASE_URL}{data_img}" if not data_img.startswith("http") else data_img
            
        athlete_name = name_el.get_text(strip=True) if name_el else ""
        age_group = year_el.get_text(strip=True) if year_el else ""
        event_name = prize_el.get_text(strip=True) if prize_el else ""
        city = city_el.get_text(strip=True) if city_el else ""
        result_val = time_el.get_text(strip=True) if time_el else ""
        
        if athlete_name or result_val:
            records.append({
                "discipline_id": disc_id,
                "discipline": title,
                "gender": gender_name,
                "serial_id": serial or "",
                "athlete_name": athlete_name,
                "age_group": age_group,
                "event": event_name,
                "city": city,
                "result": result_val,
                "photo_url": full_img_url
            })
    return records

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    csv_dir = os.path.join(OUTPUT_DIR, "csv")
    os.makedirs(csv_dir, exist_ok=True)
    
    disciplines = get_disciplines()
    all_records = []
    
    print("\n[2/3] Сбор всех рекордов...")
    for idx, d in enumerate(disciplines):
        d_id = d["id"]
        title = d["title"]
        print(f"[{idx+1}/{len(disciplines)}] {title}...")
        
        # Мужчины (sex=1)
        m_recs = fetch_records_for_discipline(d_id, title, 1, "Мужчины")
        all_records.extend(m_recs)
        
        # Женщины (sex=0)
        w_recs = fetch_records_for_discipline(d_id, title, 0, "Женщины")
        all_records.extend(w_recs)
        
        print(f"  -> Мужчины: {len(m_recs)}, Женщины: {len(w_recs)} (Всего по дисциплине: {len(m_recs) + len(w_recs)})")
        time.sleep(0.1)
        
    print(f"\n[3/3] Сохранение данных (Всего записей: {len(all_records)})...")
    
    # JSON
    json_path = os.path.join(OUTPUT_DIR, "gto_all_records.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print("Сохранено в JSON:", json_path)
    
    # CSV
    csv_path = os.path.join(OUTPUT_DIR, "gto_all_records.csv")
    if all_records:
        keys = list(all_records[0].keys())
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(all_records)
        print("Сохранено в CSV:", csv_path)
        
    print("Готово!")

if __name__ == "__main__":
    main()

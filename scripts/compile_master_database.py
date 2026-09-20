#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Компиляция единой базы данных ГТО РФ (SQLite + Master JSON + Каталог атлетов)
Объединяет:
- Книгу рекордов (321 рекорд)
- Протоколы результатов соревнований (4869 результатов)
- Каталог турниров (123 турнира)
"""

import sqlite3
import json
import os
import re
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUMPS_DIR = os.path.join(BASE_DIR, "database_dumps")

SQLITE_PATH = os.path.join(DUMPS_DIR, "gto_master.sqlite")
MASTER_JSON_PATH = os.path.join(DUMPS_DIR, "gto_master_complete.json")
ATHLETES_JSON_PATH = os.path.join(DUMPS_DIR, "gto_athletes_directory.json")

def clean_name(name):
    if not name:
        return ""
    # Убираем лишние пробелы, цифры в начале (если попали)
    n = re.sub(r'^\d+[\.\s]+', '', name).strip()
    n = re.sub(r'\s+', ' ', n)
    return n

def main():
    print("[1/4] Загрузка исходных дампов...")
    
    # Рекорды
    with open(os.path.join(DUMPS_DIR, "gto_all_records.json"), "r", encoding="utf-8") as f:
        records_data = json.load(f)
    print(f"  Загружено рекордов: {len(records_data)}")
    
    # Результаты
    with open(os.path.join(DUMPS_DIR, "gto_all_competition_results.json"), "r", encoding="utf-8") as f:
        results_data = json.load(f)
    print(f"  Загружено результатов: {len(results_data)}")
    
    # Турниры
    with open(os.path.join(DUMPS_DIR, "gto_all_tournaments.json"), "r", encoding="utf-8") as f:
        tournaments_data = json.load(f)
    print(f"  Загружено турниров: {len(tournaments_data)}")
    
    print("\n[2/4] Создание и наполнение базы SQLite:", SQLITE_PATH)
    if os.path.exists(SQLITE_PATH):
        os.remove(SQLITE_PATH)
        
    conn = sqlite3.connect(SQLITE_PATH)
    cursor = conn.cursor()
    
    # 1. Таблица tournaments
    cursor.execute("""
    CREATE TABLE tournaments (
        slug TEXT PRIMARY KEY,
        title TEXT,
        dates TEXT,
        city TEXT,
        discipline TEXT,
        main_url TEXT,
        banner_url TEXT,
        description TEXT,
        docs_json TEXT,
        sub_pages_json TEXT
    )
    """)
    
    for t in tournaments_data:
        cursor.execute("""
        INSERT INTO tournaments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            t.get("slug", ""),
            t.get("title", ""),
            t.get("dates", ""),
            t.get("city", ""),
            t.get("discipline", ""),
            t.get("main_url", ""),
            t.get("banner_url", ""),
            t.get("description", ""),
            json.dumps(t.get("documents", []), ensure_ascii=False),
            json.dumps(t.get("sub_pages", []), ensure_ascii=False)
        ))
        
    # 2. Таблица records
    cursor.execute("""
    CREATE TABLE records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discipline_id TEXT,
        discipline TEXT,
        gender TEXT,
        serial_id TEXT,
        athlete_name TEXT,
        age_group TEXT,
        event TEXT,
        city TEXT,
        result TEXT,
        photo_url TEXT
    )
    """)
    
    for r in records_data:
        cursor.execute("""
        INSERT INTO records (discipline_id, discipline, gender, serial_id, athlete_name, age_group, event, city, result, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r.get("discipline_id", ""),
            r.get("discipline", ""),
            r.get("gender", ""),
            r.get("serial_id", ""),
            clean_name(r.get("athlete_name", "")),
            r.get("age_group", ""),
            r.get("event", ""),
            r.get("city", ""),
            r.get("result", ""),
            r.get("photo_url", "")
        ))
        
    # 3. Таблица competition_results
    cursor.execute("""
    CREATE TABLE competition_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_slug TEXT,
        page_title TEXT,
        category TEXT,
        subgroup TEXT,
        rank TEXT,
        participant TEXT,
        region TEXT,
        result TEXT,
        details_json TEXT,
        page_url TEXT,
        FOREIGN KEY (tournament_slug) REFERENCES tournaments(slug)
        )
    """)
    
    for res in results_data:
        cursor.execute("""
        INSERT INTO competition_results (tournament_slug, page_title, category, subgroup, rank, participant, region, result, details_json, page_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res.get("tournament_slug", ""),
            res.get("page_title", ""),
            res.get("category", ""),
            res.get("subgroup", ""),
            res.get("rank", ""),
            clean_name(res.get("participant", "")),
            res.get("region", ""),
            res.get("result", ""),
            json.dumps(res.get("details", {}), ensure_ascii=False),
            res.get("page_url", "")
        ))
        
    # Индексы для быстрой фильтрации и выборок
    cursor.execute("CREATE INDEX idx_rec_athlete ON records(athlete_name)")
    cursor.execute("CREATE INDEX idx_rec_discipline ON records(discipline)")
    cursor.execute("CREATE INDEX idx_res_participant ON competition_results(participant)")
    cursor.execute("CREATE INDEX idx_res_tournament ON competition_results(tournament_slug)")
    
    # 4. Агрегация реестра атлетов
    print("\n[3/4] Построение единого реестра и профилей атлетов...")
    athletes_map = defaultdict(lambda: {
        "name": "",
        "gender": "",
        "city_or_region": set(),
        "records": [],
        "competitions": [],
        "photo_url": ""
    })
    
    for r in records_data:
        name = clean_name(r.get("athlete_name", ""))
        if not name:
            continue
        ath = athletes_map[name]
        ath["name"] = name
        if not ath["gender"] and r.get("gender"):
            ath["gender"] = r.get("gender")
        if r.get("city"):
            ath["city_or_region"].add(r.get("city"))
        if not ath["photo_url"] and r.get("photo_url"):
            ath["photo_url"] = r.get("photo_url")
        ath["records"].append({
            "discipline": r.get("discipline"),
            "age_group": r.get("age_group"),
            "result": r.get("result"),
            "event": r.get("event"),
            "city": r.get("city")
        })
        
    for res in results_data:
        part = clean_name(res.get("participant", ""))
        if not part or len(part.split()) < 2:
            continue
        # Исключаем технические названия ("г. Москва", "Команда 1" и т.п.)
        if any(w in part.lower() for w in ["команда", "сборная", "клуб", "область", "край", "район", "г."]):
            continue
            
        ath = athletes_map[part]
        ath["name"] = part
        if res.get("region"):
            ath["city_or_region"].add(res.get("region"))
        ath["competitions"].append({
            "tournament_slug": res.get("tournament_slug"),
            "tournament_title": res.get("page_title"),
            "category": res.get("category"),
            "subgroup": res.get("subgroup"),
            "rank": res.get("rank"),
            "result": res.get("result")
        })
        
    # Таблица athletes в SQLite
    cursor.execute("""
    CREATE TABLE athletes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        gender TEXT,
        region TEXT,
        records_count INTEGER,
        competitions_count INTEGER,
        photo_url TEXT,
        profile_json TEXT
    )
    """)
    
    athletes_list = []
    for name, ath in athletes_map.items():
        regions_str = ", ".join(sorted(ath["city_or_region"]))
        profile_dict = {
            "name": name,
            "gender": ath["gender"],
            "region": regions_str,
            "records_count": len(ath["records"]),
            "competitions_count": len(ath["competitions"]),
            "photo_url": ath["photo_url"],
            "records": ath["records"],
            "competitions": ath["competitions"]
        }
        athletes_list.append(profile_dict)
        
        cursor.execute("""
        INSERT INTO athletes (name, gender, region, records_count, competitions_count, photo_url, profile_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            name,
            ath["gender"],
            regions_str,
            len(ath["records"]),
            len(ath["competitions"]),
            ath["photo_url"],
            json.dumps(profile_dict, ensure_ascii=False)
        ))
        
    conn.commit()
    conn.close()
    print(f"  В базу SQLite добавлено уникальных атлетов: {len(athletes_list)}")
    
    # Сохраняем athletes_directory.json
    athletes_list.sort(key=lambda x: (x["records_count"], x["competitions_count"]), reverse=True)
    with open(ATHLETES_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(athletes_list, f, ensure_ascii=False, indent=2)
    print("Сохранен реестр атлетов в JSON:", ATHLETES_JSON_PATH)
    
    # 5. Master JSON (Полный объединенный дамп)
    print("\n[4/4] Сохранение мастер-дампа...")
    master_dump = {
        "metadata": {
            "generated_at": "2026-09-10",
            "source": "https://gto.com.ru",
            "total_tournaments": len(tournaments_data),
            "total_records": len(records_data),
            "total_competition_results": len(results_data),
            "total_athletes": len(athletes_list)
        },
        "records": records_data,
        "tournaments": tournaments_data,
        "competition_results": results_data
    }
    
    with open(MASTER_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(master_dump, f, ensure_ascii=False, indent=2)
    print("Сохранен мастер-дамп в JSON:", MASTER_JSON_PATH)
    
    print("\nГотово! База данных полностью скомпилирована и готова к интеграции.")

if __name__ == "__main__":
    main()

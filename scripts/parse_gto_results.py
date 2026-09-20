#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер официальных протоколов результатов соревнований с gto.com.ru
Извлекает все результаты соревнований из таблиц.
"""

import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import json
import csv
import os
import re
import time

BASE_URL = "https://gto.com.ru"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database_dumps")
AUDIT_FILE = os.path.join(OUTPUT_DIR, "rezultaty_audit.json")

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def parse_results_page(page_info):
    url = page_info["url"]
    page_title = page_info.get("title", "")
    
    path_parts = [p for p in urllib.parse.urlparse(url).path.split('/') if p]
    tourn_slug = path_parts[1] if len(path_parts) > 1 and path_parts[0] == "sorevnovaniya" else "general"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
    except Exception as e:
        print(f"  Ошибка загрузки {url}: {e}")
        return []
        
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    all_rows_data = []
    
    current_category = page_title
    
    for t_idx, table in enumerate(tables):
        rows = table.find_all("tr")
        if not rows:
            continue
            
        headers = []
        current_subgroup = ""
        
        for r_idx, row in enumerate(rows):
            cells = [clean_text(td.get_text()) for td in row.find_all(["th", "td"])]
            if not cells or all(c == "" for c in cells):
                continue
                
            # Проверка строки-заголовка категории/подгруппы
            if len(cells) == 1 or (len(cells) == 2 and cells[1] == ""):
                text_header = cells[0]
                if any(w in text_header.lower() for w in ["мужчины", "женщины", "мальчики", "девочки", "категория", "юниоры", "мастера", "профи", "атлет", "команд"]):
                    current_subgroup = text_header
                    continue
                elif r_idx == 0:
                    current_category = text_header
                    continue
                    
            # Проверка, является ли строка шапкой таблицы
            first_cell_lower = cells[0].lower()
            if any(k in first_cell_lower for k in ["место", "№", "категория", "регион", "спортсмен", "фамилия"]) and not any(m in first_cell_lower for m in ["1 место", "2 место", "3 место", "4 место", "5 место"]):
                headers = cells
                continue
            elif "фио" in " ".join(cells).lower() or "фамилия имя" in " ".join(cells).lower():
                headers = cells
                continue
                
            row_dict = {
                "tournament_slug": tourn_slug,
                "page_title": page_title,
                "page_url": url,
                "category": current_category,
                "subgroup": current_subgroup,
                "raw_cells": cells
            }
            
            rank = ""
            name = ""
            region = ""
            result = ""
            details = {}
            
            if headers and len(headers) == len(cells):
                for h, val in zip(headers, cells):
                    h_clean = h.strip()
                    details[h_clean] = val
                    h_lower = h_clean.lower()
                    if any(x in h_lower for x in ["место", "итог"]):
                        rank = val
                    elif any(x in h_lower for x in ["фио", "фамилия", "имя", "команда", "спортсмен", "атлет"]):
                        name = f"{name} {val}".strip() if name else val
                    elif any(x in h_lower for x in ["регион", "субъект", "город"]):
                        region = val
                    elif any(x in h_lower for x in ["сумма", "общий результат", "итог", "результат"]):
                        result = val
            else:
                details["cells"] = " | ".join(cells)
                # Определение позиции места
                c0 = cells[0]
                if re.match(r'^\d+$', c0) or "место" in c0.lower() or c0.lower() in ["золото", "серебро", "бронза"]:
                    rank = c0
                    if len(cells) > 1:
                        name = cells[1]
                    if len(cells) > 2:
                        region = cells[2]
                    if len(cells) > 3:
                        result = cells[3]
                else:
                    name = cells[0]
                    if len(cells) > 1:
                        region = cells[1]
                    if len(cells) > 2:
                        result = cells[-1]
                        
            row_dict["rank"] = rank
            row_dict["participant"] = name
            row_dict["region"] = region
            row_dict["result"] = result
            row_dict["details"] = details
            
            all_rows_data.append(row_dict)
            
    return all_rows_data

def main():
    if not os.path.exists(AUDIT_FILE):
        print("Не найден файл аудита:", AUDIT_FILE)
        return
        
    with open(AUDIT_FILE, "r", encoding="utf-8") as f:
        pages = json.load(f)
        
    table_pages = [p for p in pages if p.get("tables_count", 0) > 0]
    print(f"Всего страниц с таблицами результатов: {len(table_pages)}")
    
    total_results = []
    
    for idx, p in enumerate(table_pages):
        rows = parse_results_page(p)
        total_results.extend(rows)
        time.sleep(0.02)
        
    print(f"\nВсего собрано результатов соревнований: {len(total_results)}")
    
    # Сохраняем JSON
    json_path = os.path.join(OUTPUT_DIR, "gto_all_competition_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(total_results, f, ensure_ascii=False, indent=2)
    print("Сохранено в JSON:", json_path)
    
    # Сохраняем CSV
    csv_path = os.path.join(OUTPUT_DIR, "gto_all_competition_results.csv")
    if total_results:
        csv_rows = []
        for r in total_results:
            csv_rows.append({
                "tournament_slug": r.get("tournament_slug", ""),
                "page_title": r.get("page_title", ""),
                "category": r.get("category", ""),
                "subgroup": r.get("subgroup", ""),
                "rank": r.get("rank", ""),
                "participant": r.get("participant", ""),
                "region": r.get("region", ""),
                "result": r.get("result", ""),
                "details": json.dumps(r.get("details", {}), ensure_ascii=False),
                "page_url": r.get("page_url", "")
            })
            
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
            writer.writeheader()
            writer.writerows(csv_rows)
        print("Сохранено в CSV:", csv_path)
        
    print("Сбор результатов соревнований успешно завершен!")

if __name__ == "__main__":
    main()

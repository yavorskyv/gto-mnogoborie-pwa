#!/usr/bin/env python3
"""Audit every official calendar filter and publish a reproducible coverage report."""
import json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://gto.com.ru"

def fetch(url, body=None):
    req = Request(url, data=body, headers={"User-Agent":"Mozilla/5.0","Content-Type":"application/x-www-form-urlencoded"})
    with urlopen(req, timeout=40) as r: return r.read().decode("utf-8", "replace")

def cards(html):
    out=[]
    for chunk in html.split('<a ')[1:]:
        if 'calendar_content_container' not in chunk: continue
        title=re.search(r'calendar_content_container_c_title">([\s\S]*?)</div>',chunk,re.I)
        href=re.search(r'href="([^">]+)',chunk,re.I)
        if title:
            clean=re.sub(r'<[^>]+>','',title.group(1)).strip()
            url=(href.group(1) if href else '').strip()
            out.append({"title":clean,"url":url})
    return out

def main():
    page=fetch(BASE+'/sorevnovaniya/')
    options=[]
    for value,label in re.findall(r'<option[^>]+value="(\d+\|[^"]*)"[^>]*>([\s\S]*?)</option>',page,re.I):
        item={"value":value,"label":re.sub(r'<[^>]+>','',label).strip()}
        if value not in {x['value'] for x in options}: options.append(item)
    unique={}
    for option in options:
        region, oblast=option['value'].split('|',1)
        items=cards(fetch(BASE+'/extore/frontend/themes/gto/calendar_ajax.php',urlencode({"region":region,"oblst":oblast}).encode()))
        option['count']=len(items)
        for x in items:
            key=x['url'] or re.sub(r'\s+',' ',x['title'].lower())
            unique.setdefault(key,x)
    report={"checkedAt":datetime.now(timezone.utc).isoformat(),"source":BASE+'/sorevnovaniya/',"filtersChecked":len(options),"uniqueEvents":len(unique),"filters":options}
    target=ROOT/'web/data/calendar_audit.json'; target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"Checked {len(options)} filters; {len(unique)} unique event keys")

if __name__=='__main__': main()

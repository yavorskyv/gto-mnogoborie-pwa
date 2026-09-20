#!/usr/bin/env python3
"""Cache official video thumbnails locally for fast, stable media cards."""
import json, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'web/assets/video-thumbs'; MAN=ROOT/'web/data/video_thumbs.json'
def one(item):
    url=item.get('thumb'); key=str(item.get('id','')).replace('/','-') or str(abs(hash(item.get('embedUrl',''))))
    if not url: return None
    dst=OUT/(key+'.webp')
    try:
        if not dst.exists():
            raw=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://gto.com.ru/'}),timeout=25).read()
            tmp=OUT/(key+'.tmp'); tmp.write_bytes(raw)
            from PIL import Image
            with Image.open(tmp) as im:
                im=im.convert('RGB'); im.thumbnail((640,360),Image.Resampling.LANCZOS); im.save(dst,'WEBP',quality=78,method=6)
            tmp.unlink(missing_ok=True)
        return item.get('embedUrl'), './assets/video-thumbs/'+dst.name
    except Exception: return None
def main():
    js="import('./web/js/gto_data.js').then(m=>console.log(JSON.stringify(m.GTO_VIDEOS)))"
    videos=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True));OUT.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=10) as pool: rows=list(pool.map(one,videos))
    data={k:v for row in rows if row for k,v in [row]};MAN.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    print(f'Localized {len(data)}/{len(videos)} video thumbnails')
if __name__=='__main__':main()

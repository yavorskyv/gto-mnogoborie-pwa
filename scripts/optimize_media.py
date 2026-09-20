#!/usr/bin/env python3
"""Create lightweight local WebP media and local official leadership portraits."""
import json
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]; WEB=ROOT/'web'; manifest=WEB/'data/vk_media.json'
LEADERS={
 'kemal-shamanov':'https://gto.com.ru/data/1703837629/files/x1739449153.jpg.pagespeed.ic.8_376C68ek.jpg',
 'mikhail-stenin':'https://gto.com.ru/data/1703837629/files/1739449152.jpg',
 'vladimir-voytekhovsky':'https://gto.com.ru/data/1703837629/files/1739449154.jpg',
 'alexey-mikhaylin':'https://gto.com.ru/data/1703837629/files/1739449155.jpg',
 'pavel-filatov':'https://gto.com.ru/data/1703837629/files/x1774932224.jpg.pagespeed.ic.TlxxyM6Y33.jpg',
 'alexander-peskov':'https://gto.com.ru/data/1703837629/files/1774941095.jpg'}

def convert(src,dst,max_side=1440):
    with Image.open(src) as im:
        im=im.convert('RGB'); im.thumbnail((max_side,max_side),Image.Resampling.LANCZOS)
        dst.parent.mkdir(parents=True,exist_ok=True); im.save(dst,'WEBP',quality=80,method=6)

def main():
    data=json.loads(manifest.read_text())
    for album in data['albums'].values():
        for obj in [album,*album.get('photos',[])]:
            key='cover' if obj is album else 'src'; rel=obj.get(key,'')
            if not rel.endswith('.jpg'): continue
            src=WEB/rel.removeprefix('./'); dst=src.with_suffix('.webp')
            if src.exists() and not dst.exists(): convert(src,dst)
            if dst.exists(): obj[key]='./'+str(dst.relative_to(WEB))
    manifest.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    folder=WEB/'assets/leadership'; folder.mkdir(parents=True,exist_ok=True)
    for name,url in LEADERS.items():
        raw=folder/(name+'.jpg'); out=folder/(name+'.webp')
        if not raw.exists(): raw.write_bytes(urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read())
        convert(raw,out,900)
    print('Optimized gallery and official portraits')

if __name__=='__main__': main()

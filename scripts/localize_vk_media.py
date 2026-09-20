#!/usr/bin/env python3
"""Download the curated VK album previews so the gallery never depends on VK hotlinking."""
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "web" / "assets" / "vk-albums"
MANIFEST = ROOT / "web" / "data" / "vk_media.json"


def catalog():
    js = "import('./web/js/vk_albums_data.js').then(m=>console.log(JSON.stringify(m.GTO_VK_ALBUMS)))"
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=ROOT, text=True))


def download(url, target):
    if target.exists() and target.stat().st_size > 1000:
        return True
    for attempt in range(4):
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            if attempt % 2 == 0:
                headers["Referer"] = "https://vk.ru/"
            req = Request(url, headers=headers)
            with urlopen(req, timeout=30) as response:
                target.write_bytes(response.read())
            return True
        except Exception:
            time.sleep(1 + attempt)
    return False


def main():
    albums = catalog()
    MEDIA.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    jobs, result = [], {"albums": {}}
    with ThreadPoolExecutor(max_workers=10) as pool:
        for album in albums:
            folder = MEDIA / str(album["id"])
            folder.mkdir(parents=True, exist_ok=True)
            cover = folder / "cover.jpg"
            jobs.append(pool.submit(download, album["cover"], cover))
            photos = []
            for index, photo in enumerate(album.get("photos", []), 1):
                target = folder / f"{index:03}.jpg"
                jobs.append(pool.submit(download, photo.get("src") or photo.get("thumb"), target))
                photos.append({"id": photo.get("id"), "title": photo.get("title", ""), "src": f"./assets/vk-albums/{album['id']}/{index:03}.jpg"})
            result["albums"][str(album["id"])] = {"cover": f"./assets/vk-albums/{album['id']}/cover.jpg", "photos": photos}
        failed = 0
        for index, job in enumerate(as_completed(jobs), 1):
            if not job.result():
                failed += 1
            if index % 50 == 0:
                print(f"Downloaded {index}/{len(jobs)}")
    MANIFEST.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Localized {len(albums)} albums, {len(jobs) - failed}/{len(jobs)} images")


if __name__ == "__main__":
    main()

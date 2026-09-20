#!/usr/bin/env python3
"""Save a federation contact snapshot and a human-readable change log."""
import json, subprocess
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'web/data'; CURRENT=DATA/'federation_contacts.json'; CHANGES=DATA/'federation_changes.json'
def main():
    js="import('./web/js/gto_data.js').then(m=>console.log(JSON.stringify(m.GTO_FEDERATIONS)))"
    rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True)); old={}
    if CURRENT.exists(): old={str(x['id']):x for x in json.loads(CURRENT.read_text()).get('federations',[])}
    changes=[]
    for row in rows:
        before=old.get(str(row['id']))
        if before:
            for key in ('president','address','phone','email'):
                if before.get(key)!=row.get(key): changes.append({'region':row.get('region'),'field':key,'before':before.get(key,''),'after':row.get(key,'')})
    stamp=datetime.now(timezone.utc).isoformat(); CURRENT.write_text(json.dumps({'checkedAt':stamp,'federations':rows},ensure_ascii=False,indent=2))
    history=json.loads(CHANGES.read_text()) if CHANGES.exists() else []
    if changes: history.append({'checkedAt':stamp,'changes':changes})
    CHANGES.write_text(json.dumps(history,ensure_ascii=False,indent=2));print(f'Checked {len(rows)} federations; {len(changes)} contact changes')
if __name__=='__main__':main()

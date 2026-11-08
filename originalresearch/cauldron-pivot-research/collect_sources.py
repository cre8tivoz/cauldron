"""Collect reference source only; never install or execute upstream code."""
from pathlib import Path
import subprocess,json,concurrent.futures
ROOT=Path('/Users/habibi/hermes/apps-codebases/cauldron-astro')
SOURCES=[('stacki','flowtricks/stacki'),('sveltia-cms','sveltia/sveltia-cms'),('pages-cms','pages-cms/pages-cms'),('ycode','ycode/ycode'),('stageshow-skills','benjitaylor/skills'),('superdesign','superdesigndev/superdesign'),('superdesign-skill','superdesigndev/superdesign-skill'),('react-bits','DavidHDev/react-bits'),('threeui','MengTo/threeui'),('design-bites','educlopez/design-bites'),('originkit-plugin','vellum-ai/originkit')]
def collect(item):
 name,repo=item;dest=ROOT/'references'/'source'/name
 record={'name':name,'repo':repo,'path':str(dest)}
 try:
  meta=subprocess.run(['gh','api','repos/'+repo],capture_output=True,text=True,timeout=40)
  if meta.returncode:raise RuntimeError('Repository metadata lookup failed: '+meta.stderr[:150])
  d=json.loads(meta.stdout);record.update(url=d['html_url'],license_api=(d.get('license') or {}).get('spdx_id'),default_branch=d['default_branch'],archived=d['archived'])
  if dest.exists():raise RuntimeError('Destination already exists; refusing overwrite')
  p=subprocess.run(['git','clone','--depth','1','--single-branch','--filter=blob:none','https://github.com/'+repo+'.git',str(dest)],capture_output=True,text=True,timeout=240)
  if p.returncode:raise RuntimeError('Clone failed: '+p.stderr[-300:])
  record['head']=subprocess.check_output(['git','-C',str(dest),'rev-parse','HEAD'],text=True).strip()
  record['remote']=subprocess.check_output(['git','-C',str(dest),'remote','get-url','origin'],text=True).strip()
  record['status']=subprocess.check_output(['git','-C',str(dest),'status','--porcelain'],text=True).strip()
  license_files=[p for p in dest.iterdir() if p.is_file() and p.name.lower().startswith(('license','licence','copying','notice'))]
  if name=='stageshow-skills':license_files += [p for p in (dest/'stageshow').glob('*') if p.is_file() and p.name.lower().startswith(('license','notice'))]
  record['license_files']=[str(p.relative_to(dest)) for p in license_files]
  record['license_texts']={str(p.relative_to(dest)):p.read_text(errors='replace') for p in license_files}
  record['collected']=True
 except Exception as e:record.update(collected=False,error=str(e))
 return record
if __name__=='__main__':
 ROOT.mkdir(exist_ok=True);(ROOT/'references'/'source').mkdir(parents=True,exist_ok=True)
 ledger=ROOT/'references'/'collection.jsonl';assert not ledger.exists(),'Existing collection ledger; refusing duplicate batch'
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for r in pool.map(collect,SOURCES):
   results.append(r)
   with ledger.open('a') as f:f.write(json.dumps(r)+'\n')
   print(r['name'],r.get('collected'),r.get('license_api'),r.get('error',''),flush=True)
 (ROOT/'references'/'sources.json').write_text(json.dumps(results,indent=2))
 print('Collected',sum(r['collected'] for r in results),'of',len(results))

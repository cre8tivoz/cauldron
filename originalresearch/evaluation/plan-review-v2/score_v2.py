"""Score the saved v2 Jev answers; no API calls. Same scoring rules as v1 score.py."""
import csv, json
from pathlib import Path
import plan_review_v2 as p

ROOT = Path(__file__).parent
rows = [json.loads(l) for l in (ROOT / 'ledger.jsonl').read_text().splitlines()]
ans = {r['id']: {k: v['noul'] for k, v in r['response']['answers'].items()} for r in rows}
out, checks = [], []
d = p.decide

for cid, claim, _, exp in p.CLAIMS:
    a = ans[cid]
    verdict = 'holds' if d(a['supported']) == 'yes' and d(a['goes_beyond']) != 'yes' else \
              'rejected' if d(a['supported']) == 'no' else 'review'
    out.append({'part': 'claims', 'id': cid, 'text': claim, 'verdict': verdict, 'expected': exp, **{k: round(v, 3) for k, v in a.items()}})
    if exp == 'false': checks.append((cid, 'control claim rejected', verdict == 'rejected'))

for pid, (text, _) in {**p.PLAN, **p.ALTS}.items():
    a = ans[pid]
    flags = []
    if d(a['fits_brief']) != 'yes': flags.append('fit ' + d(a['fits_brief']))
    if d(a['restricted_reuse']) != 'no': flags.append('licence ' + d(a['restricted_reuse']))
    if d(a['assumes_unproven']) != 'no': flags.append('assumption ' + d(a['assumes_unproven']))
    if d(a['testable']) != 'yes': flags.append('testable ' + d(a['testable']))
    if d(a['evidenced_gap']) != 'yes': flags.append('gap ' + d(a['evidenced_gap']))
    verdict = 'rejected' if d(a['fits_brief']) == 'no' or d(a['restricted_reuse']) == 'yes' else \
              'sound' if not flags else 'needs work'
    out.append({'part': 'plan' if pid in p.PLAN else 'alternative', 'id': pid, 'text': text, 'verdict': verdict,
                'flags': '; '.join(flags), **{k: round(v, 3) for k, v in a.items()}})
    if p.EXPECT_FIT.get(pid) == 'no': checks.append((pid, 'bad alternative rejected', verdict == 'rejected'))

for a_, b_, exp in p.ORDER:
    v = ans['order'][f'{a_}__{b_}']
    out.append({'part': 'order', 'id': f'{a_} before {b_}', 'verdict': d(v), 'noul': round(v, 3), 'expected': exp})
    if exp == 'false': checks.append((f'{a_}->{b_}', 'control: no dependency', d(v) == 'no'))

for rid, text, exp in p.REQS:
    v = ans['coverage'][rid]
    out.append({'part': 'coverage', 'id': rid, 'text': text, 'verdict': d(v), 'noul': round(v, 3), 'expected': exp})
    if exp == 'false': checks.append((rid, 'control: not covered', d(v) == 'no'))

(ROOT / 'results.json').write_text(json.dumps({'results': out, 'controls': [
    {'id': i, 'check': c, 'passed': ok} for i, c, ok in checks]}, indent=1))
keys = sorted({k for r in out for k in r})
with (ROOT / 'results.csv').open('w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=keys); w.writeheader(); w.writerows(out)
print('controls passed', sum(ok for *_, ok in checks), 'of', len(checks))
for i, c, ok in checks:
    if not ok: print('  FAILED', i, c)
for r in out:
    if r['part'] in ('plan', 'alternative', 'claims'):
        print(f"{r['part']:11} {r['id']:22} {r['verdict']:10} {r.get('flags', '')}")
    else:
        print(f"{r['part']:11} {r['id']:44} {r['verdict']:7} {r['noul']} exp={r['expected']}")

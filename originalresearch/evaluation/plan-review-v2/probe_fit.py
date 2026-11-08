"""Follow-up probe: why do three agent items score low on fit with the brief?

Checks each item against each locked decision and the original brief separately. Same harness rules.
"""
import hashlib, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
import plan_review_v2 as p  # noqa: E402

ITEMS = ['p_external_access', 'p_shared_actions', 'p_agent_panel']

def qs():
    out = {'brief': p.noul('Does `proposal` match what `original_brief` asks for?',
                           'It delivers what the original brief describes.',
                           'It departs from, narrows or contradicts what the original brief describes.')}
    for i, dec in enumerate(p.BRIEF['locked_decisions']):
        out[f'd{i:02d}'] = p.noul(f'Does `proposal` contradict `locked_decisions[{i}]`?',
                                  'Doing what the proposal says would break or go against that decision.',
                                  'The proposal is consistent with that decision, or unrelated to it.')
    return out

def main():
    ledger = ROOT / 'probe-ledger.jsonl'
    assert not ledger.exists(), 'probe already run; refusing to rerun'
    env = Path('/Users/habibi/.hermes/profiles/claudia/.env').read_text()
    key = re.search(r'(?m)^(?:export\s+)?TYPESAFE_API_KEY\s*=\s*(.*?)\s*$', env).group(1).strip('"\'')
    tokens = 0
    for pid in ITEMS:
        text, keys = p.PLAN[pid]
        payload = {'model': p.MODEL, 'state': {'original_brief': p.BRIEF['original_brief'],
                   'locked_decisions': p.BRIEF['locked_decisions'], 'proposal': text,
                   'evidence': {k: p.EV[k] for k in keys}}, 'questions': qs()}
        raw = json.dumps(payload).encode()
        p.screen(raw.decode())
        req = urllib.request.Request('https://api.typesafe.ai/v1/systemone', data=raw, method='POST',
            headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=90) as r:
            res = json.load(r)
        assert res['model'] == p.MODEL and set(res['answers']) == set(payload['questions'])
        tokens += res['usage']['input_tokens']
        with ledger.open('a') as f:
            f.write(json.dumps({'id': pid, 'request_sha256': hashlib.sha256(raw).hexdigest(), 'response': res}) + '\n')
        a = {k: round(v['noul'], 2) for k, v in res['answers'].items()}
        flagged = {k: v for k, v in a.items() if (k == 'brief' and v < 0.7) or (k != 'brief' and v > 0.3)}
        print(pid, 'brief', a['brief'], 'flags', flagged)
        for k in flagged:
            if k != 'brief':
                print('   ', k, p.BRIEF['locked_decisions'][int(k[1:])][:110])
    print('tokens', tokens, 'usd', round(tokens * p.RATE / 1e6, 5))

if __name__ == '__main__':
    main()

"""Challenge proposals against Billy's corrected product brief; no target-code edits."""
import json,urllib.request,re,hashlib
from pathlib import Path
from run_jev import MODEL,RATE,ROOT,screen
BRIEF={
 'purpose':'Completely pivot Cauldron into a genuinely useful Astro website design and builder tool. Billy builds his websites with Astro and values speed, accessibility and good design taste.',
 'baseline':'Billy reports current Cauldron functionally useless/outdated and doubts it ever delivered its intended workflow. Treat that direct experience as evidence. Existing code has no presumption of preservation.',
 'interaction':'External agent tools can operate it using their own existing model access. Optional standalone BYOK may be considered.',
 'constraints':'Fully free and open source. Assess proposals on working Astro output, practical design/editing usefulness, speed/accessibility, and understandable implementation. Current architecture can be replaced completely.',
}
PROPOSALS=[
 ('astro_first','Rebuild the main workflow around opening or creating real Astro websites, with reusable Astro layouts/components, real content/assets and the project\'s own dev-server preview. Generate and edit these files directly. Make built output checks part of completion. The old Alpine prototype/blueprint workflow is superseded.', ['scaffold-generator.js','verification.js','WEB BUILDER IDEAS.md']),
 ('agent_operated_builder','Provide a documented local agent interface plus instructions/examples so an external agent can open/create an Astro project, obtain design context, make scoped edits, inspect its real preview and receive checks. Include a useful human-facing design workspace with pages/sections/assets and targeted change requests. The agent uses its existing model access. Establish one end-to-end loop before claiming support for any agent.', ['build-agents.js','PUBLIC_INTERFACES.md','WEB BUILDER IDEAS.md']),
 ('design_tools','Make design taste usable during site building: select references, establish typography/colour/spacing and composition direction, browse curated compatible sections, edit page content/order/style, and inspect whole-site coherence in the real preview. Pair documented examples with working Astro components where licences allow. Validate with contrasting real site briefs.', ['DESIGN_REFERENCE.md','WEB BUILDER IDEAS.md','quality-scorer.js']),
 ('rendered_quality','Build the Astro site and test real output for responsive overflow, keyboard navigation, image/layout problems, broken links and automated accessibility. Record mobile/desktop performance measurements under stated conditions. Distinguish advisory visual critique from measured checks. Astro choice alone cannot guarantee speed or accessibility.', ['verification.js','quality-scorer.js','scaffold-generator.js']),
 ('replace_freely','Scope a fresh Astro builder architecture from required user journeys. Review old modules only for demonstrable reuse; replace or discard them when adapting them costs more or constrains the new workflow. Preserve project history. No requirement for old pipeline compatibility or retaining standalone mode; optional BYOK is an open feature decision.', ['scaffold-generator.js','build-agents.js','WEB BUILDER IDEAS.md']),
 ('existing_tools_evaluate','Study Stacki/Sitereal/Meno for actual editing workflows and inspect Stacki source/licensing before selecting reusable code. Evaluate Git-based CMS integration after the core Astro creation/edit/preview loop. Decide the UI editing depth from Billy\'s real tasks; visual section/content/style controls are legitimate product scope.', ['WEB BUILDER IDEAS.md']),
 ('optional_byok','Keep external-agent operation independent from Cauldron API keys. Consider optional in-app BYOK only after the agent-operated builder path works; evaluate user benefit and maintenance effort before choosing to retain it.', ['WEB BUILDER IDEAS.md','PUBLIC_INTERFACES.md']),
 ('old_pipeline_default','Keep the old seven-stage blueprint and Alpine HTML prototype pipeline mandatory and add an Astro export button. Require users to supply a model key to generate the prototype before their external agent can build.', ['scaffold-generator.js','WEB BUILDER IDEAS.md']),
 ('prompt_library_only','Deliver a folder of good-taste prompts and a handoff Markdown file as the complete pivot. Leave real site creation, preview, editing, project management and output checks entirely outside Cauldron.', ['WEB BUILDER IDEAS.md','scaffold-generator.js']),
 ('framework_guarantee','Choose Astro and mark all generated sites fast and accessible by default. Use the current markup-based quality grade as sufficient evidence of finished-site quality.', ['verification.js','quality-scorer.js']),
]
def q(text,yes,no):return {'type':'noul','instructions':text,'criteria':{'true':yes,'false':no}}
QUESTIONS={
 'fits_brief':q('Does `proposal` serve the stated product purpose in `brief`?','It directly advances a usable Astro site design/build workflow within the stated constraints.','It preserves the failed prototype/handoff outcome or conflicts with the constraints.'),
 'addresses_gap':q('Does `proposal` address a concrete gap described in `brief` or demonstrated by `evidence`?','A specific existing limitation or required user task is addressed.','The supplied evidence supplies no concrete gap that this proposal addresses.'),
 'alone_sufficient':q('Would `proposal` alone deliver the complete working Astro builder described in `brief`?','The proposal covers a usable creation/edit/preview/check loop with design direction.','This is a supporting piece, evaluation step, or incomplete workflow requiring other work.'),
 'assumes_unproved':q('Does `proposal` treat an untested capability as already reliable?','It assumes a model, framework, imported library or existing code already guarantees a working product.','It identifies required implementation, measurement or validation and does not assert those capabilities already work.'),
 'testable':q('Does `proposal` describe an outcome that can be checked on a real Astro project?','A concrete project action or observable output can be exercised.','It offers only positioning, vague taste claims or an untestable guarantee.'),
}
def main():
 ledger=ROOT/'jev-reassessment.jsonl';assert not ledger.exists()
 old=json.loads((ROOT/'jev-inputs.json').read_text())
 jobs=[]
 for ident,proposal,names in PROPOSALS:
  evidence=[]
  for name in names:
   matches=[j for j in old if Path(j['source']).name==name]
   # At most one source chunk per named document; exact ranges retained.
   if matches:
    state=matches[0]['payload']['state'];evidence.append(state)
  state={'brief':BRIEF,'proposal':proposal,'evidence':evidence}
  payload={'model':MODEL,'state':state,'questions':QUESTIONS};screen(json.dumps(payload))
  jobs.append({'id':ident,'payload':payload})
 assert len(jobs)*0.005<=0.10
 (ROOT/'jev-reassessment-inputs.json').write_text(json.dumps(jobs,indent=2))
 env=Path('/Users/habibi/.hermes/profiles/claudia/.env').read_text()
 key=re.search(r'(?m)^(?:export\s+)?TYPESAFE_API_KEY\s*=\s*(.*?)\s*$',env).group(1).strip('\"\'')
 tokens=0
 for job in jobs:
  raw=json.dumps(job['payload']).encode();row={'id':job['id'],'request_sha256':hashlib.sha256(raw).hexdigest()}
  try:
   req=urllib.request.Request('https://api.typesafe.ai/v1/systemone',data=raw,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
   with urllib.request.urlopen(req,timeout=90) as r:res=json.load(r)
   assert res['model']==MODEL and set(res['answers'])==set(QUESTIONS)
   for a in res['answers'].values():assert a['type']=='noul' and 0<=a['noul']<=1
   tokens+=res['usage']['input_tokens'];row['response']=res
  except Exception as e:
   row['error']=type(e).__name__
   with ledger.open('a') as f:f.write(json.dumps(row)+'\n')
   raise RuntimeError('Stopped; error type '+type(e).__name__) from None
  with ledger.open('a') as f:f.write(json.dumps(row)+'\n')
  assert tokens*RATE/1e6<=.10
  print(job['id'],{k:round(v['noul'],3) for k,v in res['answers'].items()},flush=True)
 summary={'requests':len(jobs),'input_tokens':tokens,'estimated_usd':tokens*RATE/1e6,'cap_usd':.10,'model':MODEL}
 (ROOT/'jev-reassessment-summary.json').write_text(json.dumps(summary,indent=2));print(summary)
if __name__=='__main__':main()

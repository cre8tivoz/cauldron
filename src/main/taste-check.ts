import type { BrowserWindow } from 'electron';
import type { DesignDirection } from './directions';
import type { Finding } from './quality';
import { judgeFocus, type FocusSample } from './contrast';

/** The approved automatic taste tests. A scope limits judgement to newly added pieces. */
export async function measureTaste(
  window: BrowserWindow,
  direction: DesignDirection,
  page: string,
  options:
    | string
    | {
        /** CSS selector selecting what to judge; `body` is the whole page. */
        scope?: string;
        /** Judge the stylesheet declarations found on screen (off for a run's own CSS). */
        declarations?: boolean;
        /** The approved width the page is rendered at; the tests run at three. */
        width?: number;
        /** `change` judges only an agent run's output, and says so in each label. */
        kind?: 'site' | 'change';
      } = {},
): Promise<Finding[]> {
  const opts = typeof options === 'string' ? { scope: options } : options;
  const scope = opts.scope ?? 'body';
  const judgeDeclarations = opts.declarations ?? true;
  const measured = (await window.webContents.executeJavaScript(`(() => {
    try {
    const direction = ${JSON.stringify(direction)};
    const roots = [...document.querySelectorAll(${JSON.stringify(scope)})];
    if (!roots.length) throw new Error('No rendered elements matched the taste-check scope.');
    const elements = [...new Set(roots.flatMap(root => [root,...root.querySelectorAll('*')]))]
      .filter(el => { const s=getComputedStyle(el); return s.display!=='none' && s.visibility!=='hidden' && el.getBoundingClientRect().width>0; });
    const canvas = document.createElement('canvas'); canvas.width=canvas.height=1;
    const context = canvas.getContext('2d',{willReadFrequently:true});
    const rgba = value => { context.clearRect(0,0,1,1); context.fillStyle=value; context.fillRect(0,0,1,1); return [...context.getImageData(0,0,1,1).data]; };
    const key = value => rgba(value).join(',');
    const palette = new Set(Object.values(direction.colours).map(key));
    const allowedFonts = [direction.fonts.display.family,direction.fonts.body.family].map(f=>f.toLowerCase());
    const counts = { black:0, cards:0, gradient:0, accents:0, fonts:0, defaultFonts:0, colours:0, spacing:0, type:0, radius:0, emoji:0, labels:0, declarations:0, hardcoded:0, textContrast:0, buttonContrast:0, lowest:99 };
    const off = { spacing:[], type:[], radius:[] };
    const name = el => el.tagName.toLowerCase() + (typeof el.className==='string' && el.className ? '.'+el.className.split(' ')[0] : '');
    const near = (value, scale) => scale.some(token=>Math.abs(token-value)<0.6);
    const blackNamed = palette.has('0,0,0,255');
    const accentKeys=['#2563eb','#3b82f6','#7c3aed','#6366f1','#4f46e5'].map(key);
    const fontNames = new Set();
    const hue = ([r,g,b]) => { r/=255;g/=255;b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b), delta=max-min;
      if(!delta)return 0; return ((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360; };
    const bluePurple = value => { const h=hue(rgba(value)); return h>=210 && h<=290; };
    const gradientNamed = Object.values(direction.colours).filter(bluePurple).length>=2;
    const panel = el => { const s=getComputedStyle(el); return parseFloat(s.borderTopLeftRadius)>0 && (parseFloat(s.borderTopWidth)>0 || s.boxShadow!=='none'); };
    const solid = value => { const parts=(value||'').match(/[\\d.]+/g)?.map(Number); if(!parts||parts.length<3)return null; if(parts.length>3&&parts[3]<0.9)return null; return parts.slice(0,3); };
    const lum = c => { const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]) };
    const contrast = (a,b) => { const l1=lum(a),l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05) };
    const behind = el => { let node=el; while(node){ const s=getComputedStyle(node);
      if(!s.backgroundImage.includes('gradient')){ const c=solid(s.backgroundColor); if(c)return c; }
      node=node.parentElement; } return solid(getComputedStyle(document.body).backgroundColor)||[255,255,255]; };
    const indicator = el => { const s=getComputedStyle(el);
      if(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=1&&solid(s.outlineColor))return solid(s.outlineColor);
      if(s.boxShadow&&s.boxShadow!=='none'){ const first=(s.boxShadow.match(/rgba?\\([^)]*\\)|#[0-9a-f]{3,8}/i)||[])[0]; if(first&&solid(first))return solid(first); }
      return null; };
    const rules=[];
    const judgeRules = ${judgeDeclarations};
    const readRules = sheet => { try { for(const rule of sheet.cssRules||[]) { if(rule.selectorText && rule.style) rules.push(rule); else if(rule.cssRules)readRules(rule); } } catch {} };
    if(judgeRules) [...document.styleSheets].forEach(readRules);
    const hardcodedExamples=[];
    const declarations = style => { for(const property of style) {
      if(!/^(color|background(?:-color)?|border(?:-[a-z]+)?-color|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|(?:row-|column-)?gap)$/.test(property))continue;
      const value=style.getPropertyValue(property).trim();
      if(/^(0(?:px|rem)?|auto|inherit|initial|unset|transparent|currentcolor|none)$/i.test(value))continue;
      if(!value)continue;
      counts.declarations++;if(!value.includes('var(--cauldron-')){counts.hardcoded++;hardcodedExamples.push(property+':'+value);}
    } };
    // Scoped library checks judge the copied component declarations, not the
    // host site's reset stylesheet. Computed-value checks still catch leakage.
    for(const rule of rules) { try { if(${scope !== 'body'} && !rule.selectorText.includes('cauldron-'))continue; if(elements.some(el=>el.matches(rule.selectorText)))declarations(rule.style); }catch{} }
    const mixAllowed = (el,property) => rules.some(rule=>{try{return el.matches(rule.selectorText)&&rule.style.getPropertyValue(property).includes('color-mix(')&&rule.style.getPropertyValue(property).includes('var(--cauldron-');}catch{return false;}});
    const controls=[];
    elements.forEach((el,index)=>{
      const s=getComputedStyle(el), rect=el.getBoundingClientRect();
      const directText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      const textColour=key(s.color), background=key(s.backgroundColor);
      if(!blackNamed && ((directText&&textColour==='0,0,0,255')||(background==='0,0,0,255'&&rect.width*rect.height>innerWidth*innerHeight*.1)))counts.black++;
      if(panel(el)){let parent=el.parentElement;while(parent){if(panel(parent)){counts.cards++;break;}parent=parent.parentElement;}}
      const stops=s.backgroundImage.match(/rgba?\\([^)]*\\)|#[0-9a-f]{3,8}|oklch\\([^)]*\\)|hsla?\\([^)]*\\)/gi)||[];
      if(!gradientNamed&&stops.filter(bluePurple).length>=2)counts.gradient++;
      for(const stop of stops) { const colour=key(stop); if(accentKeys.includes(colour)&&!palette.has(colour))counts.accents++; }
      for(const [property,value] of [['color',s.color],['background-color',s.backgroundColor]]){
        const colour=key(value); if(rgba(value)[3]===0)continue;
        if(accentKeys.includes(colour)&&!palette.has(colour))counts.accents++;
        if((property!=='color'||directText)&&!palette.has(colour)&&!mixAllowed(el,property))counts.colours++;
      }
      if(el.matches('h1,h2,h3,h4,h5,h6,p,button,a')&&el.textContent.trim()){
        const family=s.fontFamily.split(',')[0].replace(/["']/g,'').trim().toLowerCase();fontNames.add(family);
        if(!allowedFonts.includes(family))counts.fonts++;
        if(['inter','roboto','arial','system-ui'].includes(family)&&!allowedFonts.includes(family))counts.defaultFonts++;
        if(!near(parseFloat(s.fontSize),direction.typeScale)){counts.type++;if(off.type.length<4)off.type.push(s.fontSize+' on '+name(el));}
        // Approved contrast thresholds (taste-tests.md 4.2 #6 and #7).
        if(directText||el.matches('button')){
          const size=parseFloat(s.fontSize), bold=parseInt(s.fontWeight)>=700;
          const required=el.matches('button')?4.5:(size>=24||(bold&&size>=18.66)?3:4.5);
          const ink=solid(s.color);
          if(ink){ const measured=contrast(ink,behind(el));
            if(measured<counts.lowest)counts.lowest=Math.round(measured*100)/100;
            if(measured<required){ if(el.matches('button'))counts.buttonContrast++; else counts.textContrast++; } }
        }
      }
      for(const property of ['marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','rowGap','columnGap']){
        const autoMargin=property.startsWith('margin') && rules.some(rule=>{try{return el.matches(rule.selectorText)&&[rule.style.margin,rule.style.marginInline,rule.style.getPropertyValue(property.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))].some(value=>value.includes('auto'));}catch{return false;}});
        const value=parseFloat(s[property]);if(!autoMargin&&Number.isFinite(value)&&value!==0&&value!==1&&!near(value,direction.spacing)){counts.spacing++;if(off.spacing.length<4)off.spacing.push(property+':'+value+'px on '+name(el));}
      }
      for(const property of ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius']){
        const value=parseFloat(s[property]);if(Number.isFinite(value)&&!near(value,direction.radii))counts.radius++;
      }
      if(el.matches('button,nav,li')&&/[\\p{Extended_Pictographic}\\p{Regional_Indicator}]/u.test(el.textContent))counts.emoji++;
      if(el.matches('button,nav a')&&(s.textOverflow==='ellipsis'||el.scrollWidth>el.clientWidth+1))counts.labels++;
      if(judgeRules) declarations(el.style);
      if(el.matches('a[href],button,input,select,textarea,[tabindex]')&&!el.disabled&&el.tabIndex>=0){el.setAttribute('data-cauldron-audit-control',String(controls.length));controls.push(controls.length);}
    });
    const totalControls=[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0).length;
    // The approved focus check measures the indicator's contrast (3:1), not just
    // that one is present.
    window.__cauldronFocusContrast = index => { const el=document.querySelector('[data-cauldron-audit-control="'+index+'"]'); if(!el)return null;
      const s=getComputedStyle(el), colour=indicator(el);
      return { outline:s.outlineStyle, width:parseFloat(s.outlineWidth), shadow:s.boxShadow,
        ratio: colour ? Math.round(contrast(colour, behind(el.parentElement||el))*100)/100 : 0 }; };
    return {counts, hardcodedExamples:hardcodedExamples.slice(0,8), off, controls:controls.length, totalControls, fonts:[...fontNames], blackNamed, gradientNamed};
    } catch (error) { return { error: String((error && error.stack) || error) }; }
  })()`)) as {
    counts: Record<string, number>;
    hardcodedExamples: string[];
    off: { spacing: string[]; type: string[]; radius: string[] };
    controls: number;
    totalControls: number;
    fonts: string[];
    blackNamed: boolean;
    gradientNamed: boolean;
    error?: string;
  };
  if (measured.error)
    throw new Error(`The taste checks could not run: ${measured.error}`);
  const width = opts.width;
  const suffix = width ? `-${width}` : '';
  const labelPrefix = opts.kind === 'change' ? 'Agent changes: ' : '';
  const findings: Finding[] = [];
  const add = (id: string, label: string, failed: number, detail?: string) =>
    findings.push({
      id: `taste-${id}-${page}${suffix}`,
      label: `${labelPrefix}${label}`,
      status: failed ? 'fail' : 'pass',
      kind: 'measured',
      detail: detail ?? `${failed} violation(s).`,
      page,
      ...(width ? { width } : {}),
      ...(opts.kind ? { scope: opts.kind } : {}),
    });
  const opinion = (id: string, label: string, detail: string) =>
    findings.push({
      id: `opinion-${id}-${page}`,
      label,
      status: 'info',
      kind: 'opinion',
      detail,
      page,
      width,
    });
  // One opinion per page, not one for every width it was measured at.
  const wantsOpinions = width === undefined || width === 1280;
  const c = measured.counts;
  add('default-fonts', 'No unchosen default fonts', c.defaultFonts);
  add(
    'black',
    'No pure black',
    c.black,
    measured.blackNamed
      ? 'Direction exception: pure black is explicitly named. Risk: harsh contrast; prefer its softer ink colour where possible.'
      : undefined,
  );
  if (measured.blackNamed && wantsOpinions) {
    opinion(
      'black',
      'Design opinion: pure black is part of this direction',
      'The direction names pure black, so it is not counted as a failure. Risk: harsh contrast; prefer its softer ink colour for large areas where the direction allows.',
    );
  }
  add('cards', 'No cards inside cards', c.cards);
  add(
    'gradients',
    'No tired blue-purple gradients',
    c.gradient,
    measured.gradientNamed
      ? 'Direction exception: blue-purple colours are named. Risk: a generic SaaS feel; prefer a solid colour for large areas.'
      : undefined,
  );
  if (measured.gradientNamed && wantsOpinions) {
    opinion(
      'gradients',
      'Design opinion: blue-purple colours are part of this direction',
      'The direction names blue-purple colours, so the gradient is not counted as a failure. Risk: a generic SaaS feel; prefer a solid colour for large areas.',
    );
  }
  add('accents', 'No unchosen generic SaaS accents', c.accents);
  add(
    'fonts',
    'First fonts match the direction',
    c.fonts,
    `Observed: ${measured.fonts.join(', ')}.`,
  );
  add('colours', 'Colours follow the direction', c.colours);
  add(
    'spacing',
    'Spacing follows the direction',
    c.spacing,
    measured.off.spacing.length > 0
      ? measured.off.spacing.join('; ')
      : undefined,
  );
  add(
    'type',
    'Type sizes use the direction',
    c.type,
    measured.off.type.length > 0 ? measured.off.type.join('; ') : undefined,
  );
  add('radius', 'Radii follow the direction', c.radius);
  add(
    'tokens',
    'Tokens rather than hard-coded values',
    c.declarations && c.hardcoded / c.declarations > 0.05 ? 1 : 0,
    `${c.hardcoded}/${c.declarations} colour/spacing declarations hard-coded. ${measured.hardcodedExamples.join('; ')}`,
  );
  add('emoji', 'No emoji used as interface icons', c.emoji);
  add('labels', 'Labels are not truncated', c.labels);
  add(
    'text-contrast',
    'Text contrast meets the approved threshold',
    c.textContrast,
    `${c.textContrast} piece(s) of text under 4.5:1 (3:1 for large text). Lowest measured ${c.lowest === 99 ? 'none' : `${c.lowest}:1`}.`,
  );
  add(
    'button-contrast',
    'Button text contrast meets the approved threshold',
    c.buttonContrast,
    `${c.buttonContrast} button(s) under 4.5:1.`,
  );
  // Keyboard modality is set by actual Tab key events, not element.focus().
  window.webContents.debugger.attach('1.3');
  await window.webContents.debugger.sendCommand('DOM.enable');
  await window.webContents.debugger.sendCommand('CSS.enable');
  const { root } =
    await window.webContents.debugger.sendCommand('DOM.getDocument');
  const force = async (index: number, classes: string[]) => {
    const { nodeId } = await window.webContents.debugger.sendCommand(
      'DOM.querySelector',
      {
        nodeId: root.nodeId,
        selector: `[data-cauldron-audit-control="${index}"]`,
      },
    );
    if (nodeId)
      await window.webContents.debugger.sendCommand('CSS.forcePseudoState', {
        nodeId,
        forcedPseudoClasses: classes,
      });
  };
  const reached = new Set<number>();
  let invisible = 0,
    lowContrast = 0,
    weakest = 99,
    hoverless = 0,
    disabledUnchanged = 0;
  const focusProblems: string[] = [];
  const signature = `['color','backgroundColor','borderColor','boxShadow','outline','textDecoration','opacity','transform'].map(p=>getComputedStyle(el)[p]).join('|')`;
  await window.webContents.executeJavaScript(
    `document.body.tabIndex=-1;document.body.focus()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 150));
  for (let index = 0; index < measured.totalControls + 2; index++) {
    window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' });
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' });
    const active = await window.webContents.executeJavaScript(
      `(() => {const el=document.activeElement;return {index:Number(el.getAttribute('data-cauldron-audit-control')??-1)};})()`,
    );
    if (active.index >= 0 && !reached.has(active.index)) {
      reached.add(active.index);
      const selector = `[data-cauldron-audit-control="${active.index}"]`;
      await force(active.index, []);
      const before = await window.webContents.executeJavaScript(
        `(() => {const el=document.querySelector(${JSON.stringify(selector)});return getComputedStyle(el).backgroundColor;})()`,
      );
      await force(active.index, ['focus', 'focus-visible']);
      const after = (await window.webContents.executeJavaScript(
        `(() => {
          const el=document.querySelector(${JSON.stringify(selector)});
          const s=getComputedStyle(el);
          let node=el.parentElement;
          let parentBackground='rgb(255, 255, 255)';
          while(node){const c=getComputedStyle(node).backgroundColor;
            if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){parentBackground=c;break;}
            node=node.parentElement;}
          return {
            where: el.tagName.toLowerCase()+(typeof el.className==='string'&&el.className?'.'+el.className.split(' ')[0]:''),
            outlineStyle: s.outlineStyle,
            outlineWidth: parseFloat(s.outlineWidth)||0,
            outlineColor: s.outlineColor,
            outlineOffset: parseFloat(s.outlineOffset) || 0,
            boxShadow: s.boxShadow,
            background: s.backgroundColor,
            parentBackground,
          };
        })()`,
      )) as Omit<FocusSample, 'beforeBackground'>;
      // The approved focus threshold is 3:1 against its surroundings, not mere
      // presence of a ring.
      const verdict = judgeFocus({ ...after, beforeBackground: before });
      if (verdict.state === 'missing') {
        invisible++;
      } else if (verdict.state === 'low-contrast') {
        lowContrast++;
        focusProblems.push(`${after.where} ${verdict.ratio}:1`);
      }
      if (verdict.state !== 'ok')
        weakest = Math.min(weakest, verdict.ratio ?? 0);
      await force(active.index, []);
    }
  }
  add(
    'keyboard',
    'Interactive parts can be reached by keyboard',
    measured.controls - reached.size,
    `${reached.size}/${measured.controls} reached using Tab.`,
  );
  add(
    'focus',
    'Focus is visible on controls',
    invisible + lowContrast + measured.controls - reached.size,
    `${invisible} without an indicator, ${lowContrast} under 3:1${
      focusProblems.length ? ` (${focusProblems.slice(0, 3).join('; ')})` : ''
    }.`,
  );
  add(
    'focus-threshold',
    'Focus indicator is visible at 3:1 or better',
    invisible + lowContrast + measured.controls - reached.size,
    `${invisible} reached control(s) had no indicator or one under 3:1 against its background${weakest === 99 ? '' : `; weakest measured ${weakest}:1`}. ${measured.controls - reached.size} control(s) could not be reached.`,
  );
  for (let index = 0; index < measured.controls; index++) {
    const selector = `[data-cauldron-audit-control="${index}"]`;
    await window.webContents.executeJavaScript(
      `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`,
    );
    await force(index, []);
    const before = await window.webContents.executeJavaScript(
      `(() => {const el=document.querySelector(${JSON.stringify(selector)});return {signature:${signature},rect:el.getBoundingClientRect().toJSON()};})()`,
    );
    await force(index, ['hover']);
    await new Promise((resolve) => setTimeout(resolve, 160));
    const states = await window.webContents.executeJavaScript(
      `(() => {const el=document.querySelector(${JSON.stringify(selector)});const hover=${signature};let disabled=null;if('disabled' in el){el.disabled=true;disabled=${signature};el.disabled=false;}return {hover,disabled};})()`,
    );
    await force(index, []);
    if (states.hover === before.signature) hoverless++;
    if (states.disabled !== null && states.disabled === states.hover)
      disabledUnchanged++;
  }
  add('hover', 'Controls have a visible hover state', hoverless);
  add('disabled', 'Controls have a visible disabled state', disabledUnchanged);
  try {
    await window.webContents.debugger.sendCommand(
      'Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
    );
    const moving = await window.webContents.executeJavaScript(
      `(() => [...document.querySelectorAll(${JSON.stringify(scope)})].flatMap(root=>[root,...root.querySelectorAll('*')]).filter(el=>{const s=getComputedStyle(el);return [...s.animationDuration.split(','),...s.transitionDuration.split(',')].some(v=>parseFloat(v)>.01);}).length)()`,
    );
    add('motion', 'Motion respects reduced-motion', moving);
  } catch (error) {
    findings.push({
      id: `taste-motion-${page}`,
      label: 'Motion respects reduced-motion',
      status: 'unknown',
      kind: 'failure',
      detail: `The motion check could not run: ${String(error)}`,
      page,
      width,
    });
  } finally {
    if (window.webContents.debugger.isAttached())
      window.webContents.debugger.detach();
  }
  return findings;
}

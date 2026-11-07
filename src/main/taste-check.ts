import type { BrowserWindow } from 'electron';
import type { DesignDirection } from './directions';
import type { Finding } from './quality';

/** The approved automatic taste tests. A scope limits judgement to newly added pieces. */
export async function measureTaste(
  window: BrowserWindow,
  direction: DesignDirection,
  page: string,
  scope = 'body',
): Promise<Finding[]> {
  const measured = (await window.webContents.executeJavaScript(`(() => {
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
    const counts = { black:0, cards:0, gradient:0, accents:0, fonts:0, defaultFonts:0, colours:0, spacing:0, type:0, radius:0, emoji:0, labels:0, declarations:0, hardcoded:0 };
    const near = (value, scale) => scale.some(token=>Math.abs(token-value)<0.6);
    const blackNamed = palette.has('0,0,0,255');
    const accentKeys=['#2563eb','#3b82f6','#7c3aed','#6366f1','#4f46e5'].map(key);
    const fontNames = new Set();
    const hue = ([r,g,b]) => { r/=255;g/=255;b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b), delta=max-min;
      if(!delta)return 0; return ((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360; };
    const bluePurple = value => { const h=hue(rgba(value)); return h>=210 && h<=290; };
    const gradientNamed = Object.values(direction.colours).filter(bluePurple).length>=2;
    const panel = el => { const s=getComputedStyle(el); return parseFloat(s.borderTopLeftRadius)>0 && (parseFloat(s.borderTopWidth)>0 || s.boxShadow!=='none'); };
    const rules=[];
    const readRules = sheet => { try { for(const rule of sheet.cssRules||[]) { if(rule.selectorText && rule.style) rules.push(rule); else if(rule.cssRules)readRules(rule); } } catch {} };
    [...document.styleSheets].forEach(readRules);
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
        if(!near(parseFloat(s.fontSize),direction.typeScale))counts.type++;
      }
      for(const property of ['marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','rowGap','columnGap']){
        const autoMargin=property.startsWith('margin') && rules.some(rule=>{try{return el.matches(rule.selectorText)&&[rule.style.margin,rule.style.marginInline,rule.style.getPropertyValue(property.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))].some(value=>value.includes('auto'));}catch{return false;}});
        const value=parseFloat(s[property]);if(!autoMargin&&Number.isFinite(value)&&value!==0&&value!==1&&!near(value,direction.spacing))counts.spacing++;
      }
      for(const property of ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius']){
        const value=parseFloat(s[property]);if(Number.isFinite(value)&&!near(value,direction.radii))counts.radius++;
      }
      if(el.matches('button,nav,li')&&/[\\p{Extended_Pictographic}\\p{Regional_Indicator}]/u.test(el.textContent))counts.emoji++;
      if(el.matches('button,nav a')&&(s.textOverflow==='ellipsis'||el.scrollWidth>el.clientWidth+1))counts.labels++;
      declarations(el.style);
      if(el.matches('a[href],button,input,select,textarea,[tabindex]')&&!el.disabled&&el.tabIndex>=0){el.setAttribute('data-cauldron-audit-control',String(controls.length));controls.push(controls.length);}
    });
    const totalControls=[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0).length;
    return {counts, hardcodedExamples:hardcodedExamples.slice(0,8), controls:controls.length, totalControls, fonts:[...fontNames], blackNamed, gradientNamed};
  })()`)) as {
    counts: Record<string, number>;
    hardcodedExamples: string[];
    controls: number;
    totalControls: number;
    fonts: string[];
    blackNamed: boolean;
    gradientNamed: boolean;
  };
  const findings: Finding[] = [];
  const add = (id: string, label: string, failed: number, detail?: string) =>
    findings.push({
      id: `taste-${id}-${page}`,
      label,
      status: failed ? 'fail' : 'pass',
      detail: detail ?? `${failed} violation(s).`,
      page,
    });
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
  add('cards', 'No cards inside cards', c.cards);
  add(
    'gradients',
    'No tired blue-purple gradients',
    c.gradient,
    measured.gradientNamed
      ? 'Direction exception: blue-purple colours are named. Risk: a generic SaaS feel; prefer a solid colour for large areas.'
      : undefined,
  );
  add('accents', 'No unchosen generic SaaS accents', c.accents);
  add(
    'fonts',
    'First fonts match the direction',
    c.fonts,
    `Observed: ${measured.fonts.join(', ')}.`,
  );
  add('colours', 'Colours follow the direction', c.colours);
  add('spacing', 'Spacing follows the direction', c.spacing);
  add('type', 'Type sizes use the direction', c.type);
  add('radius', 'Radii follow the direction', c.radius);
  add(
    'tokens',
    'Tokens rather than hard-coded values',
    c.declarations && c.hardcoded / c.declarations > 0.05 ? 1 : 0,
    `${c.hardcoded}/${c.declarations} colour/spacing declarations hard-coded. ${measured.hardcodedExamples.join('; ')}`,
  );
  add('emoji', 'No emoji used as interface icons', c.emoji);
  add('labels', 'Labels are not truncated', c.labels);
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
    hoverless = 0,
    disabledUnchanged = 0;
  const signature = `['color','backgroundColor','borderColor','boxShadow','outline','textDecoration','opacity','transform'].map(p=>getComputedStyle(el)[p]).join('|')`;
  await window.webContents.executeJavaScript(
    `document.body.tabIndex=-1;document.body.focus()`,
  );
  for (let index = 0; index < measured.totalControls + 2; index++) {
    window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' });
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' });
    const active = await window.webContents.executeJavaScript(
      `(() => {const el=document.activeElement;return {index:Number(el.getAttribute('data-cauldron-audit-control')??-1),outline:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth),shadow:getComputedStyle(el).boxShadow};})()`,
    );
    if (active.index >= 0 && !reached.has(active.index)) {
      reached.add(active.index);
      await force(active.index, ['focus', 'focus-visible']);
      const indicator = await window.webContents.executeJavaScript(
        `(() => {const el=document.querySelector('[data-cauldron-audit-control="${active.index}"]');const s=getComputedStyle(el);return {outline:s.outlineStyle,width:parseFloat(s.outlineWidth),shadow:s.boxShadow};})()`,
      );
      if (
        (indicator.outline === 'none' || indicator.width < 1) &&
        indicator.shadow === 'none'
      )
        invisible++;
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
    invisible + measured.controls - reached.size,
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
      detail: String(error),
      page,
    });
  } finally {
    if (window.webContents.debugger.isAttached())
      window.webContents.debugger.detach();
  }
  return findings;
}

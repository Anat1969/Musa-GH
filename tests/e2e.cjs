const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
// בדיקת קצה לקצה: npm run build, npx vite preview --port 4173, ואז node tests/e2e.cjs
// כל קריאות Supabase במוק עם מאגר בזיכרון. צילומי מסך ב-tests/out (לא בריפו).
const S = path.join(__dirname, 'out'), U = 'http://localhost:4173/';
fs.mkdirSync(S, { recursive: true });
const SB = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const IMG = path.join(__dirname, 'fixtures');
const imgs = fs.readdirSync(IMG).filter(f => f.endsWith('.jpg')).map(f => fs.readFileSync(path.join(IMG, f)));
const fails = []; const ok = m => console.log('ok  ', m); const bad = m => { fails.push(m); console.log('FAIL', m); };

const seed = () => {
  const rows = []; let t = Date.parse('2026-10-01T10:00:00Z');
  const src = ['כמעיין המתגבר\nאיין ראנד', 'אריק איינשטיין', 'אנה קרנינה\nלב טולסטוי'];
  for (const s of src) for (const m of ['board', 'illustration', 'art']) {
    const n = rows.length;
    rows.unshift({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, source: s, mode: m,
      image_url: `${SB}/storage/v1/object/public/musa-media/studies/${n}.jpg`,
      hebrew_interpretation: `פרשנות ${n}: בטון חשוף ואור מערבי נמוך.`, visual_prompt: `Prompt ${n}. Documentary realism.`,
      spatial_identity: n % 2 ? `זהות מרחבית ${n}` : null, created_at: new Date(t += 3600e3).toISOString() });
  }
  // מחקר שנשמר בלי תמונה (מפתח fal חסר)
  rows.unshift({ id: '20000000-0000-4000-8000-000000000001', source: 'וואבי־סאבי', mode: 'illustration', image_url: null,
    hebrew_interpretation: 'וואבי־סאבי רואה יופי בחולף ובפגום.', visual_prompt: 'A rural tea hut, clay walls.', spatial_identity: 'חדר תה צנוע מטיח אדמה.',
    created_at: new Date(t += 3600e3).toISOString() });
  return rows;
};

function mock(ctx, db, log) {
  return ctx.route(`${SB}/**`, async (route, req) => {
    const url = new URL(req.url()), p = url.pathname, m = req.method();
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    log.push(`${m} ${p}`);
    const j = (status, body) => route.fulfill({ status, headers: cors, body: JSON.stringify(body) });
    if (p.startsWith('/auth/')) { log.push('AUTHCALL ' + p); return j(404, {}); }
    if (p === '/rest/v1/musa_generations' && m === 'GET') return j(200, db.rows);
    if (p.startsWith('/storage/v1/object/public/musa-media/')) {
      const n = parseInt(p.split('/').pop(), 10) || 0;
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'image/jpeg' }, body: imgs[n % imgs.length] });
    }
    if (p === '/functions/v1/musa-generate') {
      const b = JSON.parse(req.postData()); db.calls.push(b);
      if (b.setImage) { const row = db.rows.find(x => x.id === b.setImage.id); db.pasted.push(b.setImage); row.image_url = `${SB}/storage/v1/object/public/musa-media/studies/7.jpg`; return j(200, { generation: row }); }
      if (b.imageFor) { const row = db.rows.find(x => x.id === b.imageFor); row.image_url = `${SB}/storage/v1/object/public/musa-media/studies/99.jpg`; return j(200, { generation: row }); }
      if (db.fail) return j(502, { error: 'יצירת התמונה נכשלה. נסו שוב.' });
      const hit = db.rows.find(r => r.source === b.source && r.mode === b.mode);
      if (hit && !b.fresh) return j(200, { generation: hit, cached: true });
      const n = db.rows.length;
      const row = { id: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`, source: b.source, mode: b.mode,
        image_url: `${SB}/storage/v1/object/public/musa-media/studies/${n}.jpg`, hebrew_interpretation: 'פרשנות חדשה.',
        visual_prompt: 'New prompt.', spatial_identity: 'זהות חדשה.', created_at: new Date().toISOString() };
      db.rows.unshift(row);
      return j(200, { generation: row, cached: false });
    }
    log.push('UNMOCKED ' + m + ' ' + p);
    return j(404, {});
  });
}

(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const db = { rows: seed(), calls: [], fail: false, pasted: [] }, log = [];
    const ctx = await b.newContext({ viewport: vp, permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
    await mock(ctx, db, log);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => m.type() === 'error' && !/fonts\.g|status of 40[0-4]|status of 502|ERR_/.test(m.text()) && errs.push(m.text()));
    const hs = async t => { const w = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); w > 0 ? bad(`${name} ${t} hscroll ${w}`) : ok(`${name} ${t} no hscroll`); };

    // השער
    await p.goto(U); await p.waitForTimeout(1500);
    (await p.locator('.brand .app-mark').count()) && (await p.locator('.brand-name').innerText()) === 'מוזה' ? ok('brand with app mark') : bad('brand');
    (await p.locator('.hero-title').count()) && (await p.locator('.steps .step').count()) === 4 && (await p.locator('[data-mode-card]').count()) === 3 ? ok('gate explains: hero, 4 steps, 3 modes') : bad('gate sections');
    // III: אותו מקור בשלושת האופנים
    const srcOf = async sel => p.$$eval(sel, els => els.map(e => e.getAttribute('href').replace('#s/', '')));
    const sameIds = await srcOf('.same-source .ccard');
    const sameSources = new Set(sameIds.map(id => db.rows.find(x => x.id === decodeURIComponent(id))?.source));
    const sameModes = sameIds.map(id => db.rows.find(x => x.id === decodeURIComponent(id))?.mode).join();
    sameSources.size === 1 && sameModes === 'board,illustration,art' ? ok('same source in all three modes') : bad('same source ' + [...sameSources] + ' ' + sameModes);
    await p.locator('[data-triad="1"]').click(); await p.waitForTimeout(600);
    const ids2 = await srcOf('.same-source .ccard');
    const src2 = new Set(ids2.map(id => db.rows.find(x => x.id === decodeURIComponent(id))?.source));
    src2.size === 1 && [...src2][0] !== [...sameSources][0] ? ok('switching source keeps one source') : bad('switch triad');
    // IV: אותו אופן, שלושה מקורות
    const modeIds = await srcOf('.same-mode .ccard');
    const mrows = modeIds.map(id => db.rows.find(x => x.id === decodeURIComponent(id)));
    modeIds.length === 3 && new Set(mrows.map(x => x.source)).size === 3 && mrows.every(x => x.mode === 'illustration') ? ok('same mode, three different sources') : bad('same mode');
    // קרוסלה: כל המקורות באותה קריאה, עם מונה מיקום ו"הקודם"/"הבא"
    await p.locator('[data-carousel]').scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
    const posText = async () => p.locator('[data-carousel-pos]').innerText();
    const p0 = await posText();
    p0.endsWith('מתוך 3 מקורות') ? ok('carousel position: ' + p0) : bad('carousel pos ' + p0);
    if (name === 'mobile') {
      (await p.locator('[data-act=prev]').isDisabled()) && !(await p.locator('[data-act=next]').isDisabled()) ? ok('carousel at start: prev off, next on') : bad('carousel buttons');
      await p.click('[data-act=next]'); await p.waitForTimeout(900);
      (await posText()) !== p0 ? ok('next moves the carousel: ' + await posText()) : bad('next did not move');
      await p.click('[data-act=prev]'); await p.waitForTimeout(900);
      (await posText()) === p0 ? ok('prev returns') : bad('prev ' + await posText());
    } else {
      await p.mouse.move(2, 2); await p.waitForTimeout(500);
      const rows = await p.$$eval('.same-mode .ccard', cs => cs.map(c => Math.round(c.querySelector('.ccard-interp').getBoundingClientRect().top)));
      new Set(rows).size === 1 ? ok('carousel cards aligned row by row') : bad('carousel rows ' + rows);
    }
    await p.locator('[data-same-mode=art]').click(); await p.waitForTimeout(600);
    (await srcOf('.same-mode .ccard')).every(id => db.rows.find(x => x.id === decodeURIComponent(id))?.mode === 'art') ? ok('mode switch') : bad('mode switch');
    // יישור: השורות מתיישרות בין הכרטיסים גם כשהטקסט באורך שונה
    if (name === 'desktop') {
      await p.locator('.same-source').scrollIntoViewIfNeeded(); await p.mouse.move(2, 2); await p.waitForTimeout(600);
      const tops = await p.$$eval('.same-source .ccard', cs => cs.map(c => ['.ccard-interp', '.ccard-when'].map(q => Math.round(c.querySelector(q).getBoundingClientRect().top))));
      const hs2 = await p.$$eval('.same-source .ccard', cs => cs.map(c => Math.round(c.getBoundingClientRect().height)));
      tops.every(t => t[0] === tops[0][0] && t[1] === tops[0][1]) && new Set(hs2).size === 1 ? ok(`cards aligned row by row (${hs2[0]}px)`) : bad('alignment ' + JSON.stringify({ tops, hs2 }));
    }
    (await p.locator('.meridian .tick').count()) === 3 ? ok('meridian showcase cycles 3 projects with images') : bad('ticks ' + await p.locator('.meridian .tick').count());
    const t0 = await p.locator('.meridian-title').innerText();
    await p.locator('.meridian .tick').nth(1).click(); await p.waitForTimeout(900);
    (await p.locator('.meridian-title').innerText()) !== t0 ? ok('tick switches showcase') : bad('tick');
    (await p.locator('.recent-card').count()) === 4 ? ok('recent projects') : bad('recent');
    (await p.locator('.meridian .tick').count()) === 3 ? ok('showcase skips studies without image') : bad('showcase no-image');
    const nav = await p.locator('.topbar').boundingBox(); const top = await p.locator('main').evaluate(e => parseFloat(getComputedStyle(e).paddingTop));
    nav.height <= top + 1 ? ok(`nav ${Math.round(nav.height)} fits slot ${top}`) : bad(`nav ${nav.height} > ${top}`);
    await hs('home');
    await p.screenshot({ path: `${S}/${name}-home.png` });
    await p.screenshot({ path: `${S}/${name}-home-full.png`, fullPage: true });

    // כרטיס ההגדרות מהלוגו
    await p.click('[data-act=settings]'); await p.waitForTimeout(300);
    const card = p.locator('.settings-card');
    const ct = await card.innerText();
    ['העתקת קישור', 'שיחת הפיתוח', 'פרויקט המחקר', 'התקנת האפליקציה', 'cultura-GH', 'musa-generate', 'ANTHROPIC_API_KEY'].every(s => ct.includes(s)) ? ok('settings card: actions + project details') : bad('settings card ' + ct);
    const cb = await card.boundingBox(); cb.x >= 0 && cb.x + cb.width <= vp.width ? ok('card inside viewport') : bad('card overflow');
    await card.locator('[data-testid=copy]').click(); await p.waitForTimeout(200);
    (await p.evaluate(() => navigator.clipboard.readText())).startsWith(U) ? ok('copy link') : bad('copy');
    await p.screenshot({ path: `${S}/${name}-settings.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    (await p.locator('.settings-card').count()) === 0 ? ok('esc closes card') : bad('card open');

    // ניווט בטאבים
    await p.click('.tab:has-text("ארכיון")'); await p.waitForTimeout(900);
    (await p.evaluate(() => location.hash)) === '#archive' && (await p.locator('.project').count()) === 4 ? ok('archive: 4 projects') : bad('archive');
    // כל מקור הוא סדרה של שלוש קריאות, באותו סדר
    const order = await p.locator('.project').nth(1).locator('.study-card .mode-tag').allInnerTexts();
    order.join('|') === 'קריאה 1: לוח חומרים|קריאה 2: המחשה|קריאה 3: מרחב מחודש' ? ok('series in order: readings 1, 2, 3') : bad('order ' + order);
    (await p.locator('.project').nth(1).locator('[data-act=complete]').count()) === 0 && (await p.locator('.project').nth(1).locator('.series-count').innerText()) === 'שלוש הקריאות' ? ok('full series: no extra button') : bad('full series');
    const wab = p.locator('.project').first();
    (await wab.locator('[data-missing]').count()) === 2 && (await wab.locator('[data-act=complete]').allInnerTexts()).join('|') === 'השלמת קריאה 1: לוח חומרים|השלמת קריאה 3: מרחב מחודש' ? ok('missing readings offer completion') : bad('missing ' + await wab.locator('[data-act=complete]').allInnerTexts());
    (await wab.locator('.series-count').innerText()) === '1 מתוך 3 קריאות' ? ok('series count 1 of 3') : bad('count');
    (await wab.locator('[data-study] .frame-empty').innerText()).includes('ממתינה') ? ok('study without image shows waiting frame') : bad('waiting frame');
    (await p.locator('[data-act=add-study]').count()) === 0 ? ok('no "מחקר נוסף" anywhere') : bad('add-study still there');
    await p.click('[data-filter=art]'); await p.waitForTimeout(600);
    (await p.evaluate(() => location.hash)) === '#archive/art' && (await p.locator('.project').count()) === 3 ? ok('filter by reading in url') : bad('filter');
    await p.fill('.search', 'קרנינה'); await p.waitForTimeout(300);
    (await p.locator('.project').count()) === 1 ? ok('search') : bad('search');
    await p.fill('.search', 'אין כזה'); await p.waitForTimeout(300);
    (await p.locator('.state').innerText()).includes('אין מקורות') ? ok('empty search state') : bad('empty');
    await p.fill('.search', ''); await p.click('.chip:has-text("הכול")'); await p.waitForTimeout(500);
    await hs('archive');
    await p.screenshot({ path: `${S}/${name}-archive.png` });

    // מחקר בלי תמונה: פרומפט למידג'רני והשלמת התמונה
    await p.locator('.project').first().locator('[data-study]').first().click(); await p.waitForTimeout(1000);
    await p.click('[data-act=copy-mj]'); await p.waitForTimeout(200);
    const mj = await p.evaluate(() => navigator.clipboard.readText());
    mj.includes('Documentary realism, Professional architecture photography') && mj.includes('--no text, words, writing, frame divisions') ? ok('midjourney prompt with suffix and negatives') : bad('mj ' + mj);
    (await p.locator('[data-act=fill-image] .key-mark').count()) === 1 ? ok('fill image button with key mark') : bad('fill btn');
    await p.screenshot({ path: `${S}/${name}-study-noimage.png` });
    await p.click('[data-act=fill-image]'); await p.waitForTimeout(1200);
    db.calls.at(-1).imageFor === '20000000-0000-4000-8000-000000000001' && (await p.locator('.study-hero-wrap .frame img').count()) === 1 && (await p.locator('[data-act=fill-image]').count()) === 0 ? ok('image completed in place') : bad('fill image');
    await p.click('.tab:has-text("ארכיון")'); await p.waitForTimeout(800);

    // מחקר
    await p.locator('.project').nth(1).locator('.study-card').first().click(); await p.waitForTimeout(1200);
    (await p.evaluate(() => location.hash)).startsWith('#s/') && (await p.locator('.study-title').count()) ? ok('study page opens') : bad('study');
    (await p.locator('.siblings .study-card').count()) === 3 && (await p.locator('.siblings .is-here').count()) === 1 ? ok('study shows its series, itself marked') : bad('siblings');
    (await p.locator('.actions [data-act=complete]').count()) === 0 ? ok('full series: no completion button on study') : bad('complete on full');
    await p.click('[data-act=copy-prompt]'); await p.waitForTimeout(200);
    (await p.evaluate(() => navigator.clipboard.readText())).startsWith('Prompt') ? ok('copy prompt') : bad('copy prompt');
    (await p.locator('.study [data-act=fresh] .key-mark').count()) === 1 ? ok('key mark on fresh') : bad('key mark');
    (await p.locator('.study .prompt').isVisible()) === false ? ok('prompt text hidden inside copy buttons') : bad('prompt visible');
    await p.locator('.prompt-peek summary').click(); await p.waitForTimeout(200);
    (await p.locator('.study .prompt').isVisible()) ? ok('prompt can be revealed') : bad('peek');
    // הדבקת תמונה במסגרת: תצוגה מקדימה, ביטול, ושמירה
    const before = await p.locator('.study-hero-wrap .frame img').getAttribute('src');
    const pasteImg = async () => p.evaluate(async b64 => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bin], 'mj.jpg', { type: 'image/jpeg' }));
      window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, imgs[1].toString('base64'));
    await pasteImg(); await p.waitForTimeout(400);
    (await p.locator('[data-act=save-image]').count()) === 1 && (await p.locator('.study-hero-wrap .frame img').getAttribute('src')).startsWith('blob:') ? ok('paste shows preview in the frame') : bad('paste preview');
    await p.click('[data-act=cancel-image]'); await p.waitForTimeout(300);
    (await p.locator('.study-hero-wrap .frame img').getAttribute('src')) === before && db.pasted.length === 0 ? ok('cancel restores the image') : bad('cancel');
    await p.locator('.paste-frame [data-act=file]').setInputFiles(path.join(IMG, 'room2.jpg')); await p.waitForTimeout(400);
    await p.click('[data-act=save-image]'); await p.waitForTimeout(1500);
    db.pasted.length === 1 && db.pasted[0].type === 'image/jpeg' && db.pasted[0].data.length > 1000 && (await p.locator('.study-hero-wrap .frame img').getAttribute('src')).endsWith('/7.jpg') ? ok('file saved as study image') : bad('save pasted ' + JSON.stringify(db.pasted.map(x => x.type)));
    await p.click('[data-act=older]'); await p.waitForTimeout(800);
    (await p.locator('.study-title').count()) ? ok('pager older') : bad('pager');
    await hs('study');
    await p.screenshot({ path: `${S}/${name}-study.png` });
    await p.screenshot({ path: `${S}/${name}-study-full.png`, fullPage: true });
    // השלמת קריאה חסרה: מדף המחקר של וואבי־סאבי לסטודיו, עם המקור והקריאה הנכונה
    await p.goto(U + '#s/20000000-0000-4000-8000-000000000001'); await p.waitForTimeout(1200);
    (await p.locator('.actions [data-act=complete]').count()) === 2 ? ok('study offers the 2 missing readings') : bad('complete buttons');
    await p.locator('.actions [data-act=complete]').nth(1).click(); await p.waitForTimeout(800);
    (await p.inputValue('[data-act=source]')) === 'וואבי־סאבי' && (await p.locator('[data-mode=art]').getAttribute('aria-checked')) === 'true' ? ok('completion opens studio with source and reading 3') : bad('prefill ' + await p.evaluate(() => location.hash));
    (await p.locator('.done-mark').count()) === 1 ? ok('reading already done is marked') : bad('done marks ' + await p.locator('.done-mark').count());
    await p.click('[data-act=generate]'); await p.waitForTimeout(900);
    const made = db.calls.at(-1);
    made.mode === 'art' && made.source === 'וואבי־סאבי' && made.fresh === false ? ok('reading 3 created for the series') : bad('complete gen');
    // סדרה שלמה: הסטודיו אומר שהיא כבר בארכיון, וגרסה נוספת עדיין אפשרית
    const anna = db.rows.find(x => x.source.startsWith('אנה'));
    await p.goto(U + '#studio/board/' + encodeURIComponent(anna.source)); await p.waitForTimeout(900);
    (await p.locator('[data-note=complete]').count()) === 1 ? ok('full series noted in studio') : bad('complete note');
    await p.click('[data-act=generate]'); await p.waitForTimeout(900);
    db.calls.at(-1).fresh === false && (await p.locator('.out-done .note').count()) === 1 ? ok('cached reading returned with note') : bad('cached');
    const nBefore = db.rows.length;
    await p.click('.out-done [data-act=fresh]'); await p.waitForTimeout(900);
    db.calls.at(-1).fresh === true && db.rows.length === nBefore + 1 ? ok('fresh version created') : bad('fresh');

    // סטודיו: מקור חדש, ממסך נקי
    await p.click('.brand'); await p.waitForTimeout(500);
    await p.click('.tab:has-text("סטודיו")'); await p.waitForTimeout(700);
    (await p.locator('[data-dir]').count()) === 7 ? ok('7 thinking directions') : bad('directions');
    { const seen = []; for (const m of ['board', 'illustration', 'art']) { await p.click(`[data-mode=${m}]`); await p.waitForTimeout(150); seen.push(await p.locator('.out-idle .blueprint').getAttribute('data-blueprint')); }
      seen.join() === 'board,illustration,art' ? ok('each reading has its own drawing') : bad('blueprint ' + seen); }
    await p.locator('[data-dir=music]').click(); await p.waitForTimeout(300);
    (await p.locator('.dir-tip').innerText()).length > 10 && (await p.locator('[data-example]').count()) === 3 ? ok('direction shows tip and 3 examples') : bad('direction body');
    await p.locator('[data-example]').first().click();
    (await p.inputValue('[data-act=source]')).includes('\n') ? ok('example splits work and author') : bad('suggestion');
    await p.fill('[data-act=source]', 'מקור חדש');
    await p.click('[data-mode=art]');
    (await p.locator('[data-act=generate] .key-mark').count()) === 1 ? ok('key mark on generate') : bad('key generate');
    if (name === 'desktop') { const [h1, h2] = await p.$$eval('.studio-grid > .panel', els => els.map(e => Math.round(e.getBoundingClientRect().height))); h1 === h2 ? ok(`studio panels equal height ${h1}`) : bad(`panels ${h1} vs ${h2}`); }
    await p.click('[data-act=generate]'); await p.waitForTimeout(1200);
    const last = db.calls.at(-1);
    last.source === 'מקור חדש' && last.mode === 'art' && (await p.locator('.out-done .interp').innerText()) === 'פרשנות חדשה.' ? ok('new generation shown') : bad('new gen ' + JSON.stringify(last));
    (await p.locator('.out-done [data-act=copy-mj]').count()) === 1 && (await p.locator('.out-done [data-act=pick-image]').count()) === 1 ? ok('result has copy and paste') : bad('result tools');
    await p.screenshot({ path: `${S}/${name}-studio-done.png` });
    await p.click('[data-act=open-study]'); await p.waitForTimeout(900);
    (await p.locator('.study-title').innerText()) === 'מקור חדש' ? ok('new study opens from result') : bad('open new');
    await p.click('.tab:has-text("ארכיון")'); await p.waitForTimeout(800);
    (await p.locator('.project').count()) === 5 && (await p.locator('.project h2').first().innerText()) === 'מקור חדש' ? ok('new project first in archive') : bad('archive after');
    // שגיאה
    db.fail = true;
    await p.click('.tab:has-text("סטודיו")'); await p.waitForTimeout(600);
    await p.fill('[data-act=source]', 'מקור שנכשל'); await p.click('[data-act=generate]'); await p.waitForTimeout(900);
    (await p.locator('.out-error [role=alert]').innerText()).includes('נכשלה') ? ok('error state shown') : bad('error');
    // מצב עבודה
    db.fail = false;
    await p.route(`${SB}/functions/v1/musa-generate`, async r => { await new Promise(res => setTimeout(res, 2500)); r.fallback(); });
    await p.fill('[data-act=source]', 'מקור איטי'); await p.click('[data-act=generate]'); await p.waitForTimeout(600);
    (await p.locator('.process li').count()) === 5 && (await p.locator('[data-act=generate]').isDisabled()) ? ok('working state with process') : bad('working');
    await hs('studio');
    await p.screenshot({ path: `${S}/${name}-studio-working.png` });
    await p.waitForTimeout(2600);
    await p.unroute(`${SB}/functions/v1/musa-generate`);

    // שם האפליקציה מחזיר לשער
    await p.click('.brand'); await p.waitForTimeout(700);
    (await p.locator('.hero-title').count()) ? ok('brand returns home') : bad('brand home');
    // קישור ישיר למחקר שלא קיים
    await p.goto(U + '#s/nope'); await p.waitForTimeout(1200);
    (await p.locator('.state').innerText()).includes('לא נמצא') ? ok('missing study state') : bad('missing');

    const badLog = log.filter(l => /UNMOCKED|AUTHCALL/.test(l));
    badLog.length ? bad(`${name} ${badLog.join(' | ')}`) : ok(`${name} all supabase calls mocked, no auth`);
    errs.length ? bad(`${name} errors: ${errs.join(' / ')}`) : ok(`${name} no console errors`);
    await ctx.close();
  }

  // התקנה: אין שגיאות installability
  const c = await b.newContext(); const p = await c.newPage(); await p.goto(U); await p.waitForTimeout(1500);
  const cdp = await c.newCDPSession(p);
  const r = await cdp.send('Page.getInstallabilityErrors');
  r.installabilityErrors.length === 0 ? ok('installable (no installability errors)') : bad('install ' + JSON.stringify(r.installabilityErrors));
  await c.close();
  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILURES` : '\nALL GREEN');
  process.exit(fails.length ? 1 : 0);
})();

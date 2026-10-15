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
    (await p.locator('.hero-title').count()) && (await p.locator('.steps .step').count()) === 4 && (await p.locator('.mode-card').count()) === 3 ? ok('gate explains: hero, 4 steps, 3 modes') : bad('gate sections');
    (await p.locator('.mode-card .frame img').count()) === 3 ? ok('mode cards show archive samples') : bad('mode samples');
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
    (await p.locator('.project').nth(1).locator('.study-card').count()) === 3 ? ok('project groups 3 studies') : bad('group');
    (await p.locator('.project').first().locator('.frame-empty').innerText()).includes('ממתינה') ? ok('study without image shows waiting frame') : bad('waiting frame');
    await p.click('[data-filter=art]'); await p.waitForTimeout(600);
    (await p.evaluate(() => location.hash)) === '#archive/art' && (await p.locator('.study-card').count()) === 3 ? ok('filter by mode in url') : bad('filter');
    await p.fill('.search', 'קרנינה'); await p.waitForTimeout(300);
    (await p.locator('.project').count()) === 1 ? ok('search') : bad('search');
    await p.fill('.search', 'אין כזה'); await p.waitForTimeout(300);
    (await p.locator('.state').innerText()).includes('אין מחקרים') ? ok('empty search state') : bad('empty');
    await p.fill('.search', ''); await p.click('.chip:has-text("הכול")'); await p.waitForTimeout(500);
    await hs('archive');
    await p.screenshot({ path: `${S}/${name}-archive.png` });

    // מחקר בלי תמונה: פרומפט למידג'רני והשלמת התמונה
    await p.locator('.project').first().locator('.study-card').first().click(); await p.waitForTimeout(1000);
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
    (await p.locator('.siblings .study-card').count()) === 2 ? ok('siblings in project') : bad('siblings');
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
    // מחקר נוסף לפרויקט: לסטודיו עם מקור מוכן
    await p.click('.actions [data-act=add-study]'); await p.waitForTimeout(800);
    const src = await p.inputValue('[data-act=source]');
    (await p.evaluate(() => location.hash)).startsWith('#studio/') && src.length > 2 ? ok('add study prefills studio') : bad('prefill ' + src);
    (await p.locator('.done-mark').count()) === 3 ? ok('modes already in archive marked') : bad('done marks ' + await p.locator('.done-mark').count());

    // סטודיו: מקור קיים מחזיר מהארכיון, ואז גרסה נוספת
    await p.click('[data-mode=board]');
    await p.click('[data-act=generate]'); await p.waitForTimeout(900);
    db.calls.at(-1).fresh === false && (await p.locator('.out-done .note').count()) === 1 ? ok('cached study returned with note') : bad('cached');
    await p.click('.out-done [data-act=fresh]'); await p.waitForTimeout(900);
    db.calls.at(-1).fresh === true && db.rows.length === 11 ? ok('fresh version created') : bad('fresh');

    // סטודיו: מקור חדש
    await p.click('.tab:has-text("סטודיו")'); await p.waitForTimeout(700);
    await p.locator('.chips .chip').first().click();
    (await p.inputValue('[data-act=source]')).includes('\n') ? ok('suggestion splits work and author') : bad('suggestion');
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

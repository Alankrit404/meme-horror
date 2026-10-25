#!/usr/bin/env node
/* ============================================================================
   tools/smoke.js  --  run with:   npm run test:smoke
   ----------------------------------------------------------------------------
   Headless playthrough test for MEME HORRORS: LAWDEN BHOJYAM. It drives the
   real game in Chromium, exercises every consequence flow, prints screenshots
   to /tmp/opencode/shots and exits non-zero when an assertion fails.
   ============================================================================ */
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const SHOTS = process.env.SHOTS_DIR || '/tmp/opencode/shots';

fs.mkdirSync(SHOTS, { recursive: true });

const notes = [];
const fails = [];
const errors = [];

function check(name, cond, extra = '') {
  const suffix = extra === '' || extra == null
    ? ''
    : '  ' + (typeof extra === 'object' ? JSON.stringify(extra) : String(extra));
  const line = (cond ? 'PASS ' : 'FAIL ') + name + suffix;
  console.log((cond ? '\x1b[32m' : '\x1b[31m') + line + '\x1b[0m');
  (cond ? notes : fails).push(name);
}

function findBrowser() {
  const candidates = [];

  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);

  try {
    candidates.push(chromium.executablePath());
  } catch {
    /* playwright-core has no downloaded browser for this revision */
  }

  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) {
    const dirs = fs.readdirSync(cache).sort().reverse();
    for (const dir of dirs) {
      if (dir.startsWith('chromium-')) {
        candidates.push(path.join(cache, dir, 'chrome-linux64', 'chrome'));
        candidates.push(path.join(cache, dir, 'chrome-linux', 'chrome'));
      }
      if (dir.startsWith('chromium_headless_shell-')) {
        candidates.push(path.join(cache, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
        candidates.push(path.join(cache, dir, 'chrome-linux', 'headless_shell'));
      }
    }
  }

  candidates.push(
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  );

  const found = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!found) {
    throw new Error('No Chromium binary found. Set CHROME_PATH or run: npx playwright install chromium');
  }
  return found;
}

async function text(page, selector) {
  return (await page.textContent(selector)) || '';
}

async function run(page) {
  await page.goto(URL);
  await page.waitForTimeout(700);

  check('title screen visible', await page.isVisible('#title'));
  const title = await page.title();
  check('game renamed to MEME HORRORS', title.toUpperCase().includes('MEME HORRORS'), title);
  await page.screenshot({ path: path.join(SHOTS, '00_title.png') });

  // the old title-screen upload slot and in-game asset panel are gone
  check('title-screen image removed', (await page.locator('#title-art').count()) === 0);
  check('all image slots use .jpg',
    await page.evaluate("Object.values(IMAGES).every(i => i.file.endsWith('.jpg'))"));

  // deterministic harness: no ambient random teleports, no chase scramble
  await page.evaluate(
    'CONFIG.teleportMinSec = 99999; CONFIG.teleportMaxSec = 99999; ' +
    'CONFIG.scrambleSeconds = 0; CONFIG.scrambleCooldown = 999999;'
  );
  check('randomized layout is on by default',
    await page.evaluate('CONFIG.randomizeLayout === true'));

  // ---- start the run ----
  await page.click('button[data-act="start"]');
  await page.waitForTimeout(900);
  check('floor 1 intro cutscene', await page.isVisible('#cutscene'),
    await page.evaluate('Game.state'));
  await page.screenshot({ path: path.join(SHOTS, '01_intro.png') });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check('state is PLAY after intro', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));
  check('hud visible', await page.isVisible('#hud'));

  // ---- bigger maps + the modihh / yogi / amit shah cast ----
  check('map is bigger (>= 60x38)',
    await page.evaluate('Game.floor.w >= 60 && Game.floor.h >= 38'),
    await page.evaluate("Game.floor.w + 'x' + Game.floor.h"));
  check('this run generated a fresh seed',
    await page.evaluate('Game.floor.cfg.seed !== Game.floorCfg.seed'),
    await page.evaluate('({base: Game.floorCfg.seed, run: Game.floor.cfg.seed})'));
  const ids = await page.evaluate("Game.enemies.map(e => e.id).sort().join(',')");
  check('floor 1 chasers = modi, yogi, amitshah', ids === 'amitshah,modi,yogi', ids);
  check('5 tokens on floor 1', (await page.evaluate('Game.progress.total')) === 5,
    await page.evaluate('Game.progress'));

  // ---- canvas actually renders something ----
  const frac = await page.evaluate(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return lit / (d.length / 4);
  })()`);
  check('canvas has content', frac > 0.02, `lit=${frac.toFixed(3)}`);

  // ---- walking (net displacement can cancel out, so track the max) ----
  const start = await page.evaluate('({x: Game.player.x, y: Game.player.y})');
  let maxd = 0;
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(450);
    await page.keyboard.up(key);
    const pos = await page.evaluate('({x: Game.player.x, y: Game.player.y})');
    maxd = Math.max(maxd, Math.abs(pos.x - start.x) + Math.abs(pos.y - start.y));
  }
  check('player can walk', maxd > 1.0, `max displacement ${maxd.toFixed(2)} tiles`);
  await page.screenshot({ path: path.join(SHOTS, '02_walking.png') });

  // ---- enemies exist and the AI runs ----
  await page.waitForTimeout(1200);
  const info = await page.evaluate(
    '({n: Game.enemies.length, id: Game.enemies.map(e => e.id), st: Game.enemies.map(e => e.state)})'
  );
  check('chasers spawned', info.n >= 3, info);
  check('enemy ai ticked', info.st.every((s) => s === 'patrol' || s === 'chase'), info.st);

  // ---- locked stairs ----
  await page.evaluate('Game.debug.goto(Game.floor.exit.x, Game.floor.exit.y)');
  await page.waitForTimeout(400);
  check('stairs locked without tokens',
    (await page.evaluate('Game.state')) === 'PLAY' && !(await page.evaluate('Game.isExitOpen()')));

  // ---- checkpoint (away from the exit tile!) ----
  const cp = await page.evaluate(
    "({x: Game.floor.entitiesOfType('checkpoint')[0].x, y: Game.floor.entitiesOfType('checkpoint')[0].y})"
  );
  await page.evaluate(`Game.debug.goto(${cp.x}, ${cp.y})`);
  await page.waitForTimeout(400);
  check('checkpoint saved', await page.evaluate('!!Game.checkpoint'),
    await page.evaluate('Game.checkpoint'));

  // ---- tokens + unlock (stand somewhere neutral) ----
  await page.evaluate('Game.debug.goto(Game.floor.spawn.x, Game.floor.spawn.y)');
  await page.evaluate('Game.debug.tokens()');
  await page.waitForTimeout(300);
  check('all 5 tokens collected', (await page.evaluate('Game.progress.have')) === 5,
    await page.evaluate('Game.progress'));
  check('exit unlocked', await page.evaluate('Game.isExitOpen()'));

  // ---- secret gate ----
  const gate = await page.evaluate('({x: Game.floor.gate.x, y: Game.floor.gate.y})');
  const spot = await page.evaluate(`(() => {
    const g = Game.floor.gate, f = Game.floor;
    const spots = [[g.x + 1, g.y], [g.x - 1, g.y], [g.x, g.y + 1], [g.x, g.y - 1]];
    for (const s of spots) if (f.walkable(s[0], s[1])) return {x: (s[0] + g.x) / 2, y: (s[1] + g.y) / 2};
    return {x: g.x, y: g.y};
  })()`);
  await page.evaluate(`Game.debug.goto(${spot.x}, ${spot.y})`);
  await page.waitForTimeout(350);
  check('secret gate prompt', (await text(page, '#prompt')).includes('SECRET EXIT'),
    await text(page, '#prompt'));
  await page.keyboard.press('e');
  await page.waitForTimeout(400);
  check('secret gate shows photo', await page.isVisible('#photo'),
    await page.evaluate('Game.state'));
  await page.screenshot({ path: path.join(SHOTS, '03_secret_gate.png') });
  await page.waitForTimeout(2800); // photo is 2.5s
  check('rick statue choice modal',
    (await page.isVisible('#modal')) && (await page.isVisible('#modal-choices')),
    await page.evaluate('Game.state'));
  await page.screenshot({ path: path.join(SHOTS, '04_rick.png') });
  // pick "RUN AWAY" (2nd choice) to keep progress
  await page.click('#modal-choices button:nth-child(2)');
  await page.waitForTimeout(400);
  check('gate event closed', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));

  // ---- the gate's "RUN AWAY" gift: NAZAR SHIELD eats one catch ----
  check('shield granted by the safe choice',
    (await page.evaluate('Game.powerups.shield')) === 1,
    await page.evaluate('Game.powerups'));
  await page.evaluate("Game.debug.ready(); Game.powerups.shield = 1; Game.debug.catch('modi')");
  await page.waitForTimeout(400);
  check('shield absorbs the catch',
    (await page.evaluate('Game.powerups.shield')) === 0 &&
    (await page.evaluate('Game.progress.have')) === 5,
    await page.evaluate('Game.powerups'));
  check('no jumpscare when shielded', !(await page.isVisible('#photo')));

  // ---- MODIHH catch: progress reset ----
  await page.evaluate('Game.debug.goto(Game.floor.spawn.x, Game.floor.spawn.y)');
  await page.waitForTimeout(200);
  await page.evaluate("Game.debug.ready(); Game.debug.catch('modi')");
  await page.waitForTimeout(300);
  check('modihh jumpscare photo', await page.isVisible('#photo'));
  await page.screenshot({ path: path.join(SHOTS, '05_modi.png') });
  await page.waitForTimeout(2000);
  check('modihh reset the progress', (await page.evaluate('Game.progress.have')) === 0,
    await page.evaluate('Game.progress'));
  check('modihh never asks a question', !(await page.isVisible('#modal-input')));
  check('state back to PLAY', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));
  check('respawned at checkpoint', await page.evaluate(
    '!!Game.checkpoint && Math.abs(Game.player.x - (Game.checkpoint.x+0.5)) < 1.2 && ' +
    'Math.abs(Game.player.y - (Game.checkpoint.y+0.5)) < 1.2'
  ));

  // ---- YOGI catch: one random question from the grab bank ----
  await page.evaluate('Game.debug.goto(Game.floor.spawn.x, Game.floor.spawn.y)');
  await page.evaluate('Game.debug.tokens()'); // grab all 5 again so a reset is visible
  await page.waitForTimeout(300);
  await page.evaluate("Game.debug.ready(); Game.debug.catch('yogi')");
  await page.waitForTimeout(300);
  check('yogi jumpscare photo', await page.isVisible('#photo'));
  await page.waitForTimeout(1600);
  check('yogi grab-question modal', await page.isVisible('#modal-input'),
    await page.evaluate('Game.state'));
  const yogiQ = (await text(page, '#modal')).toUpperCase();
  const bankMarks = ['YOGI JI KA ROLE', 'DADI HAI GORILLA', 'BHAGWAN KISKA SATH', 'MUSALMANO KA SATH'];
  check('yogi asks a question from his bank', bankMarks.some((k) => yogiQ.includes(k)),
    yogiQ.slice(0, 90));
  check('yogi never asks Amit Shah\'s role', !yogiQ.includes('AMIT SHAH JI KA ROLE'),
    yogiQ.slice(0, 90));
  check('question audio slots exist', await page.evaluate(
    "['sfx_question','line_q_yogi_role','line_q_amit_role','line_q_dadi_gorilla'," +
    "'line_q_bhagwan','line_q_musalman','line_q_air','line_q_painting_1'," +
    "'line_q_painting_2','line_q_painting_3','line_q_painting_4'," +
    "'line_q_boss','line_q_math'].every(id => !!AUDIO_ASSETS[id])"
  ));
  await page.screenshot({ path: path.join(SHOTS, '05b_chalisa.png') });
  await page.fill('#modal-input', 'yogi is a bowler');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('wrong grab answer resets progress',
    (await page.evaluate('Game.progress.have')) === 0,
    await page.evaluate('Game.progress'));
  check('state back to PLAY after chalisa', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));

  // ---- exact role answers (forced via debug so the test is deterministic) ----
  await page.evaluate("Game.debug.ready(); Game.debug.chalisaQ('yogi_role')");
  await page.waitForTimeout(300);
  check('yogi role modal', await page.isVisible('#modal-input'),
    (await text(page, '#modal')).slice(0, 80));
  await page.fill('#modal-input', 'YOGI IS HANUMAN');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('correct yogi role gives the BOOST (shield + chai)',
    (await page.evaluate('Game.powerups.shield')) >= 1 &&
    (await page.evaluate('Game.effects.chai')) > 0,
    await page.evaluate('({s:Game.powerups.shield, c:Game.effects.chai})'));

  // ---- AMIT SHAH's own role -> "angad" ----
  await page.evaluate("Game.debug.ready(); Game.debug.chalisaQ('amit_role', 'amitshah')");
  await page.waitForTimeout(300);
  const amitQ = (await text(page, '#modal')).toUpperCase();
  check('amit shah asks HIS role',
    (await page.isVisible('#modal-input')) && amitQ.includes('AMIT SHAH JI KA ROLE'),
    amitQ.slice(0, 90));
  await page.fill('#modal-input', 'Angad');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('amit shah correct -> boost',
    (await page.evaluate('Game.powerups.shield')) >= 1,
    await page.evaluate('Game.powerups'));

  // ---- the three extra grab questions ----
  const extra = [
    ['dadi_gorilla', 'godzilla', 'dadi / gorilla'],
    ['bhagwan', 'Hindu', 'bhagwan'],
    ['musalman', 'Allah', 'musalman']
  ];
  for (const [qid, answer, label] of extra) {
    const resets0 = await page.evaluate('Game.stats.resets');
    await page.evaluate(`Game.debug.ready(); Game.debug.chalisaQ('${qid}')`);
    await page.waitForTimeout(250);
    check(`extra question modal: ${label}`, await page.isVisible('#modal-input'));
    await page.fill('#modal-input', answer);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    check(`extra question answer accepted: ${label}`,
      (await page.evaluate('Game.stats.resets')) === resets0,
      await page.evaluate('Game.stats.resets'));
  }

  // ---- floor 2: tech team + IITB alumni ----
  await page.evaluate('Game.debug.floor(1)');
  await page.waitForTimeout(500);
  check('floor 2 loaded', (await page.evaluate('Game.floorIndex')) === 1,
    await page.evaluate('Game.floorCfg.name'));
  check('5 tokens on floor 2', (await page.evaluate('Game.progress.total')) === 5,
    await page.evaluate('Game.progress'));
  check('tech team is a lit-up IITB ALUMNI', await page.evaluate(
    "!!Game.enemies.find(e => e.id === 'techteam' && e.tagAlways && e.name === 'IITB ALUMNI')"
  ), await page.evaluate('Game.enemies.map(e => e.name)'));
  await page.screenshot({ path: path.join(SHOTS, '06_floor2.png') });

  // the AIR question must never pre-tell the accepted ranks
  const hintblob = await page.evaluate(
    "Game.floorCfg.objective + ' ' + Game.floorCfg.intro.join(' ')"
  );
  check('AIR ranks never pre-told', !hintblob.includes('247') && !hintblob.includes('42'),
    hintblob.slice(0, 80));

  await page.evaluate('Game.debug.airAsk()');
  await page.waitForTimeout(400);
  check('AIR question modal', await page.isVisible('#modal-input'));
  await page.screenshot({ path: path.join(SHOTS, '07_air.png') });
  await page.fill('#modal-input', '11');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('wrong AIR punishes', !(await page.evaluate('Game.flags.airAnswered')));
  await page.evaluate('Game.debug.airAsk()');
  await page.waitForTimeout(400);
  await page.fill('#modal-input', 'Air 247'); // case + prefix still accepted
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('AIR 247 accepted (case-insensitive)', await page.evaluate('Game.flags.airAnswered'));

  // keyboard must still work after the modal closed (focus regression)
  const px0 = await page.evaluate('Game.player.x');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const px1 = await page.evaluate('Game.player.x');
  check('keys work after modal', Math.abs(px1 - px0) > 0.3,
    `dx=${(px1 - px0).toFixed(2)}`);

  // phone event: side-of-screen PICK UP / CUT while it rings
  check('phone exists', await page.evaluate('Game.debug.phone()'));
  await page.waitForTimeout(350);
  check('phone side prompt visible', await page.isVisible('#phone-call'));
  check('phone prompt offers PICK UP + CUT',
    (await page.isVisible('#pc-pick')) && (await page.isVisible('#pc-cut')));
  await page.screenshot({ path: path.join(SHOTS, '08_phone.png') });
  await page.click('#pc-cut');
  await page.waitForTimeout(400);
  check('CUT closes the side prompt', !(await page.isVisible('#phone-call')));
  check('CUT does not open the scream photo', !(await page.isVisible('#photo')),
    await page.evaluate('Game.state'));
  check('CUT keeps the game running', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));

  await page.evaluate('Game.debug.phone()');
  await page.waitForTimeout(350);
  check('phone rings again', await page.isVisible('#phone-call'));
  await page.click('#pc-pick');
  await page.waitForTimeout(400);
  check('PICK UP opens the scream photo', await page.isVisible('#photo'));
  await page.screenshot({ path: path.join(SHOTS, '08b_phone_pickup.png') });
  await page.waitForTimeout(1900);
  check('phone event ended', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));

  // ---- chase scramble (3s, no countdown shown) ----
  await page.evaluate(
    'Game.debug.ready(); Game.enemies.forEach(e => e.stun(30)); ' +
    'Game.debug.goto(Game.floor.spawn.x, Game.floor.spawn.y)'
  );
  await page.evaluate('CONFIG.scrambleSeconds = 3; Game.debug.scramble()');
  await page.waitForTimeout(150);
  check('controls scramble when a chase starts',
    await page.evaluate('Game.controlScrambleT > 0 && !!Game.controlMap'));
  const acts = await page.evaluate(`(() => {
    Game.input.right = true;
    const v = Game.effectiveInput();
    Game.input.right = false;
    return Object.keys(v).filter(k => v[k]);
  })()`);
  check('scramble rewires the inputs', acts.length === 1 && acts[0] !== 'right',
    `right -> ${acts}`);
  const toastTxt = await text(page, '#toasts');
  check('scramble toast has no countdown',
    toastTxt.includes('SCAMBLED') && !toastTxt.includes('3'), toastTxt);
  await page.waitForTimeout(3400);
  check('scramble ends after 3s',
    await page.evaluate('Game.controlScrambleT === 0 && Game.controlMap === null'));
  await page.evaluate('CONFIG.scrambleSeconds = 0; Game.controlScrambleT = 0; Game.controlMap = null');

  // ---- random teleport (debug trigger) ----
  await page.evaluate('Game.debug.ready()');
  const before = await page.evaluate('({x: Game.player.x, y: Game.player.y})');
  check('teleport works', await page.evaluate('Game.debug.teleport()'));
  const after = await page.evaluate('({x: Game.player.x, y: Game.player.y})');
  const dist = Math.hypot(after.x - before.x, after.y - before.y);
  check('teleport moves the player far away', dist >= 8, `${dist.toFixed(1)} tiles`);
  check('teleport lands on a walkable tile', await page.evaluate(
    'Game.floor.walkable(Math.floor(Game.player.x), Math.floor(Game.player.y))'
  ));

  // ---- tokens run away when you almost grab them ----
  await page.evaluate('Game.enemies.forEach(e => e.stun(30))');
  const tok = await page.evaluate(`(() => {
    const f = Game.floor;
    const all = Game.floor.entitiesOfType('token');
    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      if (t.taken) continue;
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(d => f.walkable(t.x + d[0], t.y + d[1]) && f.tileFree(t.x + d[0], t.y + d[1]));
      if (opts.length >= 2) return {i: i, tileX: t.x + opts[0][0], tileY: t.y + opts[0][1]};
    }
    return null;
  })()`);
  check('found a token to scare', Boolean(tok), tok);
  if (tok) {
    const pos0 = await page.evaluate(
      `(() => { const t = Game.floor.entitiesOfType('token')[${tok.i}]; return [t.x, t.y, t.taken]; })()`
    );
    await page.evaluate(`Game.debug.goto(${tok.tileX}, ${tok.tileY})`);
    await page.waitForTimeout(700);
    const pos1 = await page.evaluate(
      `(() => { const t = Game.floor.entitiesOfType('token')[${tok.i}]; return [t.x, t.y, t.taken]; })()`
    );
    check('token runs away when you almost grab it',
      !pos1[2] && (pos1[0] !== pos0[0] || pos1[1] !== pos0[1]),
      `${JSON.stringify(pos0)} -> ${JSON.stringify(pos1)}`);
    await page.waitForTimeout(3300);
    let stopped = false;
    try {
      await page.waitForFunction(
        `(() => {
          const t = Game.floor.entitiesOfType('token')[${tok.i}];
          return !t || t.taken || t.fleeT === 0;
        })()`,
        null,
        { timeout: 10000 }
      );
      stopped = true;
    } catch {
      stopped = false;
    }
    check('token stops after its run', stopped,
      await page.evaluate(
        `(() => {
          const t = Game.floor.entitiesOfType('token')[${tok.i}];
          return t && {fleeT: t.fleeT, cd: t.fleeCd, taken: t.taken};
        })()`
      ));
  }

  // alec daddy catch
  await page.evaluate("Game.debug.ready(); Game.debug.catch('alakh')");
  await page.waitForTimeout(300);
  check('alec daddy catch photo', await page.isVisible('#photo'));
  await page.waitForTimeout(2000);
  check('alec daddy catch resolved', (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));

  // iitb alumni catch -> math lock, wrong answer path
  await page.evaluate("Game.debug.ready(); Game.debug.catch('techteam')");
  await page.waitForTimeout(2400);
  check('math lock opened', await page.isVisible('#math'));
  await page.screenshot({ path: path.join(SHOTS, '09_math.png') });
  const mathQ = await text(page, '#math-q');
  const m = mathQ.match(/\s*(\d+)\s*([+-])\s*(\d+)/);
  check('math question readable', Boolean(m), mathQ);
  await page.fill('#math-input', '999');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check('wrong math keeps the lock', await page.isVisible('#math'));
  if (!m) throw new Error('math question unreadable: ' + mathQ);
  const a = Number(m[1]);
  const op = m[2];
  const b = Number(m[3]);
  await page.fill('#math-input', String(op === '+' ? a + b : a - b));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('correct math unlocks',
    !(await page.isVisible('#math')) && (await page.evaluate('Game.state')) === 'PLAY',
    await page.evaluate('Game.state'));

  // ---- floor 3: 4 paintings, each with a question ----
  await page.evaluate('Game.debug.floor(2)');
  await page.waitForTimeout(500);
  check('floor 3 loaded', (await page.evaluate('Game.floorIndex')) === 2,
    await page.evaluate('Game.floorCfg.name'));
  check('4 paintings on floor 3', (await page.evaluate('Game.progress.total')) === 4,
    await page.evaluate('Game.progress'));
  await page.screenshot({ path: path.join(SHOTS, '10_floor3.png') });

  // ---- floor 3 music: 6 songs, room track continues through hallways ----
  await page.evaluate('Game.enemies.forEach(e => e.stun(30)); Game.invuln = 99');
  check('6 Bhojpuri song slots', (await page.evaluate('Game.floorCfg.roomSongs.length')) === 6,
    await page.evaluate('Game.floorCfg.roomSongs'));
  check('every room has a song', await page.evaluate('Game.floor.rooms.every(r => !!r.bgm)'));
  check('every painting question has its own audio slot',
    await page.evaluate('Game.floorCfg.quiz.every(q => !!q.audio && !!AUDIO_ASSETS[q.audio])'),
    await page.evaluate('Game.floorCfg.quiz.map(q => q.audio)'));
  const music = await page.evaluate(`(() => {
    const f = Game.floor;
    const rooms = f.rooms.filter(r => r.bgm);
    const a = rooms[0], b = rooms.find(r => r.bgm !== a.bgm);
    let hall = null;
    for (let y = 1; y < f.h - 1 && !hall; y++) {
      for (let x = 1; x < f.w - 1; x++) {
        if (f.walkable(x, y) && !f.roomAt(x, y)) { hall = {x, y}; break; }
      }
    }
    return {a: f.roomCenter(a), aSong: a.bgm, b: f.roomCenter(b), bSong: b.bgm, hall};
  })()`);
  await page.evaluate(`Game.debug.goto(${music.a.x}, ${music.a.y})`);
  await page.waitForTimeout(300);
  check('room starts its Bhojpuri song',
    (await page.evaluate('Game.currentMusic')) === music.aSong,
    await page.evaluate('Game.currentMusic'));
  await page.evaluate(`Game.debug.goto(${music.hall.x}, ${music.hall.y})`);
  await page.waitForTimeout(300);
  check('hallway keeps the room song playing',
    !(await page.evaluate('Game.currentRoom')) &&
    (await page.evaluate('Game.currentMusic')) === music.aSong,
    await page.evaluate('({room: Game.currentRoom, music: Game.currentMusic})'));
  await page.evaluate(`Game.debug.goto(${music.b.x}, ${music.b.y})`);
  await page.waitForTimeout(300);
  check('entering another room changes the song',
    (await page.evaluate('Game.currentMusic')) === music.bSong,
    await page.evaluate(`({want: ${JSON.stringify(music.bSong)}, got: Game.currentMusic})`));

  const ph = await page.evaluate(
    "({x: Game.floor.entitiesOfType('painting')[0].x, y: Game.floor.entitiesOfType('painting')[0].y})"
  );
  await page.evaluate(`Game.debug.goto(${ph.x + 1}, ${ph.y})`);
  await page.waitForTimeout(500);
  check('painting prompt visible', (await text(page, '#prompt')).includes('PAINTING'),
    await text(page, '#prompt'));
  await page.keyboard.press('e');
  await page.waitForTimeout(400);
  check('floor 3 painting shown', await page.isVisible('#photo'));
  await page.screenshot({ path: path.join(SHOTS, '11_photo2s.png') });
  await page.waitForTimeout(1000);
  check('painting only lasts ~2s', await page.isVisible('#photo'));
  await page.waitForTimeout(1400);
  check('painting closed -> question', !(await page.isVisible('#photo')));
  check('painting question modal', await page.isVisible('#modal-input'),
    await page.evaluate('Game.state'));
  await page.screenshot({ path: path.join(SHOTS, '11b_quiz.png') });
  await page.fill('#modal-input', 'THREE'); // painting #1 = "how many people were there?" -> 3
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('painting #1 collected', (await page.evaluate('Game.flags.paintings')) === 1,
    await page.evaluate('Game.flags'));

  // wrong answer on painting #2 -> progress reset
  const ph2 = await page.evaluate(
    "({x: Game.floor.entitiesOfType('painting')[1].x, y: Game.floor.entitiesOfType('painting')[1].y})"
  );
  await page.evaluate(`Game.debug.goto(${ph2.x + 1}, ${ph2.y})`);
  await page.waitForTimeout(400);
  await page.keyboard.press('e');
  await page.waitForTimeout(2400);
  check('painting #2 question', await page.isVisible('#modal-input'));
  await page.fill('#modal-input', 'delhi');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('wrong painting answer resets progress',
    (await page.evaluate('Game.flags.paintings')) === 0,
    await page.evaluate('Game.flags'));

  // ravi run challenge
  await page.evaluate("Game.debug.ready(); Game.debug.catch('ravi')");
  await page.waitForTimeout(2000);
  check('ravi catch forces the run',
    await page.evaluate('!!(Game.challenge && Game.challenge.active)'),
    await page.evaluate('Game.challenge'));
  await page.screenshot({ path: path.join(SHOTS, '12_run.png') });
  // stand still -> progress reset
  await page.waitForTimeout(2200);
  check('standing still fails the run', await page.evaluate('!Game.challenge'),
    await page.evaluate('Game.challenge'));

  // finish the paintings and take the stairs
  await page.evaluate('Game.debug.paintings()');
  await page.waitForTimeout(200);
  check('all paintings collected', (await page.evaluate('Game.flags.paintings')) === 4,
    await page.evaluate('Game.flags'));
  await page.evaluate('Game.debug.goto(Game.floor.exit.x, Game.floor.exit.y)');
  await page.waitForTimeout(500);
  check('floor 3 cleared -> cutscene', await page.isVisible('#cutscene'),
    await page.evaluate('Game.state'));
  await page.screenshot({ path: path.join(SHOTS, '13_clear.png') });

  // ---- final boss ----
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  check('boss modal with question image',
    (await page.isVisible('#modal')) && (await page.isVisible('#modal-input')));
  check('boss question image loads', await page.evaluate(`(() => {
    const i = document.querySelector('#modal-imgwrap img');
    return !!i && i.naturalWidth > 0;
  })()`));
  check('configured final answer accepted',
    await page.evaluate("Game.matchAnswer('2520', BOSS.answers)"));
  await page.screenshot({ path: path.join(SHOTS, '14_boss.png') });

  // set a test answer so the wrong-answer path can be tested
  await page.evaluate("BOSS.answers = ['Lawden Bhojyam']");

  // switching tabs during the FINAL QUESTION -> DUCK YOU
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);
  await page.waitForTimeout(400);
  check('DUCK YOU on tab switch during the final question',
    await page.isVisible('#duckyou'));
  await page.screenshot({ path: path.join(SHOTS, '14b_duckyou.png') });
  await page.waitForTimeout(3400);
  check('duck overlay clears', !(await page.isVisible('#duckyou')));

  // wrong answer -> "Isliye bombay nhi mila"
  await page.fill('#modal-input', 'isliye bombay');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  check('wrong boss answer says ISLIYE BOMBAY NHI MILA',
    (await text(page, '#toasts')).toUpperCase().includes('ISLIYE BOMBAY NHI MILA'),
    await text(page, '#toasts'));
  check('boss attempt used up', (await page.evaluate('Game.bossAttempts')) === 2,
    await page.evaluate('Game.bossAttempts'));

  // correct answer, typed with wrong case + punctuation
  await page.waitForTimeout(1200);
  await page.fill('#modal-input', 'LAWDEN BHOJYAM!!');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('win panel shown',
    (await page.isVisible('#panel')) &&
    (await text(page, '#panel-title')).toUpperCase().includes('TOP'),
    await text(page, '#panel-title'));
  await page.screenshot({ path: path.join(SHOTS, '15_win.png') });

  // ---- back to the cleaned-up title screen ----
  await page.click('#panel-actions button:nth-child(2)');
  await page.waitForTimeout(500);
  check('back to title', await page.isVisible('#title'),
    await page.evaluate('Game.state'));
  check('audio/photo setup removed',
    (await page.locator('button[data-act="setup"]').count()) === 0);
  await page.screenshot({ path: path.join(SHOTS, '16_title_clean.png') });
}

async function main() {
  const executablePath = findBrowser();
  console.log('Chromium:', executablePath);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console.' + msg.type() + ': ' + msg.text());
  });

  try {
    await run(page);
  } catch (err) {
    fails.push('EXCEPTION: ' + (err && err.stack ? err.stack : String(err)));
    await page.screenshot({ path: path.join(SHOTS, '99_crash.png') }).catch(() => {});
    console.error('\x1b[31mEXCEPTION\x1b[0m', err);
  } finally {
    await browser.close();
  }

  console.log('\n--- console/page errors ---');
  if (errors.length) {
    for (const error of errors) console.log('  ' + error);
  } else {
    console.log('  none');
  }

  console.log(`\n${notes.length} passed, ${fails.length} failed`);
  for (const fail of fails) console.log('  \x1b[31mFAILED:\x1b[0m ' + fail);
  console.log('screenshots in ' + SHOTS);

  process.exitCode = fails.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});

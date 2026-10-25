/* ============================================================================
   tools/check.js  --  run with:   deno run --allow-read tools/check.js
   ----------------------------------------------------------------------------
   1. syntax-checks every js file
   2. generates every floor and validates reachability / placement
   3. cross-checks every audio + image id used in code against the manifests
   ============================================================================ */
'use strict';

const ROOT = new URL('..', import.meta.url).pathname;
const files = ['js/assets.js', 'js/audio.js', 'js/dungeon.js', 'js/entities.js', 'js/ui.js', 'js/game.js'];

let failures = 0;
const ok = (m) => console.log('  \x1b[32mOK\x1b[0m   ' + m);
const bad = (m) => { failures++; console.log('  \x1b[31mFAIL\x1b[0m ' + m); };

/* ---------- 1. syntax ---------- */
console.log('\n[1] syntax');
const sources = {};
for (const f of files) {
  const src = Deno.readTextFileSync(ROOT + f);
  sources[f] = src;
  try {
    new Function(src);          // parse only, do not execute
    ok(f);
  } catch (e) {
    bad(f + ' -> ' + e.message);
  }
}

/* ---------- 2. load the data/logic files in a sandbox ---------- */
console.log('\n[2] data + dungeon');
const sandbox = {};
try {
  const holder = {};
  const data = new Function('module', 'exports', 'window',
    sources['js/assets.js'] + '\nreturn { CONFIG, AUDIO_ASSETS, IMAGES, BOSS, FLOORS, CHALISA };')(holder, holder, {});
  Object.assign(sandbox, data);
  ok('assets.js loaded (' + Object.keys(sandbox.AUDIO_ASSETS).length + ' sounds, ' + Object.keys(sandbox.IMAGES).length + ' images, ' + sandbox.FLOORS.length + ' floors)');
} catch (e) { bad('assets.js load: ' + e.message); }

let Dungeon = null;
try {
  Dungeon = new Function(sources['js/dungeon.js'] + '\nreturn Dungeon;')();
  ok('dungeon.js loaded');
} catch (e) { bad('dungeon.js load: ' + e.message); }

let Entities = null;
try {
  Entities = new Function(sources['js/entities.js'] + '\nreturn Entities;')();
  ok('entities.js loaded (' + Object.keys(Entities.PAL).length + ' sprite palettes)');
} catch (e) { bad('entities.js load: ' + e.message); }

// the AIR answers must never be revealed anywhere the player can read
if (/247 or 42/.test(sources['js/game.js'])) bad('game.js still pre-tells the AIR codes ("247 or 42")');
else ok('AIR codes are not pre-told in game.js');

if (Dungeon && sandbox.FLOORS) {
  const T = Dungeon.T;
  for (let i = 0; i < sandbox.FLOORS.length; i++) {
    const cfg = sandbox.FLOORS[i];
    const f = Dungeon.generateFloor(cfg);
    const label = 'floor ' + cfg.id + ' seed ' + cfg.seed + ' (attempt ' + f.attempt + ')';
    if (!f) { bad(label + ' -> generation returned nothing'); continue; }
    const problems = [];
    const reach = f.reachMap(f.spawn.x, f.spawn.y);
    if (!f.walkable(f.spawn.x, f.spawn.y)) problems.push('spawn is a wall');
    if (!f.isReachableFrom(reach, f.exit.x, f.exit.y)) problems.push('exit unreachable');
    const tokens = f.entitiesOfType('token');
    const paintings = f.entitiesOfType('painting');
    const cps = f.entitiesOfType('checkpoint');
    const phones = f.entitiesOfType('phone');
    const terms = f.entitiesOfType('terminal');
    const powers = f.entitiesOfType('powerup');
    if (tokens.length !== cfg.tokens) problems.push('tokens ' + tokens.length + ' != ' + cfg.tokens);
    if (paintings.length !== cfg.paintings) problems.push('paintings ' + paintings.length + ' != ' + cfg.paintings);
    if (cfg.quiz) {
      if (cfg.paintings && cfg.quiz.length < cfg.paintings) problems.push('fewer quiz questions than paintings');
      for (const q of cfg.quiz) {
        if (!q.audio) problems.push('quiz question has no audio slot: ' + q.q);
        else if (!sandbox.AUDIO_ASSETS || !sandbox.AUDIO_ASSETS[q.audio]) problems.push('quiz audio missing: ' + q.audio);
      }
    }
    if (cps.length !== cfg.checkpoints) problems.push('checkpoints ' + cps.length + ' != ' + cfg.checkpoints);
    if (!cfg.paintings && cfg.tokens < 5) problems.push('only ' + cfg.tokens + ' tokens (the design asks for 5)');
    if (cfg.width < 60 || cfg.height < 38) problems.push('map is not "bigger" yet (' + cfg.width + 'x' + cfg.height + ')');
    if (cfg.id === 2 && (cfg.objective.includes('247') || /(^|[^0-9])42([^0-9]|$)/.test(cfg.objective))) {
      problems.push('floor 2 objective reveals an accepted AIR');
    }
    (cfg.enemies || []).forEach(function (def) {
      const sprite = def.sprite || def.id;
      if (Entities && !Entities.PAL[sprite]) problems.push('enemy ' + def.id + ' uses unknown sprite "' + sprite + '"');
      if (sources['js/game.js'].indexOf("consequence === '" + def.consequence + "'") < 0) {
        problems.push('enemy ' + def.id + ' consequence "' + def.consequence + '" has no handler in game.js');
      }
    });
    if (phones.length !== cfg.phones) problems.push('phones ' + phones.length + ' != ' + cfg.phones);
    if (terms.length !== cfg.terminals) problems.push('terminals ' + terms.length + ' != ' + cfg.terminals);
    if (powers.length !== cfg.powerups) problems.push('powerups ' + powers.length + ' != ' + cfg.powerups);
    for (const e of f.entities) {
      if (!f.walkable(e.x, e.y)) problems.push('entity ' + e.type + ' sits on a wall');
      if (!f.isReachableFrom(reach, e.x, e.y)) problems.push('entity ' + e.type + ' unreachable');
    }
    if (cfg.gate && !f.gate) problems.push('no secret gate placed');
    if (f.gate) {
      const g = f.gate;
      const adj = f.walkable(g.x + 1, g.y) || f.walkable(g.x - 1, g.y) || f.walkable(g.x, g.y + 1) || f.walkable(g.x, g.y - 1);
      if (!adj) problems.push('gate has no walkable neighbour');
      else if (!f.isReachableFrom(reach, g.x, g.y + 1) && !f.isReachableFrom(reach, g.x, g.y - 1) &&
               !f.isReachableFrom(reach, g.x + 1, g.y) && !f.isReachableFrom(reach, g.x - 1, g.y)) problems.push('gate not reachable');
    }
    if (f.enemySpawns.length !== cfg.enemies.length) problems.push('enemy spawns ' + f.enemySpawns.length + ' != ' + cfg.enemies.length);
    for (const e of f.enemySpawns) {
      const path = f.bfs(f.spawn.x, f.spawn.y, e.x, e.y);
      if (!path) problems.push('enemy ' + e.def.id + ' unreachable');
      else if (path.length < 8) problems.push('enemy ' + e.def.id + ' spawns too close (' + path.length + ' tiles)');
    }
    if (cfg.raids) {
      const raidRooms = f.rooms.filter((r) => r.raid);
      if (raidRooms.length !== cfg.raids) problems.push('raid rooms ' + raidRooms.length + ' != ' + cfg.raids);
    }
    if (cfg.roomSongs) {
      if (cfg.roomSongs.length !== 6) problems.push('room song slots ' + cfg.roomSongs.length + ' != 6');
      for (const id of cfg.roomSongs) {
        if (!sandbox.AUDIO_ASSETS || !sandbox.AUDIO_ASSETS[id]) problems.push('room song not in AUDIO_ASSETS: ' + id);
      }
      const missing = f.rooms.filter((r) => !r.bgm);
      if (missing.length) problems.push('rooms without a song: ' + missing.length);
    }
    problems.length ? bad(label + ' -> ' + problems.join(' | '))
                    : ok(label + ' -> ' + f.rooms.length + ' rooms, ' +
                        (tokens.length + paintings.length) + ' objectives, ' + cps.length + ' checkpoints' +
                        (f.gate ? ', gate@' + f.gate.x + ',' + f.gate.y : ''));
  }
}

/* ---------- 2b. grab-question bank ---------- */
if (sandbox.CHALISA && sandbox.CHALISA.questions) {
  const qs = sandbox.CHALISA.questions;
  const ids = new Set(qs.map((q) => q.id));
  if (ids.size !== qs.length) bad('CHALISA question ids are not unique');
  for (const q of qs) {
    if (!q.q || !q.answers || !q.answers.length) bad('CHALISA question missing text/answers: ' + q.id);
    if (!q.audio || !sandbox.AUDIO_ASSETS[q.audio]) bad('CHALISA question audio missing from manifest: ' + q.id + ' -> ' + q.audio);
    if (!['yogi', 'amitshah', 'any'].includes(q.asker)) bad('CHALISA question has bad asker: ' + q.id);
  }
  const role = (id) => qs.find((q) => q.id === id);
  if (!role('yogi_role') || !role('yogi_role').answers.includes('hanuman')) bad('yogi role answer must be hanuman');
  if (!role('amit_role') || !role('amit_role').answers.includes('angad')) bad('amit role answer must be angad');
  for (const id of ['dadi_gorilla', 'bhagwan', 'musalman']) {
    if (!role(id)) bad('extra grab question missing: ' + id);
  }
  if (!role('dadi_gorilla') || !role('dadi_gorilla').answers.includes('godzilla')) {
    bad('dadi gorilla answer must be godzilla');
  }
  for (const id of ['line_q_air', 'line_q_boss', 'line_q_math']) {
    if (!sandbox.AUDIO_ASSETS || !sandbox.AUDIO_ASSETS[id]) bad('question audio missing from manifest: ' + id);
  }
  ok('CHALISA bank: ' + qs.length + ' questions (' + qs.filter((q) => q.asker === 'any').length + ' shared + 2 role)');
}

/* ---------- 3. id cross-check ---------- */
console.log('\n[3] asset id cross-check');
if (sandbox.IMAGES) {
  const notJpg = Object.entries(sandbox.IMAGES).filter(([, d]) => !/\.jpg$/i.test(d.file));
  for (const [id, d] of notJpg) bad('image slot ' + id + ' is not .jpg: ' + d.file);
  if (!notJpg.length) ok('all ' + Object.keys(sandbox.IMAGES).length + ' image slots use .jpg');
  try {
    const stray = [...Deno.readDirSync(ROOT + 'assets/images')]
      .filter((e) => e.isFile && /\.(png|webp|gif|bmp|tif|tiff|avif)$/i.test(e.name));
    for (const e of stray) bad('non-jpg image in assets/images: ' + e.name);
    if (!stray.length) ok('assets/images contains only .jpg images');
  } catch (e) { bad('could not scan assets/images: ' + e.message); }
}
if (sandbox.AUDIO_ASSETS) {
  const codeFiles = ['js/game.js', 'js/ui.js', 'js/audio.js', 'js/assets.js'];
  const used = new Set();
  const re = /['"]([a-z0-9_]+)['"]/g;
  for (const f of codeFiles) {
    let m;
    const src = sources[f];
    while ((m = re.exec(src))) {
      const id = m[1];
      if (/^(bgm_|sfx_|line_|bhojpuri_|img_)/.test(id)) used.add(id);
    }
  }
  for (const id of used) {
    if (id.endsWith('_')) continue;   // string prefix like 'bhojpuri_room_' + n
    if (sandbox.AUDIO_ASSETS[id] || sandbox.IMAGES[id]) ok('id exists: ' + id);
    else bad('id used in code but missing from manifest: ' + id);
  }
  // referenced-but-unused is only a warning
  const unused = [];
  for (const id in sandbox.AUDIO_ASSETS) if (!used.has(id)) unused.push(id);
  for (const id in sandbox.IMAGES) if (!used.has(id)) unused.push(id);
  if (unused.length) console.log('  \x1b[33mWARN\x1b[0m defined but never referenced: ' + unused.join(', '));
}

/* ---------- 4. ascii preview of floor 1 ---------- */
if (Dungeon && sandbox.FLOORS) {
  console.log('\n[4] preview of floor 1 (S spawn, X exit, # wall, + pillar, G gate, o token, A painting, c checkpoint, p powerup)');
  const T = Dungeon.T;
  const f = Dungeon.generateFloor(sandbox.FLOORS[0]);
  const marks = {};
  f.entities.forEach((e) => {
    marks[e.x + ',' + e.y] = e.type === 'token' ? 'o' : e.type === 'painting' ? 'A'
      : e.type === 'checkpoint' ? 'c' : e.type === 'powerup' ? 'p' : e.type[0];
  });
  f.enemySpawns.forEach((e) => { marks[e.x + ',' + e.y] = 'E'; });
  let out = '';
  for (let y = 0; y < f.h; y++) {
    let line = '';
    for (let x = 0; x < f.w; x++) {
      const t = f.get(x, y);
      let ch = t === T.WALL ? '#' : t === T.PILLAR ? '+' : t === T.GATE ? 'G' : t === T.EXIT ? 'X' : '.';
      if (x === f.spawn.x && y === f.spawn.y) ch = 'S';
      if (marks[x + ',' + y]) ch = marks[x + ',' + y];
      line += ch;
    }
    out += line + '\n';
  }
  console.log(out);
}

console.log(failures ? '\n\x1b[31m' + failures + ' problem(s)\x1b[0m\n' : '\n\x1b[32mall checks passed\x1b[0m\n');
if (failures) Deno.exit(1);

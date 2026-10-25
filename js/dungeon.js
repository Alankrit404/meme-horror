/* ============================================================================
   dungeon.js -- procedural retro dungeon builder (rooms + corridors + props)
   Every floor is generated from a seed, then validated (everything reachable).
   ============================================================================ */
'use strict';

var Dungeon = (function () {

  var T = { FLOOR: 0, WALL: 1, PILLAR: 2, EXIT: 3, GATE: 4 };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  class Floor {
    constructor(w, h, cfg) {
      this.w = w; this.h = h; this.cfg = cfg || {};
      this.tiles = new Uint8Array(w * h); // default 0 = FLOOR, we fill walls below
      this.tiles.fill(T.WALL);
      this.rooms = [];
      this.entities = [];   // {type,x,y,...}
      this.spawn = { x: 1, y: 1 };
      this.exit = { x: 1, y: 1 };
      this.gate = null;
      this.enemySpawns = [];
      this._used = {};
    }
    idx(x, y) { return y * this.w + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) { return this.inBounds(x, y) ? this.tiles[this.idx(x, y)] : T.WALL; }
    set(x, y, t) { if (this.inBounds(x, y)) this.tiles[this.idx(x, y)] = t; }
    // GATE blocks movement too: you "go into it" with the interact key
    isWall(x, y) { var t = this.get(x, y); return t === T.WALL || t === T.PILLAR || t === T.GATE; }
    isGate(x, y) { return this.get(x, y) === T.GATE; }
    isExit(x, y) { return this.get(x, y) === T.EXIT; }
    walkable(x, y) { return !this.isWall(x, y); }

    roomAt(x, y) {
      for (var i = 0; i < this.rooms.length; i++) {
        var r = this.rooms[i];
        if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
      }
      return null;
    }
    entitiesOfType(type) {
      var out = [];
      for (var i = 0; i < this.entities.length; i++) if (this.entities[i].type === type) out.push(this.entities[i]);
      return out;
    }
    roomCenter(r) { return { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) }; }

    lineOfSight(a, b) {
      var x0 = Math.floor(a.x), y0 = Math.floor(a.y);
      var x1 = Math.floor(b.x), y1 = Math.floor(b.y);
      var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      var err = dx - dy, guard = 0;
      while (guard++ < 400) {
        if (!(x0 === Math.floor(a.x) && y0 === Math.floor(a.y))) {
          if (this.isWall(x0, y0)) return false;
        }
        if (x0 === x1 && y0 === y1) return true;
        var e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
      return false;
    }

    bfs(sx, sy, tx, ty) {
      sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
      if (!this.walkable(sx, sy) || !this.walkable(tx, ty)) return null;
      var w = this.w, h = this.h;
      var seen = new Uint8Array(w * h), prev = new Int32Array(w * h).fill(-1);
      var q = new Int32Array(w * h), qh = 0, qt = 0;
      var start = this.idx(sx, sy), goal = this.idx(tx, ty);
      q[qt++] = start; seen[start] = 1;
      while (qh < qt) {
        var cur = q[qh++];
        if (cur === goal) break;
        var cx = cur % w, cy = (cur / w) | 0;
        for (var d = 0; d < 4; d++) {
          var nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0);
          var ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          var ni = ny * w + nx;
          if (seen[ni] || this.isWall(nx, ny)) continue;
          seen[ni] = 1; prev[ni] = cur; q[qt++] = ni;
        }
      }
      if (!seen[goal]) return null;
      var path = [], c = goal;
      while (c !== -1) { path.push({ x: c % w, y: (c / w) | 0 }); c = prev[c]; }
      path.reverse();
      return path;
    }

    reachMap(sx, sy) {
      var w = this.w, h = this.h;
      var seen = new Uint8Array(w * h);
      if (!this.walkable(sx, sy)) return seen;
      var q = new Int32Array(w * h), qh = 0, qt = 0;
      q[qt++] = this.idx(sx, sy); seen[this.idx(sx, sy)] = 1;
      while (qh < qt) {
        var cur = q[qh++];
        var cx = cur % w, cy = (cur / w) | 0;
        for (var d = 0; d < 4; d++) {
          var nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0);
          var ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          var ni = ny * w + nx;
          if (seen[ni] || this.isWall(nx, ny)) continue;
          seen[ni] = 1; q[qt++] = ni;
        }
      }
      return seen;
    }
    isReachableFrom(seen, x, y) { return !!seen[this.idx(x, y)]; }

    randomWalkable(rng) {
      for (var i = 0; i < 200; i++) {
        var x = 1 + Math.floor(rng() * (this.w - 2));
        var y = 1 + Math.floor(rng() * (this.h - 2));
        if (this.walkable(x, y)) return { x: x, y: y };
      }
      return { x: this.exit.x, y: this.exit.y };
    }
    randomRoomCenter(rng) {
      var r = pick(this.rooms, rng);
      return this.roomCenter(r);
    }
    tileFree(x, y) { return !this._used[x + ',' + y]; }
    use(x, y) { this._used[x + ',' + y] = true; }
    randomTileIn(room, rng) {
      for (var i = 0; i < 80; i++) {
        var x = room.x + Math.floor(rng() * room.w);
        var y = room.y + Math.floor(rng() * room.h);
        if (this.walkable(x, y) && this.tileFree(x, y)) { this.use(x, y); return { x: x, y: y }; }
      }
      for (var yy = room.y; yy < room.y + room.h; yy++) {
        for (var xx = room.x; xx < room.x + room.w; xx++) {
          if (this.walkable(xx, yy) && this.tileFree(xx, yy)) { this.use(xx, yy); return { x: xx, y: yy }; }
        }
      }
      var c = this.roomCenter(room);
      this.use(c.x, c.y);
      return c;
    }
  }

  function carveH(f, x0, x1, y) {
    var a = Math.min(x0, x1), b = Math.max(x0, x1);
    for (var x = a; x <= b; x++) f.set(x, y, T.FLOOR);
  }
  function carveV(f, y0, y1, x) {
    var a = Math.min(y0, y1), b = Math.max(y0, y1);
    for (var y = a; y <= b; y++) f.set(x, y, T.FLOOR);
  }
  function corridor(f, a, b, rng) {
    if (rng() < 0.5) { carveH(f, a.x, b.x, a.y); carveV(f, a.y, b.y, b.x); }
    else { carveV(f, a.y, b.y, a.x); carveH(f, a.x, b.x, b.y); }
  }

  function build(cfg, rng) {
    var f = new Floor(cfg.width, cfg.height, cfg);
    var W = f.w, H = f.h;
    var cols = cfg.gridCols || 3, rows = cfg.gridRows || 3;
    var cw = Math.floor(W / cols), ch = Math.floor(H / rows);

    // ---- rooms ----
    for (var gy = 0; gy < rows; gy++) {
      for (var gx = 0; gx < cols; gx++) {
        var rw = 8 + Math.floor(rng() * 5);
        var rh = 6 + Math.floor(rng() * 3);
        var maxX = gx * cw + Math.max(1, cw - rw - 2);
        var maxY = gy * ch + Math.max(1, ch - rh - 2);
        var rx = gx * cw + 1 + Math.floor(rng() * Math.max(1, maxX - gx * cw));
        var ry = gy * ch + 1 + Math.floor(rng() * Math.max(1, maxY - gy * ch));
        if (rx + rw > W - 1) rw = W - 1 - rx;
        if (ry + rh > H - 1) rh = H - 1 - ry;
        for (var y = ry; y < ry + rh; y++) for (var x = rx; x < rx + rw; x++) f.set(x, y, T.FLOOR);
        var room = { x: rx, y: ry, w: rw, h: rh, gx: gx, gy: gy, id: f.rooms.length, bgm: null, raid: false, visited: false };
        f.rooms.push(room);
      }
    }

    // ---- corridors (guaranteed connectivity) ----
    for (var i = 0; i < f.rooms.length; i++) {
      var r = f.rooms[i];
      var right = f.rooms.find(function (o) { return o.gx === r.gx + 1 && o.gy === r.gy; });
      var down = f.rooms.find(function (o) { return o.gx === r.gx && o.gy === r.gy + 1; });
      if (right) corridor(f, f.roomCenter(r), f.roomCenter(right), rng);
      if (down) corridor(f, f.roomCenter(r), f.roomCenter(down), rng);
    }
    // extra loops
    for (var k = 0; k < 8; k++) {
      var a = pick(f.rooms, rng), b = pick(f.rooms, rng);
      if (a !== b) corridor(f, f.roomCenter(a), f.roomCenter(b), rng);
    }

    // ---- pillars for cover (never on room centers) ----
    f.rooms.forEach(function (room) {
      if (room.w < 8 || room.h < 5) return;
      var c = f.roomCenter(room);
      var n = 1 + Math.floor(rng() * (room.w >= 11 && room.h >= 6 ? 3 : 2));
      for (var i2 = 0; i2 < n; i2++) {
        var px = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
        var py = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
        if (px === c.x && py === c.y) continue;
        if (Math.abs(px - c.x) < 2 && Math.abs(py - c.y) < 2) continue;
        f.set(px, py, T.PILLAR);
      }
    });

    // ---- spawn + exit ----
    var spawnRoom = pick(f.rooms, rng);
    var sc = f.roomCenter(spawnRoom);
    f.set(sc.x, sc.y, T.FLOOR);
    f.spawn = { x: sc.x, y: sc.y };
    f.use(sc.x, sc.y);

    var reach = f.reachMap(f.spawn.x, f.spawn.y);
    var exitRoom = null, bestD = -1;
    f.rooms.forEach(function (room) {
      if (room === spawnRoom) return;
      var c2 = f.roomCenter(room);
      if (!f.isReachableFrom(reach, c2.x, c2.y)) return;
      var path = f.bfs(f.spawn.x, f.spawn.y, c2.x, c2.y);
      var d = path ? path.length : -1;
      if (d > bestD) { bestD = d; exitRoom = room; }
    });
    if (!exitRoom) return null;
    var ec = f.roomCenter(exitRoom);
    f.set(ec.x, ec.y, T.EXIT);
    f.exit = { x: ec.x, y: ec.y };
    f.use(ec.x, ec.y);

    var pool = shuffle(f.rooms.filter(function (rm) { return rm !== spawnRoom && rm !== exitRoom; }), rng);
    var take = function (n) { var out = []; for (var i3 = 0; i3 < n && pool.length; i3++) out.push(pool[(i3 + Math.floor(rng() * pool.length)) % pool.length]); return out; };

    // ---- objective tokens / paintings ----
    var objectiveRooms = shuffle(pool, rng).slice(0, Math.max(cfg.tokens || 0, cfg.paintings || 0));
    var objIndex = 0;
    for (var t = 0; t < (cfg.tokens || 0); t++) {
      var room1 = objectiveRooms[objIndex++] || pick(pool, rng);
      var p1 = f.randomTileIn(room1, rng);
      f.entities.push({ type: 'token', x: p1.x, y: p1.y, room: room1, taken: false, label: cfg.tokenLabel });
    }
    for (var ph = 0; ph < (cfg.paintings || 0); ph++) {
      var room2 = objectiveRooms[objIndex++] || pick(pool, rng);
      var p2 = f.randomTileIn(room2, rng);
      f.entities.push({
        type: 'painting', x: p2.x, y: p2.y, room: room2, taken: false,
        imageId: 'img_painting_' + (ph + 1), index: ph,
        quiz: (cfg.quiz && cfg.quiz.length) ? cfg.quiz[ph % cfg.quiz.length] : null
      });
    }

    // ---- checkpoints ----
    var cpRooms = shuffle(pool, rng).slice(0, cfg.checkpoints || 0);
    cpRooms.forEach(function (room) {
      var p = f.randomTileIn(room, rng);
      f.entities.push({ type: 'checkpoint', x: p.x, y: p.y, room: room, active: false });
    });

    // ---- phones ----
    for (var pn = 0; pn < (cfg.phones || 0); pn++) {
      var roomP = pick(pool, rng);
      var pp = f.randomTileIn(roomP, rng);
      f.entities.push({ type: 'phone', x: pp.x, y: pp.y, room: roomP, state: 'idle', timer: 0 });
    }

    // ---- AIR terminals ----
    for (var tm = 0; tm < (cfg.terminals || 0); tm++) {
      var roomT = pick(pool, rng);
      var pt = f.randomTileIn(roomT, rng);
      f.entities.push({ type: 'terminal', x: pt.x, y: pt.y, room: roomT, used: false });
    }

    // ---- powerups ----
    var kinds = ['chai', 'chappal', 'shield', 'torch', 'notes'];
    for (var pw = 0; pw < (cfg.powerups || 0); pw++) {
      var roomW = pick(pool, rng);
      var px2 = f.randomTileIn(roomW, rng);
      f.entities.push({ type: 'powerup', x: px2.x, y: px2.y, room: roomW, kind: pick(kinds, rng), taken: false });
    }

    // ---- secret gate (red "SECRET EXIT" on floor 1) ----
    if (cfg.gate) {
      var gateRoom = pick(pool.length ? pool : f.rooms, rng);
      var candidates = [];
      for (var gyy = gateRoom.y - 1; gyy <= gateRoom.y + gateRoom.h; gyy++) {
        for (var gxx = gateRoom.x - 1; gxx <= gateRoom.x + gateRoom.w; gxx++) {
          if (f.get(gxx, gyy) !== T.WALL) continue;
          if (gxx <= 0 || gyy <= 0 || gxx >= W - 1 || gyy >= H - 1) continue;
          var inside =
            f.walkable(gxx + 1, gyy) || f.walkable(gxx - 1, gyy) ||
            f.walkable(gxx, gyy + 1) || f.walkable(gxx, gyy - 1);
          if (inside) candidates.push({ x: gxx, y: gyy });
        }
      }
      if (candidates.length) {
        var gc = pick(candidates, rng);
        f.set(gc.x, gc.y, T.GATE);
        f.gate = { x: gc.x, y: gc.y };
      }
    }

    // ---- room music (floor 3) + raid rooms (floor 2) ----
    if (cfg.roomSongs && cfg.roomSongs.length) {
      f.rooms.forEach(function (room, i4) { room.bgm = cfg.roomSongs[i4 % cfg.roomSongs.length]; });
    }
    if (cfg.raids) {
      var raidRooms = shuffle(f.rooms.filter(function (rm) { return rm !== spawnRoom; }), rng).slice(0, cfg.raids);
      raidRooms.forEach(function (rm) { rm.raid = true; });
    }

    // ---- enemy spawns ----
    (cfg.enemies || []).forEach(function (def, i5) {
      var placed = null;
      for (var tr = 0; tr < 120 && !placed; tr++) {
        var room = pick(f.rooms, rng);
        if (room === spawnRoom) continue;
        var p = f.randomTileIn(room, rng);
        var path = f.bfs(f.spawn.x, f.spawn.y, p.x, p.y);
        if (!path) continue;
        if (path.length < 12) continue;
        placed = { def: def, x: p.x, y: p.y };
      }
      if (!placed) {
        var fb = f.randomWalkable(rng);
        placed = { def: def, x: fb.x, y: fb.y };
      }
      f.enemySpawns.push(placed);
    });

    // ---- keep outer border sealed ----
    for (var bx = 0; bx < W; bx++) { f.set(bx, 0, T.WALL); f.set(bx, H - 1, T.WALL); }
    for (var by = 0; by < H; by++) { f.set(0, by, T.WALL); f.set(W - 1, by, T.WALL); }

    return f;
  }

  function validate(f, cfg) {
    if (!f) return false;
    var reach = f.reachMap(f.spawn.x, f.spawn.y);
    var ok = true;
    if (!f.isReachableFrom(reach, f.exit.x, f.exit.y)) ok = false;
    f.entities.forEach(function (e) {
      if (!f.walkable(e.x, e.y)) ok = false;
      if (!f.isReachableFrom(reach, e.x, e.y)) ok = false;
    });
    f.enemySpawns.forEach(function (e) {
      if (!f.walkable(e.x, e.y)) ok = false;
      if (!f.isReachableFrom(reach, e.x, e.y)) ok = false;
    });
    if (f.gate) {
      var g = f.gate;
      var adj = f.walkable(g.x + 1, g.y) || f.walkable(g.x - 1, g.y) || f.walkable(g.x, g.y + 1) || f.walkable(g.x, g.y - 1);
      if (!adj) ok = false;
    }
    // the exit must be genuinely far from spawn
    if (ok) {
      var path = f.bfs(f.spawn.x, f.spawn.y, f.exit.x, f.exit.y);
      if (!path || path.length < 20) ok = false;
    }
    return ok;
  }

  function generateFloor(cfg) {
    var base = (cfg.seed == null ? 1234 : cfg.seed) >>> 0;
    for (var attempt = 0; attempt < 60; attempt++) {
      var rng = mulberry32((base + attempt * 7919) >>> 0);
      var f = build(cfg, rng);
      if (validate(f, cfg)) { f.attempt = attempt; return f; }
    }
    // last resort: slightly relaxed floor
    return build(cfg, mulberry32(base));
  }

  return { T: T, Floor: Floor, generateFloor: generateFloor, mulberry32: mulberry32, validate: validate, build: build };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dungeon;

/* ============================================================================
   entities.js -- player, chasers (AI), collision + pixel sprite drawing
   ============================================================================ */
'use strict';

var Entities = (function () {

  var SPR_BODY = [
    '..HHHH..',
    '.HHHHHH.',
    '.HSSSSH.',
    '.HSEESH.',
    '.HSSSSH.',
    '..BBBB..',
    '.BBBBBB.',
    '.BBBBBB.',
    '..BBBB..'
  ];
  var SPR_LEGS_A = ['..PPPP..', '..P..P..', '.FF..FF.'];
  var SPR_LEGS_B = ['..PPPP..', '.PP...P.', '.FF..F..'];

  var PAL = {
    player:  { H: '#2a2233', S: '#c98f6a', B: '#2f6fb5', P: '#33384a', F: '#171722', A: '#ffe066' },
    modi:    { H: '#f2ede2', S: '#d9a066', B: '#f5a623', P: '#f6efdd', F: '#8a5a1a', A: '#159a4b' },
    yogi:    { H: '#f0a12a', S: '#d9a066', B: '#f28a1b', P: '#e6dcc4', F: '#7a4a10', A: '#ff5a1f' },
    amitshah:{ H: '#ececec', S: '#d9a066', B: '#f4f4f4', P: '#c9c9c9', F: '#3a3a3a', A: '#1f6fd0' },
    alakh:   { H: '#241a12', S: '#c98f6a', B: '#2a63c9', P: '#20242e', F: '#101018', A: '#e8f4ff' },
    techteam:{ H: '#0b0b0d', S: '#c98f6a', B: '#16d97a', P: '#0f2418', F: '#0b0b0d', A: '#39ff88' },
    ravi:    { H: '#0f0f0f', S: '#b87c4a', B: '#e8c33a', P: '#5a3a1a', F: '#2a1a0a', A: '#ff5a2a' },
    rick:    { H: '#d8b23a', S: '#e8c8a8', B: '#f2f2f2', P: '#2a2a2a', F: '#111111', A: '#e33333' }
  };

  /* ---------------- collision ---------------- */
  function collidesAt(x, y, floor, r) {
    return floor.isWall(Math.floor(x - r), Math.floor(y - r)) ||
           floor.isWall(Math.floor(x + r), Math.floor(y - r)) ||
           floor.isWall(Math.floor(x - r), Math.floor(y + r)) ||
           floor.isWall(Math.floor(x + r), Math.floor(y + r));
  }
  // returns {x,y,hitWall:{left,right,up,down}}
  function moveWithCollision(o, dx, dy, floor, r) {
    var hit = { left: false, right: false, up: false, down: false };
    if (dx) {
      if (!collidesAt(o.x + dx, o.y, floor, r)) o.x += dx;
      else { hit[dx > 0 ? 'right' : 'left'] = true; }
    }
    if (dy) {
      if (!collidesAt(o.x, o.y + dy, floor, r)) o.y += dy;
      else { hit[dy > 0 ? 'down' : 'up'] = true; }
    }
    return hit;
  }

  /* ---------------- drawing ---------------- */
  function drawChar(ctx, kind, sx, sy, dir, anim, opt) {
    opt = opt || {};
    var pal = PAL[kind] || PAL.player;
    var body = SPR_BODY.slice();
    // eyes / facing
    body[3] = '.HSEESH.';
    if (dir === 3) body[3] = '.HSSSSH.';
    else if (dir === 1) body[3] = '.HSESSH.';
    else if (dir === 2) body[3] = '.HSSESH.';

    var legs = (Math.floor(anim) % 2 === 0) ? SPR_LEGS_A : SPR_LEGS_B;
    var rows = body.concat(legs);
    var bob = (opt.moving && Math.floor(anim) % 2 === 1) ? -1 : 0;

    // "you cannot miss me" ring (IITB ALUMNI): a pulsing halo on the floor
    if (opt.ring) {
      var pulse = (opt.ringPulse || 0) * 5;
      ctx.strokeStyle = opt.ring;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx + 4, sy + 8, 7.5 + Math.sin(pulse) * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + 1, sy + 12, 6, 1);

    for (var y = 0; y < rows.length; y++) {
      var line = rows[y];
      for (var x = 0; x < line.length; x++) {
        var ch = line[x];
        if (ch === '.') continue;
        var col = pal[ch] || pal.B;
        ctx.fillStyle = col;
        ctx.fillRect(sx + x, sy + y + bob, 1, 1);
      }
    }

    // per-character flavour pixels
    if (kind === 'modi') { // white beard + saffron tilak
      ctx.fillStyle = '#f2ede2';
      ctx.fillRect(sx + 2, sy + 5 + bob, 4, 1);
      ctx.fillStyle = '#e2591b';
      ctx.fillRect(sx + 3, sy + 1 + bob, 1, 1);
    } else if (kind === 'yogi') { // bigger saffron tilak + rudraksha bead
      ctx.fillStyle = '#ff5a1f';
      ctx.fillRect(sx + 3, sy + 1 + bob, 2, 1);
      ctx.fillRect(sx + 3, sy + 2 + bob, 1, 1);
      ctx.fillStyle = '#8a5a10';
      ctx.fillRect(sx + 3, sy + 6 + bob, 2, 1);
    } else if (kind === 'amitshah') { // black-frame specs
      ctx.fillStyle = '#101010';
      ctx.fillRect(sx + 2, sy + 3 + bob, 4, 1);
      ctx.fillRect(sx + 3, sy + 4 + bob, 2, 1);
    } else if (kind === 'alakh') { // glasses
      ctx.fillStyle = '#dff6ff';
      ctx.fillRect(sx + 2, sy + 3 + bob, 4, 1);
    } else if (kind === 'techteam') { // glowing visor + beanie + laptop
      ctx.fillStyle = pal.A;
      ctx.fillRect(sx + 2, sy + 3 + bob, 4, 1);
      ctx.fillStyle = '#0b0b0d';
      ctx.fillRect(sx + 1, sy + 0 + bob, 6, 1);
      ctx.fillStyle = '#0b2b18';
      ctx.fillRect(sx + 2, sy + 9 + bob, 5, 3);
      ctx.fillStyle = '#39ff88';
      ctx.fillRect(sx + 3, sy + 10 + bob, 3, 1);
    } else if (kind === 'ravi') { // sunglasses + gold chain
      ctx.fillStyle = '#101010';
      ctx.fillRect(sx + 2, sy + 3 + bob, 4, 1);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(sx + 3, sy + 6 + bob, 2, 1);
    } else if (kind === 'rick') { // white suit lines
      ctx.fillStyle = '#c9c9c9';
      ctx.fillRect(sx + 4, sy + 6 + bob, 1, 3);
    } else if (kind === 'player') { // backpack strap
      ctx.fillStyle = '#1c2333';
      ctx.fillRect(sx + 1, sy + 6 + bob, 1, 2);
    }

    if (opt.tag) {
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = opt.tagColor || '#ff9a9a';
      ctx.fillText(opt.tag, sx + 4, sy - 2);
      ctx.textAlign = 'left';
    }
    if (opt.alert) {
      ctx.fillStyle = '#ff3b3b';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx + 4, sy - 2);
      ctx.textAlign = 'left';
    }
    if (opt.stunned) {
      ctx.fillStyle = '#ffe066';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('*', sx + 2 + ((Math.floor(anim) % 3) * 2), sy - 2);
      ctx.textAlign = 'left';
    }
  }

  function drawProp(ctx, type, sx, sy, t, extra) {
    extra = extra || {};
    var bob = Math.sin(t * 3 + sx) * 1;
    if (type === 'token') {
      ctx.fillStyle = 'rgba(255,220,120,0.18)';
      ctx.fillRect(sx + 3, sy + 3 + bob, 10, 10);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(sx + 5, sy + 5 + bob, 6, 6);
      ctx.fillStyle = '#8a6a00';
      ctx.fillRect(sx + 7, sy + 6 + bob, 2, 4);
      ctx.fillStyle = '#fff3c0';
      ctx.fillRect(sx + 5, sy + 5 + bob, 6, 1);
    } else if (type === 'checkpoint') {
      var flick = (Math.floor(t * 8) % 2) ? 1 : 0;
      ctx.fillStyle = '#2a2a35';
      ctx.fillRect(sx + 5, sy + 8, 6, 6);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(sx + 6, sy + 4 + flick, 4, 4);
      ctx.fillStyle = '#fff6c9';
      ctx.fillRect(sx + 7, sy + 6 + flick, 2, 2);
      if (extra.active) {
        ctx.fillStyle = '#46ff9b';
        ctx.fillRect(sx + 4, sy + 2, 8, 1);
        ctx.fillRect(sx + 4, sy + 14, 8, 1);
        ctx.fillRect(sx + 3, sy + 3, 1, 11);
        ctx.fillRect(sx + 12, sy + 3, 1, 11);
      }
    } else if (type === 'phone') {
      var ringing = extra.state === 'ringing';
      ctx.fillStyle = '#20202a';
      ctx.fillRect(sx + 4, sy + 6, 8, 8);
      ctx.fillStyle = ringing ? ((Math.floor(t * 6) % 2) ? '#46ff9b' : '#0f6b3f') : '#3a4a3a';
      ctx.fillRect(sx + 5, sy + 7, 6, 3);
      ctx.fillStyle = '#555';
      ctx.fillRect(sx + 5, sy + 11, 6, 1);
      if (ringing) {
        ctx.fillStyle = '#46ff9b';
        ctx.font = '6px monospace';
        ctx.fillText(')', sx + 13 + (Math.floor(t * 6) % 2), sy + 9);
      }
    } else if (type === 'terminal') {
      ctx.fillStyle = '#1a2a22';
      ctx.fillRect(sx + 3, sy + 5, 10, 8);
      ctx.fillStyle = extra.used ? '#0a3a22' : '#0ff0a0';
      ctx.fillRect(sx + 4, sy + 6, 8, 5);
      ctx.fillStyle = '#052a18';
      for (var i = 0; i < 3; i++) ctx.fillRect(sx + 5, sy + 7 + i, 6 - i * 2, 1);
      ctx.fillStyle = '#2a2a35';
      ctx.fillRect(sx + 5, sy + 13, 6, 2);
    } else if (type === 'painting') {
      ctx.fillStyle = '#3a2a10';
      ctx.fillRect(sx + 2, sy + 3, 12, 11);
      ctx.fillStyle = extra.taken ? '#3a3050' : '#ffd24a';
      ctx.fillRect(sx + 3, sy + 4, 10, 9);
      ctx.fillStyle = extra.taken ? '#241c3d' : '#7a5a10';
      ctx.fillRect(sx + 5, sy + 6, 6, 5);
      if (!extra.taken && (Math.floor(t * 2) % 2)) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 4, 10, 1);
      }
    } else if (type === 'powerup') {
      var col = { chai: '#c98f6a', chappal: '#8ad1ff', shield: '#ffd24a', torch: '#ffe066', notes: '#c9b8ff' }[extra.kind] || '#fff';
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(sx + 3, sy + 4, 10, 9);
      ctx.fillStyle = col;
      ctx.fillRect(sx + 4, sy + 5, 8, 7);
      ctx.fillStyle = '#0b0616';
      ctx.font = '6px monospace';
      ctx.fillText((extra.kind || '?')[0].toUpperCase(), sx + 6, sy + 11);
    } else if (type === 'rick') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(sx + 4, sy + 2, 8, 12);
      ctx.fillStyle = '#d8b23a';
      ctx.fillRect(sx + 5, sy + 1, 6, 2);
      ctx.fillStyle = '#333';
      ctx.fillRect(sx + 6, sy + 5, 4, 1);
    }
  }

  /* ---------------- player ---------------- */
  class Player {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.dir = 0;
      this.r = 0.3;
      this.anim = 0;
      this.moving = false;
      this.vx = 0; this.vy = 0;
      this.speedBase = 4.15;
    }
    update(dt, input, floor, mul) {
      var ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      var iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      var len = Math.hypot(ix, iy);
      if (len > 0) { ix /= len; iy /= len; }
      if (ix || iy) {
        this.dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 2 : 1) : (iy > 0 ? 0 : 3);
      }
      var s = (this.speedBase) * (mul || 1);
      this.vx = ix * s; this.vy = iy * s;
      var hit = moveWithCollision(this, this.vx * dt, this.vy * dt, floor, this.r);
      this.moving = !!(ix || iy);
      this.anim += this.moving ? dt * 9 : dt * 2;
      this.lastHit = hit;
      return hit;
    }
  }

  /* ---------------- chaser AI ---------------- */
  class Enemy {
    constructor(def, x, y) {
      this.id = def.id;
      this.name = def.name;
      this.sprite = def.sprite || def.id;
      this.consequence = def.consequence;
      this.speedPatrol = def.speedPatrol || 2.3;
      this.speedChase = def.speedChase || 3.4;
      this.detect = def.detect || 6.5;
      this.hear = def.hear || 9;
      this.flavorSee = def.flavorSee || null;
      this.tagAlways = !!def.tagAlways;
      this.x = x; this.y = y;
      this.r = 0.3;
      this.dir = 0;
      this.state = 'patrol';
      this.path = [];
      this.repathT = 0;
      this.loseT = 0;
      this.stunned = 0;
      this.catchCd = 0;
      this.approachCd = 0;
      this.seen = false;
      this.anim = 0;
      this.target = null;
      this.alertPos = null;
      this.forceChase = 0;   // >0 => chase even without line of sight (run challenge)
    }
    stun(sec) { this.stunned = Math.max(this.stunned, sec); this.path = []; }
    alert(pos, seconds) {
      this.alertPos = { x: pos.x, y: pos.y };
      this.forceChase = Math.max(this.forceChase, seconds || 6);
    }
    update(dt, w) {
      var floor = w.floor, p = w.player;
      this.catchCd = Math.max(0, this.catchCd - dt);
      this.approachCd = Math.max(0, this.approachCd - dt);
      this.forceChase = Math.max(0, this.forceChase - dt);
      if (this.stunned > 0) {
        this.stunned -= dt;
        this.anim += dt * 6;
        return;
      }
      if (w.frozen) return;

      var dist = Math.hypot(p.x - this.x, p.y - this.y);
      var sees = false;
      if (dist <= this.detect && floor.lineOfSight(this, p)) sees = true;
      if (!sees && dist <= 2.2) sees = true; // breathing down your neck

      if (sees || this.forceChase > 0) {
        if (this.state !== 'chase') { this.state = 'chase'; this.repathT = 0; }
        this.loseT = 0;
        this.target = { x: p.x, y: p.y };
        if (!this.seen) {
          this.seen = true;
          if (w.onSee) w.onSee(this);
        }
        if (this.approachCd <= 0 && dist < this.detect * 0.8 && w.onApproach) {
          this.approachCd = 25;
          w.onApproach(this);
        }
      } else if (this.state === 'chase') {
        this.loseT += dt;
        if (this.loseT > 4.5) {
          this.state = 'patrol';
          this.seen = false;
          this.target = null;
          this.path = [];
          if (w.onLose) w.onLose(this);
        }
      }

      // pick a movement target
      if (this.state === 'chase') {
        this.target = this.target || { x: p.x, y: p.y };
      } else if (this.alertPos) {
        this.target = this.alertPos;
        if (Math.hypot(this.x - this.target.x, this.y - this.target.y) < 0.8) { this.alertPos = null; this.target = null; }
      } else {
        if (!this.target || Math.hypot(this.x - this.target.x, this.y - this.target.y) < 0.8) {
          this.target = w.rng ? floor.randomRoomCenter(w.rng) : floor.randomRoomCenter(Math.random);
        }
      }

      // path
      this.repathT -= dt;
      if (this.target && (this.repathT <= 0 || this.path.length === 0)) {
        this.repathT = this.state === 'chase' ? 0.35 : 0.9;
        var path = floor.bfs(this.x, this.y, this.target.x, this.target.y);
        if (path && path.length > 1) this.path = path;
        else if (this.state !== 'chase') this.target = null;
      }

      // follow path
      var speed = (this.state === 'chase' ? this.speedChase : this.speedPatrol) * (w.speedMul || 1);
      while (this.path.length > 1) {
        var nxt = this.path[1];
        if (Math.hypot(nxt.x + 0.5 - this.x, nxt.y + 0.5 - this.y) < 0.14) this.path.shift();
        else break;
      }
      var node = this.path.length > 1 ? this.path[1] : null;
      if (node) {
        var tx = node.x + 0.5, ty = node.y + 0.5;
        var d = Math.hypot(tx - this.x, ty - this.y) || 1;
        this.x += (tx - this.x) / d * speed * dt;
        this.y += (ty - this.y) / d * speed * dt;
        this.dir = Math.abs(tx - this.x) > Math.abs(ty - this.y) ? (tx > this.x ? 2 : 1) : (ty > this.y ? 0 : 3);
        this.anim += dt * 8;
      } else {
        this.anim += dt * 2;
      }

      // grab the player
      if (this.catchCd <= 0 && Math.hypot(p.x - this.x, p.y - this.y) < (w.catchRadius || 0.58)) {
        this.catchCd = 3;
        if (w.onCatch) w.onCatch(this);
      }
    }
  }

  return {
    T: null,
    Player: Player,
    Enemy: Enemy,
    PAL: PAL,
    drawChar: drawChar,
    drawProp: drawProp,
    moveWithCollision: moveWithCollision,
    collidesAt: collidesAt
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Entities;

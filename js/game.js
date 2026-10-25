/* ============================================================================
   game.js -- the whole haunted BTech: floors, chasers, consequences, boss.
   ============================================================================ */
'use strict';

(function () {

  var TILE = CONFIG.tile, VW = CONFIG.viewW, VH = CONFIG.viewH;
  var T = Dungeon.T;

  var POWER_LABEL = {
    chai: 'CHAI — speed boost 10s',
    chappal: 'CHAPPAL — press Q to stun a chaser',
    shield: 'NAZAR SHIELD — one free save',
    torch: 'TORCH — bigger light 25s',
    notes: 'TOPPER NOTES — dark lifts 12s'
  };

  var Game = {
    /* ------------------------------------------------------------ core -- */
    state: 'TITLE',
    canvas: null, ctx: null, lightCanvas: null, lightCtx: null,
    time: 0, last: 0, hudTick: 0,
    shakeT: 0, shakeMag: 0, flashT: 0, flashDur: 0.3, flashColor: '#ffffff',
    invuln: 0, chaseMusic: false,
    floorIndex: 0, floorCfg: null, floor: null, player: null, enemies: [],
    cam: { x: 0, y: 0 },
    input: { up: false, down: false, left: false, right: false },
    checkpoint: null, snapshotTokens: [], snapshotPaintings: [],
    flags: { airAnswered: false, paintings: 0, gateUsed: false },
    bossActive: false, _tabHidden: false, floorCleared: false,
    powerups: { chai: 0, chappal: 0, shield: 0, torch: 0, notes: 0 },
    effects: { chai: 0, torch: 0, notes: 0 },
    challenge: null, phoneTimer: 20, airCd: 20, currentRoom: null, lastRoomSong: null,
    controlMap: null, controlScrambleT: 0, controlScrambleCd: 0, teleportTimer: 24,
    progress: { have: 0, total: 0 }, hudTokens: '',
    stats: { catches: 0, resets: 0, tokens: 0, time: 0 },
    bossAttempts: 0, bossTime: 60,

    /* ------------------------------------------------------------ init -- */
    init: function () {
      var self = this;
      this.canvas = document.getElementById('screen');
      this.ctx = this.canvas.getContext('2d');
      this.lightCanvas = document.createElement('canvas');
      this.lightCanvas.width = VW; this.lightCanvas.height = VH;
      this.lightCtx = this.lightCanvas.getContext('2d');

      UI.init();
      this.bindTitle();
      this.bindInput();
      document.addEventListener('visibilitychange', function () { self.onVisibility(); });
      this.resize();
      window.addEventListener('resize', function () { self.resize(); });

      requestAnimationFrame(function (t) { self.frame(t); });
    },

    resize: function () {
      var s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
      s = Math.max(1, Math.floor(s * 2) / 2);
      document.documentElement.style.setProperty('--scale', s);
    },

    bindTitle: function () {
      var self = this;
      document.getElementById('title').addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
        if (!btn) return;
        audio.unlock();
        audio.playSfx('sfx_click');
        var act = btn.getAttribute('data-act');
        if (act === 'start') self.startGame();
        else if (act === 'controls') self.showControls();
        else if (act === 'settings') self.showSettings();
      });
    },

    bindInput: function () {
      var self = this;
      window.addEventListener('keydown', function (e) { self.onKeyDown(e); });
      window.addEventListener('keyup', function (e) { self.onKeyUp(e); });
      window.addEventListener('blur', function () {
        self.input.up = self.input.down = self.input.left = self.input.right = false;
      });
      var dpad = document.getElementById('dpad');
      var map = { up: 'up', down: 'down', left: 'left', right: 'right' };
      Array.prototype.forEach.call(dpad.querySelectorAll('button'), function (b) {
        var k = b.getAttribute('data-key');
        var press = function (ev) {
          ev.preventDefault();
          audio.unlock();
          if (map[k]) self.input[map[k]] = true;
          else if (k === 'e') self.interact();
          else if (k === 'q') self.useChappal();
        };
        var release = function () { if (map[k]) self.input[map[k]] = false; };
        b.addEventListener('pointerdown', press);
        b.addEventListener('pointerup', release);
        b.addEventListener('pointerleave', release);
        b.addEventListener('pointercancel', release);
      });
      // keep an explicit reference so a touch device can still unlock audio
      window.addEventListener('pointerdown', function () { audio.unlock(); }, { once: true });
    },

    onKeyDown: function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var k = e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(k) >= 0) e.preventDefault();
      audio.unlock();

      if (k === 'ArrowUp' || k === 'w' || k === 'W') this.input.up = true;
      else if (k === 'ArrowDown' || k === 's' || k === 'S') this.input.down = true;
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.input.left = true;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.input.right = true;
      else if (k === 'm' || k === 'M') {
        audio.setMuted(!audio.muted);
        UI.toast(audio.muted ? 'SOUND OFF' : 'SOUND ON', 1500);
      } else if (k === 'Escape') {
        if (UI.photoOpen()) UI.closePhoto();
        else if (UI.modalOpen()) UI.closeModal(true);
        else if (UI.panelOpen()) { if (this.state === 'PAUSE') this.resumeGame(); }
        else if (this.state === 'PLAY') this.pauseGame();
      } else if (k === 'Enter' || k === ' ') {
        if (this.state === 'CUTSCENE') UI.advanceCutscene();
        else if (UI.photoOpen()) UI.closePhoto();
        else if (this.state === 'TITLE' && !UI.panelOpen()) this.startGame();
      } else if (k === 'e' || k === 'E') {
        if (this.state === 'PLAY') this.interact();
      } else if (k === 'q' || k === 'Q') {
        if (this.state === 'PLAY') this.useChappal();
      } else if ((k === 'p' || k === 'P') && this.state === 'PLAY' && UI.phoneOpen()) {
        UI.phoneAnswer();
      } else if ((k === 'c' || k === 'C') && this.state === 'PLAY' && UI.phoneOpen()) {
        UI.phoneCut();
      }
    },

    onKeyUp: function (e) {
      var k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') this.input.up = false;
      else if (k === 'ArrowDown' || k === 's' || k === 'S') this.input.down = false;
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.input.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.input.right = false;
    },

    /* ------------------------------------------------------------ loop -- */
    frame: function (ts) {
      var self = this;
      if (!this.last) this.last = ts;
      var dt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      try { this.update(dt); } catch (err) { console.error('update', err); }
      try { this.render(); } catch (err) { console.error('render', err); }
      requestAnimationFrame(function (t) { self.frame(t); });
    },

    update: function (dt) {
      this.time += dt;
      if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
      if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      for (var k in this.effects) if (this.effects[k] > 0) this.effects[k] = Math.max(0, this.effects[k] - dt);

      if (this.state === 'PLAY') {
        try { this.updatePlay(dt); } catch (err) { console.error('updatePlay', err); }
      }
      if (this.floor) this.updateCamera(dt);
      this.updateMusic();
      this.updateHud();
    },

    updatePlay: function (dt) {
      var p = this.player, self = this;
      this.stats.time += dt;

      // 3-second control scramble after a chase starts (no on-screen timer)
      if (this.controlScrambleT > 0) {
        this.controlScrambleT = Math.max(0, this.controlScrambleT - dt);
        if (this.controlScrambleT === 0) this.controlMap = null;
      }
      if (this.controlScrambleCd > 0) this.controlScrambleCd = Math.max(0, this.controlScrambleCd - dt);

      var mul = 1;
      if (this.effects.chai > 0) mul *= CONFIG.chaiMul;
      p.update(dt, this.effectiveInput(), this.floor, mul);

      // tokens scoot away for 3s when you almost grab them
      this.updateFleeingTokens(dt);

      // random spooky teleport (never during the forced 30s run)
      this.teleportTimer -= dt;
      if (this.teleportTimer <= 0) {
        this.teleportTimer = CONFIG.teleportMinSec + Math.random() * (CONFIG.teleportMaxSec - CONFIG.teleportMinSec);
        if (!(this.challenge && this.challenge.active)) this.teleportPlayer();
      }

      // pickups
      this.floor.entities.forEach(function (e) {
        var d = Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y);
        if (e.type === 'token' && !e.taken && d < 0.75) self.collectToken(e);
        else if (e.type === 'powerup' && !e.taken && d < 0.75) self.collectPowerup(e);
        else if (e.type === 'checkpoint' && !e.active && d < 0.85) self.activateCheckpoint(e);
      });

      // exit tile
      if (Math.floor(p.x) === this.floor.exit.x && Math.floor(p.y) === this.floor.exit.y) {
        this.tryExit();
      }

      // prompts
      var near = this.nearestInteractable();
      UI.prompt(near ? near.prompt : null);

      // enemies
      this.enemies.forEach(function (e) { e.update(dt, self.world); });
      this.chaseMusic = this.enemies.some(function (e) { return e.state === 'chase'; });

      // first frame of a chase = controls go haywire for 3 seconds
      this.enemies.forEach(function (e) {
        if (e.state === 'chase' && !e._wasChase && self.controlScrambleCd <= 0) self.scrambleControls();
        e._wasChase = (e.state === 'chase');
      });

      // room events / room music
      var room = this.floor.roomAt(Math.floor(p.x), Math.floor(p.y));
      if (room !== this.currentRoom) {
        this.currentRoom = room;
        if (room) {
          if (room.bgm) this.lastRoomSong = room.bgm;
          this.onEnterRoom(room);
        }
      }

      // phones + air question cooldowns
      this.updatePhones(dt);
      if (this.airCd > 0) this.airCd -= dt;
      this.updateChallenge(dt);
    },

    updateCamera: function (dt) {
      var p = this.player;
      var tx = p.x * TILE - VW / 2, ty = p.y * TILE - VH / 2;
      tx = Math.max(0, Math.min(this.floor.w * TILE - VW, tx));
      ty = Math.max(0, Math.min(this.floor.h * TILE - VH, ty));
      var k = Math.min(1, dt * 9);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    },

    /* ------------------------------------------- chase / token chaos ---- */
    effectiveInput: function () {
      var m = this.controlMap;
      if (!m || this.controlScrambleT <= 0) return this.input;
      return {
        up: this.input[m.up], down: this.input[m.down],
        left: this.input[m.left], right: this.input[m.right]
      };
    },

    scrambleControls: function () {
      var dirs = ['up', 'down', 'left', 'right'];
      var shuffled = dirs.slice();
      var fixed = true, tries = 0;
      while (fixed && tries < 30) {
        for (var i = shuffled.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }
        fixed = false;
        for (var d = 0; d < dirs.length; d++) if (shuffled[d] === dirs[d]) fixed = true;
        tries++;
      }
      if (fixed) shuffled = ['down', 'up', 'right', 'left'];   // guarantee no fixed key
      var map = {};
      dirs.forEach(function (dir, idx) { map[dir] = shuffled[idx]; });
      this.controlMap = map;
      this.controlScrambleT = CONFIG.scrambleSeconds;
      this.controlScrambleCd = CONFIG.scrambleCooldown;
      audio.playSfx('sfx_error');
      this.shake(0.55, 0.35);
      UI.toast('ULTE PAIRON! CONTROLS SCAMBLED', 1600, 'bad');
    },

    updateFleeingTokens: function (dt) {
      var self = this, p = this.player;
      this.floor.entitiesOfType('token').forEach(function (t) {
        if (t.taken) return;
        if (t.fleeCd > 0) t.fleeCd = Math.max(0, t.fleeCd - dt);
        var d = Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y);
        if (!t.fleeT && d < CONFIG.tokenFleeRadius && !(t.fleeCd > 0)) {
          t.fleeT = CONFIG.tokenFleeSeconds;
          t.fleeCd = CONFIG.tokenFleeCooldown;
          t.fleeStep = 0;
          audio.playSfx('sfx_click');
          UI.toast('THE TOKEN RAN AWAY', 1400, 'bad');
        }
        if (t.fleeT > 0) {
          t.fleeT = Math.max(0, t.fleeT - dt);
          t.fleeStep = (t.fleeStep || 0) - dt;
          if (t.fleeStep <= 0) {
            t.fleeStep = 0.16;
            self.fleeTokenStep(t, p);
          }
        }
      });
    },

    fleeTokenStep: function (t, p) {
      var f = this.floor;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      var opts = [];
      for (var i = 0; i < dirs.length; i++) {
        var nx = t.x + dirs[i][0], ny = t.y + dirs[i][1];
        if (!f.walkable(nx, ny)) continue;
        if (!f.tileFree(nx, ny)) continue;
        if (Math.floor(p.x) === nx && Math.floor(p.y) === ny) continue;
        if (f.exit && nx === f.exit.x && ny === f.exit.y) continue;
        opts.push({ x: nx, y: ny, d: Math.hypot(nx + 0.5 - p.x, ny + 0.5 - p.y) });
      }
      if (!opts.length) { t.fleeT = 0; return; }
      opts.sort(function (a, b) { return b.d - a.d; });
      // the token randomly picks one of the two tiles that lead furthest away
      var pool = opts.slice(0, Math.min(2, opts.length));
      var pick = pool[Math.floor(Math.random() * pool.length)];
      t.x = pick.x; t.y = pick.y;
      f.use(pick.x, pick.y);   // keep teleports from dropping the player onto a moved token
    },

    teleportPlayer: function () {
      var f = this.floor, p = this.player;
      var spot = null;
      for (var i = 0; i < 60 && !spot; i++) {
        var room = f.rooms[Math.floor(Math.random() * f.rooms.length)];
        var x = room.x + Math.floor(Math.random() * room.w);
        var y = room.y + Math.floor(Math.random() * room.h);
        if (!f.walkable(x, y) || !f.tileFree(x, y)) continue;
        if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < 10) continue;
        var nearEnemy = this.enemies.some(function (e) { return Math.hypot(e.x - x, e.y - y) < 6; });
        if (nearEnemy) continue;
        spot = { x: x + 0.5, y: y + 0.5 };
      }
      if (!spot) return false;
      p.x = spot.x; p.y = spot.y;
      audio.playSfx('sfx_stun');
      this.flash('#7a3cff', 0.28);
      this.shake(0.7, 0.45);
      UI.toast('ghummi kar lo...', 2000, 'bad');
      this.updateCamera(1);
      return true;
    },

    updateMusic: function () {
      if (!this.floorCfg) { if (this.currentMusic !== 'bgm_tense') { this.currentMusic = 'bgm_tense'; audio.playAmbient('bgm_tense'); } return; }
      audio.playAmbient('bgm_tense');
      if (this.state === 'TITLE') return;
      // while a modal / minigame / photo is up we keep whatever is playing
      if (this.state === 'FROZEN' || this.state === 'MODAL' || this.state === 'MATH' || this.state === 'PAUSE') return;
      var wanted;
      if (this.state === 'BOSS') wanted = 'bgm_boss';
      else if (this.state === 'LOSE') wanted = 'bgm_gameover';
      else if (this.challenge && this.challenge.active) wanted = 'bgm_kavi_challenge';
      else if (this.chaseMusic) wanted = 'bgm_chase';
      // floor 3: the current/last room song keeps playing through hallways,
      // and swaps as soon as you step into another room
      else if (this.floorIndex === 2) wanted = this.lastRoomSong || this.floorCfg.bgm;
      else wanted = this.floorCfg.bgm;
      if (wanted !== this.currentMusic) {
        this.currentMusic = wanted;
        audio.playMusic(wanted);
      }
    },

    updateHud: function () {
      this.hudTick++;
      if (this.hudTick % 6 !== 0 || !this.floorCfg) return;
      var status = '';
      if (this.challenge && this.challenge.active) {
        status = 'RUN ' + Math.max(0, this.challenge.t).toFixed(1) + 's';
        if (this.challenge.still > 0.35) status += '  MOVE MOVE MOVE';
      }
      var powers = [];
      if (this.effects.chai > 0) powers.push('CHAI ' + Math.ceil(this.effects.chai) + 's');
      if (this.effects.torch > 0) powers.push('TORCH ' + Math.ceil(this.effects.torch) + 's');
      if (this.effects.notes > 0) powers.push('NOTES ' + Math.ceil(this.effects.notes) + 's');
      if (this.powerups.chappal > 0) powers.push('CHAPPAL x' + this.powerups.chappal);
      if (this.powerups.shield > 0) powers.push('SHIELD x' + this.powerups.shield);
      UI.hud({
        floor: this.floorCfg.short,
        objective: this.floorCfg.objective,
        tokens: this.hudTokens,
        status: status,
        powers: powers.join('   ')
      });
    },

    /* ------------------------------------------------------- run setup -- */
    startGame: function () {
      var self = this;
      audio.unlock();
      audio.playSfx('sfx_start');
      audio.playAmbient('bgm_tense');
      this.stats = { catches: 0, resets: 0, tokens: 0, time: 0 };
      this.powerups = { chai: 0, chappal: 1, shield: 0, torch: 0, notes: 0 };
      this.effects = { chai: 0, torch: 0, notes: 0 };
      UI.setTitle(false);
      UI.setHud(true);
      UI.closePanel();
      UI.fade(true);
      setTimeout(function () {
        self.loadFloor(0, {});
        UI.fade(false);
      }, 320);
    },

    mutateCfg: function (cfg) {
      var c = JSON.parse(JSON.stringify(cfg, function (k, v) { return k === 'enemies' ? v : v; }));
      c.seed = Math.floor(Math.random() * 1e9);
      return c;
    },

    loadFloor: function (i, opts) {
      opts = opts || {};
      var self = this;
      this.floorIndex = i;
      this.floorCfg = FLOORS[i];
      var cfg = CONFIG.randomizeLayout ? this.mutateCfg(this.floorCfg) : this.floorCfg;
      this.floor = Dungeon.generateFloor(cfg);
      this.player = new Entities.Player(this.floor.spawn.x + 0.5, this.floor.spawn.y + 0.5);
      this.enemies = this.floor.enemySpawns.map(function (s) { return new Entities.Enemy(s.def, s.x + 0.5, s.y + 0.5); });
      this.checkpoint = null;
      this.snapshotTokens = [];
      this.snapshotPaintings = [];
      this.flags = { airAnswered: false, paintings: 0, gateUsed: false };
      this.effects = { chai: 0, torch: 0, notes: 0 };
      this.challenge = null;
      this.controlMap = null; this.controlScrambleT = 0; this.controlScrambleCd = 0;
      this.teleportTimer = CONFIG.teleportMinSec + Math.random() * (CONFIG.teleportMaxSec - CONFIG.teleportMinSec);
      this._lastChalisaQ = null;
      UI.hidePhoneCall();
      this.floorCleared = false;
      this.phoneTimer = 14 + Math.random() * 10;
      this.airCd = 18;
      this.currentRoom = null;
      this.lastRoomSong = null;
      var spawnRoom = this.floor.roomAt(Math.floor(this.player.x), Math.floor(this.player.y));
      if (spawnRoom && spawnRoom.bgm) this.lastRoomSong = spawnRoom.bgm;
      this.currentMusic = null;
      this.invuln = 2;
      this.cam.x = Math.max(0, Math.min(this.floor.w * TILE - VW, this.player.x * TILE - VW / 2));
      this.cam.y = Math.max(0, Math.min(this.floor.h * TILE - VH, this.player.y * TILE - VH / 2));

      this.world = {
        floor: this.floor,
        player: this.player,
        rng: Math.random,
        speedMul: 1,
        catchRadius: CONFIG.catchRadius,
        frozen: false,
        onSee: function (e) { self.onSee(e); },
        onApproach: function (e) { self.onApproach(e); },
        onCatch: function (e) { self.onCatch(e); },
        onLose: function () {}
      };

      // reset room flags (floor objects are regenerated, but keep it defensive)
      this.floor.rooms.forEach(function (r) { r.raided = false; r.visited = false; r.announced = false; });

      this.updateObjective();
      this.currentMusic = null;
      audio.playMusic(this.floorCfg.bgm);
      UI.hud({ floor: this.floorCfg.short, objective: this.floorCfg.objective });
      UI.clearSubtitle();
      this.showIntro(opts.silent);
    },

    showIntro: function (silent) {
      var self = this;
      this.state = 'CUTSCENE';
      if (silent) { this.state = 'PLAY'; return; }
      UI.openCutscene({
        kicker: this.floorCfg.kicker,
        title: this.floorCfg.name,
        text: this.floorCfg.intro.join('\n'),
        hint: 'PRESS ENTER TO START',
        onDone: function () { self.state = 'PLAY'; }
      });
    },

    /* -------------------------------------------------------- objective -- */
    updateObjective: function () {
      var cfg = this.floorCfg, have, total;
      if (cfg.paintings) { total = cfg.paintings; have = this.flags.paintings; }
      else {
        total = cfg.tokens;
        have = this.floor.entitiesOfType('token').filter(function (t) { return t.taken; }).length;
      }
      this.progress = { have: have, total: total };
      var icons = '';
      for (var i = 0; i < total; i++) icons += (i < have ? '\u25C6' : '\u25C7');
      this.hudTokens = icons + '  ' + have + '/' + total;
      this.checkExitUnlock();
    },

    isExitOpen: function () {
      if (this.floorIndex === 0) return this.progress.have >= this.floorCfg.tokens;
      if (this.floorIndex === 1) return this.progress.have >= this.floorCfg.tokens && this.flags.airAnswered;
      return this.flags.paintings >= this.floorCfg.paintings;
    },

    checkExitUnlock: function () {
      var open = this.isExitOpen();
      if (open && !this._exitWasOpen) {
        this._exitWasOpen = true;
        audio.playSfx('sfx_unlock');
        UI.toast('STAIRS UNLOCKED — nikal jao yaha se', 2600, 'good');
      }
      if (!open) this._exitWasOpen = false;
    },

    lockMessage: function () {
      if (this.floorIndex === 0) return 'STAIRS LOCKED — ACHHE DIN tokens: ' + this.progress.have + '/' + this.floorCfg.tokens;
      if (this.floorIndex === 1) {
        if (this.progress.have < this.floorCfg.tokens) return 'STAIRS LOCKED — RAID-PROOF tokens: ' + this.progress.have + '/' + this.floorCfg.tokens;
        return 'STAIRS LOCKED — AIR verification pending. Try a terminal.';
      }
      return 'STAIRS LOCKED — paintings: ' + this.flags.paintings + '/' + this.floorCfg.paintings;
    },

    tryExit: function () {
      if (this.state !== 'PLAY' || this.floorCleared) return;
      if (!this.isExitOpen()) {
        if (!this._lockToastAt || this.time - this._lockToastAt > 2.5) {
          this._lockToastAt = this.time;
          audio.playSfx('sfx_locked');
          UI.toast(this.lockMessage(), 2600, 'bad');
        }
        return;
      }
      this.clearFloor();
    },

    /* -------------------------------------------------------- pickups ---- */
    collectToken: function (t) {
      t.taken = true;
      this.stats.tokens++;
      audio.playSfx('sfx_token');
      this.updateObjective();
      UI.toast((t.label || 'TOKEN') + ' — ' + this.progress.have + '/' + this.progress.total, 1600, 'good');
    },

    collectPowerup: function (p) {
      p.taken = true;
      this.applyPowerup(p.kind);
    },

    applyPowerup: function (kind) {
      if (kind === 'chai') this.effects.chai = Math.max(this.effects.chai, 10);
      else if (kind === 'torch') this.effects.torch = Math.max(this.effects.torch, 25);
      else if (kind === 'notes') this.effects.notes = Math.max(this.effects.notes, 12);
      else if (kind === 'shield') this.powerups.shield++;
      else if (kind === 'chappal') this.powerups.chappal = Math.min(3, this.powerups.chappal + 1);
      audio.playSfx('sfx_powerup');
      UI.toast('POWERUP: ' + (POWER_LABEL[kind] || kind), 2400, 'good');
    },

    grantRandomPowerup: function () {
      var kinds = ['chai', 'chappal', 'shield', 'torch', 'notes'];
      this.applyPowerup(kinds[Math.floor(Math.random() * kinds.length)]);
    },

    activateCheckpoint: function (c) {
      c.active = true;
      this.checkpoint = { x: c.x, y: c.y };
      var idx = [];
      var tokens = this.floor.entitiesOfType('token');
      tokens.forEach(function (t, i) { if (t.taken) idx.push(i); });
      this.snapshotTokens = idx;
      var pidx = [];
      this.floor.entitiesOfType('painting').forEach(function (p, i) { if (p.taken) pidx.push(i); });
      this.snapshotPaintings = pidx;
      audio.playSfx('sfx_checkpoint');
      UI.toast('CHECKPOINT SAVED', 1800, 'good');
      audio.playSfx('line_flavor_checkpoint');
    },

    /* ------------------------------------------------------- interaction -- */
    nearestInteractable: function () {
      var p = this.player, best = null, bestD = 1.25;
      this.floor.entities.forEach(function (e) {
        if (e.taken) return;
        if (e.type !== 'phone' && e.type !== 'terminal' && e.type !== 'painting') return;
        var d = Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y);
        if (d > bestD) return;
        if (e.type === 'phone') {
          if (e.state !== 'ringing') return;
          best = { type: 'phone', e: e, prompt: '[E] PICK UP — bihari ji aapka phone baj raha hai' };
        }
        else if (e.type === 'terminal') best = { type: 'terminal', e: e, prompt: e.used ? '[E] DEAD TERMINAL' : '[E] USE AIR TERMINAL' };
        else if (e.type === 'painting') best = { type: 'painting', e: e, prompt: '[E] LOOK AT PAINTING' };
        bestD = d;
      });
      if (this.floor.gate) {
        var g = this.floor.gate;
        var dg = Math.hypot(g.x + 0.5 - p.x, g.y + 0.5 - p.y);
        if (dg < 1.7 && (!best || dg < bestD + 0.4)) best = { type: 'gate', e: g, prompt: '[E] SECRET EXIT' };
      }
      return best;
    },

    interact: function () {
      if (this.state !== 'PLAY') return;
      var near = this.nearestInteractable();
      if (!near) return;
      if (near.type === 'phone') this.pickPhone(near.e);
      else if (near.type === 'terminal') this.useTerminal(near.e);
      else if (near.type === 'painting') this.viewPainting(near.e);
      else if (near.type === 'gate') this.useGate();
    },

    /* ---------------------------------------------------------- phones --- */
    updatePhones: function (dt) {
      var self = this;
      if (!this.floorCfg.phones) { UI.hidePhoneCall(); return; }
      var phones = this.floor.entitiesOfType('phone');
      this.phoneTimer -= dt;
      var ringing = phones.filter(function (p) { return p.state === 'ringing'; });
      if (this.phoneTimer <= 0 && ringing.length === 0 && !(this.challenge && this.challenge.active)) {
        var idle = phones.filter(function (p) { return p.state === 'idle'; });
        if (idle.length) {
          var p = idle[Math.floor(Math.random() * idle.length)];
          p.state = 'ringing';
          p.timer = CONFIG.phoneRingSeconds;
          audio.playFx('bgm_phone_ring');
          UI.toast('PHONE RINGING: bihari ji, aapka phone baj raha hai', 3200, 'bad');
        }
        this.phoneTimer = 24 + Math.random() * 18;
      }
      phones.forEach(function (p) {
        if (p.state === 'ringing') {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.state = 'cooldown';
            p.timer = 7;
            audio.stopFx();
            audio.playSfx('line_uthaiye_na');
            UI.subtitle('PHONE', 'UTHAIYE NA! UTHAIYE NA! (nobody picked up)', 3200);
            self.enemies.forEach(function (e) { e.alert({ x: p.x, y: p.y }, 12); });
            UI.toast('The ringing attracted them.', 2400, 'bad');
          }
        } else if (p.state === 'cooldown') {
          p.timer -= dt;
          if (p.timer <= 0) p.state = 'idle';
        }
      });

      // side-of-screen call prompt: PICK UP or CUT (also P / C on keyboard)
      var ring = phones.filter(function (p) { return p.state === 'ringing'; })[0] || null;
      if (ring) {
        if (!UI.phoneOpen()) {
          UI.phoneCall(function () { self.pickPhone(ring); }, function () { self.cutPhone(ring); });
        }
      } else if (UI.phoneOpen()) {
        UI.hidePhoneCall();
      }
      if (audio.fxId() === 'bgm_phone_ring' && !ring) audio.stopFx();
    },

    pickPhone: function (p) {
      var self = this;
      UI.hidePhoneCall();
      if (p.state === 'ringing') {
        p.state = 'cooldown';
        p.timer = 10;
        audio.stopFx();
        audio.playSfx('line_phone_scream');
        audio.playSfx('sfx_jumpscare');
        this.shake(1, 0.6);
        this.flash('#ffffff', 0.25);
        this.frozenPhoto({
          imageId: 'img_phone_bihari', seconds: 1.5, shake: true,
          caption: 'BIHARI JI: TUM BTECH KI TAIYARI CHHOD DO!',
          onDone: function () {
            self.loseTokenOrShrug();
            self.enemies.forEach(function (e) { e.alert({ x: p.x, y: p.y }, 12); });
          }
        });
      } else {
        UI.toast('No one is calling. Yet.', 1800);
      }
    },

    cutPhone: function (p) {
      if (!p || p.state !== 'ringing') return;
      p.state = 'cooldown';
      p.timer = 8;
      UI.hidePhoneCall();
      audio.stopFx();
      audio.playSfx('line_uthaiye_na');
      UI.subtitle('PHONE', 'UTHAIYE NA! UTHAIYE NA! (aapne call kaat diya)', 3000);
      this.enemies.forEach(function (e) { e.alert({ x: p.x, y: p.y }, 12); });
      UI.toast('You cut the call. They heard the ringing stop.', 2400, 'bad');
    },

    loseTokenOrShrug: function () {
      var tokens = this.floor.entitiesOfType('token');
      var collected = tokens.filter(function (t) { return t.taken; });
      if (!collected.length) {
        UI.toast('Nothing left to lose. Scary.', 2200, 'bad');
        return;
      }
      var t = collected[collected.length - 1];
      t.taken = false;
      this.updateObjective();
      audio.playSfx('sfx_hurt');
      UI.toast('A token slipped out of your bag!', 2600, 'bad');
    },

    /* -------------------------------------------------------- AIR stuff -- */
    useTerminal: function (t) {
      if (t.used) {
        UI.toast('This terminal is burnt. Try another one.', 2000, 'bad');
        return;
      }
      this.askAir('terminal', t);
    },

    askAir: function (source, terminal) {
      var self = this;
      this.airCd = 50;
      audio.playSfx('line_q_air');
      this.ask({
        speaker: source === 'terminal' ? 'AIR TERMINAL' : 'TECH TEAM',
        text: 'Bina notes banaye kya AIR aati h?',
        input: { placeholder: 'AIR', maxLength: 12 },
        hint: 'ENTER TO SUBMIT',
        timeout: 16000,
        showCountdown: true,
        onSubmit: function (v) { self.resolveAir(v, terminal); },
        onTimeout: function () { self.airFail('(no answer)', terminal); }
      });
    },

    resolveAir: function (v, terminal) {
      var ans = String(v == null ? '' : v).trim();
      var ok = this.matchAnswer(ans, CONFIG.airCodes);
      if (ok) {
        this.flags.airAnswered = true;
        audio.playSfx('line_air_pass');
        UI.subtitle('AIR TERMINAL', 'VERIFIED. Shabash, topper.', 3000);
        UI.toast('AIR VERIFIED', 2400, 'good');
        if (terminal) terminal.used = true;
        this.grantRandomPowerup();
        this.updateObjective();
      } else {
        this.airFail(ans || '(blank)', terminal);
      }
    },

    airFail: function (v, terminal) {
      audio.playSfx('line_btech_chhod_do');
      UI.subtitle('TECH TEAM', 'TUM BTECH KI TAIYARI CHHOD DO', 3400);
      this.flash('#3a0000', 0.3);
      this.shake(0.6, 0.4);
      this.loseTokenOrShrug();
      var p = this.player;
      this.enemies.forEach(function (e) { e.alert({ x: p.x, y: p.y }, 8); });
    },

    /* -------------------------------------------------------- paintings -- */
    viewPainting: function (ph) {
      var self = this;
      if (ph.taken) return;
      audio.playSfx('sfx_photo');
      audio.playSfx('sfx_flash');
      this.frozenPhoto({
        imageId: ph.imageId, seconds: 2,
        caption: 'PAINTING ' + (ph.index + 1) + '/' + this.floorCfg.paintings + ' — 2 seconds only. Then the question.',
        onDone: function () { self.askPainting(ph); }
      });
    },

    askPainting: function (ph) {
      var self = this;
      var quiz = ph.quiz || { q: 'TELL ME SOMETHING.', answers: [] };
      audio.playSfx(quiz.audio || ('line_q_painting_' + (ph.index + 1)));
      this.ask({
        speaker: 'PAINTING ' + (ph.index + 1),
        text: quiz.q,
        input: { placeholder: 'ANSWER', maxLength: 40 },
        hint: 'ENTER TO SUBMIT — GALAT JAWAB = PROGRESS RESET',
        timeout: 30000,
        showCountdown: true,
        onSubmit: function (v) {
          if (self.matchAnswer(v, quiz.answers)) self.paintingPass(ph);
          else self.paintingFail(ph, v);
        },
        onTimeout: function () { self.paintingFail(ph, '(no answer)'); }
      });
    },

    paintingPass: function (ph) {
      ph.taken = true;
      this.flags.paintings++;
      this.updateObjective();
      audio.playSfx('sfx_powerup');
      UI.toast('PAINTING ' + this.flags.paintings + '/' + this.floorCfg.paintings + ' — SAHI JAWAB!', 2200, 'good');
      this.grantRandomPowerup();
      if (this.flags.paintings >= this.floorCfg.paintings) {
        audio.playSfx('sfx_unlock');
        UI.subtitle('KAVI RISON', 'Sab painting mil gayi? Ab jaao upar. Waha aakhri sawaal wait kar raha hai.', 3800);
      }
    },

    paintingFail: function (ph, v) {
      audio.playSfx('line_painting_wrong');
      UI.subtitle('KAVI RISON', 'GALAT JAWAB!', 3000);
      this.resetProgress('WRONG ANSWER ' + (v ? '(' + v + ') ' : '') + '— progress reset', null);
    },

    /* ------------------------------------------------------ secret gate -- */
    useGate: function () {
      var self = this;
      if (this.flags.gateUsed) {
        UI.toast('The gate is bricked up now. Nice try.', 2200);
        return;
      }
      this.flags.gateUsed = true;
      audio.playSfx('sfx_gate');
      audio.playSfx('line_flavor_gate');
      audio.playSfx('line_secret_exit');
      this.frozenPhoto({
        imageId: 'img_secret_exit', seconds: 2.5,
        caption: 'THE RED GATE SAYS: SECRET EXIT. (photo pending upload)',
        onDone: function () {
          self.ask({
            speaker: 'SECRET ROOM',
            text: 'The secret room has no exit.\nIt has a RICK ASTLEY statue holding a tape.\n\nHe is waiting for you to press play.',
            imageId: 'img_rick_statue',
            choices: [
              { label: 'PLAY THE TAPE', value: 'play', cls: 'danger' },
              { label: 'RUN AWAY (safe)', value: 'run' }
            ],
            onChoice: function (v) {
              if (v === 'play') {
                audio.playSfx('line_flavor_rick');
                audio.playSfx('line_rickroll');
                UI.toast('NEVER GONNA GIVE YOU UP...', 3000, 'bad');
                self.frozenPhoto({
                  imageId: 'img_rick_statue', seconds: 2.5, shake: true,
                  caption: 'You got RICK ROLLED.',
                  onDone: function () { self.resetProgress('RICK ROLL! Progress reset. Never gonna give you up.'); }
                });
              } else {
                UI.toast('Wise. The statue gives you a NAZAR SHIELD anyway.', 2600, 'good');
                self.applyPowerup('shield');
              }
            }
          });
        }
      });
    },

    /* ----------------------------------------------------------- events -- */
    onEnterRoom: function (room) {
      if (!room.visited) room.visited = true;
      if (this.floorIndex === 1) {
        if (room.raid && !room.raided) {
          room.raided = true;
          this.raidEvent(room);
        } else if (this.airCd <= 0 && Math.random() < 0.4) {
          this.askAir('room');
        }
      } else if (this.floorIndex === 2) {
        if (!room.announced) {
          room.announced = true;
          if (room.bgm) UI.toast('ROOM SONG: ' + room.bgm.replace('bhojpuri_room_', 'BHOJPURI TRACK '), 2000);
        }
      }
    },

    raidEvent: function (room) {
      var self = this;
      audio.playSfx('line_tech_team_raid');
      UI.subtitle('TECH TEAM', 'TECH TEAM RAID! LOCK THE ROOM!', 3200);
      this.frozenPhoto({
        imageId: 'img_tech_team_raid', seconds: 1.6,
        caption: 'TECH TEAM RAID!',
        onDone: function () {
          var c = self.floor.roomCenter(room);
          self.enemies.forEach(function (e) { e.alert({ x: c.x, y: c.y }, 12); });
          UI.toast('TECH TEAM RAID — they heard that!', 2600, 'bad');
          self.shake(0.7, 0.4);
        }
      });
    },

    onSee: function (e) {
      if (this.state !== 'PLAY') return;
      var now = this.time;
      if (!e._flavorAt || now - e._flavorAt > 18) {
        e._flavorAt = now;
        var f = e.flavorSee;
        if (f) {
          UI.subtitle(f.speaker, f.text, 3000);
          if (f.sfx) audio.playSfx(f.sfx);
        }
      }
      if (e.consequence === 'ravi') this.startChallenge(CONFIG.runChallengeSeconds, false);
    },

    onApproach: function (e) {
      if (this.state !== 'PLAY') return;
      if (e.consequence === 'alakh') {
        audio.playSfx('line_alec_kuchu');
        UI.subtitle('ALEC DADDY', 'Kuchu puchu... tum kaha ho?', 2600);
      } else if (e.flavorSee) {
        UI.subtitle(e.flavorSee.speaker, 'I can hear you.', 2000);
      }
    },

    onCatch: function (e) {
      if (this.state !== 'PLAY' || this.invuln > 0) return;
      UI.hidePhoneCall();
      this.stats.catches++;
      audio.playSfx('sfx_catch');
      this.shake(0.9, 0.5);
      if (this.powerups.shield > 0) {
        this.powerups.shield--;
        audio.playSfx('sfx_powerup');
        UI.toast('NAZAR SHIELD USED — nazar utar gayi', 2400, 'good');
        this.shoveEnemy(e);
        this.invuln = 2.5;
        return;
      }
      if (e.consequence === 'modi') this.catchModi(e);
      else if (e.consequence === 'chalisa') this.catchChalisa(e);
      else if (e.consequence === 'alakh') this.catchAlakh(e);
      else if (e.consequence === 'saransh') this.catchSaransh(e);
      else if (e.consequence === 'ravi') this.catchRavi(e);
      else this.resetProgress('CAUGHT!', e);
    },

    shoveEnemy: function (e) {
      var tile = this.floor.randomRoomCenter(Math.random);
      e.x = tile.x + 0.5; e.y = tile.y + 0.5;
      e.path = []; e.state = 'patrol'; e.seen = false; e.target = null; e.alertPos = null; e.catchCd = 3;
    },

    /* ----------------------------------------------------- consequences -- */
    catchModi: function (e) {
      var self = this;
      audio.playSfx('line_modihh_lawden_bhojyam');
      UI.subtitle('MODIHH', 'LAWDEN BHOJYAM!', 3000);
      this.frozenPhoto({
        imageId: 'img_modihh_jumpscare', seconds: 1.5, shake: true,
        caption: 'MODIHH: LAW-DEN BHOJ-YAM.',
        onDone: function () { self.resetProgress('MODIHH NE PROGRESS RESET KAR DIYA', e); }
      });
    },

    /* ------------------------------------------- Yogi / Amit question bank -- */
    pickChalisaQuestion: function (e) {
      var bank = CHALISA.questions.filter(function (q) {
        return q.asker === 'any' || (e && q.asker === e.id);
      });
      if (!bank.length) bank = CHALISA.questions;
      var last = this._lastChalisaQ;
      var pool = bank.filter(function (q) { return q.id !== last; });
      if (!pool.length) pool = bank;
      var picked = pool[Math.floor(Math.random() * pool.length)];
      this._lastChalisaQ = picked.id;
      return picked;
    },

    chalisaQuestion: function (id) {
      for (var i = 0; i < CHALISA.questions.length; i++) {
        if (CHALISA.questions[i].id === id) return CHALISA.questions[i];
      }
      return null;
    },

    catchChalisa: function (e) {
      var self = this;
      var q = this.pickChalisaQuestion(e);
      UI.subtitle(e.name, q.q, 3400);
      var img = (e.id === 'yogi') ? 'img_yogi_jumpscare' : 'img_amit_jumpscare';
      this.frozenPhoto({
        imageId: img, seconds: 1.4, shake: true,
        caption: e.name + ': ' + q.q,
        onDone: function () { self.askChalisa(e, q); }
      });
    },

    askChalisa: function (e, q) {
      var self = this;
      q = q || this.pickChalisaQuestion(e);
      var speaker = (e && e.name) || 'MODI CHALISA';
      this.ask({
        speaker: speaker,
        text: q.q,
        imageId: CHALISA.imageId,
        input: { placeholder: 'One word answer', maxLength: 90 },
        hint: 'ENTER TO SUBMIT — SAHI = BOOST, GALAT = PROGRESS RESET',
        timeout: CHALISA.timeLimit * 1000,
        showCountdown: true,
        onSubmit: function (v) {
          if (self.matchAnswer(v, q.answers)) self.chalisaPass(e, q);
          else self.chalisaFail(e, v);
        },
        onTimeout: function () { self.chalisaFail(e, '(no answer)'); }
      });
      // voice line for THIS question (missing file = TTS reads the question)
      if (q.audio) audio.playSfx(q.audio);
    },

    chalisaPass: function (e, q) {
      audio.playSfx('line_chalisa_pass');
      audio.playSfx('sfx_boost');
      UI.subtitle((e && e.name) || 'MODI CHALISA', (CHALISA.passLine || 'Sahi jawab! Boost mil gaya!').toUpperCase(), 3200);
      UI.toast('BOOST! CHAI + NAZAR SHIELD + ek random powerup', 2800, 'good');
      this.effects.chai = Math.max(this.effects.chai, 15);
      this.applyPowerup('shield');
      this.grantRandomPowerup();
      this.invuln = Math.max(this.invuln, 3.5);
      if (e) this.shoveEnemy(e);
    },

    chalisaFail: function (e, v) {
      UI.toast('CHALISA FAIL: ' + (v || '?'), 3000, 'bad');
      this.resetProgress('GALAT JAWAB — ' + (e ? e.name : 'CHALISA') + ' ne progress reset kar diya', e);
    },

    catchAlakh: function (e) {
      var self = this;
      audio.playSfx('line_alec_padhai');
      UI.subtitle('ALEC DADDY', 'KYU NAHI HO RHI PADHAI?', 3400);
      this.frozenPhoto({
        imageId: 'img_alec_catch', seconds: 1.6,
        caption: 'ALEC DADDY: KYU NAHI HO RHI PADHAI?',
        onDone: function () {
          self.loseTokenOrShrug();
          self.respawn();
          self.invuln = 2.5;
          self.shoveEnemy(e);
          UI.toast('Back to the checkpoint. Padhai karo.', 2600, 'bad');
        }
      });
    },

    catchSaransh: function (e) {
      var self = this;
      audio.playSfx('line_tech_lock');
      UI.subtitle('IITB ALUMNI', 'TECH TEAM, LOCK KAR DO!', 3200);
      this.chaseMusic = false;
      this.currentMusic = null;
      audio.playMusic('bgm_lockdown');
      this.frozenPhoto({
        imageId: 'img_iitb_lock', seconds: 1.4,
        caption: 'IITB ALUMNI: TECH TEAM, LOCK KAR DO!',
        onDone: function () { self.startMathLock(e); }
      });
    },

    startMathLock: function (e) {
      var self = this;
      var a = 1 + Math.floor(Math.random() * 9);
      var b = 1 + Math.floor(Math.random() * 9);
      var op = Math.random() < 0.5 ? '+' : '-';
      if (op === '-' && b > a) { var t = a; a = b; b = t; }
      var problems = [];
      for (var i = 0; i < 14; i++) {
        var x = 1 + Math.floor(Math.random() * 9), y = 1 + Math.floor(Math.random() * 9);
        problems.push(x + ' + ' + y);
        problems.push(x + ' - ' + Math.min(x, y));
      }
      audio.playSfx('line_q_math');
      this.state = 'MATH';
      UI.openMath({
        timeLimit: CONFIG.mathTimeLimit,
        question: { a: a, b: b, op: op },
        problems: problems,
        onWrong: function () { audio.playSfx('sfx_error'); },
        onResult: function (ok) {
          self.currentMusic = null;
          self.state = 'PLAY';
          if (ok) {
            audio.playSfx('sfx_math_pass');
            UI.subtitle('IITB ALUMNI', 'Theek hai, lock khul gaya. Jaao.', 2600);
            UI.toast('LOCK KHUL GAYA!', 2000, 'good');
            self.shoveEnemy(e);
            self.invuln = 3;
          } else {
            audio.playSfx('line_tech_fail');
            UI.subtitle('TECH TEAM', 'TECH TEAM NE LOCK LAGA DIYA', 3200);
            self.resetProgress('TECH TEAM NE LOCK LAGA DIYA', e);
          }
        }
      });
    },

    catchRavi: function (e) {
      var self = this;
      audio.playSfx('line_kavi_motivation');
      audio.playSfx('line_flavor_caught_kavi');
      UI.subtitle('KAVI RISON', 'UTTHO! BHAAGO! HAAR MAT MAANO!', 3400);
      this.frozenPhoto({
        imageId: 'img_kavi_motivation', seconds: 1.6, shake: true,
        caption: 'KAVI RISON: HAAR MAT MAANO!',
        onDone: function () {
          self.respawn();
          self.shoveEnemy(e);
          self.invuln = 1.5;
          self.startChallenge(CONFIG.runChallengeSeconds, true);
        }
      });
    },

    /* --------------------------------------------------- run challenge --- */
    startChallenge: function (seconds, force) {
      if (this.challenge && this.challenge.active) {
        if (!force) { this.challenge.t = Math.max(this.challenge.t, seconds); return; }
      }
      this.challenge = { active: true, t: seconds, still: 0 };
      audio.playSfx('line_kavi_run');
      UI.toast('RUN! ' + seconds + ' SECONDS — DO NOT STOP MOVING', 3200, 'bad');
      this.shake(0.4, 0.3);
    },

    updateChallenge: function (dt) {
      var c = this.challenge;
      if (!c || !c.active) return;
      c.t -= dt;
      if (this.player.moving) c.still = Math.max(0, c.still - dt * 0.6);
      else c.still += dt;

      if (c.still > CONFIG.runChallengeStillLimit) {
        this.challenge = null;
        audio.playSfx('line_flavor_stop');
        UI.subtitle('KAVI RISON', 'RUK GAYE? POORA PROGRESS GAYA!', 3200);
        this.resetProgress('YOU STOPPED — Kavi Rison reset your progress', null);
        return;
      }
      if (c.t <= 0) {
        this.challenge = null;
        audio.playSfx('sfx_powerup');
        UI.subtitle('KAVI RISON', 'Shabash! Aage badho!', 3000);
        UI.toast('30 SECOND RUN SURVIVED — +CHAI', 2600, 'good');
        this.effects.chai = Math.max(this.effects.chai, 10);
      }
    },

    /* --------------------------------------------------------- progress -- */
    resetProgress: function (reason, enemy) {
      UI.hidePhoneCall();
      this.stats.resets++;
      UI.toast(reason, 3400, 'bad');
      audio.playSfx('sfx_hurt');
      this.flash('#5a0000', 0.35);
      this.shake(0.8, 0.5);
      this.challenge = null;

      // un-collect everything gathered after the last checkpoint
      var tokens = this.floor.entitiesOfType('token');
      var self = this;
      tokens.forEach(function (t, i) {
        if (t.taken && self.snapshotTokens.indexOf(i) === -1) t.taken = false;
      });
      var keptPaintings = 0;
      this.floor.entitiesOfType('painting').forEach(function (p, i) {
        if (p.taken && self.snapshotPaintings.indexOf(i) === -1) p.taken = false;
        if (p.taken) keptPaintings++;
      });
      this.flags.paintings = keptPaintings;
      if (this.powerups.chappal > 0) this.powerups.chappal--;
      this.updateObjective();
      this.respawn();
      this.invuln = 3;
      if (enemy) this.shoveEnemy(enemy);
      // scare the rest of them off too, so you do not get instantly grabbed again
      this.enemies.forEach(function (e) { if (e !== enemy) e.alert({ x: self.player.x, y: self.player.y }, 0.1); e.catchCd = Math.max(e.catchCd, 2.5); });
    },

    respawn: function () {
      var p = this.player;
      if (this.checkpoint) { p.x = this.checkpoint.x + 0.5; p.y = this.checkpoint.y + 0.5; }
      else { p.x = this.floor.spawn.x + 0.5; p.y = this.floor.spawn.y + 0.5; }
      this.cam.x = Math.max(0, Math.min(this.floor.w * TILE - VW, p.x * TILE - VW / 2));
      this.cam.y = Math.max(0, Math.min(this.floor.h * TILE - VH, p.y * TILE - VH / 2));
      this.chaseMusic = false;
    },

    /* ------------------------------------------------------- chappal ----- */
    useChappal: function () {
      if (this.powerups.chappal <= 0) {
        UI.toast('No chappal left. Buy more from Amazon.', 1800, 'bad');
        return;
      }
      var p = this.player, best = null, bestD = 4;
      this.enemies.forEach(function (e) {
        var d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bestD) { best = e; bestD = d; }
      });
      if (!best) { UI.toast('No chaser in range (4 tiles).', 1600, 'bad'); return; }
      this.powerups.chappal--;
      best.stun(6);
      audio.playSfx('sfx_stun');
      this.shake(0.4, 0.3);
      UI.toast('CHAPPAL! ' + best.name + ' is stunned 6s', 2400, 'good');
    },

    /* ------------------------------------------------------ freeze/photo -- */
    frozenPhoto: function (spec) {
      var self = this;
      this.state = 'FROZEN';
      UI.openPhoto({
        imageId: spec.imageId,
        seconds: spec.seconds,
        caption: spec.caption,
        shake: spec.shake,
        onDone: function () {
          self.state = 'PLAY';
          if (spec.onDone) spec.onDone();
        }
      });
    },

    ask: function (spec) {
      var self = this;
      this.state = 'MODAL';
      audio.playSfx('sfx_question');   // question sting for EVERY question in the game
      var wrapped = {
        speaker: spec.speaker,
        text: spec.text,
        imageId: spec.imageId,
        input: spec.input,
        choices: spec.choices,
        hint: spec.hint,
        timeout: spec.timeout,
        showCountdown: spec.showCountdown,
        onSubmit: function (v) { self.state = 'PLAY'; if (spec.onSubmit) spec.onSubmit(v); },
        onTimeout: function () { self.state = 'PLAY'; if (spec.onTimeout) spec.onTimeout(); },
        onChoice: function (v) { self.state = 'PLAY'; if (spec.onChoice) spec.onChoice(v); },
        allowBackdropClose: !!spec.allowBackdropClose
      };
      UI.openModal(wrapped);
    },

    /* ------------------------------------------------------- floor clear -- */
    clearFloor: function () {
      if (this.state !== 'PLAY') return;
      this.floorCleared = true;
      var self = this;
      this.state = 'CUTSCENE';
      this.challenge = null;
      this.chaseMusic = false;
      audio.playSfx('sfx_unlock');
      var statsLine = 'CATCHES: ' + this.stats.catches + '   RESETS: ' + this.stats.resets + '   TOKENS: ' + this.stats.tokens + '   TIME: ' + Math.floor(this.stats.time) + 's';
      UI.openCutscene({
        kicker: 'FLOOR CLEARED',
        title: this.floorCfg.short,
        text: this.floorCfg.clear.join('\n') + '\n\n' + statsLine,
        hint: 'PRESS ENTER',
        onDone: function () {
          if (self.floorIndex >= FLOORS.length - 1) self.bossFight();
          else self.loadFloor(self.floorIndex + 1, {});
        }
      });
    },

    /* ------------------------------------------------------------- boss -- */
    bossFight: function () {
      this.state = 'BOSS';
      this.bossActive = true;
      this.currentMusic = null;
      audio.playSfx('line_boss_intro');
      audio.playMusic('bgm_boss');
      this.bossAttempts = BOSS.attempts;
      this.bossTime = BOSS.timeLimit;
      UI.setHud(true);
      setTimeout(this.askBoss.bind(this), 400);
    },

    askBoss: function () {
      var self = this;
      this.state = 'MODAL';
      audio.playSfx('sfx_question');
      audio.playSfx('line_q_boss');
      UI.openModal({
        speaker: BOSS.speaker,
        text: BOSS.text,
        imageId: BOSS.imageId,
        input: { placeholder: 'ANSWER', maxLength: 60 },
        hint: 'ENTER TO SUBMIT — ' + this.bossTime + 's',
        timeout: this.bossTime * 1000,
        showCountdown: true,
        onSubmit: function (v) { self.resolveBoss(v); },
        onTimeout: function () { self.bossFail('TIME UP'); }
      });
    },

    resolveBoss: function (v) {
      var ans = String(v == null ? '' : v).trim();
      if (!ans) { this.bossFail('EMPTY ANSWER'); return; }
      if (!BOSS.answers || !BOSS.answers.length) {
        this.win('(placeholder mode: no answers configured yet — type anything wins. Put the real answer in BOSS.answers in js/assets.js)');
        return;
      }
      if (this.matchAnswer(ans, BOSS.answers)) this.win('');
      else this.bossFail('WRONG ANSWER: ' + ans);
    },

    bossFail: function (reason) {
      var self = this;
      this.bossAttempts--;
      this.state = 'PLAY';
      audio.playSfx('line_boss_fail');
      this.shake(1, 0.7);
      UI.subtitle('EXAM CELL', (BOSS.wrongLine || 'WRONG') + ' ... FAIL. VIVA ME MILTE HAIN.', 3800);
      UI.toast(BOSS.wrongLine || 'WRONG ANSWER', 3200, 'bad');
      if (this.bossAttempts <= 0) {
        this.lose(reason + ' — ' + (BOSS.wrongLine || ''));
        return;
      }
      UI.toast('ATTEMPTS LEFT: ' + this.bossAttempts, 2400, 'bad');
      this.bossTime = Math.max(20, this.bossTime - 25);
      setTimeout(function () { self.askBoss(); }, 900);
    },

    win: function (note) {
      this.state = 'WIN';
      this.bossActive = false;
      audio.playMusic('bgm_win');
      audio.playSfx('sfx_win');
      UI.setHud(false);
      var body = '<p><b>TOP HO GAYE.</b> BTech ki taiyari nahi chhodi.</p>' +
        '<p>catches: <span class="k">' + this.stats.catches + '</span> &nbsp; resets: <span class="k">' + this.stats.resets + '</span> &nbsp; tokens: <span class="k">' + this.stats.tokens + '</span> &nbsp; time: <span class="k">' + Math.floor(this.stats.time) + 's</span></p>' +
        '<p>Modihh: lawden bhojyam. Kavi Rison: proud. The IITB alumni: confused. Rick Astley: never gonna give you up.</p>' +
        (note ? '<p class="bad">' + note + '</p>' : '');
      var self = this;
      UI.openPanel({
        title: 'YOU TOPPED THE HORROR',
        imageId: 'img_win',
        body: body,
        actions: [
          { label: 'PLAY AGAIN', cls: 'primary', onPick: function () { UI.closePanel(); self.startGame(); } },
          { label: 'BACK TO TITLE', onPick: function () { UI.closePanel(); self.toTitle(); } }
        ]
      });
    },

    lose: function (reason) {
      this.state = 'LOSE';
      this.bossActive = false;
      audio.playMusic('bgm_gameover');
      UI.setHud(false);
      var self = this;
      UI.openPanel({
        title: 'BTECH CHHOD DI YA?',
        imageId: 'img_gameover',
        body: '<p>Reason: <span class="bad">' + reason + '</span></p>' +
          '<p>The final question defeated you. Somewhere an IITB alumni is laughing.</p>',
        actions: [
          { label: 'RETRY THE FINAL QUESTION', cls: 'primary', onPick: function () { UI.closePanel(); self.bossFight(); } },
          { label: 'RESTART FLOOR 3', onPick: function () { UI.closePanel(); self.loadFloor(2, { silent: true }); } },
          { label: 'BACK TO TITLE', onPick: function () { UI.closePanel(); self.toTitle(); } }
        ]
      });
    },

    toTitle: function () {
      this.state = 'TITLE';
      UI.closePanel();
      UI.setHud(false);
      UI.setTitle(true);
      UI.prompt(null);
      UI.clearSubtitle();
      UI.hidePhoneCall();
      audio.stopMusic();
      audio.stopFx();
      this.floor = null;
      this.player = null;
      this.enemies = [];
      this.floorCfg = null;
      this.currentMusic = null;
      this.bossActive = false;
      this.controlMap = null; this.controlScrambleT = 0; this.controlScrambleCd = 0;
    },

    /* ------------------------------------------------------------ menus -- */
    pauseGame: function () {
      var self = this;
      this.state = 'PAUSE';
      UI.hidePhoneCall();
      UI.openPanel({
        title: 'PAUSED',
        body: '<p>Floor: <span class="k">' + (this.floorCfg ? this.floorCfg.name : '-') + '</span></p>' +
          '<p>Objective: ' + (this.floorCfg ? this.floorCfg.objective : '-') + '</p>' +
          '<p>Chasers: ' + this.enemies.map(function (e) { return e.name; }).join(', ') + '</p>',
        actions: [
          { label: 'RESUME', cls: 'primary', onPick: function () { self.resumeGame(); } },
          { label: 'RESTART THIS FLOOR', onPick: function () { UI.closePanel(); self.loadFloor(self.floorIndex, { silent: true }); } },
          { label: (audio.muted ? 'SOUND: OFF' : 'SOUND: ON'), onPick: function () { audio.setMuted(!audio.muted); UI.closePanel(); self.pauseGame(); } },
          { label: 'BACK TO TITLE', cls: 'danger', onPick: function () { UI.closePanel(); self.toTitle(); } }
        ]
      });
    },

    resumeGame: function () {
      UI.closePanel();
      this.state = 'PLAY';
    },

    showControls: function () {
      var self = this;
      UI.openPanel({
        title: 'CONTROLS',
        body: '<p><b>WASD / ARROWS</b> — walk (horror rule: keep walking)</p>' +
          '<p><b>E</b> — interact (phone, terminal, painting, secret gate)</p>' +
          '<p><b>Q</b> — throw chappal (stun the nearest chaser 6s)</p>' +
          '<p><b>ENTER / SPACE</b> — advance cutscene, skip the 2 second image</p>' +
          '<p><b>ESC</b> — pause &nbsp; <b>M</b> — mute</p>' +
          '<p>Tokens are picked up by walking over them. Checkpoints save your progress — a catch sends you back to the last checkpoint and un-collects everything grabbed after it.</p>' +
          '<p><b>Every answer is matched ignoring CASE.</b> Yogi ji + Amit Shah grab you and ask one random question: their own MODI CHALISA role, or one of the extra meme questions (right = BOOST, wrong = progress reset). Every floor 3 painting asks a question (wrong = progress reset).</p>' +
          '<p>If a chaser spots you, your controls scramble for a few seconds. Tokens may run away when you get close. When the phone rings, PICK UP or CUT it on the side of the screen (or press P / C).</p>' +
          '<p>The AIR terminal will never tell you which rank works. Do not switch tabs during the FINAL QUESTION.</p>',
        actions: [{ label: 'BACK', onPick: function () { UI.closePanel(); } }]
      });
    },

    showSettings: function () {
      var self = this;
      UI.closePanel();
      UI.openPanel({
        title: 'SETTINGS',
        body: '<p>Everything here lives in <b>js/assets.js</b> (CONFIG object).</p>' +
          '<p>Randomize layout each run: <b>' + (CONFIG.randomizeLayout ? 'ON' : 'OFF') + '</b></p>' +
          '<p>Voice fallback (browser TTS when a file is missing): <b>' + (CONFIG.speechFallback ? 'ON' : 'OFF') + '</b></p>' +
          '<p>Sound: <b>' + (audio.muted ? 'OFF' : 'ON') + '</b></p>',
        actions: [
          { label: 'TOGGLE RANDOM LAYOUT', onPick: function () { CONFIG.randomizeLayout = !CONFIG.randomizeLayout; self.showSettings(); } },
          { label: 'TOGGLE VOICE FALLBACK', onPick: function () { CONFIG.speechFallback = !CONFIG.speechFallback; self.showSettings(); } },
          { label: 'TOGGLE SOUND', onPick: function () { audio.setMuted(!audio.muted); self.showSettings(); } },
          { label: 'RESCAN AUDIO FILES', onPick: function () { audio.rescan(); UI.toast('rescanning audio...', 2000); self.showSettings(); } },
          { label: 'BACK', cls: 'primary', onPick: function () { UI.closePanel(); } }
        ]
      });
    },
    /* ----------------------------------------------------------- render -- */
    render: function () {
      var ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VW, VH);

      if (this.floor && this.player) {
        var ox = 0, oy = 0;
        if (this.shakeT > 0) {
          ox = (Math.random() * 2 - 1) * this.shakeMag * 3;
          oy = (Math.random() * 2 - 1) * this.shakeMag * 3;
        }
        ctx.save();
        ctx.translate(Math.round(-this.cam.x + ox), Math.round(-this.cam.y + oy));
        this.drawTiles(ctx);
        this.drawProps(ctx);
        this.drawChars(ctx);
        ctx.restore();
        this.drawDark();
      }

      if (this.flashT > 0) {
        ctx.globalAlpha = Math.min(0.9, this.flashT / this.flashDur);
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, VW, VH);
        ctx.globalAlpha = 1;
      }

      if (this.state === 'PLAY' && this.chaseMusic) {
        ctx.strokeStyle = 'rgba(255,40,40,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, VW - 2, VH - 2);
        ctx.lineWidth = 1;
      }
      if (this.state === 'PLAY' && this.challenge && this.challenge.active) {
        ctx.fillStyle = 'rgba(255,200,60,0.85)';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RUN ' + Math.max(0, this.challenge.t).toFixed(1) + 's', VW / 2, 12);
        ctx.textAlign = 'left';
      }
    },

    drawTiles: function (ctx) {
      var pal = this.floorCfg.palette;
      var x0 = Math.max(0, Math.floor(this.cam.x / TILE) - 1);
      var y0 = Math.max(0, Math.floor(this.cam.y / TILE) - 1);
      var x1 = Math.min(this.floor.w - 1, Math.floor((this.cam.x + VW) / TILE) + 1);
      var y1 = Math.min(this.floor.h - 1, Math.floor((this.cam.y + VH) / TILE) + 1);
      for (var y = y0; y <= y1; y++) {
        for (var x = x0; x <= x1; x++) {
          var t = this.floor.get(x, y);
          var sx = x * TILE, sy = y * TILE;
          if (t === T.WALL || t === T.PILLAR) {
            ctx.fillStyle = t === T.PILLAR ? '#141018' : pal.wall;
            ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(sx, sy, TILE, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
            if (!this.floor.isWall(x, y + 1)) {
              ctx.fillStyle = pal.wallTop;
              ctx.fillRect(sx, sy + TILE - 3, TILE, 3);
              ctx.fillStyle = 'rgba(0,0,0,0.25)';
              ctx.fillRect(sx, sy + TILE - 5, TILE, 2);
            }
          } else if (t === T.GATE) {
            this.drawGate(ctx, sx, sy);
          } else {
            ctx.fillStyle = pal.floor;
            ctx.fillRect(sx, sy, TILE, TILE);
            var h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
            if (h % 7 === 0) { ctx.fillStyle = pal.dot; ctx.fillRect(sx + (h % 13), sy + ((h >> 3) % 13), 1, 1); }
            else if (h % 11 === 0) { ctx.fillStyle = pal.dot; ctx.fillRect(sx + 3, sy + 9, 2, 1); }
            if (t === T.EXIT) this.drawExit(ctx, sx, sy, pal);
          }
        }
      }
    },

    drawExit: function (ctx, sx, sy, pal) {
      var open = this.isExitOpen();
      ctx.fillStyle = open ? pal.accent : '#3a3a3a';
      ctx.fillRect(sx + 1, sy + 1, 14, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (var i = 0; i < 3; i++) ctx.fillRect(sx + 2 + i, sy + 2 + i * 5, 12 - i * 2, 3);
      if (!open) {
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(sx + 5, sy + 6, 6, 5);
        ctx.fillStyle = '#ffb3b3';
        ctx.fillRect(sx + 6, sy + 4, 4, 3);
        ctx.fillStyle = '#3a0000';
        ctx.fillRect(sx + 7, sy + 8, 2, 2);
      } else {
        var pulse = (Math.floor(this.time * 3) % 2) ? 1 : 0.55;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 * pulse) + ')';
        ctx.fillRect(sx, sy, TILE, TILE);
      }
    },

    drawGate: function (ctx, sx, sy) {
      ctx.fillStyle = '#7a0d0d';
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = '#d12b2b';
      ctx.fillRect(sx + 1, sy + 1, 14, 14);
      ctx.fillStyle = '#4a0808';
      ctx.fillRect(sx + 1, sy + 7, 14, 2);
      var pulse = (Math.floor(this.time * 4) % 2) ? 1 : 0;
      ctx.fillStyle = pulse ? '#ffe066' : '#ff4d4d';
      ctx.fillRect(sx + 4, sy + 4, 2, 2);
      ctx.fillRect(sx + 10, sy + 4, 2, 2);
      ctx.fillStyle = 'rgba(255,60,60,0.25)';
      ctx.fillRect(sx - 1, sy - 1, TILE + 2, TILE + 2);
    },

    drawProps: function (ctx) {
      var self = this;
      var t = this.time;
      this.floor.entities.forEach(function (e) {
        if (e.taken && e.type !== 'painting') return;
        var sx = e.x * TILE, sy = e.y * TILE;
        if (e.type === 'token') Entities.drawProp(ctx, 'token', sx, sy, t, {});
        else if (e.type === 'checkpoint') Entities.drawProp(ctx, 'checkpoint', sx, sy, t, { active: e.active });
        else if (e.type === 'phone') Entities.drawProp(ctx, 'phone', sx, sy, t, { state: e.state });
        else if (e.type === 'terminal') Entities.drawProp(ctx, 'terminal', sx, sy, t, { used: e.used });
        else if (e.type === 'painting') Entities.drawProp(ctx, 'painting', sx, sy, t, { taken: e.taken });
        else if (e.type === 'powerup') Entities.drawProp(ctx, 'powerup', sx, sy, t, { kind: e.kind });
      });
      if (this.effects.notes > 0) {
        ctx.fillStyle = 'rgba(200,180,255,0.25)';
        this.floor.entities.forEach(function (e) {
          if (e.type === 'token' && !e.taken) ctx.fillRect(e.x * TILE + 2, e.y * TILE - 3, 12, 1);
        });
      }
    },

    drawChars: function (ctx) {
      var self = this;
      this.enemies.forEach(function (e) {
        var sx = Math.round(e.x * TILE) - 4, sy = Math.round(e.y * TILE) - 6;
        var d = Math.hypot(e.x - self.player.x, e.y - self.player.y);
        Entities.drawChar(ctx, e.sprite, sx, sy, e.dir, e.anim, {
          moving: e.state === 'chase',
          tag: (e.tagAlways || d < 11) ? e.name : null,
          tagColor: e.tagAlways ? (e.state === 'chase' ? '#ff6a6a' : '#39ff88')
                                : (e.state === 'chase' ? '#ff6a6a' : '#c9b8ff'),
          ring: e.tagAlways ? (e.state === 'chase' ? 'rgba(255,80,80,0.85)' : 'rgba(57,255,136,0.75)') : null,
          ringPulse: self.time,
          alert: e.state === 'chase',
          stunned: e.stunned > 0
        });
      });
      var p = this.player;
      var blink = this.invuln > 0 && (Math.floor(this.time * 12) % 2 === 0);
      if (!blink) {
        Entities.drawChar(ctx, 'player', Math.round(p.x * TILE) - 4, Math.round(p.y * TILE) - 6, p.dir, p.anim, { moving: p.moving });
      }
    },

    drawDark: function () {
      var lc = this.lightCtx, ctx = this.ctx;
      var notes = this.effects.notes > 0;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalCompositeOperation = 'source-over';
      lc.clearRect(0, 0, VW, VH);
      lc.fillStyle = 'rgba(2,1,6,' + (notes ? 0.68 : 0.93) + ')';
      lc.fillRect(0, 0, VW, VH);

      var p = this.player;
      var px = p.x * TILE - this.cam.x, py = p.y * TILE - this.cam.y;
      var r = CONFIG.lightRadius * TILE * (this.effects.torch > 0 ? CONFIG.torchMul : 1) * (notes ? 1.4 : 1);
      r *= 0.97 + Math.sin(this.time * 9) * 0.03;

      lc.globalCompositeOperation = 'destination-out';
      var g = lc.createRadialGradient(px, py, 4, px, py, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.62, 'rgba(0,0,0,0.88)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(px, py, r, 0, Math.PI * 2);
      lc.fill();

      var dirAngle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][p.dir];
      lc.save();
      lc.translate(px, py);
      lc.rotate(dirAngle);
      var g2 = lc.createRadialGradient(0, 0, 4, 0, 0, r * 1.6);
      g2.addColorStop(0, 'rgba(0,0,0,0.95)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g2;
      lc.beginPath();
      lc.moveTo(0, 0);
      lc.lineTo(r * 1.6, -r * 0.6);
      lc.lineTo(r * 1.6, r * 0.6);
      lc.closePath();
      lc.fill();
      lc.restore();

      // glowing props
      var self = this;
      this.floor.entities.forEach(function (e) {
        var ex = e.x * TILE + 8 - self.cam.x, ey = e.y * TILE + 8 - self.cam.y;
        var rr = 0;
        if (e.type === 'checkpoint') rr = 22;
        else if (e.type === 'phone' && e.state === 'ringing') rr = 34 + Math.sin(self.time * 12) * 6;
        else if (e.type === 'terminal' && !e.used) rr = 20;
        else if (e.type === 'painting' && !e.taken) rr = 26;
        else if (e.type === 'token') rr = 16;
        if (!rr) return;
        var gg = lc.createRadialGradient(ex, ey, 1, ex, ey, rr);
        gg.addColorStop(0, 'rgba(0,0,0,0.85)');
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = gg;
        lc.beginPath();
        lc.arc(ex, ey, rr, 0, Math.PI * 2);
        lc.fill();
      });

      if (this.floor.gate) {
        var gx = this.floor.gate.x * TILE + 8 - this.cam.x, gy = this.floor.gate.y * TILE + 8 - this.cam.y;
        var gg2 = lc.createRadialGradient(gx, gy, 1, gx, gy, 40);
        gg2.addColorStop(0, 'rgba(0,0,0,0.8)');
        gg2.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = gg2;
        lc.beginPath();
        lc.arc(gx, gy, 40, 0, Math.PI * 2);
        lc.fill();
      }

      // enemies burn a little hole in the darkness when very close (doom vibes)
      this.enemies.forEach(function (e) {
        var d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > 3) return;
        var ex = e.x * TILE + 8 - self.cam.x, ey = e.y * TILE + 8 - self.cam.y;
        var rr2 = 30 * (1 - d / 3);
        var gg3 = lc.createRadialGradient(ex, ey, 1, ex, ey, rr2);
        gg3.addColorStop(0, 'rgba(0,0,0,0.7)');
        gg3.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = gg3;
        lc.beginPath();
        lc.arc(ex, ey, rr2, 0, Math.PI * 2);
        lc.fill();
      });

      lc.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.lightCanvas, 0, 0);
    },

    /* --------------------------------------------------- tab detection -- */
    // "when final question appears and users switch tab => display DUCK YOU"
    onVisibility: function () {
      if (document.hidden) { this._tabHidden = true; return; }
      if (!this._tabHidden) return;
      this._tabHidden = false;
      if (this.bossActive) this.duckYou();
    },

    duckYou: function () {
      audio.playSfx('line_duckyou');
      audio.playSfx('sfx_jumpscare');
      this.shake(1, 0.7);
      this.flash('#ff2b2b', 0.22);
      UI.duckyou(3.2);
    },

    /* ---------------------------------------------- answer matching ----- */
    // EVERY answer in this game is matched ignoring case, spaces, punctuation
    norm: function (s) {
      return String(s == null ? '' : s).toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    matchAnswer: function (value, answers) {
      var v = this.norm(value);
      if (!v) return false;
      if (!answers || !answers.length) return true;   // placeholder mode: anything wins
      var vt = v.split(' ');
      for (var i = 0; i < answers.length; i++) {
        var a = this.norm(answers[i]);
        if (!a) continue;
        if (v === a) return true;
        var at = a.split(' ');
        if (at.length === 1) { if (vt.indexOf(at[0]) >= 0) return true; }
        else if (v.indexOf(a) >= 0) return true;
      }
      return false;
    },

    /* ------------------------------------------------------------ utils -- */
    shake: function (mag, time) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeT = Math.max(this.shakeT, time);
    },
    flash: function (color, time) {
      this.flashColor = color || '#ffffff';
      this.flashDur = time || 0.3;
      this.flashT = this.flashDur;
    }
  };

  /* --------------------------------------------------------------- debug -- */
  Game.debug = {
    state: function () { return Game.state; },
    intro: function () { UI.advanceCutscene(); },
    // clear the i-frames / shield so a scripted catch actually fires
    ready: function () {
      Game.invuln = 0;
      Game.powerups.shield = 0;
      if (Game.state !== 'PLAY') Game.state = 'PLAY';
      Game.enemies.forEach(function (e) { e.catchCd = 0; e.stunned = 0; });
      return true;
    },
    tokens: function () { Game.floor.entitiesOfType('token').forEach(function (t) { if (!t.taken) Game.collectToken(t); }); },
    paintings: function () {
      var n = 0;
      Game.floor.entitiesOfType('painting').forEach(function (p) { if (!p.taken) p.taken = true; if (p.taken) n++; });
      Game.flags.paintings = n;
      Game.updateObjective();
    },
    duck: function () { Game.duckYou(); },
    chalisa: function (id) {
      var e = null;
      Game.enemies.forEach(function (en) { if (!e && en.consequence === 'chalisa' && (!id || en.id === id)) e = en; });
      if (e) Game.catchChalisa(e);
      return !!e;
    },
    air: function () { Game.flags.airAnswered = true; Game.updateObjective(); },
    goto: function (x, y) { Game.player.x = x + 0.5; Game.player.y = y + 0.5; },
    floor: function (i) {
      UI.state.cutscene = null; UI.hide(UI.eCut);
      Game.loadFloor(i, { silent: true });
      Game.state = 'PLAY';
    },
    catch: function (id) {
      var aliases = { modihh: 'modi', alec: 'alakh', 'alec-daddy': 'alakh', kavi: 'ravi', iitb: 'techteam', alumni: 'techteam', saransh: 'techteam' };
      var want = aliases[String(id).toLowerCase()] || id;
      var e = null;
      Game.enemies.forEach(function (en) { if (en.id === want) e = en; if (!e && en.consequence === want) e = en; });
      if (e) Game.onCatch(e);
      return !!e;
    },
    phone: function () {
      var p = Game.floor.entitiesOfType('phone')[0];
      if (!p) return false;
      p.state = 'ringing';
      p.timer = CONFIG.phoneRingSeconds;
      audio.playFx('bgm_phone_ring');
      return true;
    },
    phonePickup: function () {
      var p = Game.floor.entitiesOfType('phone').filter(function (x) { return x.state === 'ringing'; })[0];
      if (!p) return false;
      Game.pickPhone(p);
      return true;
    },
    phoneCut: function () {
      var p = Game.floor.entitiesOfType('phone').filter(function (x) { return x.state === 'ringing'; })[0];
      if (!p) return false;
      Game.cutPhone(p);
      return true;
    },
    scramble: function () { Game.scrambleControls(); },
    teleport: function () { return Game.teleportPlayer(); },
    chalisaQ: function (id, enemy) {
      var q = Game.chalisaQuestion(id);
      if (!q) return false;
      var e = null;
      Game.enemies.forEach(function (en) {
        if (!e && en.consequence === 'chalisa' && (!enemy || en.id === enemy)) e = en;
      });
      if (!e) e = { id: enemy || 'yogi', name: (enemy === 'amitshah') ? 'AMIT SHAH' : 'YOGI JI' };
      Game.askChalisa(e, q);
      return true;
    },
    airAsk: function () { Game.askAir('debug'); },
    gate: function () { Game.useGate(); },
    boss: function () { Game.bossFight(); },
    win: function () { Game.win('debug'); },
    goal: function () { Game.tryExit(); },
    music: function () { return audio.musicId(); },
    anywhere: function () { return Game.isExitOpen(); },
    kill: function (id) { Game.enemies.forEach(function (e) { if (e.id === id) e.stun(30); }); }
  };

  window.Game = Game;
  window.addEventListener('load', function () { Game.init(); });

})();

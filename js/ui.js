/* ============================================================================
   ui.js -- DOM overlays: HUD, subtitles, modals, photos, math lock, panels.
   The 3D-ish game happens on the canvas; every word the player reads happens
   in here (crisp pixel text at any scale).
   ============================================================================ */
'use strict';

var UI = {
  el: function (id) { return document.getElementById(id); },

  state: {
    modal: null,
    photo: null,
    math: null,
    panel: null,
    cutscene: null,
    subTimer: null,
    toastId: 0,
    duckTimer: null,
    phonePick: null,
    phoneCut: null
  },

  init: function () {
    this.eTitle = this.el('title');
    this.eHud = this.el('hud');
    this.eHudFloor = this.el('hud-floor');
    this.eHudObj = this.el('hud-obj');
    this.eHudTokens = this.el('hud-tokens');
    this.eHudStatus = this.el('hud-status');
    this.eHudPowers = this.el('hud-powers');
    this.ePrompt = this.el('prompt');
    this.eSub = this.el('subtitle');
    this.eSubSpeaker = this.el('sub-speaker');
    this.eSubText = this.el('sub-text');
    this.eToasts = this.el('toasts');
    this.eModal = this.el('modal');
    this.eModalSpeaker = this.el('modal-speaker');
    this.eModalText = this.el('modal-text');
    this.eModalInput = this.el('modal-input');
    this.eModalInputWrap = this.el('modal-inputwrap');
    this.eModalHint = this.el('modal-hint');
    this.eModalChoices = this.el('modal-choices');
    this.eModalImgWrap = this.el('modal-imgwrap');
    this.eModalImg = this.el('modal-img');
    this.eModalImgPh = this.el('modal-imgph');
    this.ePhoto = this.el('photo');
    this.ePhotoFig = this.el('photo-fig');
    this.ePhotoCap = this.el('photo-cap');
    this.eMath = this.el('math');
    this.eMathGrid = this.el('math-grid');
    this.eMathQ = this.el('math-q');
    this.eMathInput = this.el('math-input');
    this.eMathHint = this.el('math-hint');
    this.eMathBar = this.el('math-bar');
    this.ePanel = this.el('panel');
    this.ePanelTitle = this.el('panel-title');
    this.ePanelBody = this.el('panel-body');
    this.ePanelActions = this.el('panel-actions');
    this.eCut = this.el('cutscene');
    this.eCutKicker = this.el('cut-kicker');
    this.eCutTitle = this.el('cut-title');
    this.eCutText = this.el('cut-text');
    this.eCutHint = this.el('cut-hint');
    this.eFade = this.el('fade');
    this.eDpad = this.el('dpad');
    this.eDuck = this.el('duckyou');
    this.eDuckImg = this.el('duck-imgwrap');
    this.ePhone = this.el('phone-call');
    this.ePhonePick = this.el('pc-pick');
    this.ePhoneCut = this.el('pc-cut');
    if ('ontouchstart' in window) this.eDpad.classList.remove('hide');

    var self = this;
    this.eModal.addEventListener('click', function (e) {
      if (e.target === self.eModal && self.state.modal && self.state.modal.allowBackdropClose) self.closeModal(true);
    });
    this.ePhoto.addEventListener('click', function () { self.closePhoto(); });
    if (this.eDuck) this.eDuck.addEventListener('click', function () { self.hide(self.eDuck); });
    if (this.ePhonePick) this.ePhonePick.addEventListener('click', function () { self.phoneAnswer(); });
    if (this.ePhoneCut) this.ePhoneCut.addEventListener('click', function () { self.phoneCut(); });
  },

  /* ------------------------------------------------ generic ------------ */
  show: function (el) { if (el) el.classList.remove('hide'); },
  hide: function (el) { if (el) el.classList.add('hide'); },

  setTitle: function (on) { on ? this.show(this.eTitle) : this.hide(this.eTitle); },
  setHud: function (on) { on ? this.show(this.eHud) : this.hide(this.eHud); },
  hud: function (data) {
    if (data.floor != null) this.eHudFloor.textContent = data.floor;
    if (data.objective != null) this.eHudObj.textContent = data.objective;
    if (data.tokens != null) this.eHudTokens.textContent = data.tokens;
    if (data.status != null) this.eHudStatus.textContent = data.status;
    if (data.powers != null) this.eHudPowers.textContent = data.powers;
  },

  toast: function (text, ms, kind) {
    if (!this.eToasts) return;
    var d = document.createElement('div');
    d.className = 'toast' + (kind ? ' ' + kind : '');
    d.textContent = text;
    this.eToasts.appendChild(d);
    var self = this;
    setTimeout(function () {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, ms || 2200);
  },

  subtitle: function (speaker, text, ms) {
    if (!this.eSub) return;
    this.show(this.eSub);
    this.eSubSpeaker.textContent = speaker ? (speaker + ':') : '';
    this.eSubText.textContent = text;
    if (this.state.subTimer) clearTimeout(this.state.subTimer);
    var self = this;
    this.state.subTimer = setTimeout(function () { self.hide(self.eSub); }, ms || 2800);
  },
  clearSubtitle: function () {
    if (this.state.subTimer) clearTimeout(this.state.subTimer);
    this.hide(this.eSub);
  },

  prompt: function (text) {
    if (text) { this.ePrompt.textContent = text; this.show(this.ePrompt); }
    else this.hide(this.ePrompt);
  },

  /* --------------------------------------------- ringing phone prompt -- */
  phoneCall: function (onPick, onCut) {
    this.state.phonePick = onPick || null;
    this.state.phoneCut = onCut || null;
    if (this.ePhone) this.show(this.ePhone);
  },
  hidePhoneCall: function () {
    this.state.phonePick = null;
    this.state.phoneCut = null;
    if (this.ePhone) this.hide(this.ePhone);
  },
  phoneOpen: function () { return !!(this.ePhone && !this.ePhone.classList.contains('hide')); },
  phoneAnswer: function () {
    var f = this.state.phonePick;
    this.hidePhoneCall();
    if (f) f();
  },
  phoneCut: function () {
    var f = this.state.phoneCut;
    this.hidePhoneCall();
    if (f) f();
  },

  fade: function (on) {
    if (!this.eFade) return;
    if (on) this.eFade.classList.add('on'); else this.eFade.classList.remove('on');
  },

  /* ------------------------------------------------ DUCK YOU ----------- */
  // shows when the player switches tabs while the FINAL QUESTION is up
  duckyou: function (seconds) {
    var self = this;
    if (!this.eDuck) return;
    if (this.eDuckImg && !this.eDuckImg.firstChild) {
      this.eDuckImg.appendChild(this.imageNode('img_duckyou'));
    }
    this.show(this.eDuck);
    if (this.state.duckTimer) clearTimeout(this.state.duckTimer);
    this.state.duckTimer = setTimeout(function () { self.hide(self.eDuck); }, (seconds || 3) * 1000);
  },

  /* --------------- image node (real file or ALT placeholder) ---------- */
  imageNode: function (imageId, cls) {
    var spec = (typeof IMAGES !== 'undefined' && IMAGES[imageId]) ? IMAGES[imageId] : null;
    var alt = spec ? spec.alt : ('Missing image spec: ' + imageId);
    var file = spec ? spec.file : null;
    var wrap = document.createElement('div');
    wrap.className = 'imgnode';
    var ph = document.createElement('div');
    ph.className = 'ph';
    ph.innerHTML = '<b>PHOTO PLACEHOLDER' + (file ? ' &mdash; assets/' + file : '') + '</b>' + alt;
    var img = document.createElement('img');
    img.alt = alt;
    img.style.display = 'none';
    if (file) {
      img.onload = function () {
        ph.style.display = 'none';
        img.style.display = '';
      };
      img.onerror = function () {
        img.style.display = 'none';
        ph.style.display = '';
      };
      img.src = 'assets/' + file;
    }
    if (cls) img.className = cls;
    wrap.appendChild(img);
    wrap.appendChild(ph);
    return wrap;
  },

  /* ------------------------------------------------ modal -------------- */
  modalOpen: function () { return !!this.state.modal; },

  openModal: function (spec) {
    var self = this;
    spec = spec || {};
    this.state.modal = spec;
    this.eModalSpeaker.textContent = spec.speaker || '';
    this.eModalText.textContent = spec.text || '';

    // image
    while (this.eModalImgWrap.firstChild) this.eModalImgWrap.removeChild(this.eModalImgWrap.firstChild);
    if (spec.imageId) {
      this.eModalImgWrap.appendChild(this.imageNode(spec.imageId));
      this.eModalImgWrap.classList.remove('hide');
    } else {
      this.eModalImgWrap.classList.add('hide');
    }

    // choices
    this.eModalChoices.innerHTML = '';
    if (spec.choices && spec.choices.length) {
      spec.choices.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'btn' + (c.cls ? ' ' + c.cls : '');
        b.textContent = c.label;
        b.addEventListener('click', function () { self.closeModal(false, c.value); });
        self.eModalChoices.appendChild(b);
      });
      this.eModalChoices.classList.remove('hide');
      this.eModalInputWrap.classList.add('hide');
    } else {
      this.eModalChoices.classList.add('hide');
    }

    // input
    if (spec.input) {
      this.eModalInputWrap.classList.remove('hide');
      this.eModalInput.value = '';
      this.eModalInput.placeholder = spec.input.placeholder || '';
      this.eModalInput.maxLength = spec.input.maxLength || 24;
      this.eModalInput.type = spec.input.type || 'text';
      var inp = this.eModalInput;
      inp.onkeydown = function (ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
          var v = inp.value;
          self.closeModal(false);
          if (spec.onSubmit) spec.onSubmit(v);
        } else if (ev.key === 'Escape') {
          self.closeModal(true);
        }
      };
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
    } else {
      this.eModalInputWrap.classList.add('hide');
      this.eModalInput.onkeydown = null;
      var btn = this.eModalChoices.querySelector('button');
      if (btn) setTimeout(function () { try { btn.focus(); } catch (e) {} }, 30);
    }

    this.eModalHint.textContent = spec.hint || (spec.input ? 'TYPE + ENTER' : (spec.choices ? 'CLICK TO CHOOSE' : 'ENTER / CLICK TO CONTINUE'));
    this.show(this.eModal);

    if (spec.timeout) {
      spec._t0 = Date.now();
      var tick = function () {
        if (self.state.modal !== spec) return;
        var left = spec.timeout - (Date.now() - spec._t0);
        if (spec.showCountdown && left > 0) {
          self.eModalHint.textContent = (spec.hint || '') + '   [' + Math.ceil(left / 1000) + 's]';
        }
        if (left <= 0) {
          self.closeModal(false);
          if (spec.onTimeout) spec.onTimeout();
          return;
        }
        spec._timer = setTimeout(tick, 250);
      };
      spec._timer = setTimeout(tick, 250);
    }

    // click anywhere / enter => continue when there is nothing to do
    if (!spec.input && !spec.choices) {
      this.eModal.addEventListener('click', spec._clickClose = function () {
        self.closeModal(false);
      }, { once: true });
    }
    return spec;
  },

  closeModal: function (escaped, choiceValue) {
    var spec = this.state.modal;
    if (!spec) return;
    if (spec._timer) clearTimeout(spec._timer);
    if (spec._clickClose) this.eModal.removeEventListener('click', spec._clickClose);
    this.state.modal = null;
    this.hide(this.eModal);
    this.blurActive();
    if (spec.onClose) spec.onClose(escaped, choiceValue);
    if (choiceValue !== undefined && spec.onChoice) spec.onChoice(choiceValue);
  },

  // keyboard control must keep working after a modal/minigame closes
  blurActive: function () {
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    } catch (e) {}
  },

  /* ------------------------------------------------ photo overlay ------ */
  photoOpen: function () { return !!this.state.photo; },

  openPhoto: function (spec) {
    var self = this;
    spec = spec || {};
    this.state.photo = spec;
    while (this.ePhotoFig.firstChild) this.ePhotoFig.removeChild(this.ePhotoFig.firstChild);
    var node = this.imageNode(spec.imageId, spec.shake ? 'shake' : '');
    this.ePhotoFig.appendChild(node);
    this.ePhotoFig.appendChild(this.ePhotoCap);
    this.ePhotoCap.textContent = spec.caption || '';
    this.show(this.ePhoto);
    if (spec.seconds) {
      spec._timer = setTimeout(function () {
        if (self.state.photo === spec) self.closePhoto();
      }, spec.seconds * 1000);
    }
    return spec;
  },

  closePhoto: function () {
    var spec = this.state.photo;
    if (!spec) return;
    if (spec._timer) clearTimeout(spec._timer);
    this.state.photo = null;
    this.hide(this.ePhoto);
    if (spec.onDone) spec.onDone();
  },

  /* ------------------------------------------------ math lock ---------- */
  mathOpen: function () { return !!this.state.math; },

  openMath: function (spec) {
    var self = this;
    spec = spec || {};
    this.state.math = spec;
    this.eMathGrid.innerHTML = '';
    for (var i = 0; i < 14; i++) {
      var d = document.createElement('div');
      d.className = 'eq';
      d.style.left = (Math.random() * 84) + '%';
      d.style.top = (Math.random() * 90) + '%';
      d.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';
      d.textContent = spec.problems ? spec.problems[i % spec.problems.length] : '';
      this.eMathGrid.appendChild(d);
    }
    var q = spec.question || { a: 2, b: 3, op: '+' };
    spec.question = q;
    this.eMathQ.textContent = q.a + ' ' + q.op + ' ' + q.b + ' = ?';
    this.eMathInput.value = '';
    this.show(this.eMath);
    setTimeout(function () { try { self.eMathInput.focus(); } catch (e) {} }, 30);

    var limit = spec.timeLimit || 7;
    spec._t0 = Date.now();
    this.eMathInput.onkeydown = function (ev) {
      ev.stopPropagation();
      if (ev.key !== 'Enter') return;
      var val = parseInt(self.eMathInput.value, 10);
      var want = q.op === '+' ? q.a + q.b : q.a - q.b;
      if (val === want) {
        self.closeMath();
        if (spec.onResult) spec.onResult(true);
      } else {
        self.eMathInput.value = '';
        self.eMathInput.style.borderColor = '#ff4d4d';
        setTimeout(function () { self.eMathInput.style.borderColor = ''; }, 300);
        if (spec.onWrong) spec.onWrong();
      }
    };
    var tick = function () {
      if (self.state.math !== spec) return;
      var left = limit - (Date.now() - spec._t0) / 1000;
      self.eMathBar.style.width = Math.max(0, Math.min(100, (left / limit) * 100)) + '%';
      self.eMathHint.textContent = 'TYPE ANSWER + ENTER   [' + Math.max(0, left).toFixed(1) + 's]';
      if (left <= 0) {
        self.closeMath();
        if (spec.onResult) spec.onResult(false);
        return;
      }
      spec._raf = setTimeout(tick, 100);
    };
    tick();
    return spec;
  },

  closeMath: function () {
    var spec = this.state.math;
    if (!spec) return;
    if (spec._raf) clearTimeout(spec._raf);
    this.state.math = null;
    this.hide(this.eMath);
    this.blurActive();
  },

  /* ------------------------------------------------ panel -------------- */
  panelOpen: function () { return !!this.state.panel; },

  openPanel: function (spec) {
    var self = this;
    spec = spec || {};
    this.state.panel = spec;
    this.ePanelTitle.textContent = spec.title || '';
    this.ePanelBody.innerHTML = '';
    if (spec.body) {
      var p = document.createElement('div');
      p.innerHTML = spec.body;
      this.ePanelBody.appendChild(p);
    }
    if (spec.imageId) {
      this.ePanelBody.appendChild(this.imageNode(spec.imageId));
    }
    this.ePanelActions.innerHTML = '';
    (spec.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn' + (a.cls ? ' ' + a.cls : '');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        if (a.onPick) a.onPick();
      });
      self.ePanelActions.appendChild(b);
    });
    this.show(this.ePanel);
    return spec;
  },

  closePanel: function () {
    this.state.panel = null;
    this.hide(this.ePanel);
  },

  /* ------------------------------------------------ cutscene ----------- */
  cutsceneOpen: function () { return !!this.state.cutscene; },

  openCutscene: function (spec) {
    this.state.cutscene = spec || {};
    this.eCutKicker.textContent = this.state.cutscene.kicker || '';
    this.eCutTitle.textContent = this.state.cutscene.title || '';
    this.eCutText.textContent = this.state.cutscene.text || '';
    this.eCutHint.textContent = this.state.cutscene.hint || 'PRESS ENTER';
    this.show(this.eCut);
    return this.state.cutscene;
  },

  advanceCutscene: function () {
    var spec = this.state.cutscene;
    if (!spec) return;
    this.state.cutscene = null;
    this.hide(this.eCut);
    if (spec.onDone) spec.onDone();
  },
};

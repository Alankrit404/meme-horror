/* ============================================================================
   MEME HORRORS  --  assets.js  --  EVERYTHING YOU EDIT LIVES HERE
   ----------------------------------------------------------------------------
   * AUDIO_ASSETS : every sound the game asks for. Drop a real file into
                    assets/audio/<folder>/<name> and it plays automatically.
                    If the file is missing the game falls back to a chiptune
                    synth + browser text-to-speech voice (cringe mode ON).
   * IMAGES       : every photo. Drop files into assets/images/ .
                    If missing, a placeholder box with the ALT TEXT is shown.
   * FLOORS       : the three floors (themes, chasers, objectives, quizzes).
   * BOSS         : the final question + the accepted answers.
   ============================================================================ */
'use strict';

var GAME_NAME = 'MEME HORRORS';

var CONFIG = {
  version: '1.1.0',
  debug: true,          // debug helpers on window.Game.debug (safe to keep on)
  randomizeLayout: true,  // true = new layout each run (default). false = fixed layouts from the seeds below.
  speechFallback: true,   // use browser TTS voice when an audio file is missing
  speechLang: 'hi-IN',
  speechRate: 1.02,
  speechPitch: 0.8,
  subtitles: true,        // always show meme lines as subtitles
  tile: 16,
  viewW: 320,
  viewH: 180,
  playerSpeed: 4.15,      // tiles / second
  chaiMul: 1.34,
  lightRadius: 4.1,       // tiles
  torchMul: 1.55,
  catchRadius: 0.58,      // tiles
  runChallengeSeconds: 30,
  runChallengeStillLimit: 1.15, // seconds of standing still allowed
  phoneRingSeconds: 11,
  mathTimeLimit: 7,

  /* chase chaos: controls scramble for 3s the moment a chase starts.
     There is deliberately NO countdown / timer on screen for this. */
  scrambleSeconds: 3,
  scrambleCooldown: 9,

  /* tokens scoot away for 3s when you almost grab them (no timer shown). */
  tokenFleeSeconds: 3,
  tokenFleeCooldown: 9,
  tokenFleeRadius: 1.7,

  /* random spooky teleport from one place to another. */
  teleportMinSec: 20,
  teleportMaxSec: 38,

  /* The "most mentioned" AIRs of the meme world. The player is NOT told any of
     them in-game -- the objective only says "clear the AIR verification".
     Add / remove freely; matching ignores case and spaces. */
  airCodes: ['1', '2', '3', '42', '69', '100', '247', '420', '786', '1000'],

  volumes: { master: 0.85, bgm: 0.6, sfx: 0.9 }
};

/* ---------------------------------------------------------------------------
   GRAB-QUESTION BANK -- asked ONLY when Yogi ji or Amit Shah grab you.
   Every grab picks ONE random question:
     - Yogi ji  always keeps his own Chalisa role question  -> "hanuman"
     - Amit Shah always keeps his own Chalisa role question -> "angad"
     - both can also ask the three extra meme questions below
   Matching ignores case, spaces and punctuation (js/game.js -> matchAnswer).
   Right answer = boost, wrong answer = progress reset.
   Each question has its own audio slot (audio id). If the file is missing,
   the browser TTS reads the question instead.
   MODIHH never asks anything -- he just resets your progress.
   --------------------------------------------------------------------------- */
var CHALISA = {
  imageId: 'img_chalisa',
  timeLimit: 25,
  passLine: 'Sahi jawab! Boost mil gaya!',
  questions: [
    { id: 'yogi_role', asker: 'yogi', audio: 'line_q_yogi_role',
      q: 'MODI CHALISA ME YOGI JI KA ROLE KYA HAI?',
      answers: ['hanuman', 'hanumanji'] },
    { id: 'amit_role', asker: 'amitshah', audio: 'line_q_amit_role',
      q: 'MODI CHALISA ME AMIT SHAH JI KA ROLE KYA HAI?',
      answers: ['angad', 'angadji'] },
    { id: 'dadi_gorilla', asker: 'any', audio: 'line_q_dadi_gorilla',
      q: 'DADI HAI GORILLA TO BUA KYA HOGI?',
      answers: ['godzilla', 'godzila'] },
    { id: 'bhagwan', asker: 'any', audio: 'line_q_bhagwan',
      q: 'BHAGWAN KISKA SATH DETE HAIN?',
      answers: ['jo hindu hote hain', 'jo hindu hote h', 'hindu hote hain', 'hindu', 'hindus'] },
    { id: 'musalman', asker: 'any', audio: 'line_q_musalman',
      q: 'MUSALMANO KA SATH KAUN DETE HAIN?',
      answers: ['allah'] }
  ]
};

/* ---------------------------------------------------------------------------
   AUDIO MANIFEST
   kind  : 'bgm' (loops/channels) or 'sfx' (one shots)
   file  : path under assets/
   synth : chiptune fallback used when the file is missing
           drone | tense | chase | alarm | ring | jingle | beep | error | thud
           scream | sparkle | laser | noise | none
   say   : line spoken by TTS when the file is missing (and as subtitle)
   --------------------------------------------------------------------------- */
var AUDIO_ASSETS = {

  /* ---------- constant eerie / tense bed (plays the whole game) ---------- */
  bgm_tense:        { kind: 'bgm', file: 'audio/bgm/tense_ambient.ogg', loop: true, volume: 0.55, synth: 'tense',
                      desc: 'Constant eerie tense drone. ALWAYS playing underneath.' },
  bgm_chase:        { kind: 'bgm', file: 'audio/bgm/chase.ogg', loop: true, volume: 0.75, synth: 'chase',
                      desc: 'Chase theme: kicks in when a chaser sees you.' },
  bgm_floor1:       { kind: 'bgm', file: 'audio/bgm/floor1_lawden_bhojyam.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      say: 'Lawden bhojyam', lang: 'hi-IN',
                      desc: 'Floor 1 theme -- MODIHH FLOOR (lawden bhojyam).' },
  bgm_floor2:       { kind: 'bgm', file: 'audio/bgm/floor2_tech_team.ogg', loop: true, volume: 0.6, synth: 'tense',
                      desc: 'Floor 2 theme -- tech team server room.' },
  bgm_floor3:       { kind: 'bgm', file: 'audio/bgm/floor3_kavi_rison.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 theme -- Kavi Rison floor.' },
  bhojpuri_room_1:  { kind: 'bgm', file: 'audio/bgm/bhojpuri_room_1.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 room song #1 (rotates across rooms; hallways keep playing it).' },
  bhojpuri_room_2:  { kind: 'bgm', file: 'audio/bgm/bhojpuri_room_2.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 room song #2.' },
  bhojpuri_room_3:  { kind: 'bgm', file: 'audio/bgm/bhojpuri_room_3.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 room song #3.' },
  bhojpuri_room_4:  { kind: 'bgm', file: 'audio/bgm/bhojpuri_room_4.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 room song #4.' },
  bhojpuri_room_5:  { kind: 'bgm', file: 'audio/bgm/bhojpuri_room_5.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 room song #5.' },
  bhojpuri_room_6:  { kind: 'bgm', file: 'audio/bgm/bhojpuri_room_6.ogg', loop: true, volume: 0.6, synth: 'jingle',
                      desc: 'Floor 3 room song #6.' },
  bgm_kavi_challenge:{ kind: 'bgm', file: 'audio/bgm/kavi_run_30_sec.ogg', loop: true, volume: 0.75, synth: 'chase',
                      desc: '30 SECOND RUN theme (Kavi Rison motivation challenge).' },
  bgm_lockdown:     { kind: 'bgm', file: 'audio/bgm/tech_team_lock_down.ogg', loop: true, volume: 0.7, synth: 'alarm',
                      desc: 'Tech team lockdown (math trap).' },
  bgm_phone_ring:   { kind: 'bgm', file: 'audio/bgm/bihari_ji_ringtone.ogg', loop: true, volume: 0.7, synth: 'ring',
                      say: 'Bihari ji, aapka phone baj raha hai', lang: 'hi-IN',
                      desc: 'Ringtone: BIHARI JI AAPKA PHONE BAJ RAHA HAI.' },
  bgm_boss:         { kind: 'bgm', file: 'audio/bgm/final_boss.ogg', loop: true, volume: 0.7, synth: 'tense',
                      desc: 'Final boss (the question) theme.' },
  bgm_win:          { kind: 'bgm', file: 'audio/bgm/win.ogg', loop: false, volume: 0.8, synth: 'jingle',
                      desc: 'You did not chhod your BTech -- victory theme.' },
  bgm_gameover:     { kind: 'bgm', file: 'audio/bgm/gameover.ogg', loop: false, volume: 0.8, synth: 'thud',
                      desc: 'Game over theme.' },

  /* ---------- meme voice lines ---------- */
  line_modihh_lawden_bhojyam:{ kind: 'sfx', file: 'audio/sfx/modihh_lawden_bhojyam.ogg', volume: 1, synth: 'scream',
                      say: 'Lawden bhojyam!', lang: 'hi-IN',
                      desc: 'CAUGHT BY MODIHH on floor 1.' },
  line_rickroll:    { kind: 'sfx', file: 'audio/sfx/rickroll.ogg', volume: 1, synth: 'jingle',
                      say: 'Never gonna give you up, never gonna let you down', lang: 'en-US',
                      desc: 'Rick Astley statue / rick-roll trap (resets progress).' },
  line_alec_padhai: { kind: 'sfx', file: 'audio/sfx/kyu_nahi_ho_rhi_padhai.ogg', volume: 1, synth: 'scream',
                      say: 'Kyu nahi ho rahi padhai, batao!', lang: 'hi-IN',
                      desc: 'CAUGHT BY ALEC DADDY.' },
  line_alec_kuchu: { kind: 'sfx', file: 'audio/sfx/kuchu_puchu_tum_kaha_ho.ogg', volume: 1, synth: 'beep',
                      say: 'Kuchu puchu, tum kaha ho?', lang: 'hi-IN',
                      desc: 'Alec Daddy is APPROACHING (you hear him before you see him).' },
  line_tech_lock:   { kind: 'sfx', file: 'audio/sfx/tech_team_lock_kar_do.ogg', volume: 1, synth: 'error',
                      say: 'Tech team, lock kar do!', lang: 'hi-IN',
                      desc: 'CAUGHT BY THE TECH TEAM.' },
  line_tech_fail:   { kind: 'sfx', file: 'audio/sfx/tech_team_ne_lock_laga_diya.ogg', volume: 1, synth: 'error',
                      say: 'Tech team ne lock laga diya', lang: 'hi-IN',
                      desc: 'You failed the math lock.' },
  line_btech_chhod_do:{ kind: 'sfx', file: 'audio/sfx/tum_btech_ki_taiyari_chhod_do.ogg', volume: 1, synth: 'scream',
                      say: 'Tum BTech ki taiyari chhod do!', lang: 'hi-IN',
                      desc: 'Wrong AIR answer / not picking up the phone.' },
  line_uthaiye_na:  { kind: 'sfx', file: 'audio/sfx/uthaiye_na.ogg', volume: 1, synth: 'ring',
                      say: 'Uthaiye na! Uthaiye na!', lang: 'hi-IN',
                      desc: 'You ignored the ringing phone.' },
  line_phone_scream:{ kind: 'sfx', file: 'audio/sfx/phone_scream.ogg', volume: 1, synth: 'scream',
                      say: 'TUM BTECH KI TAIYARI CHHOD DO!', lang: 'hi-IN',
                      desc: 'You picked up the phone. Big mistake.' },
  line_tech_team_raid:{ kind: 'sfx', file: 'audio/sfx/tech_team_raid.ogg', volume: 1, synth: 'alarm',
                      say: 'Tech team raid!', lang: 'hi-IN',
                      desc: 'A random room opens: TECH TEAM RAID.' },
  line_kavi_motivation:{ kind: 'sfx', file: 'audio/sfx/kavi_motivation.ogg', volume: 1, synth: 'jingle',
                      say: 'Utho! Bhaago! Haar mat maano!', lang: 'hi-IN',
                      desc: 'CAUGHT BY KAVI RISON (forced 30 second run).' },
  line_kavi_run:    { kind: 'sfx', file: 'audio/sfx/kavi_bhaago.ogg', volume: 1, synth: 'beep',
                      say: 'Bhaago beta bhaago, tees second!', lang: 'hi-IN',
                      desc: 'Kavi Rison spots you: run challenge starts.' },
  line_air_pass:    { kind: 'sfx', file: 'audio/sfx/air_pass.ogg', volume: 1, synth: 'jingle',
                      say: 'Shabash! Tu topper hai.', lang: 'hi-IN',
                      desc: 'Correct AIR answer.' },
  line_boss_intro:  { kind: 'sfx', file: 'audio/sfx/boss_intro.ogg', volume: 1, synth: 'thud',
                      say: 'Aakhri sawaal. Dimaag lagao.', lang: 'hi-IN',
                      desc: 'Final boss appears.' },
  line_boss_fail:   { kind: 'sfx', file: 'audio/sfx/boss_fail.ogg', volume: 1, synth: 'scream',
                      say: 'Isliye Bombay nhi mila.', lang: 'hi-IN',
                      desc: 'You failed the final question: "Isliye Bombay nhi mila".' },
  line_secret_exit: { kind: 'sfx', file: 'audio/sfx/secret_exit.ogg', volume: 1, synth: 'sparkle',
                      say: 'Secret exit mil gaya. Ya lagta hai?', lang: 'hi-IN',
                      desc: 'The red SECRET EXIT gate on floor 1.' },
  line_flavor_modihh_see:{ kind: 'sfx', file: 'audio/sfx/modihh_sees_you.ogg', volume: 0.9, synth: 'none',
                      say: 'Achhe din aa gaye. Tumhare liye nahi.', lang: 'hi-IN',
                      desc: 'Modihh spotted you (flavor line).' },
  line_flavor_kavi_see:{ kind: 'sfx', file: 'audio/sfx/kavi_sees_you.ogg', volume: 0.9, synth: 'none',
                      say: 'Haar mat maano! Chalo bhaago!', lang: 'hi-IN',
                      desc: 'Kavi Rison spotted you (flavor line).' },
  line_flavor_rick: { kind: 'sfx', file: 'audio/sfx/rick_statue.ogg', volume: 0.9, synth: 'none',
                      say: 'Never gonna give you up.', lang: 'en-US',
                      desc: 'Talking to the Rick statue.' },
  line_flavor_gate: { kind: 'sfx', file: 'audio/sfx/secret_gate.ogg', volume: 0.9, synth: 'none',
                      say: 'Secret exit? Itne aasan se?', lang: 'hi-IN',
                      desc: 'Stepping into the red gate.' },
  line_q_air:       { kind: 'sfx', file: 'audio/sfx/q_air.ogg', volume: 1, synth: 'none',
                      say: 'Tera All India Rank kya hai?', lang: 'hi-IN',
                      desc: 'Question: the AIR verification question.' },
  line_q_math:      { kind: 'sfx', file: 'audio/sfx/q_math.ogg', volume: 1, synth: 'none',
                      say: 'Tech team lock. Hisab karo, jaldi!', lang: 'hi-IN',
                      desc: 'Question: the tech team math lock (random equation).' },
  line_flavor_caught_kavi:{ kind: 'sfx', file: 'audio/sfx/kavi_caught_you.ogg', volume: 0.9, synth: 'none',
                      say: 'Rukoge nahi! Chalte raho!', lang: 'hi-IN',
                      desc: 'Kavi Rison caught you.' },
  line_flavor_checkpoint:{ kind: 'sfx', file: 'audio/sfx/checkpoint.ogg', volume: 0.9, synth: 'none',
                      say: 'Yaha se dobara try kar sakte ho.', lang: 'hi-IN',
                      desc: 'Checkpoint saved.' },
  line_flavor_stop:  { kind: 'sfx', file: 'audio/sfx/you_stopped.ogg', volume: 0.9, synth: 'none',
                      say: 'Ruk gaye? Poora progress gaya.', lang: 'hi-IN',
                      desc: 'You stopped during the 30 second run.' },
  line_flavor_chalisa:{ kind: 'sfx', file: 'audio/sfx/chalisa_question.ogg', volume: 1, synth: 'none',
                      say: 'Modi Chalisa me mera role kya hai? Batao!', lang: 'hi-IN',
                      desc: 'Yogi ji / Amit Shah spot you (flavor line before the grab).' },
  line_q_yogi_role:{ kind: 'sfx', file: 'audio/sfx/q_yogi_role.ogg', volume: 1, synth: 'none',
                      say: 'Modi Chalisa me Yogi ji ka role kya hai?', lang: 'hi-IN',
                      desc: 'Question: Yogi ji asks his own Modi Chalisa role.' },
  line_q_amit_role:{ kind: 'sfx', file: 'audio/sfx/q_amit_role.ogg', volume: 1, synth: 'none',
                      say: 'Modi Chalisa me Amit Shah ji ka role kya hai?', lang: 'hi-IN',
                      desc: 'Question: Amit Shah asks his own Modi Chalisa role.' },
  line_q_dadi_gorilla:{ kind: 'sfx', file: 'audio/sfx/q_dadi_gorilla.ogg', volume: 1, synth: 'none',
                      say: 'Dadi hai gorilla, to bua kya hogi?', lang: 'hi-IN',
                      desc: 'Question: dadi hai gorilla to bua...?' },
  line_q_bhagwan:{ kind: 'sfx', file: 'audio/sfx/q_bhagwaan.ogg', volume: 1, synth: 'none',
                      say: 'Bhagwan kiska sath dete hain?', lang: 'hi-IN',
                      desc: 'Question: bhagwan kiska sath dete hain.' },
  line_q_musalman:{ kind: 'sfx', file: 'audio/sfx/q_musalman.ogg', volume: 1, synth: 'none',
                      say: 'Musalmano ka sath kaun dete hain?', lang: 'hi-IN',
                      desc: 'Question: musalmano ka sath kaun dete hain.' },
  line_q_painting_1:{ kind: 'sfx', file: 'audio/sfx/q_painting_1.ogg', volume: 1, synth: 'none',
                      say: 'How many people were there?', lang: 'en-US',
                      desc: 'Question: floor 3 painting #1 -- how many people were there?' },
  line_q_painting_2:{ kind: 'sfx', file: 'audio/sfx/q_painting_2.ogg', volume: 1, synth: 'none',
                      say: 'Kaha ja ke utti?', lang: 'hi-IN',
                      desc: 'Question: floor 3 painting #2 -- kaha jake utti?' },
  line_q_painting_3:{ kind: 'sfx', file: 'audio/sfx/q_painting_3.ogg', volume: 1, synth: 'none',
                      say: 'What follows?', lang: 'en-US',
                      desc: 'Question: floor 3 painting #3 -- what follows?' },
  line_q_painting_4:{ kind: 'sfx', file: 'audio/sfx/q_painting_4.ogg', volume: 1, synth: 'none',
                      say: 'Who is goat?', lang: 'en-US',
                      desc: 'Question: floor 3 painting #4 -- who is GOAT?' },
  line_q_boss:      { kind: 'sfx', file: 'audio/sfx/q_boss.ogg', volume: 1, synth: 'none',
                      say: 'Aakhri sawaal. Dhyan se socho.', lang: 'hi-IN',
                      desc: 'Question: the final boss question (record the actual question from the uploaded image).' },
  line_chalisa_pass:{ kind: 'sfx', file: 'audio/sfx/chalisa_pass.ogg', volume: 1, synth: 'jingle',
                      say: 'Sahi jawab! Boost mil gaya!', lang: 'hi-IN',
                      desc: 'Correct Modi Chalisa role -> BOOST.' },
  line_painting_wrong:{ kind: 'sfx', file: 'audio/sfx/painting_wrong.ogg', volume: 1, synth: 'scream',
                      say: 'Galat jawab. Progress reset.', lang: 'hi-IN',
                      desc: 'Wrong painting quiz answer (progress reset).' },
  line_duckyou:     { kind: 'sfx', file: 'audio/sfx/duck_you.ogg', volume: 1, synth: 'scream',
                      say: 'Duck you!', lang: 'en-US',
                      desc: 'You switched tabs during the final question.' },

  /* ---------- plain sound effects ---------- */
  sfx_token:        { kind: 'sfx', file: 'audio/sfx/token.ogg', volume: 0.9, synth: 'sparkle', desc: 'Picked an objective token.' },
  sfx_question:     { kind: 'sfx', file: 'audio/sfx/question_sting.ogg', volume: 0.7, synth: 'beep', desc: 'Question sting: plays whenever any question modal opens.' },
  sfx_checkpoint:   { kind: 'sfx', file: 'audio/sfx/checkpoint.ogg', volume: 0.9, synth: 'jingle', desc: 'Checkpoint activated.' },
  sfx_unlock:       { kind: 'sfx', file: 'audio/sfx/unlock.ogg', volume: 0.9, synth: 'jingle', desc: 'Stairs unlocked.' },
  sfx_locked:       { kind: 'sfx', file: 'audio/sfx/locked.ogg', volume: 0.9, synth: 'error', desc: 'Door still locked.' },
  sfx_flash:        { kind: 'sfx', file: 'audio/sfx/flash.ogg', volume: 0.9, synth: 'noise', desc: 'Photo / painting flash.' },
  sfx_jumpscare:    { kind: 'sfx', file: 'audio/sfx/jumpscare.ogg', volume: 1, synth: 'scream', desc: 'Generic jumpscare.' },
  sfx_error:        { kind: 'sfx', file: 'audio/sfx/error.ogg', volume: 0.9, synth: 'error', desc: 'Wrong / failed.' },
  sfx_catch:        { kind: 'sfx', file: 'audio/sfx/catch.ogg', volume: 1, synth: 'thud', desc: 'Something grabbed you.' },
  sfx_powerup:      { kind: 'sfx', file: 'audio/sfx/powerup.ogg', volume: 0.9, synth: 'sparkle', desc: 'Powerup collected.' },
  sfx_boost:        { kind: 'sfx', file: 'audio/sfx/boost.ogg', volume: 0.9, synth: 'sparkle', desc: 'BOOST granted (Modi Chalisa answered right).' },
  sfx_gate:         { kind: 'sfx', file: 'audio/sfx/gate.ogg', volume: 0.9, synth: 'laser', desc: 'Secret gate opened.' },
  sfx_stun:         { kind: 'sfx', file: 'audio/sfx/stun.ogg', volume: 0.9, synth: 'beep', desc: 'Chappal hit / chaser stunned.' },
  sfx_start:        { kind: 'sfx', file: 'audio/sfx/start.ogg', volume: 0.9, synth: 'jingle', desc: 'Run started.' },
  sfx_photo:        { kind: 'sfx', file: 'audio/sfx/photo.ogg', volume: 0.9, synth: 'beep', desc: 'Floor 3 painting appears.' },
  sfx_math_pass:    { kind: 'sfx', file: 'audio/sfx/math_pass.ogg', volume: 0.9, synth: 'jingle', desc: 'Math lock solved.' },
  sfx_win:          { kind: 'sfx', file: 'audio/sfx/win.ogg', volume: 0.9, synth: 'jingle', desc: 'Victory stinger.' },
  sfx_click:        { kind: 'sfx', file: 'audio/sfx/click.ogg', volume: 0.7, synth: 'beep', desc: 'UI click.' },
  sfx_hurt:         { kind: 'sfx', file: 'audio/sfx/hurt.ogg', volume: 0.9, synth: 'thud', desc: 'Progress went poof.' }
};

/* ---------------------------------------------------------------------------
   IMAGE MANIFEST  (alt text is shown whenever the file is missing)
   --------------------------------------------------------------------------- */
var IMAGES = {
  img_boss_question:{ file: 'images/boss_question.jpg',   alt: 'FINAL BOSS QUESTION -- the question image goes here. Replace assets/images/boss_question.jpg.' },
  img_duckyou:      { file: 'images/duck_you.jpg',        alt: 'DUCK YOU -- you switched tabs during the final question (upload later).' },
  img_secret_exit:  { file: 'images/secret_exit.jpg',     alt: 'SECRET EXIT gate photo (upload later).' },
  img_rick_statue:  { file: 'images/rick_statue.jpg',     alt: 'Rick Astley statue in the secret room (upload later).' },
  img_modihh_jumpscare:{ file: 'images/modihh_jumpscare.jpg', alt: 'Modihh jumpscare -- LAWDEN BHOJYAM (upload later).' },
  img_yogi_jumpscare:{ file: 'images/yogi_jumpscare.jpg', alt: 'Yogi ji catch screen (upload later).' },
  img_amit_jumpscare:{ file: 'images/amit_jumpscare.jpg', alt: 'Amit Shah catch screen (upload later).' },
  img_chalisa:      { file: 'images/modi_chalisa.jpg',    alt: 'MODI CHALISA role question art (upload later).' },
  img_alec_catch:  { file: 'images/alec_catch.jpg',     alt: 'Alec Daddy catches you -- KYU NAHI HO RHI PADHAI (upload later).' },
  img_iitb_lock: { file: 'images/iitb_lock.jpg',    alt: 'TECH TEAM lockdown screen -- lock kar do (upload later).' },
  img_kavi_motivation:{ file: 'images/kavi_motivation.jpg', alt: 'Kavi Rison motivation poster -- UTHO BHAAGO (upload later).' },
  img_tech_team_raid:{ file: 'images/tech_team_raid.jpg', alt: 'TECH TEAM RAID! announcement art (upload later).' },
  img_phone_bihari: { file: 'images/phone_bihari_ji.jpg', alt: 'BIHARI JI AAPKA PHONE BAJ RAHA HAI (upload later).' },
  img_painting_1:   { file: 'images/painting_1.jpg',      alt: 'Floor 3 painting #1 -- 2 seconds on screen, then its question (upload later).' },
  img_painting_2:   { file: 'images/painting_2.jpg',      alt: 'Floor 3 painting #2 -- 2 seconds on screen, then its question (upload later).' },
  img_painting_3:   { file: 'images/painting_3.jpg',      alt: 'Floor 3 painting #3 -- 2 seconds on screen, then its question (upload later).' },
  img_painting_4:   { file: 'images/painting_4.jpg',      alt: 'Floor 3 painting #4 -- 2 seconds on screen, then its question (upload later).' },
  img_gameover:     { file: 'images/gameover.jpg',        alt: 'Game over screen (upload later).' },
  img_win:          { file: 'images/win.jpg',             alt: 'Victory screen -- BTech ki taiyari nahi chhodi (upload later).' }
};

/* ---------------------------------------------------------------------------
   FINAL BOSS  (after floor 3)
   The accepted answer is set in answers[]. An empty answers[] keeps the old
   placeholder mode where any non-empty answer wins.
   Answers are matched ignoring case, spaces and punctuation.
   --------------------------------------------------------------------------- */
var BOSS = {
  imageId: 'img_boss_question',
  answers: ['2520'],
  timeLimit: 90,            // seconds
  attempts: 3,
  speaker: 'EXAM CELL',
  text: 'FINAL QUESTION.\nZindagi ka sabse bada sawaal.\n(Question image goes here -- replace assets/images/boss_question.jpg)',
  wrongLine: 'ISLIYE BOMBAY NHI MILA'
};

/* ---------------------------------------------------------------------------
   THE THREE FLOORS  (bigger maps: 64x40 tiles, 4x3 rooms, 3 checkpoints)
   --------------------------------------------------------------------------- */
var FLOORS = [
  {
    id: 1,
    name: 'FLOOR 1 // LAWDEN BHOJYAM',
    short: 'FLOOR 1/3',
    kicker: 'MODIHH FLOOR',
    seed: 112024,
    width: 64, height: 40, gridCols: 4, gridRows: 3,
    bgm: 'bgm_floor1',
    palette: { floor: '#241503', dot: '#33200a', wall: '#6b3200', wallTop: '#c96a00', accent: '#0f9d58', light: '#ffcf8a', dark: '#120a02' },
    objective: 'Collect 5 ACHHE DIN tokens, then take the stairs. Modihh, Yogi ji and Amit Shah are roaming.',
    tokenLabel: 'ACHHE DIN TOKEN',
    tokens: 5, checkpoints: 3, powerups: 3,
    phones: 0, terminals: 0, paintings: 0, raids: 0, gate: true,
    enemies: [
      { id: 'modi', name: 'MODIHH', consequence: 'modi', sprite: 'modi',
        speedPatrol: 2.35, speedChase: 3.45, detect: 6.4, hear: 9,
        flavorSee: { speaker: 'MODIHH', text: 'Achhe din aa gaye. Tumhare liye nahi.', sfx: 'line_flavor_modihh_see' } },
      { id: 'yogi', name: 'YOGI JI', consequence: 'chalisa', sprite: 'yogi',
        speedPatrol: 2.5, speedChase: 3.6, detect: 6.8, hear: 10,
        flavorSee: { speaker: 'YOGI JI', text: 'Batao... Modi Chalisa me mera role kya hai?', sfx: 'line_flavor_chalisa' } },
      { id: 'amitshah', name: 'AMIT SHAH', consequence: 'chalisa', sprite: 'amitshah',
        speedPatrol: 2.2, speedChase: 3.5, detect: 6.6, hear: 11,
        flavorSee: { speaker: 'AMIT SHAH', text: 'Amit Shah ka role? Soch ke batao.', sfx: 'line_flavor_chalisa' } }
    ],
    intro: [
      'The hostel corridor smells like burnt notes and photocopied notes.',
      'MODIHH walks these halls whispering: LAW DEN BHOJ YAM. Rick Astley got promoted, Modihh took over.',
      'With him: YOGI JI and AMIT SHAH.'
    ],
    clear: [
      'MODIHH: "Mitrooon... ye ladka nikal gaya."'
    ]
  },
  {
    id: 2,
    name: 'FLOOR 2 // TECH TEAM RAID',
    short: 'FLOOR 2/3',
    kicker: 'TECH TEAM FLOOR',
    seed: 4242,
    width: 64, height: 40, gridCols: 4, gridRows: 3,
    bgm: 'bgm_floor2',
    palette: { floor: '#04140f', dot: '#0a2418', wall: '#0b3d2c', wallTop: '#12a06a', accent: '#0ff0a0', light: '#9dffe0', dark: '#02100a' },
    objective: 'Grab 5 RAID-PROOF tokens and clear the AIR verification at a terminal.',
    tokenLabel: 'RAID-PROOF TOKEN',
    tokens: 5, checkpoints: 3, powerups: 3,
    phones: 4, terminals: 3, paintings: 0, raids: 3, gate: false,
    enemies: [
      { id: 'alakh', name: 'ALEC DADDY', consequence: 'alakh', sprite: 'alakh',
        speedPatrol: 2.5, speedChase: 3.55, detect: 6.8, hear: 10,
        flavorSee: { speaker: 'ALAKH', text: 'Kuchu puchu... tum kaha ho?', sfx: 'line_alec_kuchu' } },
      { id: 'techteam', name: 'IITB ALUMNI', consequence: 'saransh', sprite: 'techteam', tagAlways: true,
        speedPatrol: 2.3, speedChase: 3.4, detect: 6.2, hear: 9,
        flavorSee: { speaker: 'IITB ALUMNI', text: 'Tech team, lock kar do!', sfx: 'line_tech_lock' } }
    ],
    intro: [
      'Floor 2 is the server room. It is always 2 AM here.',
      'ALEC DADDY is still teaching.',
      'The TECH TEAM answers to an IITB ALUMNI'
    ],
    clear: [
      'TECH TEAM: "Server down... banda nikal gaya."',
      'Alec Daddy: "Kal se class 6 baje. Bhaag yaha se."'
    ]
  },
  {
    id: 3,
    name: 'FLOOR 3 // KAVI RISON RUNNING CLUB',
    short: 'FLOOR 3/3',
    kicker: 'BHOJPURI FLOOR',
    seed: 3007,
    width: 64, height: 40, gridCols: 4, gridRows: 3,
    bgm: 'bgm_floor3',
    palette: { floor: '#160423', dot: '#24082f', wall: '#45125c', wallTop: '#a03bd0', accent: '#ff9e2c', light: '#ffd6a0', dark: '#0d0216' },
    objective: 'Find 4 paintings (2 sec each) and answer the question hidden in each one. Wrong answer = progress reset.',
    tokenLabel: 'PAINTING',
    tokens: 0, checkpoints: 3, powerups: 2,
    phones: 0, terminals: 0, paintings: 4, raids: 0, gate: false,
    roomSongs: ['bhojpuri_room_1', 'bhojpuri_room_2', 'bhojpuri_room_3',
                'bhojpuri_room_4', 'bhojpuri_room_5', 'bhojpuri_room_6'],
    /* one question per painting -- answers are matched ignoring case/spaces */
    quiz: [
      { q: 'HOW MANY PEOPLE WERE THERE?', answers: ['3', 'three'], audio: 'line_q_painting_1' },
      { q: 'KAHA JAKE UTTI?', answers: ['ghare', 'ghar', 'gharey', 'home'], audio: 'line_q_painting_2' },
      { q: 'WHAT FOLLOWS?', answers: ['money'], audio: 'line_q_painting_3' },
      { q: 'WHO IS GOAT?', answers: ['aishwarya', 'aishwarya rai', 'aish'], audio: 'line_q_painting_4' }
    ],
    enemies: [
      { id: 'ravi', name: 'KAVI RISON', consequence: 'ravi', sprite: 'ravi',
        speedPatrol: 2.6, speedChase: 4.5, detect: 7.2, hear: 11,
        flavorSee: { speaker: 'KAVI RISON', text: 'Haar mat maano! Chalo bhaago!', sfx: 'line_flavor_kavi_see' } }
    ],
    intro: [
      'KAVI RISON is here. He does not want to hurt you. He just wants you to RUN.',
      'The walls hold paintings. They flicker when you stare at them.',
      'Upstairs, a question paper is waiting.'
    ],
    clear: [
      'KAVI RISON: "Shabash! Aage badho, top karoge."',
      'The stairs lead up. Something upstairs is ...........'
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG: CONFIG, AUDIO_ASSETS: AUDIO_ASSETS, IMAGES: IMAGES, BOSS: BOSS,
    FLOORS: FLOORS, CHALISA: CHALISA, GAME_NAME: GAME_NAME
  };
}

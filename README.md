# MEME HORRORS: LAWDEN BHOJYAM

A 2D retro pixel horror game about surviving your own BTech. Three floors, six
roaming horrors, quizzes that punish wrong answers with a full progress reset,
and one final question.

The game itself has zero runtime dependencies and no build step: it is plain
HTML + Canvas + classic scripts. Open `index.html` in a browser and you are in
the hostel corridor. All project tooling and tests are JavaScript too.

```
btech-horror/
├── index.html            <- open this
├── css/style.css         <- CRT / scanlines / pixel UI
├── js/
│   ├── assets.js         <- ALL CONTENT: audio manifest, photos, floors, boss, quiz  (EDIT ME)
│   ├── audio.js          <- music channels + chiptune/TTS fallback engine
│   ├── dungeon.js        <- seeded room+corridor generator (validated), 64x40 maps
│   ├── entities.js       <- player, chaser AI, pixel sprites
│   ├── ui.js             <- HUD, subtitles, modals, images, math lock, DUCK YOU
│   └── game.js           <- floors, consequences, checkpoints, quizzes, boss
├── assets/
│   ├── audio/            <- drop your meme audio here (checklist in its README)
│   └── images/           <- drop your .jpg photos here (checklist in its README)
└── tools/                <- check.js, gen-docs.js (deno) + serve.js, smoke.js (node)
```

## Run it

* Easiest: double-click `index.html` (works from `file://`, no server needed).
* Or serve it: `node tools/serve.js` (or `npm start`) then open
  <http://localhost:8000>.

Click **START GAME** first — browsers only allow audio after a click. The very
first thing you hear is the constant eerie drone plus whatever files you dropped in.

## Controls

| key | action |
|-----|--------|
| `WASD` / arrows | walk |
| `E` | interact (phone, AIR terminal, painting, SECRET EXIT gate) |
| `P` / `C` | while the phone rings: PICK UP / CUT the call (side panel buttons) |
| `Q` | throw chappal — stuns the nearest chaser for 6s |
| `ENTER` / `SPACE` | advance cutscene, skip the 2 second image |
| `ESC` | pause menu |
| `M` | mute |
| touch | on-screen d-pad + E/Q buttons appear automatically |

Tokens are picked up by walking over them. Checkpoints save automatically when
you touch them. **Every answer the game asks for is matched ignoring case,
spaces and punctuation.**

## The three floors

### FLOOR 1 — LAWDEN BHOJYAM (Modihh floor, 5 tokens)
* Roaming: **MODIHH**, **YOGI JI** and **AMIT SHAH**.
* Catch MODIHH and he whispers *"lawden bhojyam"* and resets your progress to
  the last checkpoint.
* Get caught by **Yogi ji or Amit Shah** and they ask ONE random question from
  their grab bank. Each of them always keeps his own Modi Chalisa role question:
  *"MODI CHALISA ME YOGI JI KA ROLE KYA HAI?"* → answer **hanuman**;
  *"MODI CHALISA ME AMIT SHAH JI KA ROLE KYA HAI?"* → answer **angad**.
  Both can also ask the three extra meme questions:

  | question | accepted answer |
  |----------|-----------------|
  | DADI HAI GORILLA TO BUA KYA HOGI? | `godzilla` |
  | BHAGWAN KISKA SATH DETE HAIN? | `hindu` / "jo hindu hote hain" |
  | MUSALMANO KA SATH KAUN DETE HAIN? | `allah` |

  (MODIHH never asks a question — he just resets you.)
  Right answer = **BOOST** (CHAI + NAZAR SHIELD + one random powerup + 3.5s of
  mercy). Wrong answer or timeout = progress reset. Every question has its own
  audio slot; if the file is missing, the browser TTS reads the question aloud.
* Also in the walls: a red **SECRET EXIT** gate. Inside there is no exit, only a
  **Rick Astley statue** with a tape. Pressing play = classic rick roll = your
  progress is reset. Walking away gets you a free NAZAR SHIELD.
* Clear it by collecting **5 ACHHE DIN tokens**, then take the stairs.

### FLOOR 2 — TECH TEAM RAID (5 tokens + AIR, no hints)
* Roaming: **ALEC DADDY** and the **IITB ALUMNI**.
  The alumni runs the tech team and he is impossible to miss: neon green hoodie,
  glowing visor, laptop, an always-on name tag and a pulsing green halo; the
  halo turns red when he is chasing you.
* Objective: **5 RAID-PROOF tokens** *and* one verified **AIR** answer.
* Room events when you enter rooms:
  * **TECH TEAM RAID!** — every chaser gets alerted to that room.
  * a random *"TERA ALL INDIA RANK KYA HAI?"* question. The game **never tells
    you which rank works** (the accepted list is `CONFIG.airCodes` in
    `js/assets.js` — the most-mentioned AIRs of the meme world). Wrong answer:
    **tum btech ki taiyari chhod do**, and you drop a token.
* AIR terminals in the rooms do the same thing, but on purpose.
* **Phones ring.** Bihari ji always calls at the worst time. A side-of-screen
  call panel appears with **PICK UP** and **CUT** (or press `P` / `C`).
  Pick it up and you get screamed at (*"TUM BTECH KI TAIYARI CHHOD DO!"*) and
  lose a token. Cut it (or let it ring out) and it plays *"Uthaiye na!"* — the
  ringing tells every chaser exactly where you are.
* Clear it with all 5 tokens + a passed AIR check, then take the stairs.

### FLOOR 3 — KAVI RISON RUNNING CLUB (Bhojpuri floor, 4 paintings)
* Roaming: **KAVI RISON**. He does not want to kill you, he wants you to *run*.
* **6 Bhojpuri tracks** rotate across the rooms. The current track keeps playing
  in the hallways; stepping into another room switches it. Drop your songs as
  `bhojpuri_room_1.ogg` … `bhojpuri_room_6.ogg` (see `assets/audio/README.md`).
* **4 PAINTINGS on the walls.** Press `E` next to one: it appears for exactly
  **2 SECONDS ONLY**, then asks its question. Each painting is one quiz:

  | painting | question | accepted answers | audio slot |
  |----------|----------|------------------|------------|
  | #1 | HOW MANY PEOPLE WERE THERE? | `3`, `three` | `q_painting_1.ogg` |
  | #2 | KAHA JAKE UTTI? | `ghare`, `ghar`, `home` | `q_painting_2.ogg` |
  | #3 | WHAT FOLLOWS? | `money` | `q_painting_3.ogg` |
  | #4 | WHO IS GOAT? | `aishwarya`, `aishwarya rai`, `aish` | `q_painting_4.ogg` |

  Right answer = the painting is yours + a random powerup. Wrong answer =
  **progress reset** (the painting stays, you can try again).
* Kavi spots you → **30 SECOND RUN**: keep moving. Stand still for more than
  ~1 second and he resets your progress to the last checkpoint. Survive the 30
  seconds and he rewards you with CHAI.
* Clear all 4 paintings, then take the stairs.

## Chaos rules (every floor)

* **Chase = scrambled controls.** The moment a chaser switches to chase, every
  direction key is remapped for 3 seconds. There is no countdown on screen —
  your brain just has to deal with it. It has a cooldown, so it does not
  re-trigger every frame.
* **Tokens run.** Get within about 1.7 tiles of an uncollected token and it
  scoots away for 3 seconds, one walkable tile at a time, picking the direction
  furthest from you. No timer is shown. Corner it after it stops.
* **Random teleports.** Every 20-38 seconds the floor yanks you somewhere else
  (screen flash + stinger). It never happens during Kavi's forced run, and it
  will not drop you next to a chaser. No countdown is displayed.
* **Question audio.** Every question modal plays a short sting
  (`sfx_question`) plus a voice line for that exact question. Every question
  has its own slot under `assets/audio/sfx/`:
  * grab questions — `q_yogi_role.ogg`, `q_amit_role.ogg`,
    `q_dadi_gorilla.ogg`, `q_bhagwaan.ogg`, `q_musalman.ogg`
  * AIR verification — `q_air.ogg`
  * floor 3 paintings — `q_painting_1.ogg` … `q_painting_4.ogg`
  * tech-team math lock — `q_math.ogg`
  * final boss — `q_boss.ogg`

  Missing files fall back to the browser TTS voice. The full checklist is in
  `assets/audio/README.md`.

### FINAL BOSS — after floor 3
The stairs lead to the final question. The accepted answer is configured in
`BOSS.answers` in `js/assets.js`; the question image slot is still waiting for
`assets/images/boss_question.jpg`, and its question voice line goes in
`audio/sfx/q_boss.ogg`. While `answers` is empty the game falls back
to placeholder mode: the question image slot shows the alt text and any answer
wins, so the ending stays testable.

* Three attempts, 90 seconds, 25 seconds fewer per retry.
* **Wrong answer says *"Isliye Bombay nhi mila."*** Fail all three attempts and
  you get the viva line on the game-over screen.
* **Switch tabs while the final question is up and the game shows you
  `DUCK YOU`** — a big red flashing jumpscare (and the question timer kept
  running while you were gone).

## Consequence table (what a catch actually costs you)

| who | sound | what happens |
|-----|-------|--------------|
| **MODIHH** | `line_modihh_lawden_bhojyam` — "lawden bhojyam" | full progress reset: respawn at the last checkpoint, every token collected after that checkpoint goes back on the map |
| **YOGI JI** | `line_flavor_chalisa` or the question's own line | asks one random grab question (his role → `hanuman`, or one of the shared three): right = BOOST, wrong = full progress reset |
| **AMIT SHAH** | `line_flavor_chalisa` or the question's own line | asks one random grab question (his role → `angad`, or one of the shared three): right = BOOST, wrong = full progress reset |
| **MODIHH when caught** | `line_modihh_lawden_bhojyam` | never asks a question |
| **ALEC DADDY** | `line_alec_padhai` — "kyu nhi ho rhi padhai" | you lose 1 collected token + respawn at the checkpoint (keeps the rest) |
| **Alec gets close** | `line_alec_kuchu` — "kuchu puchu tum kaha ho" | approach stinger, then he starts hunting |
| **IITB ALUMNI** | `line_tech_lock` — "tech team lock kar do" | screen freezes, then the math bombardment: solve e.g. `2 + 3` in 7 seconds. Right = the lock opens and you get 3s of mercy. Wrong/timeout = `line_tech_fail` + full progress reset |
| **KAVI RISON** | `line_kavi_motivation` — "Utho! Bhaago! Haar mat maano!" | forced 30 second run; stop moving and progress resets, survive and gain CHAI |
| **Painting, wrong answer** | `line_painting_wrong` | full progress reset (paintings collected after the last checkpoint go back too) |
| **Phone (picked up)** | `line_phone_scream` | a token falls out of your bag and every chaser is alerted |
| **Phone (CUT / ignored)** | `line_uthaiye_na` | the call stops ringing, chasers beeline for the phone |
| **Wrong AIR answer** | `line_btech_chhod_do` | you lose a token, chasers alerted |
| **NAZAR SHIELD active** | `sfx_powerup` | the catch is absorbed, nothing lost |
| **Tab switch during the final question** | `line_duckyou` + `sfx_jumpscare` | `DUCK YOU` |

Progress resets are checkpoint-aware: whatever you collected *before* touching
the last checkpoint is safe forever.

## Powerups

| powerup | effect |
|---------|--------|
| CHAI | +34% speed for 10s |
| CHAPPAL | press `Q` — stun the nearest chaser within 4 tiles for 6s (max 3) |
| NAZAR SHIELD | absorbs one catch completely |
| TORCH | much bigger light radius for 25s |
| TOPPER NOTES | darkness lifts and tokens glow for 12s (map reveal) |

Paintings, correct AIR answers, correct Chalisa answers, surviving Kavi's run
and the safe secret-room choice all hand you one of these.

## Adding your own audio and photos

* `assets/audio/README.md` — every track, ringtone and meme line, with the exact
  filename and the line you are supposed to hear. Nothing is included (those
  memes are other people's audio); the game falls back to chiptune + a robot
  TTS voice saying the lines, which is somehow even more cringe.
* `assets/images/README.md` — every photo, when it is shown, the alt text used
  as a placeholder until you upload it, and the full quiz answer table.

Both files are generated from `js/assets.js`:

```
deno run --allow-read --allow-write tools/gen-docs.js
```

## Tweaking the game

All knobs are in `js/assets.js`:

* `CONFIG` — player speed, light radius, catch radius, run-challenge length,
  the accepted AIR list (`airCodes`), math timer, volumes, speech fallback,
  `randomizeLayout`, and the chaos knobs: `scrambleSeconds` /
  `scrambleCooldown`, `tokenFleeSeconds` / `tokenFleeCooldown` /
  `tokenFleeRadius`, `teleportMinSec` / `teleportMaxSec`.
* `CHALISA` — the grab-question bank (`questions[]`). Each entry has an
  `asker` (`yogi`, `amitshah` or `any`), question text, accepted `answers`, and
  its own `audio` id. Yogi's role answer is *hanuman*, Amit Shah's is *angad*.
  Answers are matched by `matchAnswer` in `js/game.js` (case, spaces and
  punctuation are ignored, so "Yogi is Hanuman!" passes too).
* `AUDIO_ASSETS` / `IMAGES` — the manifests above.
* `FLOORS` — per floor: seed, size (`width`/`height`, room grid
  `gridCols`/`gridRows`), palette, objective, token/painting counts,
  phones/terminals/raid rooms, room songs, chaser stats, the floor 3 `quiz`
  list, intro and clear text. Layouts are randomized by default; set
  `CONFIG.randomizeLayout = false` to use the fixed `seed` layouts instead.
* `BOSS` — the final question image id, accepted answers, timer, attempts, and
  the `wrongLine` ("Isliye Bombay nhi mila").

Cheat/debug console (handy while building your own floors), from the browser
devtools:

```js
Game.debug.floor(1)        // jump to floor 2 (0-based)
Game.debug.tokens()        // collect every objective token
Game.debug.paintings()     // mark all floor-3 paintings as collected
Game.debug.air()           // fake a passing AIR answer
Game.debug.catch('modi')   // trigger a chaser consequence by hand
Game.debug.catch('yogi')   // ...aliases work too: modihh, alec, kavi, iitb, saransh
Game.debug.chalisa()       // open a random grab question directly
Game.debug.chalisaQ('dadi_gorilla')   // force a specific question id
Game.debug.chalisaQ('amit_role', 'amitshah')
Game.debug.ready()         // clear i-frames/shield so scripted catches fire
Game.debug.phone()         // start the Bihari ji phone event (side prompt)
Game.debug.phonePickup()   // press PICK UP for the ringing phone
Game.debug.phoneCut()      // press CUT for the ringing phone
Game.debug.scramble()      // scramble the controls for 3s (no countdown)
Game.debug.teleport()      // yank the player to a random far tile
Game.debug.airAsk()        // open the AIR question
Game.debug.gate()          // open the SECRET EXIT
Game.debug.boss()          // jump to the final question
Game.debug.duck()          // test the DUCK YOU overlay
Game.debug.win()           // show the victory screen
Game.debug.music()         // what is playing right now
```

## Verifying it (optional, for tinkerers)

```
npm install                                   # once: installs playwright-core only
npm run check                                 # syntax, level generation, asset ids
npm run test:smoke                            # headless playthrough in Chromium
```

`node tools/smoke.js` runs the playthrough directly. It uses the Chromium
already installed in the Playwright cache, or `CHROME_PATH` if you set one.

`check.js` regenerates all three floors and proves spawn→exit connectivity, that
every token/painting/checkpoint/phone/terminal is reachable, that the maps are
really bigger (>= 60x38), that floors 1-2 carry 5 tokens, that no enemy uses a
sprite that does not exist, that every enemy consequence has a handler, that the
secret gate has a walkable neighbour, that no chaser spawns next to you, that the
CHALISA grab bank is complete (role answers + per-question audio ids), and that
every audio/image id used in code exists in the manifest.

`smoke.js` drives the real game through the whole run — walking, camera, locked
stairs, 5 tokens, checkpoints, the secret gate + rick statue choice, Modihh's
reset, the shield absorbing a catch, the grab-question bank (role + the three
extra questions), AIR right/wrong (including `Air 247` with mixed case), the
ringing phone with PICK UP / CUT, chase control scrambling, random teleporting,
tokens running away, Alec Daddy's catch, the IITB alumni math lock, the
2-second paintings and their quizzes (right + wrong), Kavi's 30s run, the boss,
the wrong-answer line, the DUCK YOU tab-switch overlay and the victory screen —
112 assertions, screenshots in `/tmp/opencode/shots`.

## Notes

* Stage intros only set the mood — they do not hand out instructions. The
  objective HUD (top-left) is the only reminder of what a floor wants.
* Meme audio and photos are **not bundled** (copyright + your uploads are on the
  way). The game is fully playable without them thanks to the synth/TTS fallback.
* Designed for a keyboard on desktop; a touch d-pad appears on phones/tablets.
* Everything runs offline. No tracking, no build. The game needs no npm; the
  optional headless test harness uses the `playwright-core` dev dependency.

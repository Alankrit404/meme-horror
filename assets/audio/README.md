# Audio checklist (assets/audio/)

Drop your files here with these exact names. **The game runs fine without them** —
every missing sound is replaced by a built-in chiptune synth, and every missing
voice line is spoken out loud by the browser's text-to-speech voice
(`CONFIG.speechFallback` in `js/assets.js`, set it to `false` to use silence instead).

`bgm/` = looping tracks, `sfx/` = one shots + meme voice lines.

## Background music (loop)

| id | file | what it should be | missing-file fallback |
|----|------|-------------------|-----------------------|
| `bgm_tense` | `audio/bgm/tense_ambient.ogg` | Constant eerie tense drone. ALWAYS playing underneath. | chiptune: tense |
| `bgm_chase` | `audio/bgm/chase.ogg` | Chase theme: kicks in when a chaser sees you. | chiptune: chase |
| `bgm_floor1` | `audio/bgm/floor1_lawden_bhojyam.ogg` | Floor 1 theme -- MODIHH FLOOR (lawden bhojyam). | chiptune: jingle + TTS voice |
| `bgm_floor2` | `audio/bgm/floor2_tech_team.ogg` | Floor 2 theme -- tech team server room. | chiptune: tense |
| `bgm_floor3` | `audio/bgm/floor3_kavi_rison.ogg` | Floor 3 theme -- Kavi Rison floor. | chiptune: jingle |
| `bhojpuri_room_1` | `audio/bgm/bhojpuri_room_1.ogg` | Floor 3 room song #1 (rotates across rooms; hallways keep playing it). | chiptune: jingle |
| `bhojpuri_room_2` | `audio/bgm/bhojpuri_room_2.ogg` | Floor 3 room song #2. | chiptune: jingle |
| `bhojpuri_room_3` | `audio/bgm/bhojpuri_room_3.ogg` | Floor 3 room song #3. | chiptune: jingle |
| `bhojpuri_room_4` | `audio/bgm/bhojpuri_room_4.ogg` | Floor 3 room song #4. | chiptune: jingle |
| `bhojpuri_room_5` | `audio/bgm/bhojpuri_room_5.ogg` | Floor 3 room song #5. | chiptune: jingle |
| `bhojpuri_room_6` | `audio/bgm/bhojpuri_room_6.ogg` | Floor 3 room song #6. | chiptune: jingle |
| `bgm_kavi_challenge` | `audio/bgm/kavi_run_30_sec.ogg` | 30 SECOND RUN theme (Kavi Rison motivation challenge). | chiptune: chase |
| `bgm_lockdown` | `audio/bgm/tech_team_lock_down.ogg` | Tech team lockdown (math trap). | chiptune: alarm |
| `bgm_phone_ring` | `audio/bgm/bihari_ji_ringtone.ogg` | Ringtone: BIHARI JI AAPKA PHONE BAJ RAHA HAI. | chiptune: ring + TTS voice |
| `bgm_boss` | `audio/bgm/final_boss.ogg` | Final boss (the question) theme. | chiptune: tense |
| `bgm_win` | `audio/bgm/win.ogg` | You did not chhod your BTech -- victory theme. | chiptune: jingle |
| `bgm_gameover` | `audio/bgm/gameover.ogg` | Game over theme. | chiptune: thud |

## Meme voice lines + sound effects (one shot)

| id | file | what it is | missing-file fallback |
|----|------|-----------|-----------------------|
| `line_modihh_lawden_bhojyam` | `audio/sfx/modihh_lawden_bhojyam.ogg` | CAUGHT BY MODIHH on floor 1. <br>*voice line:* "Lawden bhojyam!" | chiptune: scream + TTS voice |
| `line_rickroll` | `audio/sfx/rickroll.ogg` | Rick Astley statue / rick-roll trap (resets progress). <br>*voice line:* "Never gonna give you up, never gonna let you down" | chiptune: jingle + TTS voice |
| `line_alec_padhai` | `audio/sfx/kyu_nahi_ho_rhi_padhai.ogg` | CAUGHT BY ALEC DADDY. <br>*voice line:* "Kyu nahi ho rahi padhai, batao!" | chiptune: scream + TTS voice |
| `line_alec_kuchu` | `audio/sfx/kuchu_puchu_tum_kaha_ho.ogg` | Alec Daddy is APPROACHING (you hear him before you see him). <br>*voice line:* "Kuchu puchu, tum kaha ho?" | chiptune: beep + TTS voice |
| `line_tech_lock` | `audio/sfx/tech_team_lock_kar_do.ogg` | CAUGHT BY THE TECH TEAM. <br>*voice line:* "Tech team, lock kar do!" | chiptune: error + TTS voice |
| `line_tech_fail` | `audio/sfx/tech_team_ne_lock_laga_diya.ogg` | You failed the math lock. <br>*voice line:* "Tech team ne lock laga diya" | chiptune: error + TTS voice |
| `line_btech_chhod_do` | `audio/sfx/tum_btech_ki_taiyari_chhod_do.ogg` | Wrong AIR answer / not picking up the phone. <br>*voice line:* "Tum BTech ki taiyari chhod do!" | chiptune: scream + TTS voice |
| `line_uthaiye_na` | `audio/sfx/uthaiye_na.ogg` | You ignored the ringing phone. <br>*voice line:* "Uthaiye na! Uthaiye na!" | chiptune: ring + TTS voice |
| `line_phone_scream` | `audio/sfx/phone_scream.ogg` | You picked up the phone. Big mistake. <br>*voice line:* "TUM BTECH KI TAIYARI CHHOD DO!" | chiptune: scream + TTS voice |
| `line_tech_team_raid` | `audio/sfx/tech_team_raid.ogg` | A random room opens: TECH TEAM RAID. <br>*voice line:* "Tech team raid!" | chiptune: alarm + TTS voice |
| `line_kavi_motivation` | `audio/sfx/kavi_motivation.ogg` | CAUGHT BY KAVI RISON (forced 30 second run). <br>*voice line:* "Utho! Bhaago! Haar mat maano!" | chiptune: jingle + TTS voice |
| `line_kavi_run` | `audio/sfx/kavi_bhaago.ogg` | Kavi Rison spots you: run challenge starts. <br>*voice line:* "Bhaago beta bhaago, tees second!" | chiptune: beep + TTS voice |
| `line_air_pass` | `audio/sfx/air_pass.ogg` | Correct AIR answer. <br>*voice line:* "Shabash! Tu topper hai." | chiptune: jingle + TTS voice |
| `line_boss_intro` | `audio/sfx/boss_intro.ogg` | Final boss appears. <br>*voice line:* "Aakhri sawaal. Dimaag lagao." | chiptune: thud + TTS voice |
| `line_boss_fail` | `audio/sfx/boss_fail.ogg` | You failed the final question: "Isliye Bombay nhi mila". <br>*voice line:* "Isliye Bombay nhi mila." | chiptune: scream + TTS voice |
| `line_secret_exit` | `audio/sfx/secret_exit.ogg` | The red SECRET EXIT gate on floor 1. <br>*voice line:* "Secret exit mil gaya. Ya lagta hai?" | chiptune: sparkle + TTS voice |
| `line_flavor_modihh_see` | `audio/sfx/modihh_sees_you.ogg` | Modihh spotted you (flavor line). <br>*voice line:* "Achhe din aa gaye. Tumhare liye nahi." | silent (TTS voice only) |
| `line_flavor_kavi_see` | `audio/sfx/kavi_sees_you.ogg` | Kavi Rison spotted you (flavor line). <br>*voice line:* "Haar mat maano! Chalo bhaago!" | silent (TTS voice only) |
| `line_flavor_rick` | `audio/sfx/rick_statue.ogg` | Talking to the Rick statue. <br>*voice line:* "Never gonna give you up." | silent (TTS voice only) |
| `line_flavor_gate` | `audio/sfx/secret_gate.ogg` | Stepping into the red gate. <br>*voice line:* "Secret exit? Itne aasan se?" | silent (TTS voice only) |
| `line_q_air` | `audio/sfx/q_air.ogg` | Question: the AIR verification question. <br>*voice line:* "Tera All India Rank kya hai?" | silent (TTS voice only) |
| `line_q_math` | `audio/sfx/q_math.ogg` | Question: the tech team math lock (random equation). <br>*voice line:* "Tech team lock. Hisab karo, jaldi!" | silent (TTS voice only) |
| `line_flavor_caught_kavi` | `audio/sfx/kavi_caught_you.ogg` | Kavi Rison caught you. <br>*voice line:* "Rukoge nahi! Chalte raho!" | silent (TTS voice only) |
| `line_flavor_checkpoint` | `audio/sfx/checkpoint.ogg` | Checkpoint saved. <br>*voice line:* "Yaha se dobara try kar sakte ho." | silent (TTS voice only) |
| `line_flavor_stop` | `audio/sfx/you_stopped.ogg` | You stopped during the 30 second run. <br>*voice line:* "Ruk gaye? Poora progress gaya." | silent (TTS voice only) |
| `line_flavor_chalisa` | `audio/sfx/chalisa_question.ogg` | Yogi ji / Amit Shah spot you (flavor line before the grab). <br>*voice line:* "Modi Chalisa me mera role kya hai? Batao!" | silent (TTS voice only) |
| `line_q_yogi_role` | `audio/sfx/q_yogi_role.ogg` | Question: Yogi ji asks his own Modi Chalisa role. <br>*voice line:* "Modi Chalisa me Yogi ji ka role kya hai?" | silent (TTS voice only) |
| `line_q_amit_role` | `audio/sfx/q_amit_role.ogg` | Question: Amit Shah asks his own Modi Chalisa role. <br>*voice line:* "Modi Chalisa me Amit Shah ji ka role kya hai?" | silent (TTS voice only) |
| `line_q_dadi_gorilla` | `audio/sfx/q_dadi_gorilla.ogg` | Question: dadi hai gorilla to bua...? <br>*voice line:* "Dadi hai gorilla, to bua kya hogi?" | silent (TTS voice only) |
| `line_q_bhagwan` | `audio/sfx/q_bhagwaan.ogg` | Question: bhagwan kiska sath dete hain. <br>*voice line:* "Bhagwan kiska sath dete hain?" | silent (TTS voice only) |
| `line_q_musalman` | `audio/sfx/q_musalman.ogg` | Question: musalmano ka sath kaun dete hain. <br>*voice line:* "Musalmano ka sath kaun dete hain?" | silent (TTS voice only) |
| `line_q_painting_1` | `audio/sfx/q_painting_1.ogg` | Question: floor 3 painting #1 -- how many people were there? <br>*voice line:* "How many people were there?" | silent (TTS voice only) |
| `line_q_painting_2` | `audio/sfx/q_painting_2.ogg` | Question: floor 3 painting #2 -- kaha jake utti? <br>*voice line:* "Kaha ja ke utti?" | silent (TTS voice only) |
| `line_q_painting_3` | `audio/sfx/q_painting_3.ogg` | Question: floor 3 painting #3 -- what follows? <br>*voice line:* "What follows?" | silent (TTS voice only) |
| `line_q_painting_4` | `audio/sfx/q_painting_4.ogg` | Question: floor 3 painting #4 -- who is GOAT? <br>*voice line:* "Who is goat?" | silent (TTS voice only) |
| `line_q_boss` | `audio/sfx/q_boss.ogg` | Question: the final boss question (record the actual question from the uploaded image). <br>*voice line:* "Aakhri sawaal. Dhyan se socho." | silent (TTS voice only) |
| `line_chalisa_pass` | `audio/sfx/chalisa_pass.ogg` | Correct Modi Chalisa role -> BOOST. <br>*voice line:* "Sahi jawab! Boost mil gaya!" | chiptune: jingle + TTS voice |
| `line_painting_wrong` | `audio/sfx/painting_wrong.ogg` | Wrong painting quiz answer (progress reset). <br>*voice line:* "Galat jawab. Progress reset." | chiptune: scream + TTS voice |
| `line_duckyou` | `audio/sfx/duck_you.ogg` | You switched tabs during the final question. <br>*voice line:* "Duck you!" | chiptune: scream + TTS voice |
| `sfx_token` | `audio/sfx/token.ogg` | Picked an objective token. | chiptune: sparkle |
| `sfx_question` | `audio/sfx/question_sting.ogg` | Question sting: plays whenever any question modal opens. | chiptune: beep |
| `sfx_checkpoint` | `audio/sfx/checkpoint.ogg` | Checkpoint activated. | chiptune: jingle |
| `sfx_unlock` | `audio/sfx/unlock.ogg` | Stairs unlocked. | chiptune: jingle |
| `sfx_locked` | `audio/sfx/locked.ogg` | Door still locked. | chiptune: error |
| `sfx_flash` | `audio/sfx/flash.ogg` | Photo / painting flash. | chiptune: noise |
| `sfx_jumpscare` | `audio/sfx/jumpscare.ogg` | Generic jumpscare. | chiptune: scream |
| `sfx_error` | `audio/sfx/error.ogg` | Wrong / failed. | chiptune: error |
| `sfx_catch` | `audio/sfx/catch.ogg` | Something grabbed you. | chiptune: thud |
| `sfx_powerup` | `audio/sfx/powerup.ogg` | Powerup collected. | chiptune: sparkle |
| `sfx_boost` | `audio/sfx/boost.ogg` | BOOST granted (Modi Chalisa answered right). | chiptune: sparkle |
| `sfx_gate` | `audio/sfx/gate.ogg` | Secret gate opened. | chiptune: laser |
| `sfx_stun` | `audio/sfx/stun.ogg` | Chappal hit / chaser stunned. | chiptune: beep |
| `sfx_start` | `audio/sfx/start.ogg` | Run started. | chiptune: jingle |
| `sfx_photo` | `audio/sfx/photo.ogg` | Floor 3 painting appears. | chiptune: beep |
| `sfx_math_pass` | `audio/sfx/math_pass.ogg` | Math lock solved. | chiptune: jingle |
| `sfx_win` | `audio/sfx/win.ogg` | Victory stinger. | chiptune: jingle |
| `sfx_click` | `audio/sfx/click.ogg` | UI click. | chiptune: beep |
| `sfx_hurt` | `audio/sfx/hurt.ogg` | Progress went poof. | chiptune: thud |

## The cringe lines the game expects (record / rip these yourself)

- `audio/sfx/modihh_lawden_bhojyam.ogg` — *"Lawden bhojyam!"*
- `audio/sfx/rickroll.ogg` — *"Never gonna give you up, never gonna let you down"*
- `audio/sfx/kyu_nahi_ho_rhi_padhai.ogg` — *"Kyu nahi ho rahi padhai, batao!"*
- `audio/sfx/kuchu_puchu_tum_kaha_ho.ogg` — *"Kuchu puchu, tum kaha ho?"*
- `audio/sfx/tech_team_lock_kar_do.ogg` — *"Tech team, lock kar do!"*
- `audio/sfx/tech_team_ne_lock_laga_diya.ogg` — *"Tech team ne lock laga diya"*
- `audio/sfx/tum_btech_ki_taiyari_chhod_do.ogg` — *"Tum BTech ki taiyari chhod do!"*
- `audio/sfx/uthaiye_na.ogg` — *"Uthaiye na! Uthaiye na!"*
- `audio/sfx/phone_scream.ogg` — *"TUM BTECH KI TAIYARI CHHOD DO!"*
- `audio/sfx/tech_team_raid.ogg` — *"Tech team raid!"*
- `audio/sfx/kavi_motivation.ogg` — *"Utho! Bhaago! Haar mat maano!"*
- `audio/sfx/kavi_bhaago.ogg` — *"Bhaago beta bhaago, tees second!"*
- `audio/sfx/air_pass.ogg` — *"Shabash! Tu topper hai."*
- `audio/sfx/boss_intro.ogg` — *"Aakhri sawaal. Dimaag lagao."*
- `audio/sfx/boss_fail.ogg` — *"Isliye Bombay nhi mila."*
- `audio/sfx/secret_exit.ogg` — *"Secret exit mil gaya. Ya lagta hai?"*
- `audio/sfx/modihh_sees_you.ogg` — *"Achhe din aa gaye. Tumhare liye nahi."*
- `audio/sfx/kavi_sees_you.ogg` — *"Haar mat maano! Chalo bhaago!"*
- `audio/sfx/rick_statue.ogg` — *"Never gonna give you up."*
- `audio/sfx/secret_gate.ogg` — *"Secret exit? Itne aasan se?"*
- `audio/sfx/q_air.ogg` — *"Tera All India Rank kya hai?"*
- `audio/sfx/q_math.ogg` — *"Tech team lock. Hisab karo, jaldi!"*
- `audio/sfx/kavi_caught_you.ogg` — *"Rukoge nahi! Chalte raho!"*
- `audio/sfx/checkpoint.ogg` — *"Yaha se dobara try kar sakte ho."*
- `audio/sfx/you_stopped.ogg` — *"Ruk gaye? Poora progress gaya."*
- `audio/sfx/chalisa_question.ogg` — *"Modi Chalisa me mera role kya hai? Batao!"*
- `audio/sfx/q_yogi_role.ogg` — *"Modi Chalisa me Yogi ji ka role kya hai?"*
- `audio/sfx/q_amit_role.ogg` — *"Modi Chalisa me Amit Shah ji ka role kya hai?"*
- `audio/sfx/q_dadi_gorilla.ogg` — *"Dadi hai gorilla, to bua kya hogi?"*
- `audio/sfx/q_bhagwaan.ogg` — *"Bhagwan kiska sath dete hain?"*
- `audio/sfx/q_musalman.ogg` — *"Musalmano ka sath kaun dete hain?"*
- `audio/sfx/q_painting_1.ogg` — *"How many people were there?"*
- `audio/sfx/q_painting_2.ogg` — *"Kaha ja ke utti?"*
- `audio/sfx/q_painting_3.ogg` — *"What follows?"*
- `audio/sfx/q_painting_4.ogg` — *"Who is goat?"*
- `audio/sfx/q_boss.ogg` — *"Aakhri sawaal. Dhyan se socho."*
- `audio/sfx/chalisa_pass.ogg` — *"Sahi jawab! Boost mil gaya!"*
- `audio/sfx/painting_wrong.ogg` — *"Galat jawab. Progress reset."*
- `audio/sfx/duck_you.ogg` — *"Duck you!"*

> NOTE: these meme clips are somebody else's copyrighted audio, so they are **not**
> included. Bring your own files, or just listen to the robot voice fallback.

## Volume / mixing

`CONFIG.volumes` in `js/assets.js` (`master`, `bgm`, `sfx`), plus a per-file
`volume` field in the manifest. Channel levels live in `js/audio.js`
(`CHANNEL_VOLUME`): ambient drifts under everything, music sits on top, phone
ringing uses the `fx` channel.

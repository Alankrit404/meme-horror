# Photo checklist (assets/images/)

Drop your pictures here with these exact names (**JPG only**, small pixel-art-ish
sizes look best: 240x120 or so). Until a file exists the game shows a dashed
placeholder box containing the alt text below.

| id | file | shown when | alt text / placeholder |
|----|------|-----------|------------------------|
| `img_boss_question` | `images/boss_question.jpg` | FINAL BOSS — after floor 3 | FINAL BOSS QUESTION -- the question image goes here. Replace assets/images/boss_question.jpg. |
| `img_duckyou` | `images/duck_you.jpg` | you switched tabs during the final question (DUCK YOU) | DUCK YOU -- you switched tabs during the final question (upload later). |
| `img_secret_exit` | `images/secret_exit.jpg` | red SECRET EXIT gate on floor 1 | SECRET EXIT gate photo (upload later). |
| `img_rick_statue` | `images/rick_statue.jpg` | secret room (press play for the rick roll trap) | Rick Astley statue in the secret room (upload later). |
| `img_modihh_jumpscare` | `images/modihh_jumpscare.jpg` | you got caught by Modihh | Modihh jumpscare -- LAWDEN BHOJYAM (upload later). |
| `img_yogi_jumpscare` | `images/yogi_jumpscare.jpg` | you got caught by Yogi ji (Modi Chalisa role question) | Yogi ji catch screen (upload later). |
| `img_amit_jumpscare` | `images/amit_jumpscare.jpg` | you got caught by Amit Shah (Modi Chalisa question) | Amit Shah catch screen (upload later). |
| `img_chalisa` | `images/modi_chalisa.jpg` | the MODI CHALISA role question art | MODI CHALISA role question art (upload later). |
| `img_alec_catch` | `images/alec_catch.jpg` | you got caught by Alec Daddy | Alec Daddy catches you -- KYU NAHI HO RHI PADHAI (upload later). |
| `img_iitb_lock` | `images/iitb_lock.jpg` | IITB alumni / tech team lock (before the math minigame) | TECH TEAM lockdown screen -- lock kar do (upload later). |
| `img_kavi_motivation` | `images/kavi_motivation.jpg` | Kavi Rison catches you / 30s run | Kavi Rison motivation poster -- UTHO BHAAGO (upload later). |
| `img_tech_team_raid` | `images/tech_team_raid.jpg` | a room opens with TECH TEAM RAID | TECH TEAM RAID! announcement art (upload later). |
| `img_phone_bihari` | `images/phone_bihari_ji.jpg` | you picked up Bihari ji's phone | BIHARI JI AAPKA PHONE BAJ RAHA HAI (upload later). |
| `img_painting_1` | `images/painting_1.jpg` | floor 3 painting #1 (2 seconds, then its question) | Floor 3 painting #1 -- 2 seconds on screen, then its question (upload later). |
| `img_painting_2` | `images/painting_2.jpg` | floor 3 painting #2 (2 seconds, then its question) | Floor 3 painting #2 -- 2 seconds on screen, then its question (upload later). |
| `img_painting_3` | `images/painting_3.jpg` | floor 3 painting #3 (2 seconds, then its question) | Floor 3 painting #3 -- 2 seconds on screen, then its question (upload later). |
| `img_painting_4` | `images/painting_4.jpg` | floor 3 painting #4 (2 seconds, then its question) | Floor 3 painting #4 -- 2 seconds on screen, then its question (upload later). |
| `img_gameover` | `images/gameover.jpg` | boss failed | Game over screen (upload later). |
| `img_win` | `images/win.jpg` | you survived the final question | Victory screen -- BTech ki taiyari nahi chhodi (upload later). |

## Quiz answers (game.js matches these ignoring CASE, spaces and punctuation)

| where | question | accepted answers | audio slot |
|-------|----------|------------------|------------|
| Yogi ji catch | "MODI CHALISA ME YOGI JI KA ROLE KYA HAI?" | `hanuman` (also accepts `hanumanji`, `yogi is hanuman`, ...) -> BOOST | `audio/sfx/q_yogi_role.ogg` |
| Amit Shah catch | "MODI CHALISA ME AMIT SHAH JI KA ROLE KYA HAI?" | `angad` (also accepts `angadji`, `amit shah is angad`, ...) -> BOOST | `audio/sfx/q_amit_role.ogg` |
| Yogi/Amit shared | "DADI HAI GORILLA TO BUA KYA HOGI?" | `godzilla` -> BOOST | `audio/sfx/q_dadi_gorilla.ogg` |
| Yogi/Amit shared | "BHAGWAN KISKA SATH DETE HAIN?" | `hindu`, `jo hindu hote hain` -> BOOST | `audio/sfx/q_bhagwaan.ogg` |
| Yogi/Amit shared | "MUSALMANO KA SATH KAUN DETE HAIN?" | `allah` -> BOOST | `audio/sfx/q_musalman.ogg` |
| MODIHH catch | -- | never asks anything, just resets your progress | -- |
| Floor 3 painting #1 | "HOW MANY PEOPLE WERE THERE?" | `3`, `three` | `audio/sfx/q_painting_1.ogg` |
| Floor 3 painting #2 | "KAHA JAKE UTTI?" | `ghare`, `ghar`, `home` | `audio/sfx/q_painting_2.ogg` |
| Floor 3 painting #3 | "WHAT FOLLOWS?" | `money` | `audio/sfx/q_painting_3.ogg` |
| Floor 3 painting #4 | "WHO IS GOAT?" | `aishwarya`, `aishwarya rai`, `aish` | `audio/sfx/q_painting_4.ogg` |
| AIR terminal | "TERA ALL INDIA RANK KYA HAI?" | **never revealed in-game** -- the list is `CONFIG.airCodes` in `js/assets.js` | `audio/sfx/q_air.ogg` |
| Tech-team math lock | random arithmetic | -- | `audio/sfx/q_math.ogg` |
| Final boss | the uploaded question image | `BOSS.answers` in `js/assets.js` | `audio/sfx/q_boss.ogg` |

Wrong quiz answers reset your progress. Switching tabs while the FINAL QUESTION is
on screen triggers the **DUCK YOU** overlay (`img_duckyou`).

## Final boss answer

1. Upload the question image as `assets/images/boss_question.jpg`.
2. Put the accepted answer(s) into `BOSS.answers` in `js/assets.js`:

```js
var BOSS = {
  imageId: 'img_boss_question',
  answers: ["2520"],   // <- your correct answer(s), any case
  timeLimit: 90,
  attempts: 3
};
```

While `answers` is empty the boss is in placeholder mode and any answer wins,
so you can test the ending before the question exists.

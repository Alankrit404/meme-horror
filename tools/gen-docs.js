/* ============================================================================
   tools/gen-docs.js -- regenerates assets/audio/README.md and
   assets/images/README.md straight from js/assets.js, so the checklists can
   never drift away from the game.
   run:  deno run --allow-read --allow-write tools/gen-docs.js
   ============================================================================ */
'use strict';

const ROOT = new URL('..', import.meta.url).pathname;
const src = Deno.readTextFileSync(ROOT + 'js/assets.js');
const holder = {};
const A = new Function('module', 'exports', 'window',
  src + '\nreturn { CONFIG, AUDIO_ASSETS, IMAGES, BOSS, FLOORS };')(holder, holder, {});

const fallback = (d) => d.synth === 'none' ? 'silent (TTS voice only)' : 'chiptune: ' + (d.synth || 'beep') + (d.say ? ' + TTS voice' : '');

let audioDoc = `# Audio checklist (assets/audio/)

Drop your files here with these exact names. **The game runs fine without them** —
every missing sound is replaced by a built-in chiptune synth, and every missing
voice line is spoken out loud by the browser's text-to-speech voice
(\`CONFIG.speechFallback\` in \`js/assets.js\`, set it to \`false\` to use silence instead).

\`bgm/\` = looping tracks, \`sfx/\` = one shots + meme voice lines.

## Background music (loop)

| id | file | what it should be | missing-file fallback |
|----|------|-------------------|-----------------------|
`;

const lines = [];
for (const id in A.AUDIO_ASSETS) {
  const d = A.AUDIO_ASSETS[id];
  lines.push({ id, ...d });
}
const bgm = lines.filter((d) => d.kind === 'bgm');
const sfx = lines.filter((d) => d.kind === 'sfx');

for (const d of bgm) {
  audioDoc += `| \`${d.id}\` | \`${d.file}\` | ${d.desc || ''} | ${fallback(d)} |\n`;
}
audioDoc += `
## Meme voice lines + sound effects (one shot)

| id | file | what it is | missing-file fallback |
|----|------|-----------|-----------------------|
`;
for (const d of sfx) {
  const say = d.say ? ` <br>*voice line:* "${d.say}"` : '';
  audioDoc += `| \`${d.id}\` | \`${d.file}\` | ${d.desc || ''}${say} | ${fallback(d)} |\n`;
}
audioDoc += `
## The cringe lines the game expects (record / rip these yourself)

`;
for (const d of sfx) {
  if (d.say) audioDoc += `- \`${d.file}\` — *"${d.say}"*\n`;
}
audioDoc += `
> NOTE: these meme clips are somebody else's copyrighted audio, so they are **not**
> included. Bring your own files, or just listen to the robot voice fallback.

## Volume / mixing

\`CONFIG.volumes\` in \`js/assets.js\` (\`master\`, \`bgm\`, \`sfx\`), plus a per-file
\`volume\` field in the manifest. Channel levels live in \`js/audio.js\`
(\`CHANNEL_VOLUME\`): ambient drifts under everything, music sits on top, phone
ringing uses the \`fx\` channel.
`;

let imgDoc = `# Photo checklist (assets/images/)

Drop your pictures here with these exact names (**JPG only**, small pixel-art-ish
sizes look best: 240x120 or so). Until a file exists the game shows a dashed
placeholder box containing the alt text below.

| id | file | shown when | alt text / placeholder |
|----|------|-----------|------------------------|
`;
const shownWhen = {
  img_boss_question: 'FINAL BOSS — after floor 3',
  img_duckyou: 'you switched tabs during the final question (DUCK YOU)',
  img_secret_exit: 'red SECRET EXIT gate on floor 1',
  img_rick_statue: 'secret room (press play for the rick roll trap)',
  img_modihh_jumpscare: 'you got caught by Modihh',
  img_yogi_jumpscare: 'you got caught by Yogi ji (Modi Chalisa role question)',
  img_amit_jumpscare: 'you got caught by Amit Shah (Modi Chalisa question)',
  img_chalisa: 'the MODI CHALISA role question art',
  img_alec_catch: 'you got caught by Alec Daddy',
  img_iitb_lock: 'IITB alumni / tech team lock (before the math minigame)',
  img_kavi_motivation: 'Kavi Rison catches you / 30s run',
  img_tech_team_raid: 'a room opens with TECH TEAM RAID',
  img_phone_bihari: 'you picked up Bihari ji\'s phone',
  img_painting_1: 'floor 3 painting #1 (2 seconds, then its question)',
  img_painting_2: 'floor 3 painting #2 (2 seconds, then its question)',
  img_painting_3: 'floor 3 painting #3 (2 seconds, then its question)',
  img_painting_4: 'floor 3 painting #4 (2 seconds, then its question)',
  img_gameover: 'boss failed',
  img_win: 'you survived the final question'
};
for (const id in A.IMAGES) {
  const d = A.IMAGES[id];
  imgDoc += `| \`${id}\` | \`${d.file}\` | ${shownWhen[id] || ''} | ${d.alt} |\n`;
}
imgDoc += `
## Quiz answers (game.js matches these ignoring CASE, spaces and punctuation)

| where | question | accepted answers | audio slot |
|-------|----------|------------------|------------|
| Yogi ji catch | "MODI CHALISA ME YOGI JI KA ROLE KYA HAI?" | \`hanuman\` (also accepts \`hanumanji\`, \`yogi is hanuman\`, ...) -> BOOST | \`audio/sfx/q_yogi_role.ogg\` |
| Amit Shah catch | "MODI CHALISA ME AMIT SHAH JI KA ROLE KYA HAI?" | \`angad\` (also accepts \`angadji\`, \`amit shah is angad\`, ...) -> BOOST | \`audio/sfx/q_amit_role.ogg\` |
| Yogi/Amit shared | "DADI HAI GORILLA TO BUA KYA HOGI?" | \`godzilla\` -> BOOST | \`audio/sfx/q_dadi_gorilla.ogg\` |
| Yogi/Amit shared | "BHAGWAN KISKA SATH DETE HAIN?" | \`hindu\`, \`jo hindu hote hain\` -> BOOST | \`audio/sfx/q_bhagwaan.ogg\` |
| Yogi/Amit shared | "MUSALMANO KA SATH KAUN DETE HAIN?" | \`allah\` -> BOOST | \`audio/sfx/q_musalman.ogg\` |
| MODIHH catch | -- | never asks anything, just resets your progress | -- |
| Floor 3 painting #1 | "HOW MANY PEOPLE WERE THERE?" | \`3\`, \`three\` | \`audio/sfx/q_painting_1.ogg\` |
| Floor 3 painting #2 | "KAHA JAKE UTTI?" | \`ghare\`, \`ghar\`, \`home\` | \`audio/sfx/q_painting_2.ogg\` |
| Floor 3 painting #3 | "WHAT FOLLOWS?" | \`money\` | \`audio/sfx/q_painting_3.ogg\` |
| Floor 3 painting #4 | "WHO IS GOAT?" | \`aishwarya\`, \`aishwarya rai\`, \`aish\` | \`audio/sfx/q_painting_4.ogg\` |
| AIR terminal | "TERA ALL INDIA RANK KYA HAI?" | **never revealed in-game** -- the list is \`CONFIG.airCodes\` in \`js/assets.js\` | \`audio/sfx/q_air.ogg\` |
| Tech-team math lock | random arithmetic | -- | \`audio/sfx/q_math.ogg\` |
| Final boss | the uploaded question image | \`BOSS.answers\` in \`js/assets.js\` | \`audio/sfx/q_boss.ogg\` |

Wrong quiz answers reset your progress. Switching tabs while the FINAL QUESTION is
on screen triggers the **DUCK YOU** overlay (\`img_duckyou\`).
`;
imgDoc += `
## Final boss answer

1. Upload the question image as \`assets/images/boss_question.jpg\`.
2. Put the accepted answer(s) into \`BOSS.answers\` in \`js/assets.js\`:

\`\`\`js
var BOSS = {
  imageId: 'img_boss_question',
  answers: ${JSON.stringify(A.BOSS.answers)},   // <- your correct answer(s), any case
  timeLimit: 90,
  attempts: 3
};
\`\`\`

While \`answers\` is empty the boss is in placeholder mode and any answer wins,
so you can test the ending before the question exists.
`;

Deno.writeTextFileSync(ROOT + 'assets/audio/README.md', audioDoc);
Deno.writeTextFileSync(ROOT + 'assets/images/README.md', imgDoc);
console.log('wrote assets/audio/README.md (' + bgm.length + ' loops, ' + sfx.length + ' one-shots)');
console.log('wrote assets/images/README.md (' + Object.keys(A.IMAGES).length + ' photos)');

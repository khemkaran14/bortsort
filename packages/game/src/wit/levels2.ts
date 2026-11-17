import type Phaser from 'phaser';
import { l, numberTile, WRONG } from './kit';
import type { WitCtx, WitLevel, WitObj } from './types';

/**
 * Wit Twist puzzles 51–100: a mix for kids, for everyone, and for engineers (tagged so the game can
 * show a badge). All our own ideas; folk riddles are retold in our own words.
 */

const MONO = '"Courier New", ui-monospace, monospace';

/** Monospace text block (code, numbers). */
function mono(c: WitCtx, s: string, x: number, y: number, size = 30, color = '#e8f1ff') {
  return c.scene.add
    .text(x, y, s, { fontFamily: MONO, fontSize: `${size}px`, color, align: 'left', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setPadding(6, 8, 6, 8)
    .setBackgroundColor('#0d1620');
}

/** Drop handler helper: run fn when dropped near target, else snap back. */
function dropOn(c: WitCtx, target: () => WitObj | { x: number; y: number }, r: number, fn: (o: WitObj) => void) {
  return (o: WitObj) => {
    const t = target();
    if (c.dist(o, t) < r) fn(o);
    else c.back(o);
  };
}

/** Switch pill for logic-circuit puzzles: shows "A = 0/1" and toggles. */
function toggle(
  c: WitCtx,
  name: string,
  label: string,
  x: number,
  y: number,
  state: Record<string, number>,
  onChange: () => void,
) {
  const o = c.pill(name, `${label} = 0`, x, y, 150, 70, 0x37474f, {
    tap: () => {
      state[label] = 1 - state[label];
      (o.go.list[1] as Phaser.GameObjects.Text).setText(`${label} = ${state[label]}`);
      o.go.setAlpha(state[label] ? 1 : 0.75);
      onChange();
    },
  });
  o.go.setAlpha(0.75);
  return o;
}

export const MORE_LEVELS: WitLevel[] = [
  // 51
  {
    tag: 'kids',
    q: l('Which one can fly?', 'इनमें से कौन उड़ सकता है?'),
    hint: l('Look for wings.', 'पंख ढूँढो।'),
    why: l('Butterflies fly with their colourful wings.', 'तितली अपने रंगीन पंखों से उड़ती है।'),
    build(c) {
      c.emoji('sky', '☁️', c.A.cx, c.figY('choices', 2), 140);
      c.choices(['🐘', '🐟', '🦋', '🐢'], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 52
  {
    tag: 'all',
    q: l(
      'A rooster lays an egg on a roof. Which way does the egg roll?',
      'एक मुर्गा छत पर अंडा देता है। अंडा किस तरफ़ लुढ़केगा?',
    ),
    hint: l('Who lays eggs: roosters or hens?', 'अंडे कौन देता है: मुर्गा या मुर्गी?'),
    why: l('Roosters don’t lay eggs. There is no egg!', 'मुर्गे अंडे नहीं देते। कोई अंडा है ही नहीं!'),
    build(c) {
      c.emoji('rooster', '🐓', c.A.cx, c.figY('choices', 2), 150);
      c.choices([l('Left', 'बाएँ'), l('Right', 'दाएँ'), l('Down', 'नीचे'), l('No egg', 'कोई अंडा नहीं')], 3);
    },
    async solve(a) {
      await a.pick(3);
    },
  },
  // 53
  {
    tag: 'eng',
    q: l('How many bits are in one byte?', 'एक बाइट में कितने बिट होते हैं?'),
    hint: l('It is the same as the legs of a spider.', 'इतनी ही मकड़ी की टाँगें होती हैं।'),
    why: l('1 byte = 8 bits, e.g. 01000010.', '1 बाइट = 8 बिट, जैसे 01000010।'),
    build(c) {
      mono(c, '0 1 0 0 0 0 1 0', c.A.cx, c.figY('keypad'), 44);
      c.keypad('8');
    },
    async solve(a) {
      await a.type('8');
    },
  },
  // 54
  {
    tag: 'kids',
    q: l('The panda is hungry. Feed it!', 'पांडा भूखा है। उसे खाना खिलाओ!'),
    hint: l('Pandas love a green, tall plant.', 'पांडा को एक हरा, लंबा पौधा बहुत पसंद है।'),
    why: l('Pandas eat bamboo almost all day.', 'पांडा लगभग पूरे दिन बाँस खाते हैं।'),
    build(c) {
      const { cx, cy } = c.A;
      const panda = c.emoji('panda', '🐼', cx, cy - 110, 170);
      const feed = dropOn(
        c,
        () => panda,
        120,
        (o) => {
          if (o.name === 'bamboo') {
            o.go.destroy();
            c.win();
          } else {
            c.wrong(l('Not for pandas!', 'यह पांडा के लिए नहीं!'));
            c.back(o);
          }
        },
      );
      c.emoji('pizza', '🍕', cx - 200, cy + 170, 100, { drag: true, drop: feed });
      c.emoji('bamboo', '🎋', cx, cy + 180, 110, { drag: true, drop: feed });
      c.emoji('icecream', '🍦', cx + 200, cy + 170, 100, { drag: true, drop: feed });
    },
    async solve(a) {
      await a.drag('bamboo', 'panda');
    },
  },
  // 55
  {
    tag: 'all',
    q: l(
      'There are 3 apples. You take away 2. How many apples do you have?',
      '3 सेब हैं। तुम 2 ले लेते हो। तुम्हारे पास कितने सेब हैं?',
    ),
    hint: l('Not how many are left — how many do YOU have?', 'कितने बचे नहीं — तुम्हारे पास कितने हैं?'),
    why: l('You took 2, so you have 2.', 'तुमने 2 लिए, तो तुम्हारे पास 2 हैं।'),
    build(c) {
      c.label('apples', '🍎 🍎 🍎', c.A.cx, c.figY('keypad'), 80);
      c.keypad('2');
    },
    async solve(a) {
      await a.type('2');
    },
  },
  // 56
  {
    tag: 'kids',
    q: l('Make the traffic light green.', 'ट्रैफ़िक लाइट को हरा करो।'),
    hint: l('Tap the traffic light. Red, then yellow, then…', 'ट्रैफ़िक लाइट पर टैप करो। लाल, फिर पीला, फिर…'),
    why: l('Red means stop, yellow means wait, green means go!', 'लाल मतलब रुको, पीला मतलब तैयार, हरा मतलब चलो!'),
    build(c) {
      let state = 0;
      const colors = [0xe53935, 0xfbc02d, 0x43a047];
      const paint = (g: Phaser.GameObjects.Graphics) => {
        g.clear();
        g.fillStyle(0x263238, 1).fillRoundedRect(-70, -190, 140, 380, 30);
        g.lineStyle(4, 0x546e7a, 1).strokeRoundedRect(-70, -190, 140, 380, 30);
        colors.forEach((col, i) => g.fillStyle(col, i === state ? 1 : 0.18).fillCircle(0, -120 + i * 120, 45));
      };
      const light = c.draw('light', c.A.cx, c.A.cy, 160, 400, (g) => paint(g), {
        tap: () => {
          if (c.solved) return;
          state++;
          paint(light.go.list[0] as Phaser.GameObjects.Graphics);
          if (state === 2) c.after(300, () => c.win());
        },
      });
    },
    async solve(a) {
      await a.tap('light');
      await a.tap('light');
      await a.wait(400);
    },
  },
  // 57
  {
    tag: 'eng',
    q: l('Which way do you turn a normal screw to tighten it?', 'साधारण पेंच को कसने के लिए किस तरफ़ घुमाते हैं?'),
    hint: l('Righty tighty, lefty loosey.', 'दाएँ कसो, बाएँ ढीला करो।'),
    why: l('Standard screws and bolts tighten clockwise.', 'साधारण पेंच और बोल्ट घड़ी की दिशा में कसते हैं।'),
    build(c) {
      c.emoji('screw', '🔩', c.A.cx, c.figY('choices', 1), 160);
      c.choices([l('↻ Clockwise', '↻ घड़ी की दिशा'), l('↺ Anticlockwise', '↺ उल्टी दिशा')], 0);
    },
    async solve(a) {
      await a.pick(0);
    },
  },
  // 58
  {
    tag: 'kids',
    q: l('Which shadow belongs to the cat?', 'बिल्ली की परछाईं कौन-सी है?'),
    hint: l('Look at the shape of the ears and tail.', 'कान और पूँछ की शक्ल देखो।'),
    why: l('Same shape, just dark. That’s a shadow!', 'वही शक्ल, बस काली। यही परछाईं है!'),
    build(c) {
      const { cx, cy } = c.A;
      c.emoji('cat', '🐈', cx, cy - 170, 150);
      const shadow = (name: string, ch: string, x: number, ok: boolean) => {
        const o = c.emoji(name, ch, x, cy + 120, 130, { tap: () => (ok ? c.win() : c.wrong(WRONG.notThat)) });
        (o.go.list[0] as Phaser.GameObjects.Text).setTint(0x111111).setAlpha(0.85);
      };
      shadow('s1', '🐘', cx - 210, false);
      shadow('s2', '🦒', cx, false);
      shadow('s3', '🐈', cx + 210, true);
    },
    async solve(a) {
      await a.tap('s3');
    },
  },
  // 59
  {
    tag: 'all',
    q: l('What has lots of teeth but never bites?', 'किसके बहुत सारे दाँत होते हैं पर वह कभी काटता नहीं?'),
    hint: l('You use it on your hair.', 'इसे बालों पर इस्तेमाल करते हो।'),
    why: l('A comb has many teeth and never bites.', 'कंघी के बहुत दाँत होते हैं पर वह काटती नहीं।'),
    build(c) {
      c.emoji('teeth', '🦷', c.A.cx, c.figY('choices', 2), 140);
      c.choices([l('Shark', 'शार्क'), l('Comb', 'कंघी'), l('Dog', 'कुत्ता'), l('Crocodile', 'मगरमच्छ')], 1);
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 60
  {
    tag: 'kids',
    q: l('Put the fish where it can live.', 'मछली को वहाँ रखो जहाँ वह रह सके।'),
    hint: l('Fish need lots of water.', 'मछली को बहुत पानी चाहिए।'),
    why: l('Fish live in water like ponds, rivers and seas.', 'मछली तालाब, नदी और समुद्र जैसे पानी में रहती है।'),
    build(c) {
      const { cx, cy } = c.A;
      const pond = c.draw('pond', cx + 140, cy + 140, 280, 150, (g) => {
        g.fillStyle(0x1e88e5, 1).fillEllipse(0, 0, 260, 120);
        g.fillStyle(0x64b5f6, 0.6).fillEllipse(-40, -20, 120, 30);
      });
      const milk = c.emoji('milk', '🥛', cx - 170, cy + 140, 120);
      c.emoji('fish', '🐟', cx - 40, cy - 150, 110, {
        drag: true,
        drop: (o) => {
          if (c.dist(o, pond) < 140) {
            o.go.setPosition(pond.go.x, pond.go.y - 10);
            c.after(300, () => c.win());
          } else if (c.dist(o, milk) < 100) {
            c.wrong(l('Fish can’t swim in milk!', 'मछली दूध में नहीं तैर सकती!'));
            c.back(o);
          } else c.back(o);
        },
      });
    },
    async solve(a) {
      await a.drag('fish', 'pond');
      await a.wait(400);
    },
  },
  // 61
  {
    tag: 'eng',
    q: l('What is binary 1010 in normal numbers?', 'बाइनरी 1010 सामान्य संख्या में कितना है?'),
    hint: l('From the right the places are worth 1, 2, 4, 8.', 'दाएँ से स्थानों का मान 1, 2, 4, 8 है।'),
    why: l('8 + 0 + 2 + 0 = 10.', '8 + 0 + 2 + 0 = 10।'),
    build(c) {
      const y = c.figY('keypad');
      mono(c, '1 0 1 0', c.A.cx, y - 20, 70);
      c.label('places', '8   4   2   1', c.A.cx, y + 60, 26, { color: '#9fb0c2' });
      c.keypad('10');
    },
    async solve(a) {
      await a.type('10');
    },
  },
  // 62
  {
    tag: 'all',
    q: l(
      'In a race you pass the runner in 2nd place. Which place are you in now?',
      'दौड़ में तुम दूसरे स्थान वाले धावक से आगे निकल जाते हो। अब तुम किस स्थान पर हो?',
    ),
    hint: l('You took their place — not the leader’s.', 'तुमने उसकी जगह ली — सबसे आगे वाले की नहीं।'),
    why: l('Passing the 2nd runner puts you in 2nd place.', 'दूसरे को पीछे छोड़ा, तो तुम दूसरे स्थान पर हो।'),
    build(c) {
      c.label('run', '🏃 🏃 🏃', c.A.cx, c.figY('keypad'), 80);
      c.keypad('2');
    },
    async solve(a) {
      await a.type('2');
    },
  },
  // 63
  {
    tag: 'kids',
    q: l('Find the tomato.', 'टमाटर ढूँढो।'),
    hint: l('It looks like an apple but has a green star on top.', 'यह सेब जैसा दिखता है पर ऊपर हरा तारा है।'),
    why: l('Sharp eyes! Tomatoes and apples look alike.', 'तेज़ नज़र! टमाटर और सेब एक जैसे दिखते हैं।'),
    build(c) {
      for (let i = 0; i < 30; i++) {
        const x = c.A.cx - 250 + (i % 6) * 100;
        const y = c.A.cy - 220 + Math.floor(i / 6) * 100;
        const ok = i === 19;
        c.emoji(ok ? 'tomato' : `a${i}`, ok ? '🍅' : '🍎', x, y, 70, {
          tap: () => (ok ? c.win() : c.wrong(l('That’s an apple.', 'यह सेब है।'))),
        });
      }
    },
    async solve(a) {
      await a.tap('tomato');
    },
  },
  // 64
  {
    tag: 'all',
    q: l('How many times can you subtract 5 from 25?', '25 में से 5 कितनी बार घटा सकते हो?'),
    hint: l('After the first time, is it still 25?', 'पहली बार के बाद, क्या वह अब भी 25 है?'),
    why: l('Only once — after that you are subtracting from 20.', 'सिर्फ़ एक बार — उसके बाद तुम 20 में से घटा रहे हो।'),
    build(c) {
      c.label('sum', '25 − 5', c.A.cx, c.figY('choices', 2), 80);
      c.choices([l('5 times', '5 बार'), l('Once', 'एक बार'), l('Never', 'कभी नहीं'), l('Forever', 'हमेशा')], 1);
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 65
  {
    tag: 'kids',
    q: l('The rabbit wants a carrot.', 'खरगोश को गाजर चाहिए।'),
    hint: l('Carrots grow under the ground. Pull the leaves!', 'गाजर ज़मीन के नीचे उगती है। पत्ते खींचो!'),
    why: l('You pulled the carrot out of the ground. Yum!', 'तुमने गाजर ज़मीन से निकाली। मज़ा आया!'),
    build(c) {
      const { cx, cy, left, right } = c.A;
      const ground = cy + 80;
      c.scene.add.rectangle(cx, ground + 150, right - left + 40, 300, 0x6d4c41);
      const rabbit = c.emoji('rabbit', '🐇', cx - 180, ground - 60, 140);
      c.emoji('sprout', '🌱', cx + 160, ground - 30, 90, {
        tap: (o) => {
          o.go.destroy();
          c.emoji('carrot', '🥕', cx + 160, ground - 60, 100, {
            drag: true,
            drop: dropOn(
              c,
              () => rabbit,
              120,
              (k) => {
                k.go.destroy();
                c.win();
              },
            ),
          });
        },
      });
    },
    async solve(a) {
      await a.tap('sprout');
      await a.drag('carrot', 'rabbit');
    },
  },
  // 66
  {
    tag: 'eng',
    q: l('What does this program print?', 'यह प्रोग्राम क्या प्रिंट करेगा?'),
    hint: l('i goes 1, 2, 3, 4 — it stops before 5.', 'i का मान 1, 2, 3, 4 — 5 से पहले रुकता है।'),
    why: l('total = 1 + 2 + 3 + 4 = 10.', 'total = 1 + 2 + 3 + 4 = 10।'),
    build(c) {
      mono(c, 'total = 0\nfor i in 1 .. 4:\n    total = total + i\nprint(total)', c.A.cx, c.figY('keypad'), 30);
      c.keypad('10');
    },
    async solve(a) {
      await a.type('10');
    },
  },
  // 67
  {
    tag: 'all',
    q: l(
      'The more you take, the more you leave behind. What are they?',
      'जितना ज़्यादा लेते हो, उतना ज़्यादा पीछे छोड़ते हो। ये क्या हैं?',
    ),
    hint: l('Think about walking on a beach.', 'समुद्र तट पर चलने के बारे में सोचो।'),
    why: l('Every step you take leaves a footstep behind.', 'हर कदम पीछे एक पैरों का निशान छोड़ता है।'),
    build(c) {
      c.emoji('beach', '🏖️', c.A.cx, c.figY('choices', 2), 140);
      c.choices([l('Coins', 'सिक्के'), l('Photos', 'फ़ोटो'), l('Footsteps', 'कदम'), l('Cookies', 'बिस्कुट')], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 68
  {
    tag: 'kids',
    q: l('Take the little chick to its mother.', 'चूज़े को उसकी माँ के पास ले जाओ।'),
    hint: l('Its mother lays eggs.', 'उसकी माँ अंडे देती है।'),
    why: l('A chick grows up to be a chicken. The hen is its mum!', 'चूज़ा बड़ा होकर मुर्गी बनता है। मुर्गी उसकी माँ है!'),
    build(c) {
      const { cx, cy } = c.A;
      const moms: [string, string, number][] = [
        ['cow', '🐄', cx - 210],
        ['hen', '🐔', cx],
        ['pig', '🐖', cx + 210],
      ];
      const objs = moms.map(([n, e, x]) => c.emoji(n, e, x, cy - 130, 130));
      c.emoji('chick', '🐥', cx, cy + 170, 100, {
        drag: true,
        drop: (o) => {
          const near = objs.find((m) => c.dist(o, m) < 110);
          if (!near) return c.back(o);
          if (near.name === 'hen') c.win();
          else {
            c.wrong(l('That’s not my mum!', 'यह मेरी माँ नहीं है!'));
            c.back(o);
          }
        },
      });
    },
    async solve(a) {
      await a.drag('chick', 'hen');
    },
  },
  // 69
  {
    tag: 'eng',
    q: l(
      'A 12 V battery is connected to a 4 Ω resistor. How many amps flow?',
      '12 V की बैटरी 4 Ω के प्रतिरोध से जुड़ी है। कितने एम्पियर बहेंगे?',
    ),
    hint: l('Ohm’s law: I = V ÷ R.', 'ओम का नियम: I = V ÷ R।'),
    why: l('I = 12 ÷ 4 = 3 amps.', 'I = 12 ÷ 4 = 3 एम्पियर।'),
    build(c) {
      const y = c.figY('keypad');
      c.draw('circuit', c.A.cx, y, 420, 200, (g) => {
        g.lineStyle(5, 0xffd166, 1).strokeRect(-180, -80, 360, 160);
        g.fillStyle(0x263238, 1).fillRect(-200, -30, 40, 60);
        g.fillStyle(0xe8554e, 1).fillRect(-196, -26, 32, 22);
        g.fillStyle(0x263238, 1).fillRect(-40, -95, 80, 30);
        g.lineStyle(3, 0xffffff, 1).strokeRect(-40, -95, 80, 30);
      });
      c.label('v', '12 V', c.A.cx - 260, y, 28);
      c.label('r', '4 Ω', c.A.cx, y - 130, 28);
      c.keypad('3');
    },
    async solve(a) {
      await a.type('3');
    },
  },
  // 70
  {
    tag: 'all',
    q: l(
      'A doctor gives you 3 pills: take one every 30 minutes. How many minutes until all are taken?',
      'डॉक्टर 3 गोलियाँ देता है: हर 30 मिनट पर एक। सारी गोलियाँ कितने मिनट में खत्म होंगी?',
    ),
    hint: l('You take the first one right away.', 'पहली गोली तुरंत लेते हो।'),
    why: l('0 min, 30 min, 60 min — done after 60 minutes.', '0 मिनट, 30 मिनट, 60 मिनट — 60 मिनट में खत्म।'),
    build(c) {
      c.label('pills', '💊 💊 💊', c.A.cx, c.figY('keypad'), 80);
      c.keypad('60');
    },
    async solve(a) {
      await a.type('60');
    },
  },
  // 71
  {
    tag: 'kids',
    q: l('Put all the toys in the box. Not the cat!', 'सारे खिलौने डिब्बे में रखो। बिल्ली नहीं!'),
    hint: l('Three toys go in. The cat stays out.', 'तीन खिलौने अंदर। बिल्ली बाहर।'),
    why: l('Toys tidied, cat happy!', 'खिलौने सजे, बिल्ली खुश!'),
    build(c) {
      const { cx, cy } = c.A;
      const box = c.emoji('box', '📦', cx, cy - 140, 170);
      let n = 0;
      const drop = dropOn(
        c,
        () => box,
        120,
        (o) => {
          if (o.name === 'cat') {
            c.wrong(l('Meow! Not in the box!', 'म्याऊँ! डिब्बे में नहीं!'));
            return c.back(o);
          }
          o.go.destroy();
          if (++n === 3) c.win();
        },
      );
      c.emoji('bear', '🧸', cx - 230, cy + 150, 100, { drag: true, drop });
      c.emoji('cat', '🐈', cx - 80, cy + 170, 100, { drag: true, drop });
      c.emoji('car', '🚗', cx + 80, cy + 150, 100, { drag: true, drop });
      c.emoji('ball', '⚽', cx + 230, cy + 170, 90, { drag: true, drop });
    },
    async solve(a) {
      for (const t of ['bear', 'car', 'ball']) await a.drag(t, 'box');
    },
  },
  // 72
  {
    tag: 'eng',
    q: l('Light the bulb.', 'बल्ब जलाओ।'),
    hint: l('The bulb is on when A is 1 AND B is NOT 1.', 'बल्ब तब जलता है जब A = 1 हो AND B, 1 न हो।'),
    why: l('A AND (NOT B): A = 1, B = 0.', 'A AND (NOT B): A = 1, B = 0।'),
    build(c) {
      const { cx, cy } = c.A;
      const st: Record<string, number> = { A: 0, B: 1 };
      c.draw('wires', cx, cy, 600, 300, (g) => {
        g.lineStyle(4, 0x90a4ae, 1);
        g.lineBetween(-200, -80, 0, -80);
        g.lineBetween(-200, 80, -90, 80);
        g.lineBetween(-30, 80, 0, 80);
        g.lineBetween(0, -80, 0, -40);
        g.lineBetween(0, 80, 0, 40);
        g.lineBetween(110, 0, 200, 0);
        g.fillStyle(0x1e3a5f, 1).fillRoundedRect(0, -60, 110, 120, 16);
        g.lineStyle(3, 0xffffff, 0.8).strokeRoundedRect(0, -60, 110, 120, 16);
        g.fillStyle(0x5d2e46, 1).fillRoundedRect(-90, 55, 60, 50, 10);
      });
      c.label('and', 'AND', cx + 55, cy, 26);
      c.label('not', 'NOT', cx - 60, cy + 80, 18);
      const bulb = c.emoji('bulb', '💡', cx + 240, cy, 110);
      bulb.go.setAlpha(0.3);
      const check = () => {
        const on = st.A === 1 && st.B === 0;
        bulb.go.setAlpha(on ? 1 : 0.3);
        if (on) c.after(400, () => c.win());
      };
      toggle(c, 'swA', 'A', cx - 270, cy - 80, st, check);
      const b = toggle(c, 'swB', 'B', cx - 270, cy + 80, st, check);
      (b.go.list[1] as Phaser.GameObjects.Text).setText('B = 1');
      b.go.setAlpha(1);
    },
    async solve(a) {
      await a.tap('swA');
      await a.tap('swB');
      await a.wait(500);
    },
  },
  // 73
  {
    tag: 'all',
    q: l(
      'Mary’s father has five daughters: Nana, Nene, Nini, Nono. What is the fifth daughter’s name?',
      'रीना के पिता की पाँच बेटियाँ हैं: नाना, नेने, नीनी, नोनो। पाँचवीं बेटी का नाम क्या है?',
    ),
    hint: l('Read the first word again.', 'पहला शब्द फिर से पढ़ो।'),
    why: l('It’s Mary — she is the fifth daughter!', 'रीना — वही पाँचवीं बेटी है!'),
    build(c) {
      c.label('girls', '👧 👧 👧 👧 ❓', c.A.cx, c.figY('choices', 2), 64);
      c.choices([l('Nunu', 'नूनू'), l('Mary', 'रीना'), l('Nina', 'नीना'), l('Nana', 'नाना')], 1);
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 74
  {
    tag: 'kids',
    q: l('Paint the sky blue.', 'आसमान को नीला रंगो।'),
    hint: l('Drag the right colour onto the sky.', 'सही रंग को आसमान पर खींचो।'),
    why: l('On a sunny day the sky is blue.', 'धूप वाले दिन आसमान नीला होता है।'),
    build(c) {
      const { cx, cy } = c.A;
      const paint = (g: Phaser.GameObjects.Graphics, col: number) => {
        g.clear();
        g.fillStyle(col, 1).fillRoundedRect(-280, -120, 560, 240, 24);
        g.lineStyle(4, 0xffffff, 0.8).strokeRoundedRect(-280, -120, 560, 240, 24);
      };
      const sky = c.draw('sky', cx, cy - 110, 560, 240, (g) => paint(g, 0x9e9e9e));
      c.emoji('sun', '☀️', cx + 190, cy - 160, 80);
      const swatch = (name: string, col: number, x: number) =>
        c.draw(
          name,
          x,
          cy + 190,
          100,
          100,
          (g) => {
            g.fillStyle(col, 1).fillRoundedRect(-45, -45, 90, 90, 20);
            g.lineStyle(4, 0xffffff, 1).strokeRoundedRect(-45, -45, 90, 90, 20);
          },
          {
            drag: true,
            drop: dropOn(
              c,
              () => sky,
              200,
              (o) => {
                if (o.name !== 'blue') {
                  c.wrong(l('Hmm, skies aren’t that colour!', 'हम्म, आसमान उस रंग का नहीं होता!'));
                  return c.back(o);
                }
                o.go.destroy();
                paint(sky.go.list[0] as Phaser.GameObjects.Graphics, 0x42a5f5);
                c.after(400, () => c.win());
              },
            ),
          },
        );
      swatch('red', 0xe53935, cx - 200);
      swatch('green', 0x43a047, cx);
      swatch('blue', 0x1e88e5, cx + 200);
    },
    async solve(a) {
      await a.drag('blue', 'sky');
      await a.wait(500);
    },
  },
  // 75
  {
    tag: 'all',
    q: l('What goes up but never comes down?', 'क्या ऊपर जाता है पर कभी नीचे नहीं आता?'),
    hint: l('It grows by one every birthday.', 'हर जन्मदिन पर यह एक बढ़ जाता है।'),
    why: l('Your age only goes up!', 'तुम्हारी उम्र सिर्फ़ बढ़ती है!'),
    build(c) {
      c.emoji('cake', '🎂', c.A.cx, c.figY('choices', 2), 140);
      c.choices([l('A ball', 'गेंद'), l('Your age', 'तुम्हारी उम्र'), l('Rain', 'बारिश'), l('A kite', 'पतंग')], 1);
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 76
  {
    tag: 'eng',
    q: l(
      'The left gear turns clockwise. Which way does the right gear turn?',
      'बायाँ गियर घड़ी की दिशा में घूमता है। दायाँ गियर किस दिशा में घूमेगा?',
    ),
    hint: l('Touching gears always turn in opposite directions.', 'छूते हुए गियर हमेशा उल्टी दिशा में घूमते हैं।'),
    why: l('Left ↻, middle ↺, right ↻ — clockwise again.', 'बायाँ ↻, बीच वाला ↺, दायाँ ↻ — फिर घड़ी की दिशा।'),
    build(c) {
      const y = c.figY('choices', 1);
      const gear = (name: string, x: number, col: number) =>
        c.draw(name, x, y, 190, 190, (g) => {
          g.fillStyle(col, 1);
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2;
            g.fillCircle(Math.cos(a) * 70, Math.sin(a) * 70, 16);
          }
          g.fillCircle(0, 0, 70);
          g.fillStyle(0x1d2b3a, 1).fillCircle(0, 0, 18);
        });
      const g1 = gear('g1', c.A.cx - 170, 0xf3c14b);
      gear('g2', c.A.cx, 0x90a4ae);
      gear('g3', c.A.cx + 170, 0x90a4ae);
      c.label('arrow', '↻', c.A.cx - 170, y - 125, 50, { color: '#ffd166' });
      c.scene.tweens.add({ targets: g1.go, angle: 360, duration: 4000, repeat: -1 });
      c.choices([l('↻ Clockwise', '↻ घड़ी की दिशा'), l('↺ Anticlockwise', '↺ उल्टी दिशा')], 0);
    },
    async solve(a) {
      await a.pick(0);
    },
  },
  // 77
  {
    tag: 'kids',
    q: l('Finish the snowman.', 'स्नोमैन पूरा करो।'),
    hint: l('A snowman needs a nose and a hat.', 'स्नोमैन को नाक और टोपी चाहिए।'),
    why: l('Carrot nose and a top hat — perfect!', 'गाजर की नाक और टोपी — बढ़िया!'),
    build(c) {
      const { cx, cy } = c.A;
      const head = { x: cx, y: cy - 100 };
      c.draw('snowman', cx, cy - 20, 260, 360, (g) => {
        g.fillStyle(0xdfe9f3, 1).fillEllipse(0, 180, 220, 30);
        g.fillStyle(0xffffff, 1).fillCircle(0, 90, 95).fillCircle(0, -80, 68);
        g.fillStyle(0xe3edf7, 0.9).fillCircle(25, 110, 60).fillCircle(18, -70, 42);
        g.fillStyle(0xffffff, 1).fillCircle(-12, 80, 70).fillCircle(-8, -88, 50);
        g.fillStyle(0x263238, 1).fillCircle(-22, -95, 8).fillCircle(22, -95, 8);
        g.fillCircle(0, 60, 8).fillCircle(0, 100, 8).fillCircle(0, 140, 8);
      });
      const placed = new Set<string>();
      const spot: Record<string, { x: number; y: number }> = {
        nose: { x: head.x + 22, y: head.y + 15 },
        hat: { x: head.x, y: head.y - 70 },
      };
      const drop = (o: WitObj) => {
        const key = o.name === 'carrot' ? 'nose' : o.name === 'tophat' ? 'hat' : null;
        if (!key) {
          if (c.dist(o, head) < 140) c.wrong(l('That doesn’t go on a snowman!', 'वह स्नोमैन पर नहीं लगता!'));
          return c.back(o);
        }
        if (c.dist(o, spot[key]) > 110) return c.back(o);
        o.go.setPosition(spot[key].x, spot[key].y);
        o.drag = false;
        placed.add(key);
        if (placed.size === 2) c.after(300, () => c.win());
      };
      c.state.spot = spot;
      c.emoji('banana', '🍌', cx - 220, cy + 220, 80, { drag: true, drop });
      c.emoji('carrot', '🥕', cx, cy + 230, 70, { drag: true, drop });
      c.emoji('tophat', '🎩', cx + 220, cy + 220, 90, { drag: true, drop });
    },
    async solve(a, c) {
      const s = c.state.spot as Record<string, { x: number; y: number }>;
      await a.drag('carrot', s.nose);
      await a.drag('tophat', s.hat);
      await a.wait(400);
    },
  },
  // 78
  {
    tag: 'all',
    q: l('Get the ball out of the tube without tipping it over.', 'नली को उलटे बिना गेंद बाहर निकालो।'),
    hint: l('Ping-pong balls float.', 'पिंग-पोंग की गेंद तैरती है।'),
    why: l('Pour in water and the light ball floats up to the top.', 'पानी डालो, हल्की गेंद तैरकर ऊपर आ जाती है।'),
    build(c) {
      const { cx, cy } = c.A;
      const tubeTop = cy - 200;
      const tubeBottom = cy + 160;
      const water = c.scene.add
        .rectangle(cx, tubeBottom, 76, tubeBottom - tubeTop - 20, 0x42a5f5, 0.75)
        .setOrigin(0.5, 1)
        .setScale(1, 0);
      c.draw(
        'tube',
        cx,
        (tubeTop + tubeBottom) / 2,
        100,
        tubeBottom - tubeTop + 10,
        (g) => {
          const h = tubeBottom - tubeTop;
          g.lineStyle(6, 0xd0f0ff, 0.9);
          g.lineBetween(-42, -h / 2, -42, h / 2)
            .lineBetween(42, -h / 2, 42, h / 2)
            .lineBetween(-42, h / 2, 42, h / 2);
        },
        { depth: 2 },
      );
      const ball = c.draw(
        'ball',
        cx,
        tubeBottom - 35,
        70,
        70,
        (g) => {
          g.fillStyle(0xffffff, 1).fillCircle(0, 0, 30);
          g.fillStyle(0xff9800, 1).fillCircle(-8, -8, 8);
        },
        {
          depth: 3,
          tap: () => {
            if (!c.state.floated) return c.wrong(l('Too deep — your hand doesn’t fit!', 'बहुत गहरी है — हाथ नहीं जाता!'));
            c.win();
          },
        },
      );
      c.emoji('jug', '💧', cx + 220, cy + 180, 110, {
        drag: true,
        drop: (o) => {
          if (Math.abs(o.go.x - cx) > 120 || o.go.y > tubeBottom) return c.back(o);
          c.back(o);
          c.scene.tweens.add({ targets: water, scaleY: 1, duration: 700 });
          c.scene.tweens.add({
            targets: ball.go,
            y: tubeTop + 10,
            duration: 900,
            onComplete: () => (c.state.floated = true),
          });
        },
      });
      c.state.tubeTop = tubeTop;
    },
    async solve(a, c) {
      await a.drag('jug', { x: c.A.cx, y: (c.state.tubeTop as number) - 20 });
      await a.wait(1100);
      await a.tap('ball');
    },
  },
  // 79
  {
    tag: 'eng',
    q: l(
      'A stack: push 1, push 2, pop, push 3, pop. What is on top now?',
      'स्टैक: push 1, push 2, pop, push 3, pop. अब सबसे ऊपर क्या है?',
    ),
    hint: l('Pop always removes the last thing pushed.', 'Pop हमेशा आख़िरी डाली गई चीज़ निकालता है।'),
    why: l('[1] → [1,2] → [1] → [1,3] → [1]. The top is 1.', '[1] → [1,2] → [1] → [1,3] → [1]। ऊपर 1 है।'),
    build(c) {
      mono(c, 'push(1)\npush(2)\npop()\npush(3)\npop()\ntop() = ?', c.A.cx, c.figY('keypad'), 28);
      c.keypad('1');
    },
    async solve(a) {
      await a.type('1');
    },
  },
  // 80
  {
    tag: 'kids',
    q: l('Pop the bubble with the fish inside.', 'जिस बुलबुले में मछली है उसे फोड़ो।'),
    hint: l('Look through the bubbles.', 'बुलबुलों के अंदर देखो।'),
    why: l('Pop! The fish is free to swim.', 'फट! मछली अब आज़ाद तैर सकती है।'),
    build(c) {
      const { cx, cy } = c.A;
      const spots = [
        [-190, -150, false],
        [120, -190, false],
        [-60, 10, true],
        [200, 60, false],
        [-200, 170, false],
        [80, 200, false],
      ] as const;
      spots.forEach(([dx, dy, fish], i) => {
        if (fish) c.emoji('fishIn', '🐠', cx + dx, cy + dy, 70);
        c.draw(
          fish ? 'fishBubble' : `b${i}`,
          cx + dx,
          cy + dy,
          150,
          150,
          (g) => {
            g.fillStyle(0x9fe0ff, 0.22).fillCircle(0, 0, 68);
            g.lineStyle(4, 0xe0f7ff, 0.9).strokeCircle(0, 0, 68);
            g.fillStyle(0xffffff, 0.7).fillEllipse(-24, -30, 30, 14);
          },
          {
            tap: (o) => {
              o.go.destroy();
              if (fish) c.win();
              else c.say(l('Empty bubble!', 'खाली बुलबुला!'));
            },
          },
        );
      });
    },
    async solve(a) {
      await a.tap('fishBubble');
    },
  },
  // 81
  {
    tag: 'all',
    q: l(
      'What can you hold in your right hand, but never in your left hand?',
      'क्या चीज़ तुम दाएँ हाथ में पकड़ सकते हो, पर बाएँ हाथ में कभी नहीं?',
    ),
    hint: l('It is part of your own body.', 'यह तुम्हारे अपने शरीर का हिस्सा है।'),
    why: l('Your left elbow! Try holding it with your left hand.', 'तुम्हारी बाईं कोहनी! बाएँ हाथ से पकड़कर देखो।'),
    build(c) {
      c.emoji('hand', '✋', c.A.cx, c.figY('choices', 2), 140);
      c.choices(
        [l('A pen', 'कलम'), l('Your left elbow', 'अपनी बाईं कोहनी'), l('A cup', 'कप'), l('Your phone', 'अपना फ़ोन')],
        1,
      );
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 82
  {
    tag: 'eng',
    q: l('A famous pattern from nature: what comes next?', 'प्रकृति का एक मशहूर पैटर्न: आगे क्या आएगा?'),
    hint: l('Add the two numbers before it.', 'पिछली दो संख्याएँ जोड़ो।'),
    why: l('Fibonacci: 5 + 8 = 13.', 'फ़िबोनाची: 5 + 8 = 13।'),
    build(c) {
      c.label('fib', '1, 1, 2, 3, 5, 8, ?', c.A.cx, c.figY('keypad'), 60);
      c.keypad('13');
    },
    async solve(a) {
      await a.type('13');
    },
  },
  // 83
  {
    tag: 'kids',
    q: l('How many legs do they have altogether?', 'इन सबकी कुल कितनी टाँगें हैं?'),
    hint: l('Chickens have 2 legs, cows have 4.', 'मुर्गी की 2 टाँगें, गाय की 4।'),
    why: l('2 + 2 + 4 = 8 legs.', '2 + 2 + 4 = 8 टाँगें।'),
    build(c) {
      const y = c.figY('keypad');
      c.emoji('h1', '🐔', c.A.cx - 190, y, 110);
      c.emoji('h2', '🐔', c.A.cx, y, 110);
      c.emoji('cow', '🐄', c.A.cx + 190, y, 120);
      c.keypad('8');
    },
    async solve(a) {
      await a.type('8');
    },
  },
  // 84
  {
    tag: 'all',
    q: l(
      'In a room with no air, you drop a hammer and a feather together. Which lands first?',
      'बिना हवा वाले कमरे में हथौड़ा और पंख साथ गिराते हो। पहले कौन ज़मीन पर पहुँचेगा?',
    ),
    hint: l('Without air, nothing slows the feather down.', 'हवा न हो तो पंख को कोई धीमा नहीं करता।'),
    why: l('Without air, everything falls at the same speed.', 'हवा के बिना सब कुछ एक ही रफ़्तार से गिरता है।'),
    build(c) {
      const y = c.figY('choices', 2);
      c.emoji('hammer', '🔨', c.A.cx - 120, y, 120);
      c.emoji('feather', '🪶', c.A.cx + 120, y, 120);
      c.choices([l('Hammer', 'हथौड़ा'), l('Feather', 'पंख'), l('Same time', 'एक साथ'), l('Neither', 'कोई नहीं')], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 85
  {
    tag: 'eng',
    q: l('Turn the pipes so the water reaches the flower.', 'पाइप घुमाओ ताकि पानी फूल तक पहुँचे।'),
    hint: l('Tap a pipe to turn it. Every pipe must lie flat.', 'पाइप घुमाने के लिए टैप करो। हर पाइप सीधा लेटा होना चाहिए।'),
    why: l('All pipes in a straight line — water flows!', 'सारे पाइप एक सीध में — पानी बह रहा है!'),
    build(c) {
      const { cx, cy } = c.A;
      c.emoji('tap', '🚰', cx - 300, cy - 20, 70);
      c.emoji('flower', '🌻', cx + 300, cy, 80);
      const angles = [90, 0, 90, 90];
      angles.forEach((ang, i) => {
        const o = c.draw(
          `p${i}`,
          cx - 195 + i * 130,
          cy,
          130,
          130,
          (g) => {
            g.fillStyle(0x263238, 1).fillRoundedRect(-62, -62, 124, 124, 14);
            g.fillStyle(0x90a4ae, 1).fillRect(-62, -20, 124, 40);
            g.fillStyle(0xcfd8dc, 1).fillRect(-62, -16, 124, 8);
          },
          {
            tap: (p) => {
              if (c.solved) return;
              angles[i] = (angles[i] + 90) % 360;
              c.scene.tweens.add({ targets: p.go, angle: angles[i], duration: 150 });
              if (angles.every((x) => x % 180 === 0)) c.after(300, () => c.win());
            },
          },
        );
        o.go.setAngle(ang);
      });
    },
    async solve(a) {
      for (const p of ['p0', 'p2', 'p3']) await a.tap(p);
      await a.wait(400);
    },
  },
  // 86
  {
    tag: 'all',
    q: l('Balance the scale.', 'तराज़ू को बराबर करो।'),
    hint: l('The left side weighs 6 kg. Make the right side 6 kg too.', 'बाईं तरफ़ 6 किलो है। दाईं तरफ़ भी 6 किलो करो।'),
    why: l('6 kg on each side: for example 2 + 4 or 1 + 5.', 'दोनों तरफ़ 6 किलो: जैसे 2 + 4 या 1 + 5।'),
    build(c) {
      const { cx, cy } = c.A;
      const pan = { x: cx + 150, y: cy - 60 };
      c.draw('scale', cx, cy - 110, 520, 240, (g) => {
        g.fillStyle(0x8d6e63, 1).fillRect(-8, -40, 16, 200);
        g.fillStyle(0xc9a24a, 1).fillRect(-200, -50, 400, 12);
        g.lineStyle(4, 0xc9a24a, 1).strokeEllipse(-150, 70, 160, 30).strokeEllipse(150, 70, 160, 30);
        g.lineBetween(-150, -44, -150, 70).lineBetween(150, -44, 150, 70);
      });
      c.label('left', '6 kg', cx - 150, cy - 70, 36, { color: '#ffd166' });
      const total = c.label('right', '0 kg', pan.x, pan.y - 10, 36);
      let sum = 0;
      const on: WitObj[] = [];
      const reset = () => {
        sum = 0;
        on.splice(0).forEach((o) => {
          o.drag = true;
          c.back(o);
        });
        (total.go.list[0] as Phaser.GameObjects.Text).setText('0 kg');
      };
      [1, 2, 4, 5].forEach((v, i) => {
        c.draw(`w${v}`, cx - 240 + i * 160, cy + 190, 110, 90, (g) => numberTile(g, 100, 80, 0x546e7a), {
          drag: true,
          drop: (o) => {
            if (c.dist(o, pan) > 130) return c.back(o);
            o.go.setPosition(pan.x - 60 + on.length * 40, pan.y + 40);
            o.drag = false;
            on.push(o);
            sum += v;
            (total.go.list[0] as Phaser.GameObjects.Text).setText(`${sum} kg`);
            if (sum === 6) c.after(300, () => c.win());
            else if (sum > 6) {
              c.wrong(l('Too heavy! Try again.', 'बहुत भारी! फिर कोशिश करो।'));
              c.after(500, reset);
            }
          },
        }).go.add(
          c.scene.add
            .text(0, 0, `${v} kg`, { fontFamily: 'system-ui', fontSize: '32px', fontStyle: 'bold' })
            .setOrigin(0.5),
        );
      });
      c.state.pan = pan;
    },
    async solve(a, c) {
      const p = c.state.pan as { x: number; y: number };
      await a.drag('w2', p);
      await a.drag('w4', p);
      await a.wait(400);
    },
  },
  // 87
  {
    tag: 'kids',
    q: l('Tap the heaviest one.', 'सबसे भारी वाले पर टैप करो।'),
    hint: l(
      'Picture size can trick you. Think about real life!',
      'तस्वीर का आकार धोखा दे सकता है। असली दुनिया के बारे में सोचो!',
    ),
    why: l('An elephant is far heavier than a balloon or a feather.', 'हाथी गुब्बारे या पंख से कहीं ज़्यादा भारी है।'),
    build(c) {
      const { cx, cy } = c.A;
      const light = () => c.wrong(l('That’s very light!', 'वह तो बहुत हल्का है!'));
      c.emoji('balloon', '🎈', cx - 150, cy - 80, 220, { tap: light });
      c.emoji('feather', '🪶', cx + 170, cy - 60, 180, { tap: light });
      c.emoji('elephant', '🐘', cx + 20, cy + 170, 60, { tap: () => c.win() });
    },
    async solve(a) {
      await a.tap('elephant');
    },
  },
  // 88
  {
    tag: 'eng',
    q: l('In hexadecimal, what is FF + 1?', 'हेक्साडेसिमल में FF + 1 कितना है?'),
    hint: l('FF is the biggest two-digit hex number (255).', 'FF सबसे बड़ी दो अंकों की हेक्स संख्या है (255)।'),
    why: l('FF + 1 = 256, which is written 100 in hex.', 'FF + 1 = 256, जिसे हेक्स में 100 लिखते हैं।'),
    build(c) {
      mono(c, '0xFF + 0x1 = 0x??', c.A.cx, c.figY('choices', 2), 44);
      c.choices(['100', 'FG', '1FF', 'F10'], 0);
    },
    async solve(a) {
      await a.pick(0);
    },
  },
  // 89
  {
    tag: 'all',
    q: l('Divide 30 by half, then add 10. What do you get?', '30 को आधे से भाग दो, फिर 10 जोड़ो। क्या मिलेगा?'),
    hint: l('Dividing by ½ is not the same as halving.', '½ से भाग देना आधा करने जैसा नहीं है।'),
    why: l('30 ÷ ½ = 60, and 60 + 10 = 70.', '30 ÷ ½ = 60, और 60 + 10 = 70।'),
    build(c) {
      c.label('eq', '30 ÷ ½ + 10 = ?', c.A.cx, c.figY('keypad'), 64);
      c.keypad('70');
    },
    async solve(a) {
      await a.type('70');
    },
  },
  // 90
  {
    tag: 'eng',
    q: l('Select all the prime numbers, then tap Check.', 'सारी अभाज्य संख्याएँ चुनो, फिर Check दबाओ।'),
    hint: l(
      'A prime has exactly two divisors: 1 and itself. 1 is not prime.',
      'अभाज्य संख्या के ठीक दो भाजक होते हैं: 1 और खुद। 1 अभाज्य नहीं है।',
    ),
    why: l('2, 3, 5, 7 and 11 are the primes up to 12.', '12 तक की अभाज्य संख्याएँ 2, 3, 5, 7 और 11 हैं।'),
    build(c) {
      const { cx, cy } = c.A;
      const picked = new Set<number>();
      for (let n = 1; n <= 12; n++) {
        const i = n - 1;
        const o = c.pill(
          `n${n}`,
          String(n),
          cx - 225 + (i % 4) * 150,
          cy - 200 + Math.floor(i / 4) * 120,
          120,
          90,
          0x37474f,
          {
            tap: () => {
              if (picked.has(n)) picked.delete(n);
              else picked.add(n);
              o.go.setAlpha(picked.has(n) ? 1 : 0.7);
              o.go.setScale(picked.has(n) ? 1.08 : 1);
            },
          },
        );
        o.go.setAlpha(0.7);
      }
      c.pill('check', 'Check ✓', cx, c.A.bottom - 60, 260, 86, 0x3cb371, {
        tap: () => {
          const want = [2, 3, 5, 7, 11];
          if (picked.size === want.length && want.every((w) => picked.has(w))) c.win();
          else c.wrong(l('Not quite — check each number.', 'पूरा सही नहीं — हर संख्या जाँचो।'));
        },
      });
    },
    async solve(a) {
      for (const n of [2, 3, 5, 7, 11]) await a.tap(`n${n}`);
      await a.tap('check');
    },
  },
  // 91
  {
    tag: 'all',
    q: l(
      'A man points at a photo: “I have no brothers or sisters, but that man’s father is my father’s son.” Who is in the photo?',
      'एक आदमी फ़ोटो दिखाता है: “मेरा कोई भाई-बहन नहीं, पर उस आदमी का पिता मेरे पिता का बेटा है।” फ़ोटो में कौन है?',
    ),
    hint: l('“My father’s son” with no brothers is… me.', 'भाई न हो तो “मेरे पिता का बेटा” … मैं ही हूँ।'),
    why: l(
      'My father’s son is me, so I am the photo man’s father: it’s my son.',
      'मेरे पिता का बेटा मैं हूँ, तो मैं फ़ोटो वाले का पिता हूँ: वह मेरा बेटा है।',
    ),
    build(c) {
      c.emoji('photo', '🖼️', c.A.cx, c.figY('choices', 2), 120);
      c.choices(
        [l('Himself', 'वह खुद'), l('His son', 'उसका बेटा'), l('His father', 'उसका पिता'), l('His uncle', 'उसका चाचा')],
        1,
      );
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 92
  {
    tag: 'kids',
    q: l('Which one is NOT a fruit?', 'इनमें से कौन फल नहीं है?'),
    hint: l('One of them grows under the ground.', 'इनमें से एक ज़मीन के नीचे उगता है।'),
    why: l('A carrot is a vegetable — it’s a root!', 'गाजर सब्ज़ी है — यह एक जड़ है!'),
    build(c) {
      c.emoji('basket', '🧺', c.A.cx, c.figY('choices', 2), 130);
      c.choices(['🍎', '🍌', '🥕', '🍇'], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 93
  {
    tag: 'eng',
    q: l('As n gets huge, which one grows the fastest?', 'जब n बहुत बड़ा हो, तो कौन सबसे तेज़ बढ़ता है?'),
    hint: l('Try n = 30 in your head.', 'मन में n = 30 रखकर देखो।'),
    why: l(
      '2ⁿ is exponential: at n = 30 it is over a billion, while n² is just 900.',
      '2ⁿ घातांकी है: n = 30 पर यह एक अरब से ज़्यादा, जबकि n² सिर्फ़ 900।',
    ),
    build(c) {
      c.emoji('chart', '📈', c.A.cx, c.figY('choices', 2), 130);
      c.choices(['n', 'n²', 'log n', '2ⁿ'], 3);
    },
    async solve(a) {
      await a.pick(3);
    },
  },
  // 94
  {
    tag: 'all',
    q: l(
      'You have one match in a dark room with a candle, a lamp and a stove. What do you light first?',
      'अँधेरे कमरे में तुम्हारे पास एक माचिस है, और एक मोमबत्ती, लैंप और चूल्हा। पहले क्या जलाओगे?',
    ),
    hint: l('What has to burn before anything else can?', 'किसी और चीज़ से पहले क्या जलना ज़रूरी है?'),
    why: l('You light the match first!', 'पहले माचिस जलाओगे!'),
    build(c) {
      c.label('things', '🕯️  🪔  🔥', c.A.cx, c.figY('choices', 2), 80);
      c.choices([l('The candle', 'मोमबत्ती'), l('The lamp', 'लैंप'), l('The stove', 'चूल्हा'), l('The match', 'माचिस')], 3);
    },
    async solve(a) {
      await a.pick(3);
    },
  },
  // 95
  {
    tag: 'eng',
    q: l('Three switches this time. Light the bulb!', 'इस बार तीन स्विच। बल्ब जलाओ!'),
    hint: l('(A XOR B) AND C: C must be 1, and exactly one of A, B.', '(A XOR B) AND C: C = 1, और A, B में से ठीक एक।'),
    why: l(
      'XOR is 1 when exactly one input is 1; AND needs C = 1 too.',
      'XOR तब 1 है जब ठीक एक इनपुट 1 हो; AND के लिए C = 1 भी चाहिए।',
    ),
    build(c) {
      const { cx, cy } = c.A;
      const st: Record<string, number> = { A: 0, B: 0, C: 0 };
      c.draw('wires', cx, cy, 600, 340, (g) => {
        g.lineStyle(4, 0x90a4ae, 1);
        g.lineBetween(-200, -120, -110, -120).lineBetween(-200, -20, -110, -20);
        g.lineBetween(-200, 120, 20, 120).lineBetween(20, 120, 20, 40);
        g.lineBetween(-10, -70, 20, -70).lineBetween(20, -70, 20, -30);
        g.lineBetween(130, 0, 200, 0);
        g.fillStyle(0x3b2f6b, 1).fillRoundedRect(-110, -140, 100, 140, 16);
        g.fillStyle(0x1e3a5f, 1).fillRoundedRect(20, -60, 110, 120, 16);
        g.lineStyle(3, 0xffffff, 0.8)
          .strokeRoundedRect(-110, -140, 100, 140, 16)
          .strokeRoundedRect(20, -60, 110, 120, 16);
      });
      c.label('xor', 'XOR', cx - 60, cy - 70, 24);
      c.label('and', 'AND', cx + 75, cy, 24);
      const bulb = c.emoji('bulb', '💡', cx + 250, cy, 110);
      bulb.go.setAlpha(0.3);
      const check = () => {
        const on = (st.A ^ st.B) === 1 && st.C === 1;
        bulb.go.setAlpha(on ? 1 : 0.3);
        if (on) c.after(400, () => c.win());
      };
      toggle(c, 'swA', 'A', cx - 270, cy - 120, st, check);
      toggle(c, 'swB', 'B', cx - 270, cy - 20, st, check);
      toggle(c, 'swC', 'C', cx - 270, cy + 120, st, check);
    },
    async solve(a) {
      await a.tap('swB');
      await a.tap('swC');
      await a.wait(500);
    },
  },
  // 96
  {
    tag: 'all',
    q: l(
      'A boat is full of people, yet there isn’t a single person on board. How?',
      'नाव लोगों से भरी है, फिर भी उसमें एक भी कुँवारा व्यक्ति नहीं है। कैसे?',
    ),
    hint: l('“Single” has two meanings.', '“कुँवारा” मतलब जिसकी शादी न हुई हो।'),
    why: l('Everyone on board is married!', 'नाव में सब शादीशुदा हैं!'),
    build(c) {
      c.emoji('boat', '🛥️', c.A.cx, c.figY('choices', 2), 140);
      c.choices(
        [
          l('They’re robots', 'वे रोबोट हैं'),
          l('All married', 'सब शादीशुदा हैं'),
          l('It’s a painting', 'यह पेंटिंग है'),
          l('Underwater', 'पानी के नीचे'),
        ],
        1,
      );
    },
    async solve(a) {
      await a.pick(1);
    },
  },
  // 97
  {
    tag: 'eng',
    q: l('Roman numerals: what is XIV + VI?', 'रोमन अंक: XIV + VI कितना है?'),
    hint: l('XIV = 14, VI = 6.', 'XIV = 14, VI = 6।'),
    why: l('14 + 6 = 20, written XX.', '14 + 6 = 20, यानी XX।'),
    build(c) {
      c.label('rom', 'XIV + VI = ?', c.A.cx, c.figY('keypad'), 72);
      c.keypad('20');
    },
    async solve(a) {
      await a.type('20');
    },
  },
  // 98
  {
    tag: 'all',
    q: l('How many fingers are there on 10 hands?', '10 हाथों में कितनी उँगलियाँ होती हैं?'),
    hint: l('Not 100! One hand has 5 fingers.', '100 नहीं! एक हाथ में 5 उँगलियाँ।'),
    why: l('10 hands × 5 fingers = 50.', '10 हाथ × 5 उँगलियाँ = 50।'),
    build(c) {
      c.label('hands', '✋ ✋ ✋ ✋ ✋\n✋ ✋ ✋ ✋ ✋', c.A.cx, c.figY('keypad'), 50);
      c.keypad('50');
    },
    async solve(a) {
      await a.type('50');
    },
  },
  // 99
  {
    tag: 'eng',
    q: l('Sort the numbers using the fewest possible swaps.', 'सबसे कम अदला-बदली में संख्याओं को क्रम में लगाओ।'),
    hint: l(
      'Tap two tiles to swap them. It can be done in 2 swaps.',
      'दो टाइल पर टैप करो तो वे बदल जाती हैं। 2 बदलाव में हो सकता है।',
    ),
    why: l('[3,1,2] needs exactly 2 swaps: it is one 3-cycle.', '[3,1,2] को ठीक 2 बदलाव चाहिए: यह एक 3-चक्र है।'),
    build(c) {
      const { cx, cy } = c.A;
      const slotsX = [cx - 170, cx, cx + 170];
      let order = [3, 1, 2];
      let swaps = 0;
      let first: WitObj | null = null;
      const counter = c.label('swaps', '0', cx, cy + 160, 40, { color: '#ffd166' });
      const tiles: Record<number, WitObj> = {};
      const place = () =>
        order.forEach((v, i) => c.scene.tweens.add({ targets: tiles[v].go, x: slotsX[i], y: cy - 40, duration: 200 }));
      const reset = () => {
        order = [3, 1, 2];
        swaps = 0;
        (counter.go.list[0] as Phaser.GameObjects.Text).setText('0');
        place();
      };
      for (const v of [3, 1, 2]) {
        tiles[v] = c.draw(
          `t${v}`,
          slotsX[order.indexOf(v)],
          cy - 40,
          150,
          150,
          (g) => numberTile(g, 140, 140, 0x3d8bf2),
          {
            tap: (o) => {
              if (c.solved) return;
              if (!first) {
                first = o;
                o.go.setScale(1.1);
                return;
              }
              const a = order.indexOf(Number(first.name.slice(1)));
              const b = order.indexOf(Number(o.name.slice(1)));
              first.go.setScale(1);
              first = null;
              if (a === b) return;
              [order[a], order[b]] = [order[b], order[a]];
              swaps++;
              (counter.go.list[0] as Phaser.GameObjects.Text).setText(String(swaps));
              place();
              if (order.join() === '1,2,3') {
                if (swaps <= 2) c.after(300, () => c.win());
                else {
                  c.wrong(l('Sorted, but it can be done in fewer swaps!', 'क्रम में तो है, पर कम बदलाव में हो सकता है!'));
                  c.after(600, reset);
                }
              }
            },
          },
        );
        tiles[v].go.add(
          c.scene.add
            .text(0, 0, String(v), { fontFamily: 'system-ui', fontSize: '72px', fontStyle: 'bold' })
            .setOrigin(0.5),
        );
      }
    },
    async solve(a) {
      await a.tap('t3');
      await a.tap('t2');
      await a.wait(300);
      await a.tap('t2');
      await a.tap('t1');
      await a.wait(500);
    },
  },
  // 100
  {
    tag: 'all',
    q: l(
      'The grand finale! Make the biggest number you can with these tiles.',
      'आख़िरी बड़ी पहेली! इन टाइलों से सबसे बड़ी संख्या बनाओ।',
    ),
    hint: l('Remember puzzle 10? Tiles can be turned upside down.', 'पहेली 10 याद है? टाइलें उल्टी भी की जा सकती हैं।'),
    why: l(
      'Turn the 6 into a 9: 991 beats 961. You finished all 100 Wit Twists!',
      '6 को उल्टा करके 9 बनाओ: 991, 961 से बड़ा है। तुमने सारी 100 पहेलियाँ पूरी कर लीं!',
    ),
    build(c) {
      const { cx, cy } = c.A;
      const slots = [cx - 170, cx, cx + 170].map((x) => ({ x, y: cy - 100 }));
      c.state.slots = slots;
      c.draw('slots', cx, cy - 100, 520, 170, (g) => {
        g.lineStyle(4, 0xffffff, 0.6);
        slots.forEach((s) => g.strokeRoundedRect(s.x - cx - 70, -70, 140, 140, 18));
      });
      const filled: (WitObj | null)[] = [null, null, null];
      const value: Record<string, string> = { one: '1', six: '6', nine: '9' };
      const tiles: WitObj[] = [];
      const reset = () => {
        filled.fill(null);
        tiles.forEach((t) => {
          t.drag = true;
          c.back(t);
        });
      };
      const check = () => {
        if (filled.some((f) => !f)) return;
        const n = filled.map((f) => value[f!.name]).join('');
        if (n === '991') c.after(300, () => c.win());
        else {
          c.wrong(l(`${n}? Is that really the biggest?`, `${n}? क्या यह सच में सबसे बड़ी है?`));
          c.after(700, reset);
        }
      };
      (['one', 'six', 'nine'] as const).forEach((name, i) => {
        const t = c.draw(name, cx - 170 + i * 170, cy + 170, 150, 150, (g) => numberTile(g, 130, 130, 0xe8554e), {
          drag: true,
          tap: (o) => {
            if (name !== 'six' || !o.drag) return;
            const txt = o.go.list[1] as Phaser.GameObjects.Text;
            const flipped = value.six === '9';
            value.six = flipped ? '6' : '9';
            c.scene.tweens.add({ targets: txt, angle: flipped ? 0 : 180, duration: 300 });
          },
          drop: (o) => {
            const k = slots.findIndex((s, j) => !filled[j] && c.dist(o, s) < 90);
            if (k < 0) return c.back(o);
            o.go.setPosition(slots[k].x, slots[k].y);
            o.drag = false;
            filled[k] = o;
            check();
          },
        });
        t.go.add(
          c.scene.add
            .text(0, 0, value[name], { fontFamily: 'system-ui', fontSize: '80px', fontStyle: 'bold' })
            .setOrigin(0.5),
        );
        tiles.push(t);
      });
    },
    async solve(a, c) {
      const s = c.state.slots as { x: number; y: number }[];
      await a.tap('six');
      await a.wait(400);
      await a.drag('nine', s[0]);
      await a.drag('six', s[1]);
      await a.drag('one', s[2]);
      await a.wait(500);
    },
  },
];

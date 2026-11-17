import type Phaser from 'phaser';
import type { L, WitLevel, WitObj } from './types';
import { l, numberTile, sequence, WRONG } from './kit';
import { MORE_LEVELS } from './levels2';

/**
 * Wit Twist: 100 original trick puzzles (1–50 here, 51–100 in levels2.ts). Some use old folk riddles (public domain), written in our
 * own words; every scene, setup and twist here is our own.
 *
 * Each level has a scripted `solve` that the automated test runs to prove it can be finished.
 */

const FIRST_LEVELS: WitLevel[] = [
  // 1
  {
    q: l('Tap the red ball.', 'लाल गेंद पर टैप करो।'),
    hint: l('Just tap the red one. Warm-up time!', 'बस लाल वाली पर टैप करो। यह अभ्यास है!'),
    why: l('Easy start. They get trickier from here!', 'आसान शुरुआत। आगे पहेलियाँ और चालाक होंगी!'),
    build(c) {
      const { cx, cy } = c.A;
      const wrong = () => c.wrong(WRONG.notThat);
      c.emoji('blue', '🔵', cx - 200, cy, 120, { tap: wrong });
      c.emoji('green', '🟢', cx, cy, 120, { tap: wrong });
      c.emoji('red', '🔴', cx + 200, cy, 120, { tap: () => c.win() });
    },
    async solve(a) {
      await a.tap('red');
    },
  },
  // 2
  {
    q: l('The robot is sad. Cheer it up!', 'रोबोट उदास है। उसे खुश करो!'),
    hint: l('Robots run on power.', 'रोबोट बिजली से चलते हैं।'),
    why: l('A full battery always cheers up a robot.', 'पूरी बैटरी से रोबोट हमेशा खुश हो जाता है।'),
    build(c) {
      const { cx, cy } = c.A;
      const robot = c.emoji('robot', '🤖', cx, cy - 90, 170, {
        tap: () => c.say(l('Beep… so tired…', 'बीप… बहुत थका हूँ…')),
      });
      const drop = (o: WitObj) => {
        if (c.dist(o, robot) < 120) {
          if (o.name === 'full') {
            o.go.destroy();
            c.win();
          } else {
            c.wrong(l('That battery is empty!', 'यह बैटरी तो खाली है!'));
            c.back(o);
          }
        } else c.back(o);
      };
      c.emoji('low', '🪫', cx - 180, cy + 170, 100, { drag: true, drop });
      c.emoji('full', '🔋', cx + 180, cy + 170, 100, { drag: true, drop });
    },
    async solve(a) {
      await a.drag('full', 'robot');
    },
  },
  // 3
  {
    q: l('Tap the smallest dot{dot:.}', 'सबसे छोटे बिंदु पर टैप करो{dot:.}'),
    hint: l('Read the question very carefully. Every bit of it.', 'सवाल को बहुत ध्यान से पढ़ो। हर हिस्सा।'),
    why: l('The full stop at the end of the question is the smallest dot!', 'सवाल के आखिर का बिंदु ही सबसे छोटा है!'),
    build(c) {
      const { cx, cy } = c.A;
      const wrong = () => c.wrong(WRONG.look);
      [
        [cx - 170, cy - 80, 50],
        [cx + 150, cy - 120, 34],
        [cx - 40, cy + 120, 22],
        [cx + 170, cy + 110, 14],
      ].forEach(([x, y, r], i) =>
        c.draw(`d${i}`, x, y, r * 2 + 20, r * 2 + 20, (g) => g.fillStyle(0x46d3d8, 1).fillCircle(0, 0, r), {
          tap: wrong,
        }),
      );
    },
    words: { tap: (id, c) => id === 'dot' && c.win() },
    async solve(a) {
      await a.tapWord('dot');
    },
  },
  // 4
  {
    q: l('Which is heavier: 1 kg of bolts or 1 kg of feathers?', 'कौन भारी है: 1 किलो बोल्ट या 1 किलो पंख?'),
    hint: l('Look at the numbers, not the things.', 'चीज़ों को नहीं, संख्याओं को देखो।'),
    why: l('Both weigh exactly 1 kg.', 'दोनों का वज़न ठीक 1 किलो है।'),
    build(c) {
      const y = c.figY('choices');
      c.emoji('bolt', '🔩', c.A.cx - 140, y, 130);
      c.emoji('feather', '🪶', c.A.cx + 140, y, 130);
      c.choices([l('Bolts', 'बोल्ट'), l('Feathers', 'पंख'), l('Same', 'बराबर')], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 5
  {
    q: l('How many squares do you see?', 'तुम्हें कितने वर्ग दिखते हैं?'),
    hint: l('Don’t forget the big one around them.', 'चारों तरफ़ वाले बड़े वर्ग को मत भूलो।'),
    why: l('4 small squares + 1 big square = 5.', '4 छोटे वर्ग + 1 बड़ा वर्ग = 5।'),
    build(c) {
      const y = c.figY('keypad');
      c.draw('grid', c.A.cx, y, 220, 220, (g) => {
        g.lineStyle(8, 0xffffff, 1).strokeRect(-100, -100, 200, 200);
        g.lineBetween(0, -100, 0, 100).lineBetween(-100, 0, 100, 0);
      });
      c.keypad('5');
    },
    async solve(a) {
      await a.type('5');
    },
  },
  // 6
  {
    q: l('Open the treasure box.', 'खज़ाने का बक्सा खोलो।'),
    hint: l('Keys like to hide under things.', 'चाबियाँ चीज़ों के नीचे छिपना पसंद करती हैं।'),
    why: l('The key was hiding under the plant.', 'चाबी गमले के नीचे छिपी थी।'),
    build(c) {
      const { cx, cy } = c.A;
      const box = c.emoji('box', '🧰', cx + 170, cy, 170, { tap: () => c.wrong(WRONG.locked) });
      c.emoji('key', '🔑', cx - 170, cy + 40, 80, {
        drag: true,
        drop: (o) => {
          if (c.dist(o, box) < 120) {
            o.go.destroy();
            box.go.removeAll(true);
            box.go.add(c.scene.add.text(0, 0, '💰', { fontSize: '150px' }).setOrigin(0.5));
            c.win();
          } else c.back(o);
        },
      });
      c.emoji('plant', '🪴', cx - 170, cy + 10, 170, { drag: true });
    },
    async solve(a, c) {
      await a.drag('plant', { x: c.A.cx - 170, y: c.A.top + 60 });
      await a.drag('key', 'box');
    },
  },
  // 7
  {
    q: l(
      'A shop has 9 robots. All but 4 run out of battery. How many still work?',
      'दुकान में 9 रोबोट हैं। 4 को छोड़कर बाकी सबकी बैटरी खत्म हो गई। कितने अभी भी चल रहे हैं?',
    ),
    hint: l('Read “all but 4” slowly.', '“4 को छोड़कर” धीरे से पढ़ो।'),
    why: l('“All but 4” means 4 are left working.', '“4 को छोड़कर” का मतलब 4 चल रहे हैं।'),
    build(c) {
      const y = c.figY('keypad');
      for (let i = 0; i < 9; i++)
        c.emoji(`r${i}`, '🤖', c.A.cx - 200 + (i % 5) * 100, y - 50 + Math.floor(i / 5) * 90, 70);
      c.keypad('4');
    },
    async solve(a) {
      await a.type('4');
    },
  },
  // 8
  {
    q: l('Pop all the balloons!', 'सारे गुब्बारे फोड़ दो!'),
    hint: l('Count again. Is one hiding?', 'फिर से गिनो। कोई छिपा है क्या?'),
    why: l('The fourth balloon was hiding behind the cloud.', 'चौथा गुब्बारा बादल के पीछे छिपा था।'),
    build(c) {
      const { cx, cy } = c.A;
      let popped = 0;
      const pop = (o: WitObj) => {
        o.go.destroy();
        c.say(l('Pop!', 'फट!'));
        if (++popped === 4) c.win();
      };
      c.emoji('b4', '🎈', cx + 150, cy - 140, 90, { tap: pop });
      c.emoji('cloud', '☁️', cx + 150, cy - 130, 200, { drag: true });
      c.emoji('b1', '🎈', cx - 200, cy + 60, 100, { tap: pop });
      c.emoji('b2', '🎈', cx - 40, cy + 160, 100, { tap: pop });
      c.emoji('b3', '🎈', cx + 120, cy + 90, 100, { tap: pop });
    },
    async solve(a, c) {
      await a.tap('b1');
      await a.tap('b2');
      await a.tap('b3');
      await a.drag('cloud', { x: c.A.cx - 150, y: c.A.bottom - 60 });
      await a.tap('b4');
    },
  },
  // 9
  {
    q: l('Tap the biggest star.', 'सबसे बड़े तारे पर टैप करो।'),
    hint: l('Not every star twinkles at night.', 'हर तारा रात में नहीं टिमटिमाता।'),
    why: l('The Sun is a star — and the biggest one here!', 'सूरज भी एक तारा है — और यहाँ सबसे बड़ा!'),
    build(c) {
      const { cx, cy } = c.A;
      const small = () => c.wrong(l('That is a small star.', 'यह तो छोटा तारा है।'));
      c.emoji('s1', '⭐', cx - 180, cy - 40, 130, { tap: small });
      c.emoji('s2', '🌟', cx + 40, cy + 120, 110, { tap: small });
      c.emoji('s3', '⭐', cx + 190, cy - 90, 90, { tap: small });
      c.emoji('sun', '☀️', cx - 220, c.A.top + 50, 80, { tap: () => c.win() });
    },
    async solve(a) {
      await a.tap('sun');
    },
  },
  // 10
  {
    q: l('Make this number bigger without adding anything.', 'बिना कुछ जोड़े इस संख्या को बड़ा करो।'),
    hint: l('Try looking at it from the other side.', 'इसे दूसरी तरफ़ से देखकर देखो।'),
    why: l('Turn 6 upside down and it becomes 9!', '6 को उल्टा करो तो 9 बन जाता है!'),
    build(c) {
      let done = false;
      c.label('six', '6', c.A.cx, c.A.cy, 260, {
        tap: (o) => {
          if (done) return;
          done = true;
          c.scene.tweens.add({ targets: o.go, angle: 180, duration: 500, onComplete: () => c.win() });
        },
      });
    },
    async solve(a) {
      await a.tap('six');
      await a.wait(700);
    },
  },
  // 11
  {
    q: l('Do {not:NOT} tap the star.', 'स्टार को {not:मत} टैप करो।'),
    hint: l('Change the rule. Words can be moved too.', 'नियम बदल दो। शब्दों को भी हिलाया जा सकता है।'),
    why: l(
      'Drag “NOT” away and the rule becomes “Do tap the star”.',
      '“मत” को हटाओ, तो नियम बन जाता है “स्टार को टैप करो”।',
    ),
    build(c) {
      c.emoji('star', '⭐', c.A.cx, c.A.cy, 180, {
        tap: () => (c.state.free ? c.win() : c.wrong(l('You were told NOT to!', 'मना किया था ना!'))),
      });
    },
    words: {
      drag: ['not'],
      drop: (id, o, c) => {
        if (o.go.y > c.A.top) {
          o.go.destroy();
          c.state.free = true;
          c.say(l('The rule changed…', 'नियम बदल गया…'));
        } else c.back(o);
      },
    },
    async solve(a, c) {
      await a.dragWord('not', { x: c.A.cx, y: c.A.bottom - 40 });
      await a.tap('star');
    },
  },
  // 12
  {
    q: l('What comes next?', 'आगे क्या आएगा?'),
    hint: l('Each number doubles.', 'हर संख्या दोगुनी होती है।'),
    why: l('Each number is twice the one before: 16 × 2 = 32.', 'हर संख्या पिछली की दोगुनी है: 16 × 2 = 32।'),
    build(c) {
      c.label('seq', '2, 4, 8, 16, ?', c.A.cx, c.figY('keypad'), 64);
      c.keypad('32');
    },
    async solve(a) {
      await a.type('32');
    },
  },
  // 13
  {
    q: l('Get the ball into the hole.', 'गेंद को छेद में डालो।'),
    hint: l('If the ball won’t move, what else can?', 'अगर गेंद नहीं हिलती, तो और क्या हिल सकता है?'),
    why: l('The ball was too heavy, so you moved the hole instead!', 'गेंद भारी थी, इसलिए तुमने छेद को ही खिसका दिया!'),
    build(c) {
      const { cx, cy } = c.A;
      const ball = c.emoji('ball', '⚽', cx - 160, cy - 40, 110, {
        tap: () => c.wrong(l('It’s stuck. Too heavy to move!', 'अटकी है। बहुत भारी है!')),
      });
      c.draw('hole', cx + 170, cy + 170, 150, 70, (g) => g.fillStyle(0x0b0b0b, 1).fillEllipse(0, 0, 140, 56), {
        drag: true,
        depth: -1,
        drop: (o) => {
          if (c.dist(o, { x: ball.go.x, y: ball.go.y + 40 }) < 100) {
            o.go.setPosition(ball.go.x, ball.go.y + 40);
            c.scene.tweens.add({
              targets: ball.go,
              y: ball.go.y + 40,
              scale: 0,
              duration: 400,
              onComplete: () => c.win(),
            });
          }
        },
      });
    },
    async solve(a, c) {
      const b = c.get('ball').go;
      await a.drag('hole', { x: b.x, y: b.y + 40 });
      await a.wait(500);
    },
  },
  // 14
  {
    q: l('How many months have 28 days?', 'कितने महीनों में 28 दिन होते हैं?'),
    hint: l('Not “only 28”. Just 28.', '“सिर्फ़ 28” नहीं। बस 28।'),
    why: l('Every month has at least 28 days — all 12!', 'हर महीने में कम से कम 28 दिन होते हैं — सभी 12!'),
    build(c) {
      c.emoji('cal', '📅', c.A.cx, c.figY('choices'), 160);
      c.choices(['1', '6', '12'], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 15
  {
    q: l('Don’t touch anything!', 'किसी चीज़ को मत छुओ!'),
    hint: l('Sometimes the best move is no move.', 'कभी-कभी कुछ न करना ही सही चाल है।'),
    why: l('Patience wins: you just had to wait.', 'धैर्य जीतता है: बस इंतज़ार करना था।'),
    build(c) {
      let left = 5;
      c.emoji('glass', '⏳', c.A.cx, c.A.cy - 60, 170);
      const t = c.label('count', String(left), c.A.cx, c.A.cy + 120, 80);
      c.onAnyTap(() => {
        if (c.solved) return;
        left = 5;
        c.wrong(l('You touched it!', 'छू लिया ना!'));
      });
      c.every(1000, () => {
        if (c.solved) return;
        left--;
        (t.go.list[0] as Phaser.GameObjects.Text).setText(String(Math.max(0, left)));
        if (left <= 0) c.win();
      });
    },
    async solve(a) {
      await a.wait(5600);
    },
  },
  // 16
  {
    q: l('The plant is thirsty. Make it rain!', 'पौधा प्यासा है। बारिश करवाओ!'),
    hint: l('Two clouds are better than one.', 'दो बादल एक से बेहतर हैं।'),
    why: l('Push the clouds together and they make rain.', 'बादलों को मिलाओ तो बारिश होती है।'),
    build(c) {
      const { cx, cy } = c.A;
      const merge = (o: WitObj) => {
        const other = c.get(o.name === 'c1' ? 'c2' : 'c1');
        if (c.dist(o, other) < 150) {
          o.go.destroy();
          other.go.destroy();
          c.emoji('rain', '🌧️', cx, cy - 120, 200);
          c.after(600, () => c.win());
        } else c.back(o);
      };
      c.emoji('c1', '☁️', cx - 190, cy - 140, 150, { drag: true, drop: merge });
      c.emoji('c2', '☁️', cx + 190, cy - 140, 150, { drag: true, drop: merge });
      c.emoji('plant', '🌱', cx, cy + 170, 120, { tap: () => c.say(l('So thirsty…', 'बहुत प्यास लगी है…')) });
    },
    async solve(a) {
      await a.drag('c1', 'c2');
      await a.wait(800);
    },
  },
  // 17
  {
    q: l('How many eggs can you eat on an empty stomach?', 'खाली पेट तुम कितने अंडे खा सकते हो?'),
    hint: l('What happens to the stomach after the first egg?', 'पहले अंडे के बाद पेट का क्या होता है?'),
    why: l('After the first egg, your stomach is not empty any more!', 'पहले अंडे के बाद पेट खाली नहीं रहता!'),
    build(c) {
      c.emoji('egg', '🥚', c.A.cx, c.figY('keypad'), 150);
      c.keypad('1');
    },
    async solve(a) {
      await a.type('1');
    },
  },
  // 18
  {
    q: l('Add one small line to make this true.', 'एक छोटी लकीर जोड़कर इसे सही करो।'),
    hint: l('A plus sign plus one line looks like a number.', 'प्लस के निशान में एक लकीर जोड़ो तो वह एक अंक जैसा दिखता है।'),
    why: l('A line on a “+” makes a “4”: 545 + 5 = 550.', '“+” पर एक लकीर से “4” बनता है: 545 + 5 = 550।'),
    build(c) {
      const parts = ['5', '+', '5', '+', '5', '=', '550'];
      const xs = [-270, -190, -110, -30, 50, 140, 250];
      parts.forEach((p, i) => {
        const name = p === '+' ? `p${i}` : `t${i}`;
        c.label(name, p, c.A.cx + xs[i], c.A.cy, 80, {
          tap: (o) => {
            if (p !== '+' || c.solved) return c.wrong(WRONG.look);
            (o.go.list[0] as Phaser.GameObjects.Text).setText('4').setColor('#7cf29c');
            c.after(500, () => c.win());
          },
        });
      });
    },
    async solve(a) {
      await a.tap('p1');
      await a.wait(600);
    },
  },
  // 19
  {
    q: l('Which line is longer?', 'कौन-सी लकीर लंबी है?'),
    hint: l('The little arrows are trying to fool you.', 'छोटे तीर तुम्हें बेवकूफ़ बना रहे हैं।'),
    why: l(
      'Both lines are exactly the same length. The arrow ends trick your eyes.',
      'दोनों लकीरें बिल्कुल बराबर हैं। तीर आँखों को धोखा देते हैं।',
    ),
    build(c) {
      const y = c.figY('choices');
      c.draw('lines', c.A.cx, y, 460, 220, (g) => {
        g.lineStyle(8, 0xffffff, 1);
        g.lineBetween(-150, -60, 150, -60);
        g.lineBetween(-150, -60, -120, -90).lineBetween(-150, -60, -120, -30);
        g.lineBetween(150, -60, 120, -90).lineBetween(150, -60, 120, -30);
        g.lineBetween(-150, 60, 150, 60);
        g.lineBetween(-150, 60, -180, 30).lineBetween(-150, 60, -180, 90);
        g.lineBetween(150, 60, 180, 30).lineBetween(150, 60, 180, 90);
      });
      c.choices([l('Top', 'ऊपर वाली'), l('Bottom', 'नीचे वाली'), l('Same', 'बराबर')], 2);
    },
    async solve(a) {
      await a.pick(2);
    },
  },
  // 20
  {
    q: l('Tap the odd one out.', 'जो अलग है उस पर टैप करो।'),
    hint: l('Four of them can only be divided by 1 and themselves.', 'चार संख्याएँ सिर्फ़ 1 और खुद से बँटती हैं।'),
    why: l('2, 3, 5 and 11 are prime numbers. 9 = 3 × 3 is not.', '2, 3, 5 और 11 अभाज्य संख्याएँ हैं। 9 = 3 × 3 नहीं है।'),
    build(c) {
      c.emoji('think', '🤔', c.A.cx, c.figY('choices', 2), 140);
      c.choices(['2', '3', '5', '9', '11'], 3);
    },
    async solve(a) {
      await a.pick(3);
    },
  },
  // 21
  {
    q: l('Feed the robot 3 bolts.', 'रोबोट को 3 बोल्ट खिलाओ।'),
    hint: l('The robot is sitting on something.', 'रोबोट किसी चीज़ पर बैठा है।'),
    why: l('The third bolt was under the robot.', 'तीसरा बोल्ट रोबोट के नीचे था।'),
    build(c) {
      const { cx, cy } = c.A;
      let eaten = 0;
      const feed = (o: WitObj) => {
        if (c.dist(o, c.get('robot')) < 120) {
          o.go.destroy();
          c.say(l('Yum!', 'मज़ा आया!'));
          if (++eaten === 3) c.win();
        } else c.back(o);
      };
      c.emoji('b3', '🔩', cx, cy - 40, 70, { drag: true, drop: feed });
      c.emoji('robot', '🤖', cx, cy - 60, 170, { drag: true });
      c.emoji('b1', '🔩', cx - 220, cy + 180, 80, { drag: true, drop: feed });
      c.emoji('b2', '🔩', cx + 220, cy + 180, 80, { drag: true, drop: feed });
    },
    async solve(a, c) {
      await a.drag('b1', 'robot');
      await a.drag('b2', 'robot');
      await a.drag('robot', { x: c.A.cx + 150, y: c.A.top + 90 });
      await a.drag('b3', 'robot');
    },
  },
  // 22
  {
    q: l('Turn on the light.', 'बत्ती जलाओ।'),
    hint: l('Pictures on a wall can hide things.', 'दीवार की तस्वीरें चीज़ें छिपा सकती हैं।'),
    why: l('The light switch was behind the picture frame.', 'बत्ती का बटन तस्वीर के पीछे था।'),
    build(c) {
      const { cx, cy, left, right, top, bottom } = c.A;
      const dark = c.scene.add.rectangle(cx, cy, right - left + 40, bottom - top + 40, 0x000000, 0.65).setDepth(5);
      const bulb = c.emoji('bulb', '💡', cx - 150, cy - 140, 140, {
        tap: () => c.say(l('The switch must be somewhere…', 'बटन कहीं तो होगा…')),
        depth: 6,
      });
      bulb.go.setAlpha(0.4);
      c.draw(
        'switch',
        cx + 170,
        cy + 60,
        70,
        100,
        (g) => {
          g.fillStyle(0xeeeeee, 1).fillRoundedRect(-30, -45, 60, 90, 10);
          g.fillStyle(0x777777, 1).fillRoundedRect(-12, -30, 24, 34, 6);
        },
        {
          depth: 6,
          tap: () => {
            dark.destroy();
            bulb.go.setAlpha(1);
            c.after(400, () => c.win());
          },
        },
      );
      c.emoji('frame', '🖼️', cx + 170, cy + 60, 170, { drag: true, depth: 7 });
    },
    async solve(a, c) {
      await a.drag('frame', { x: c.A.cx - 120, y: c.A.bottom - 80 });
      await a.tap('switch');
      await a.wait(500);
    },
  },
  // 23
  {
    q: l('What has a neck but no head?', 'किसकी गर्दन होती है पर सिर नहीं?'),
    hint: l('It’s not an animal.', 'यह कोई जानवर नहीं है।'),
    why: l('A bottle has a neck but no head.', 'बोतल की गर्दन होती है पर सिर नहीं।'),
    build(c) {
      c.emoji('q', '❓', c.A.cx, c.figY('choices', 2), 130);
      c.choices(['🍾', '🦒', '🦢', '🐢'], 0);
    },
    async solve(a) {
      await a.pick(0);
    },
  },
  // 24
  {
    q: l('A spider, a dog and a bird. How many legs in total?', 'एक मकड़ी, एक कुत्ता और एक चिड़िया। कुल कितनी टाँगें?'),
    hint: l('Spiders have more legs than you think.', 'मकड़ी की टाँगें तुम्हारी सोच से ज़्यादा होती हैं।'),
    why: l('8 + 4 + 2 = 14 legs.', '8 + 4 + 2 = 14 टाँगें।'),
    build(c) {
      const y = c.figY('keypad');
      c.emoji('sp', '🕷️', c.A.cx - 180, y, 110);
      c.emoji('dog', '🐕', c.A.cx, y, 110);
      c.emoji('bird', '🐦', c.A.cx + 180, y, 110);
      c.keypad('14');
    },
    async solve(a) {
      await a.type('14');
    },
  },
  // 25
  {
    q: l('Wake up the cat.', 'बिल्ली को जगाओ।'),
    hint: l('Cats wake up when the night is over.', 'रात खत्म होने पर बिल्लियाँ जागती हैं।'),
    why: l(
      'Pull the Moon down and the Sun comes up — good morning, cat!',
      'चाँद को नीचे खींचो तो सूरज निकलता है — सुप्रभात, बिल्ली!',
    ),
    build(c) {
      const { cx, cy, left, right } = c.A;
      const horizon = cy + 100;
      c.scene.add.rectangle(cx, horizon + 150, right - left + 40, 300, 0x2e5d32).setDepth(2);
      const cat = c.emoji('cat', '🐈', cx - 120, horizon + 40, 130, {
        depth: 3,
        tap: () => c.say(l('Zzz… it’s still night.', 'ज़्ज़्ज़… अभी तो रात है।')),
      });
      const zzz = c.label('zzz', 'z z z', cx - 40, horizon - 50, 34, { depth: 3 });
      c.emoji('moon', '🌙', cx + 150, c.A.top + 60, 110, {
        drag: true,
        drop: (o) => {
          if (o.go.y > horizon) {
            o.go.destroy();
            zzz.go.destroy();
            c.emoji('sun', '☀️', cx + 150, c.A.top + 60, 130);
            c.scene.tweens.add({ targets: cat.go, y: cat.go.y - 30, yoyo: true, duration: 200 });
            c.after(500, () => c.win());
          } else c.back(o);
        },
      });
      c.state.horizon = horizon;
    },
    async solve(a, c) {
      await a.drag('moon', { x: c.A.cx + 150, y: (c.state.horizon as number) + 80 });
      await a.wait(600);
    },
  },
  // 26
  {
    q: l('Find the 6.', '6 ढूँढो।'),
    hint: l('It looks just like the others, only upside down.', 'यह बाकियों जैसा ही दिखता है, बस उल्टा।'),
    why: l('One “9” was really a “6”.', 'एक “9” असल में “6” था।'),
    build(c) {
      const cols = 6;
      const rows = 6;
      for (let i = 0; i < cols * rows; i++) {
        const x = c.A.cx - 250 + (i % cols) * 100;
        const y = c.A.cy - 220 + Math.floor(i / cols) * 88;
        const six = i === 22;
        c.label(six ? 'six' : `n${i}`, six ? '6' : '9', x, y, 56, {
          tap: () => (six ? c.win() : c.wrong(l('That’s a 9.', 'यह 9 है।'))),
        });
      }
    },
    async solve(a) {
      await a.tap('six');
    },
  },
  // 27
  {
    q: l('Keep the robot from rusting.', 'रोबोट को जंग लगने से बचाओ।'),
    hint: l('What keeps you dry?', 'तुम्हें क्या सूखा रखता है?'),
    why: l('An umbrella keeps the rain off the robot.', 'छाता बारिश को रोबोट से दूर रखता है।'),
    build(c) {
      const { cx, cy } = c.A;
      c.emoji('rain', '🌧️', cx, cy - 210, 150);
      const robot = c.emoji('robot', '🤖', cx, cy + 40, 150);
      const drop = (o: WitObj) => {
        const over = Math.abs(o.go.x - robot.go.x) < 110 && o.go.y < robot.go.y && o.go.y > robot.go.y - 220;
        if (!over) return c.back(o);
        if (o.name === 'umbrella') c.win();
        else {
          c.wrong(l('Too small to keep it dry!', 'यह सूखा रखने के लिए बहुत छोटी है!'));
          c.back(o);
        }
      };
      c.emoji('cap', '🧢', cx - 200, cy + 210, 100, { drag: true, drop });
      c.emoji('umbrella', '☂️', cx + 200, cy + 210, 110, { drag: true, drop });
    },
    async solve(a, c) {
      const r = c.get('robot').go;
      await a.drag('umbrella', { x: r.x, y: r.y - 120 });
    },
  },
  // 28
  {
    q: l('How many triangles are there?', 'कितने त्रिभुज हैं?'),
    hint: l('Count the two halves — and the whole.', 'दोनों आधे गिनो — और पूरा भी।'),
    why: l('2 small triangles + the big one = 3.', '2 छोटे त्रिभुज + 1 बड़ा = 3।'),
    build(c) {
      c.draw('tri', c.A.cx, c.figY('keypad'), 300, 240, (g) => {
        g.lineStyle(8, 0xffffff, 1).strokeTriangle(0, -110, -140, 100, 140, 100);
        g.lineBetween(0, -110, 0, 100);
      });
      c.keypad('3');
    },
    async solve(a) {
      await a.type('3');
    },
  },
  // 29
  {
    q: l('What is the answer?', 'उत्तर क्या है?'),
    hint: l('Divide before you add.', 'जोड़ने से पहले भाग करो।'),
    why: l('Division comes first: 8 ÷ 2 = 4, then 8 + 4 = 12.', 'पहले भाग: 8 ÷ 2 = 4, फिर 8 + 4 = 12।'),
    build(c) {
      c.label('sum', '8 + 8 ÷ 2 = ?', c.A.cx, c.figY('keypad'), 72);
      c.keypad('12');
    },
    async solve(a) {
      await a.type('12');
    },
  },
  // 30
  {
    q: l('Fill the glass with water.', 'गिलास में पानी भरो।'),
    hint: l('Look at the glass. Is it ready?', 'गिलास को देखो। क्या वह तैयार है?'),
    why: l('The glass was upside down. Flip it first!', 'गिलास उल्टा था। पहले उसे सीधा करो!'),
    build(c) {
      const { cx, cy } = c.A;
      const glass = c.draw('glass', cx + 130, cy + 80, 140, 180, (g) => {
        g.lineStyle(6, 0xd0f0ff, 1);
        g.beginPath();
        g.moveTo(-50, 80);
        g.lineTo(-60, -80);
        g.moveTo(50, 80);
        g.lineTo(60, -80);
        g.moveTo(-50, 80);
        g.lineTo(50, 80);
        g.strokePath();
      });
      glass.go.setAngle(180);
      glass.onTap = (o) => {
        if (c.state.up) return;
        c.state.up = true;
        c.scene.tweens.add({ targets: o.go, angle: 0, duration: 300 });
      };
      c.emoji('water', '💧', cx - 180, cy - 120, 120, {
        drag: true,
        drop: (o) => {
          if (c.dist(o, glass) > 140) return c.back(o);
          if (!c.state.up) {
            c.wrong(l('The water spills everywhere!', 'पानी सब जगह गिर गया!'));
            return c.back(o);
          }
          o.go.destroy();
          c.scene.add.rectangle(glass.go.x, glass.go.y + 15, 100, 120, 0x3d8bf2, 0.8).setDepth(-1);
          c.after(400, () => c.win());
        },
      });
    },
    async solve(a) {
      await a.tap('glass');
      await a.wait(400);
      await a.drag('water', 'glass');
      await a.wait(500);
    },
  },
  // 31
  {
    q: l('Tap the shapes from fewest sides to most.', 'आकृतियों को सबसे कम भुजाओं से ज़्यादा की ओर टैप करो।'),
    hint: l('How many sides does a circle have?', 'वृत्त की कितनी भुजाएँ होती हैं?'),
    why: l(
      'Circle (0), triangle (3), square (4), pentagon (5), hexagon (6).',
      'वृत्त (0), त्रिभुज (3), वर्ग (4), पंचभुज (5), षट्भुज (6)।',
    ),
    build(c) {
      const { cx, cy } = c.A;
      const poly = (n: number) => (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0xf7c531, 1);
        if (n === 0) return void g.fillCircle(0, 0, 55);
        const pts: Phaser.Math.Vector2[] = [];
        for (let k = 0; k < n; k++) {
          const ang = (n === 4 ? -Math.PI / 4 : -Math.PI / 2) + (k * Math.PI * 2) / n;
          pts.push({ x: Math.cos(ang) * 60, y: Math.sin(ang) * 60 } as Phaser.Math.Vector2);
        }
        g.fillPoints(pts, true);
      };
      const order = ['circle', 'tri', 'square', 'penta', 'hexa'];
      const tap = sequence(c, order, () => c.win());
      const spots = [
        ['hexa', 6, cx - 190, cy - 140],
        ['circle', 0, cx + 170, cy + 150],
        ['penta', 5, cx + 160, cy - 160],
        ['tri', 3, cx - 180, cy + 140],
        ['square', 4, cx, cy],
      ] as const;
      for (const [name, n, x, y] of spots) c.draw(name, x, y, 140, 140, poly(n), { tap });
    },
    async solve(a) {
      for (const n of ['circle', 'tri', 'square', 'penta', 'hexa']) await a.tap(n);
    },
  },
  // 32
  {
    q: l('Tap the numbers from 1 to 5 in order.', '1 से 5 तक की संख्याएँ क्रम से टैप करो।'),
    hint: l('One number is hiding behind another.', 'एक संख्या दूसरी के पीछे छिपी है।'),
    why: l('The 4 was hiding under the 5.', '4, 5 के नीचे छिपा था।'),
    build(c) {
      const { cx, cy } = c.A;
      const tap = sequence(c, ['n1', 'n2', 'n3', 'n4', 'n5'], () => c.win());
      const tile = (name: string, n: string, x: number, y: number, color: number) =>
        c
          .draw(name, x, y, 120, 120, (g) => numberTile(g, 110, 110, color), { tap, drag: true })
          .go.add(
            c.scene.add
              .text(0, 0, n, { fontFamily: 'system-ui, sans-serif', fontSize: '60px', fontStyle: 'bold' })
              .setOrigin(0.5),
          );
      tile('n4', '4', cx + 150, cy + 60, 0x9b5de5);
      tile('n5', '5', cx + 150, cy + 60, 0xe8554e);
      tile('n1', '1', cx - 180, cy - 150, 0x3d8bf2);
      tile('n2', '2', cx + 120, cy - 170, 0x2fae63);
      tile('n3', '3', cx - 150, cy + 150, 0xf28c28);
    },
    async solve(a, c) {
      await a.drag('n5', { x: c.A.cx - 20, y: c.A.bottom - 70 });
      for (const n of ['n1', 'n2', 'n3', 'n4', 'n5']) await a.tap(n);
    },
  },
  // 33
  {
    q: l('Use exactly three coins to make 10.', 'ठीक तीन सिक्कों से 10 बनाओ।'),
    hint: l('Try the biggest coin first.', 'पहले सबसे बड़ा सिक्का आज़माओ।'),
    why: l('For example 5 + 4 + 1 = 10, or 6 + 3 + 1.', 'जैसे 5 + 4 + 1 = 10, या 6 + 3 + 1।'),
    build(c) {
      const { cx, cy } = c.A;
      const jarY = cy + 150;
      c.draw('jar', cx, jarY, 420, 150, (g) => {
        g.lineStyle(6, 0xd0f0ff, 0.9).strokeRoundedRect(-200, -70, 400, 140, 24);
      });
      const sumText = c.label('sum', '0', cx, jarY + 110, 40, { color: '#ffd166' });
      const inJar: WitObj[] = [];
      const layout = () =>
        inJar.forEach((o, i) => c.scene.tweens.add({ targets: o.go, x: cx - 120 + i * 120, y: jarY, duration: 200 }));
      const total = () => inJar.reduce((s, o) => s + Number(o.name.slice(1)), 0);
      const tap = (o: WitObj) => {
        const i = inJar.indexOf(o);
        if (i >= 0) {
          inJar.splice(i, 1);
          c.back(o);
        } else {
          if (inJar.length === 3) return c.say(l('Only three coins!', 'सिर्फ़ तीन सिक्के!'));
          inJar.push(o);
        }
        layout();
        (sumText.go.list[0] as Phaser.GameObjects.Text).setText(String(total()));
        if (inJar.length === 3 && total() === 10) c.after(300, () => c.win());
      };
      [1, 2, 3, 4, 5, 6].forEach((v, i) => {
        const o = c.draw(
          `c${v}`,
          cx - 250 + i * 100,
          cy - 120,
          90,
          90,
          (g) => {
            g.fillStyle(0xb7791f, 1).fillCircle(0, 4, 42);
            g.fillStyle(0xf3c14b, 1).fillCircle(0, 0, 42);
          },
          { tap },
        );
        o.go.add(
          c.scene.add
            .text(0, 0, String(v), { fontFamily: 'system-ui', fontSize: '40px', color: '#5a3a00', fontStyle: 'bold' })
            .setOrigin(0.5),
        );
      });
    },
    async solve(a) {
      await a.tap('c5');
      await a.tap('c4');
      await a.tap('c1');
      await a.wait(500);
    },
  },
  // 34
  {
    q: l('What gets wetter the more it dries?', 'क्या चीज़ जितना सुखाती है, उतनी ही गीली होती है?'),
    hint: l('You use it after a bath.', 'नहाने के बाद तुम इसे इस्तेमाल करते हो।'),
    why: l('A towel gets wetter as it dries you.', 'तौलिया तुम्हें सुखाते हुए खुद गीला होता है।'),
    build(c) {
      c.emoji('bath', '🛁', c.A.cx, c.figY('choices', 2), 150);
      c.choices([l('Towel', 'तौलिया'), l('Water', 'पानी'), l('Sun', 'सूरज'), l('Ice', 'बर्फ़')], 0);
    },
    async solve(a) {
      await a.pick(0);
    },
  },
  // 35
  {
    q: l('Find the way out. Tap the {exit:exit}!', 'बाहर का रास्ता ढूँढो। {exit:निकास} पर टैप करो!'),
    hint: l('The doors are all locked. Where else does it say “exit”?', 'सारे दरवाज़े बंद हैं। “निकास” और कहाँ लिखा है?'),
    why: l('The word “exit” in the question was the way out.', 'सवाल में लिखा “निकास” ही रास्ता था।'),
    build(c) {
      const { cx, cy } = c.A;
      [-200, 0, 200].forEach((dx, i) =>
        c.emoji(`door${i}`, '🚪', cx + dx, cy, 150, { tap: () => c.wrong(WRONG.locked) }),
      );
    },
    words: { tap: (id, c) => id === 'exit' && c.win() },
    async solve(a) {
      await a.tapWord('exit');
    },
  },
  // 36
  {
    q: l('Tap the button 15 times.', 'बटन को 15 बार टैप करो।'),
    hint: l('It moves, but it can’t hide. Keep going!', 'यह हिलता है, पर छिप नहीं सकता। लगे रहो!'),
    why: l('Fast fingers win!', 'तेज़ उँगलियाँ जीतती हैं!'),
    build(c) {
      const { cx, cy } = c.A;
      const spots = [
        [0, 0],
        [-180, -150],
        [170, 120],
        [-150, 160],
        [190, -140],
        [0, -190],
        [-200, 20],
        [200, 10],
        [80, 190],
        [-80, -60],
        [130, -40],
        [-170, -40],
        [40, 130],
        [-20, -150],
        [160, 170],
      ];
      let n = 0;
      c.pill('btn', 'TAP', cx, cy, 160, 90, 0xe8554e, {
        tap: (o) => {
          n++;
          (o.go.list[1] as Phaser.GameObjects.Text).setText(String(15 - n));
          if (n >= 15) return c.win();
          const [dx, dy] = spots[n % spots.length];
          o.go.setPosition(cx + dx, cy + dy);
        },
      });
    },
    async solve(a) {
      for (let i = 0; i < 15; i++) await a.tap('btn');
    },
  },
  // 37
  {
    q: l('Help the robot reach its battery.', 'रोबोट को उसकी बैटरी तक पहुँचाओ।'),
    hint: l('Robots can’t jump. Build something first.', 'रोबोट कूद नहीं सकते। पहले कुछ बनाओ।'),
    why: l('The plank made a bridge across the gap.', 'लकड़ी के पटरे से खाई पर पुल बन गया।'),
    build(c) {
      const { cx, cy, left, right } = c.A;
      const ground = cy + 40;
      c.scene.add.rectangle(left + 110, ground + 120, 260, 240, 0x6d4c41);
      c.scene.add.rectangle(right - 110, ground + 120, 260, 240, 0x6d4c41);
      const gap = { x: cx, y: ground + 10 };
      c.state.gap = gap;
      c.emoji('battery', '🔋', right - 90, ground - 50, 90);
      const robot = c.emoji('robot', '🤖', left + 90, ground - 60, 110, {
        tap: (o) => {
          if (!c.state.bridge) {
            c.wrong(l('Robots can’t jump!', 'रोबोट कूद नहीं सकते!'));
            return;
          }
          c.scene.tweens.add({ targets: o.go, x: right - 180, duration: 900, onComplete: () => c.win() });
        },
      });
      void robot;
      c.draw(
        'plank',
        cx,
        c.A.bottom - 60,
        300,
        40,
        (g) => {
          g.fillStyle(0xa1887f, 1).fillRoundedRect(-140, -16, 280, 32, 8);
          g.lineStyle(3, 0x5d4037, 1).strokeRoundedRect(-140, -16, 280, 32, 8);
        },
        {
          drag: true,
          drop: (o) => {
            if (c.dist(o, gap) < 100) {
              o.go.setPosition(gap.x, gap.y);
              o.drag = false;
              c.state.bridge = true;
            } else c.back(o);
          },
        },
      );
    },
    async solve(a, c) {
      await a.drag('plank', c.state.gap as { x: number; y: number });
      await a.tap('robot');
      await a.wait(1100);
    },
  },
  // 38
  {
    q: l('Tap the numbers from smallest to biggest.', 'संख्याओं को सबसे छोटी से सबसे बड़ी तक टैप करो।'),
    hint: l('A quarter is less than a half.', 'एक चौथाई, आधे से कम होता है।'),
    why: l('1/4 = 0.25, then 0.5, then 1, then 2.', '1/4 = 0.25, फिर 0.5, फिर 1, फिर 2।'),
    build(c) {
      const { cx, cy } = c.A;
      const tap = sequence(c, ['q', 'h', 'one', 'two'], () => c.win());
      c.label('two', '2', cx - 170, cy - 120, 90, { tap });
      c.label('h', '0.5', cx + 160, cy - 120, 90, { tap });
      c.label('one', '1', cx - 150, cy + 130, 90, { tap });
      c.label('q', '1/4', cx + 160, cy + 130, 90, { tap });
    },
    async solve(a) {
      for (const n of ['q', 'h', 'one', 'two']) await a.tap(n);
    },
  },
  // 39
  {
    q: l('What is half of 2 + 2?', '2 का आधा + 2 कितना होता है?'),
    hint: l('Take half of 2 first.', 'पहले 2 का आधा लो।'),
    why: l('Half of 2 is 1, and 1 + 2 = 3.', '2 का आधा 1 है, और 1 + 2 = 3।'),
    build(c) {
      c.emoji('brain', '🧠', c.A.cx, c.figY('keypad'), 150);
      c.keypad('3');
    },
    async solve(a) {
      await a.type('3');
    },
  },
  // 40
  {
    q: l('The robot can’t sleep. Help it!', 'रोबोट सो नहीं पा रहा। मदद करो!'),
    hint: l('Screens keep everyone awake.', 'स्क्रीन सबको जगाए रखती है।'),
    why: l('Phone in the bin, robot in dreamland.', 'फ़ोन डिब्बे में, रोबोट सपनों में।'),
    build(c) {
      const { cx, cy } = c.A;
      const robot = c.emoji('robot', '🤖', cx - 120, cy, 160, {
        tap: () => c.wrong(l('Bzzz… the phone keeps it awake!', 'बज़्ज़… फ़ोन इसे जगाए रखता है!')),
      });
      const bin = c.emoji('bin', '🗑️', cx + 200, c.A.bottom - 70, 110);
      c.emoji('phone', '📱', cx + 100, cy - 60, 100, {
        drag: true,
        drop: (o) => {
          if (c.dist(o, bin) < 110) {
            o.go.destroy();
            c.label('zzz', 'Z z z', robot.go.x + 90, robot.go.y - 110, 44);
            c.after(500, () => c.win());
          } else c.back(o);
        },
      });
    },
    async solve(a) {
      await a.drag('phone', 'bin');
      await a.wait(600);
    },
  },
  // 41
  {
    q: l('Tap the second smallest animal.', 'दूसरे सबसे छोटे जानवर पर टैप करो।'),
    hint: l('Think about real life, not picture size.', 'असली ज़िंदगी के बारे में सोचो, तस्वीर के आकार के नहीं।'),
    why: l('In real life: bee, then mouse, cat, giraffe, elephant.', 'असल में: मधुमक्खी, फिर चूहा, बिल्ली, जिराफ़, हाथी।'),
    build(c) {
      const { cx, cy } = c.A;
      const no = () => c.wrong(WRONG.notThat);
      c.emoji('elephant', '🐘', cx - 190, cy - 140, 60, { tap: no });
      c.emoji('mouse', '🐭', cx + 150, cy - 110, 170, { tap: () => c.win() });
      c.emoji('bee', '🐝', cx - 140, cy + 120, 150, {
        tap: () => c.wrong(l('That’s the smallest one.', 'यह तो सबसे छोटा है।')),
      });
      c.emoji('cat', '🐈', cx + 170, cy + 150, 80, { tap: no });
      c.emoji('giraffe', '🦒', cx, cy, 70, { tap: no });
    },
    async solve(a) {
      await a.tap('mouse');
    },
  },
  // 42
  {
    q: l('Which bolt fits the nut?', 'कौन-सा बोल्ट नट में फ़िट होगा?'),
    hint: l('Compare each bolt with the hole.', 'हर बोल्ट की तुलना छेद से करो।'),
    why: l('The middle-thick bolt is the same width as the hole.', 'मध्यम मोटाई वाला बोल्ट छेद जितना ही चौड़ा है।'),
    build(c) {
      const { cx, cy } = c.A;
      const nut = c.draw('nut', cx, cy - 150, 200, 200, (g) => {
        const pts: Phaser.Math.Vector2[] = [];
        for (let k = 0; k < 6; k++) {
          const ang = (k * Math.PI) / 3;
          pts.push({ x: Math.cos(ang) * 90, y: Math.sin(ang) * 90 } as Phaser.Math.Vector2);
        }
        g.fillStyle(0xaab4be, 1).fillPoints(pts, true);
        g.fillStyle(0x1d2b3a, 1).fillCircle(0, 0, 19);
      });
      const bolt = (name: string, x: number, w: number) =>
        c.draw(
          name,
          x,
          cy + 150,
          w + 30,
          210,
          (g) => {
            g.fillStyle(0x8d99a6, 1).fillRect(-w / 2, -80, w, 170);
            g.fillStyle(0x6b7785, 1).fillRect(-w / 2 - 14, -100, w + 28, 26);
            g.lineStyle(2, 0x4b5560, 1);
            for (let y = -60; y < 90; y += 14) g.lineBetween(-w / 2, y + 6, w / 2, y);
          },
          {
            drag: true,
            drop: (o) => {
              if (c.dist(o, nut) > 130) return c.back(o);
              if (w === 36) {
                o.go.setPosition(nut.go.x, nut.go.y + 40);
                c.after(300, () => c.win());
              } else {
                c.wrong(w > 36 ? l('Too fat!', 'बहुत मोटा!') : l('Too thin — it falls out!', 'बहुत पतला — गिर जाता है!'));
                c.back(o);
              }
            },
          },
        );
      bolt('wide', cx - 200, 54);
      bolt('thin', cx, 22);
      bolt('right', cx + 200, 36);
    },
    async solve(a) {
      await a.drag('right', 'nut');
      await a.wait(400);
    },
  },
  // 43
  {
    q: l('Give the robot its missing {eye:eye}.', 'रोबोट को उसकी खोई हुई {eye:आँख} दो।'),
    hint: l('Everything on this screen can move. Even the words.', 'इस स्क्रीन पर सब कुछ हिल सकता है। शब्द भी।'),
    why: l('You dragged the word “eye” right into place!', 'तुमने “आँख” शब्द को सही जगह खींच दिया!'),
    build(c) {
      const { cx, cy } = c.A;
      c.draw('face', cx, cy, 340, 320, (g) => {
        g.fillStyle(0x90a4ae, 1).fillRoundedRect(-160, -150, 320, 300, 40);
        g.fillStyle(0x263238, 1).fillCircle(-70, -40, 34);
        g.fillStyle(0x4fc3f7, 1).fillCircle(-70, -40, 18);
        g.lineStyle(6, 0x263238, 0.5).strokeCircle(70, -40, 34);
        g.fillStyle(0x263238, 1).fillRoundedRect(-80, 50, 160, 30, 12);
      });
      c.state.eye = { x: cx + 70, y: cy - 40 };
    },
    words: {
      drag: ['eye'],
      drop: (_id, o, c) => {
        const spot = c.state.eye as { x: number; y: number };
        if (c.dist(o, spot) < 90) {
          o.go.destroy();
          c.draw('neweye', spot.x, spot.y, 70, 70, (g) => {
            g.fillStyle(0x263238, 1).fillCircle(0, 0, 34);
            g.fillStyle(0x4fc3f7, 1).fillCircle(0, 0, 18);
          });
          c.after(400, () => c.win());
        } else c.back(o);
      },
    },
    async solve(a, c) {
      await a.dragWord('eye', c.state.eye as { x: number; y: number });
      await a.wait(500);
    },
  },
  // 44
  {
    q: l(
      'The safe code is the number of sides on three triangles and one square.',
      'तिजोरी का कोड है: तीन त्रिभुजों और एक वर्ग की कुल भुजाएँ।',
    ),
    hint: l('A triangle has 3 sides. A square has 4.', 'त्रिभुज की 3 भुजाएँ, वर्ग की 4।'),
    why: l('3 + 3 + 3 + 4 = 13.', '3 + 3 + 3 + 4 = 13।'),
    build(c) {
      const y = c.figY('keypad');
      c.label('shapes', '🔺 🔺 🔺 🟦', c.A.cx, y - 40, 70);
      c.emoji('safe', '🔐', c.A.cx, y + 60, 80);
      c.keypad('13');
    },
    async solve(a) {
      await a.type('13');
    },
  },
  // 45
  {
    q: l('Turn on all the lights.', 'सारी बत्तियाँ जलाओ।'),
    hint: l(
      'Each tap also flips the lights next to it. Try the middle.',
      'हर टैप पास वाली बत्तियाँ भी बदलता है। बीच वाली आज़माओ।',
    ),
    why: l(
      'Tapping a light flips it and its neighbours — planning wins.',
      'टैप करने से वह और उसके पड़ोसी बदलते हैं — सोच-समझकर चलना जीतता है।',
    ),
    build(c) {
      const { cx, cy } = c.A;
      const on = new Array(9).fill(true);
      const flip = (i: number) => {
        const r = Math.floor(i / 3);
        const col = i % 3;
        for (const [dr, dc] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const rr = r + dr;
          const cc = col + dc;
          if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) on[rr * 3 + cc] = !on[rr * 3 + cc];
        }
      };
      [1, 3, 4].forEach(flip); // starting puzzle: undo these three taps
      const cells: WitObj[] = [];
      const paint = () =>
        cells.forEach((o, i) => {
          const g = o.go.list[0] as Phaser.GameObjects.Graphics;
          g.clear();
          g.fillStyle(on[i] ? 0xffd166 : 0x37474f, 1).fillRoundedRect(-55, -55, 110, 110, 18);
          g.lineStyle(4, 0xffffff, 0.6).strokeRoundedRect(-55, -55, 110, 110, 18);
        });
      for (let i = 0; i < 9; i++) {
        cells.push(
          c.draw(`l${i}`, cx - 130 + (i % 3) * 130, cy - 130 + Math.floor(i / 3) * 130, 120, 120, () => {}, {
            tap: () => {
              if (c.solved) return;
              flip(i);
              paint();
              if (on.every(Boolean)) c.after(300, () => c.win());
            },
          }),
        );
      }
      paint();
    },
    async solve(a) {
      for (const i of [1, 3, 4]) await a.tap(`l${i}`);
      await a.wait(400);
    },
  },
  // 46
  {
    q: l('Get exactly 4 litres of water.', 'ठीक 4 लीटर पानी निकालो।'),
    hint: l('Fill the big one, pour into the small one, empty the small one…', 'बड़ा भरो, छोटे में डालो, छोटा खाली करो…'),
    why: l(
      'Fill 5, pour into 3 (2 left), empty 3, pour the 2 in, fill 5, top up the 3: 4 litres left!',
      '5 भरो, 3 में डालो (2 बचा), 3 खाली करो, 2 डालो, 5 भरो, 3 को भरो: 4 लीटर बचा!',
    ),
    build(c) {
      const { cx, cy } = c.A;
      const jug = { a: 0, b: 0 }; // a = 3 L, b = 5 L
      const cap = { a: 3, b: 5 };
      const jugs: Record<'a' | 'b', WitObj> = {
        a: c.draw('jugA', cx - 150, cy - 80, 160, 220, () => {}),
        b: c.draw('jugB', cx + 150, cy - 110, 180, 300, () => {}),
      };
      const paint = () => {
        (['a', 'b'] as const).forEach((k) => {
          const g = jugs[k].go.list[0] as Phaser.GameObjects.Graphics;
          const h = cap[k] * 50;
          g.clear();
          g.fillStyle(0x3d8bf2, 0.9).fillRect(-60, h / 2 - jug[k] * 50, 120, jug[k] * 50);
          g.lineStyle(6, 0xffffff, 1).strokeRect(-60, -h / 2, 120, h);
          for (let i = 1; i < cap[k]; i++) g.lineBetween(-60, h / 2 - i * 50, -45, h / 2 - i * 50);
        });
        c.label('la', `${jug.a} / 3 L`, cx - 150, cy + 60, 30);
        c.label('lb', `${jug.b} / 5 L`, cx + 150, cy + 70, 30);
        if (jug.a === 4 || jug.b === 4) c.after(400, () => c.win());
      };
      const btn = (name: string, s: L, x: number, y: number, fn: () => void) =>
        c.pill(name, c.L(s), x, y, 200, 70, 0x3d8bf2, { tap: () => (fn(), paint()) });
      const by = c.A.bottom - 170;
      btn('fillA', l('Fill 3L', '3L भरो'), cx - 230, by, () => (jug.a = 3));
      btn('emptyA', l('Empty 3L', '3L खाली'), cx - 230, by + 90, () => (jug.a = 0));
      btn('fillB', l('Fill 5L', '5L भरो'), cx + 230, by, () => (jug.b = 5));
      btn('emptyB', l('Empty 5L', '5L खाली'), cx + 230, by + 90, () => (jug.b = 0));
      btn('pourAB', l('3L → 5L', '3L → 5L'), cx, by, () => {
        const n = Math.min(jug.a, 5 - jug.b);
        jug.a -= n;
        jug.b += n;
      });
      btn('pourBA', l('5L → 3L', '5L → 3L'), cx, by + 90, () => {
        const n = Math.min(jug.b, 3 - jug.a);
        jug.b -= n;
        jug.a += n;
      });
      paint();
    },
    async solve(a) {
      for (const b of ['fillB', 'pourBA', 'emptyA', 'pourBA', 'fillB', 'pourBA']) await a.tap(b);
      await a.wait(500);
    },
  },
  // 47
  {
    q: l('Escape the room.', 'कमरे से बाहर निकलो।'),
    hint: l('The key is too high. Something to stand on?', 'चाबी बहुत ऊँची है। किसी चीज़ पर खड़े होना?'),
    why: l('Chair under the key, grab the key, open the door.', 'चाबी के नीचे कुर्सी, चाबी पकड़ो, दरवाज़ा खोलो।'),
    build(c) {
      const { cx, cy } = c.A;
      const floor = cy + 170;
      const door = c.emoji('door', '🚪', cx + 210, floor - 70, 200, { tap: () => c.wrong(WRONG.locked) });
      const keyX = cx - 80;
      c.state.chairSpot = { x: keyX, y: floor - 20 };
      const key: WitObj = c.emoji('key', '🔑', keyX, c.A.top + 40, 70, {
        tap: (o) => {
          if (!c.state.chair) return c.wrong(l('Too high to reach!', 'बहुत ऊँची है, हाथ नहीं पहुँचता!'));
          if (o.drag) return;
          c.scene.tweens.add({
            targets: o.go,
            y: floor - 140,
            duration: 300,
            onComplete: () => {
              o.drag = true;
              o.home = { x: o.go.x, y: o.go.y };
            },
          });
        },
        drop: (o) => {
          if (c.dist(o, door) < 130) {
            o.go.destroy();
            c.after(300, () => c.win());
          } else c.back(o);
        },
      });
      void key;
      c.emoji('chair', '🪑', cx - 230, floor - 20, 110, {
        drag: true,
        drop: (o) => {
          const spot = c.state.chairSpot as { x: number; y: number };
          if (Math.abs(o.go.x - spot.x) < 110) {
            o.go.setPosition(spot.x, spot.y);
            c.state.chair = true;
          } else c.back(o);
        },
      });
    },
    async solve(a, c) {
      await a.drag('chair', c.state.chairSpot as { x: number; y: number });
      await a.tap('key');
      await a.wait(400);
      await a.drag('key', 'door');
      await a.wait(400);
    },
  },
  // 48
  {
    q: l(
      'A brick weighs 1 kg plus half a brick. How many kg is one brick?',
      'एक ईंट का वज़न 1 किलो और आधी ईंट है। एक ईंट कितने किलो की है?',
    ),
    hint: l('If half a brick is 1 kg…', 'अगर आधी ईंट 1 किलो है…'),
    why: l('Half the brick weighs 1 kg, so the whole brick weighs 2 kg.', 'आधी ईंट 1 किलो की है, तो पूरी ईंट 2 किलो की।'),
    build(c) {
      c.label('eq', '🧱 = 1 kg + ½ 🧱', c.A.cx, c.figY('keypad'), 60);
      c.keypad('2');
    },
    async solve(a) {
      await a.type('2');
    },
  },
  // 49
  {
    q: l(
      'Take the fox, the chick and the corn across. The boat carries only one.',
      'लोमड़ी, चूज़ा और भुट्टा पार ले जाओ। नाव में एक ही आ सकता है।',
    ),
    hint: l('Take the chick first. You may bring something back.', 'पहले चूज़ा ले जाओ। तुम कुछ वापस भी ला सकते हो।'),
    why: l(
      'Chick over, fox over, chick back, corn over, chick over — nobody gets eaten!',
      'चूज़ा पार, लोमड़ी पार, चूज़ा वापस, भुट्टा पार, चूज़ा पार — कोई नहीं खाया गया!',
    ),
    build(c) {
      const { cx, cy, left, right } = c.A;
      const riverY = cy + 20;
      c.scene.add.rectangle(cx, riverY, 260, 420, 0x1e88e5, 0.85);
      c.scene.add.rectangle(left + 80, riverY, 200, 420, 0x558b2f);
      c.scene.add.rectangle(right - 80, riverY, 200, 420, 0x558b2f);
      type Side = 'L' | 'R' | 'boat';
      const pos: Record<string, Side> = { fox: 'L', chick: 'L', corn: 'L' };
      let boatSide: 'L' | 'R' = 'L';
      const rows: Record<string, number> = { fox: -130, chick: 0, corn: 130 };
      const boatX = () => (boatSide === 'L' ? cx - 70 : cx + 70);
      const items: Record<string, WitObj> = {};
      const place = () => {
        for (const k of Object.keys(pos)) {
          const o = items[k].go;
          const x = pos[k] === 'boat' ? boatX() : pos[k] === 'L' ? left + 80 : right - 80;
          const y = pos[k] === 'boat' ? riverY - 40 : riverY + rows[k];
          c.scene.tweens.add({ targets: o, x, y, duration: 250 });
        }
        c.scene.tweens.add({ targets: boat.go, x: boatX(), duration: 250 });
      };
      const reset = () => {
        pos.fox = pos.chick = pos.corn = 'L';
        boatSide = 'L';
        place();
      };
      const tapItem = (o: WitObj) => {
        const k = o.name;
        if (pos[k] === 'boat') pos[k] = boatSide;
        else if (pos[k] === boatSide) {
          if (Object.values(pos).includes('boat')) return c.say(l('The boat is full.', 'नाव भरी है।'));
          pos[k] = 'boat';
        } else return c.say(l('The boat is on the other side.', 'नाव दूसरी तरफ़ है।'));
        place();
        if (pos.fox === 'R' && pos.chick === 'R' && pos.corn === 'R') c.after(400, () => c.win());
      };
      const boat = c.draw('boat', boatX(), riverY + 40, 150, 70, (g) => {
        g.fillStyle(0x8d6e63, 1).fillRoundedRect(-70, -20, 140, 50, 18);
        g.fillStyle(0x5d4037, 1).fillRect(-70, -20, 140, 10);
      });
      c.pill('go', '⛵ ' + c.L(l('Cross', 'पार')), cx, c.A.bottom - 50, 220, 80, 0x3cb371, {
        tap: () => {
          boatSide = boatSide === 'L' ? 'R' : 'L';
          place();
          const behind = boatSide === 'L' ? 'R' : 'L';
          const alone = (k: string) => pos[k] === behind;
          if (alone('fox') && alone('chick')) {
            c.wrong(l('The fox ate the chick! Try again.', 'लोमड़ी चूज़ा खा गई! फिर कोशिश करो।'));
            c.after(700, reset);
          } else if (alone('chick') && alone('corn')) {
            c.wrong(l('The chick ate the corn! Try again.', 'चूज़ा भुट्टा खा गया! फिर कोशिश करो।'));
            c.after(700, reset);
          }
        },
      });
      items.fox = c.emoji('fox', '🦊', left + 80, riverY + rows.fox, 90, { tap: tapItem });
      items.chick = c.emoji('chick', '🐥', left + 80, riverY + rows.chick, 90, { tap: tapItem });
      items.corn = c.emoji('corn', '🌽', left + 80, riverY + rows.corn, 90, { tap: tapItem });
    },
    async solve(a) {
      const steps = [
        'chick',
        'go',
        'chick',
        'go',
        'fox',
        'go',
        'fox',
        'chick',
        'go',
        'chick',
        'corn',
        'go',
        'corn',
        'go',
        'chick',
        'go',
        'chick',
      ];
      for (const s of steps) {
        await a.tap(s);
        await a.wait(300);
      }
      await a.wait(500);
    },
  },
  // 50
  {
    q: l('Halfway! Tap the button to {finish:finish}.', 'आधा सफ़र! {finish:खत्म} करने के लिए बटन दबाओ।'),
    hint: l('The button is too fast. Is there another “finish”?', 'बटन बहुत तेज़ है। कहीं और “खत्म” लिखा है?'),
    why: l(
      'You tapped “finish” in the question. You finished Wit Twist!',
      'तुमने सवाल में “खत्म” दबाया। तुमने विट ट्विस्ट पूरा कर लिया!',
    ),
    build(c) {
      const { cx, cy } = c.A;
      const spots = [
        [0, 0],
        [-180, -150],
        [170, 140],
        [-160, 170],
        [180, -160],
      ];
      let i = 0;
      c.pill('btn', 'FINISH', cx, cy, 220, 90, 0xe8554e, {
        tap: (o) => {
          i = (i + 1) % spots.length;
          o.go.setPosition(cx + spots[i][0], cy + spots[i][1]);
          c.say(l('Too slow!', 'बहुत धीमे!'));
        },
      });
    },
    words: { tap: (id, c) => id === 'finish' && c.win() },
    async solve(a) {
      await a.tapWord('finish');
    },
  },
];

export const WIT_LEVELS: WitLevel[] = [...FIRST_LEVELS, ...MORE_LEVELS];

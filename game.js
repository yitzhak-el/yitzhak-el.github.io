'use strict';
/* ============ ממלכת המילים - Word Kingdom ============ */

const WORDS = [
  { he:'חתול', en:'cat', emoji:'🐱', tier:1 }, { he:'כלב', en:'dog', emoji:'🐶', tier:1 },
  { he:'דג', en:'fish', emoji:'🐟', tier:1 }, { he:'תפוח', en:'apple', emoji:'🍎', tier:1 },
  { he:'מים', en:'water', emoji:'💧', tier:1 }, { he:'חלב', en:'milk', emoji:'🥛', tier:1 },
  { he:'אדום', en:'red', emoji:'🔴', tier:1 }, { he:'כחול', en:'blue', emoji:'🔵', tier:1 },
  { he:'שמש', en:'sun', emoji:'☀️', tier:1 }, { he:'בית', en:'house', emoji:'🏠', tier:1 },
  { he:'ארנב', en:'rabbit', emoji:'🐰', tier:2 }, { he:'ציפור', en:'bird', emoji:'🐦', tier:2 },
  { he:'בננה', en:'banana', emoji:'🍌', tier:2 }, { he:'לחם', en:'bread', emoji:'🍞', tier:2 },
  { he:'ביצה', en:'egg', emoji:'🥚', tier:2 }, { he:'עוגה', en:'cake', emoji:'🍰', tier:2 },
  { he:'ירוק', en:'green', emoji:'🟢', tier:2 }, { he:'צהוב', en:'yellow', emoji:'🟡', tier:2 },
  { he:'ירח', en:'moon', emoji:'🌙', tier:2 }, { he:'כוכב', en:'star', emoji:'⭐', tier:2 },
  { he:'אריה', en:'lion', emoji:'🦁', tier:3 }, { he:'פיל', en:'elephant', emoji:'🐘', tier:3 },
  { he:'קוף', en:'monkey', emoji:'🐵', tier:3 }, { he:'גבינה', en:'cheese', emoji:'🧀', tier:3 },
];
const W = Object.fromEntries(WORDS.map(w => [w.en, w]));

const SENTENCES = [
  { en:'I see a ___', he:'אני רואה ___', answer:'cat' },
  { en:'I see a ___', he:'אני רואה ___', answer:'dog' },
  { en:'I drink ___', he:'אני שותה ___', answer:'water' },
  { en:'I drink ___', he:'אני שותה ___', answer:'milk' },
  { en:'I eat ___', he:'אני אוכל ___', answer:'apple' },
  { en:'I eat ___', he:'אני אוכל ___', answer:'bread' },
  { en:'I eat ___', he:'אני אוכל ___', answer:'cake' },
  { en:'The ___ is big', he:'ה___ גדול', answer:'elephant' },
  { en:'The ___ is small', he:'ה___ קטן', answer:'egg' },
  { en:'I see the ___', he:'אני רואה את ה___', answer:'sun' },
  { en:'I see the ___', he:'אני רואה את ה___', answer:'moon' },
  { en:'The ___ is yellow', he:'ה___ צהוב', answer:'banana' },
];

const LEVELS = [
  { name:'יער המילים', emoji:'🌲', desc:'שומעים מילה ואוספים את התמונה', wordGates:8, spellGates:0, owlGates:0, maxTier:1 },
  { name:'נהר האותיות', emoji:'🌊', desc:'גם איתיות! אוספים אותיות בסדר', wordGates:6, spellGates:2, owlGates:0, maxTier:2 },
  { name:'טירת הינשוף', emoji:'🏰', desc:'משפטים שלמים עם הינשוף החכם', wordGates:4, spellGates:2, owlGates:2, maxTier:3 },
];

/* ---------- audio ---------- */
let AC = null;
function actx() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, t, d, type, g) {
  const c = actx(), o = c.createOscillator(), gn = c.createGain();
  o.type = type || 'sine'; o.frequency.value = f;
  gn.gain.setValueAtTime(g || 0.16, c.currentTime + t);
  gn.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + d);
  o.connect(gn); gn.connect(c.destination);
  o.start(c.currentTime + t); o.stop(c.currentTime + t + d);
}
const sfx = {
  unlock() { try { actx(); } catch(e) {} },
  lane() { tone(340, 0, .08, 'triangle', .07); },
  collect(streak) { const base = 523 + Math.min(streak, 8) * 40; tone(base, 0, .12, 'triangle'); tone(base * 1.5, .08, .2, 'triangle'); },
  wrong() { tone(170, 0, .25, 'sawtooth', .07); },
  letter() { tone(700, 0, .1, 'square', .06); },
  fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .13, .3, 'triangle', .14)); },
  owl() { tone(440, 0, .15, 'sine'); tone(550, .14, .2, 'sine'); },
};
function speak(text, rate) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate || 0.82; u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch(e) {}
}

/* ---------- persistence ---------- */
const store = {
  get() { try { return JSON.parse(localStorage.getItem('wk') || '{}'); } catch(e) { return {}; } },
  set(v) { try { localStorage.setItem('wk', JSON.stringify(v)); } catch(e) {} },
  patch(p) { this.set(Object.assign(this.get(), p)); },
};

/* ---------- screens ---------- */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  if (id !== 'game') G.running = false;
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { sfx.unlock(); show(b.dataset.go); if (b.dataset.go === 'menu') buildMenuSky(); }));

/* ---------- decorative sky ---------- */
function fillStars(el) {
  if (!el || el.childElementCount) return;
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 60 + '%';
    s.style.animationDelay = (Math.random() * 3) + 's';
    el.appendChild(s);
  }
}
function buildMenuSky() {}
document.querySelectorAll('.stars').forEach(fillStars);
['☁️','☁️','⛅','☁️'].forEach((c, i) => {
  const d = document.createElement('div');
  d.className = 'cloud'; d.textContent = c;
  d.style.top = (4 + i * 14) + '%';
  d.style.animationDuration = (40 + i * 17) + 's';
  d.style.animationDelay = (-i * 13) + 's';
  document.getElementById('menu-sky').appendChild(d);
});

/* ---------- toast ---------- */
let toastTimer = 0;
function toast(t) {
  const el = document.getElementById('toast');
  el.textContent = t; el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1600);
}

/* ---------- helpers ---------- */
const rand = n => Math.floor(Math.random() * n);
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const CHEERS = ['כל הכבוד!', 'מעולה!', 'וואו!', 'אלופים!', 'מושלם!', 'עובדים!'];
const cheer = () => CHEERS[rand(CHEERS.length)];

/* ============ ADVENTURE ENGINE ============ */
const G = {
  running: false, paused: false, level: 0,
  x: 0, speed: 165, lane: 1, raf: 0, last: 0,
  objects: [], gates: [], score: 0, streak: 0, misses: 0,
  learnedThisLevel: [], missedWords: [], collectedLetters: [],
  track: document.getElementById('track'),
  player: document.getElementById('player'),
};
const LANE_Y = [16, 36, 56]; // % from top
const PLAYER_X = 0.2; // fraction of width

function lanePx() { return document.getElementById('world').clientHeight * LANE_Y[G.lane] / 100; }
function placePlayer() { G.player.style.top = lanePx() + 'px'; G.player.style.left = (document.getElementById('world').clientWidth * PLAYER_X) + 'px'; }
window.addEventListener('resize', () => { if (G.running) placePlayer(); });

function setLane(l) {
  l = Math.max(0, Math.min(2, l));
  if (l === G.lane) return;
  G.lane = l; sfx.lane(); placePlayer();
}
document.getElementById('lane-up').addEventListener('click', () => setLane(G.lane - 1));
document.getElementById('lane-down').addEventListener('click', () => setLane(G.lane + 1));
document.addEventListener('keydown', e => {
  if (!G.running || G.paused) return;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setLane(G.lane - 1);
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setLane(G.lane + 1);
});
let touchY = null;
document.getElementById('world').addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
document.getElementById('world').addEventListener('touchend', e => {
  if (touchY === null) return;
  const dy = e.changedTouches[0].clientY - touchY; touchY = null;
  if (Math.abs(dy) > 24) setLane(G.lane + (dy > 0 ? 1 : -1));
}, { passive: true });

function pool(maxTier) { return WORDS.filter(w => w.tier <= maxTier); }
function pickWord(maxTier) { const p = pool(maxTier); return p[rand(p.length)]; }

/* Build gate list for a level, interleaving missed words */
function buildLevel(li) {
  const cfg = LEVELS[li];
  const gates = [];
  const deck = shuffle(pool(cfg.maxTier));
  for (let i = 0; i < cfg.wordGates; i++) gates.push({ type: 'word', word: deck[i % deck.length] });
  for (let i = 0; i < cfg.spellGates; i++) {
    const cands = pool(cfg.maxTier).filter(w => w.en.length <= 5 && /^[a-z]+$/.test(w.en));
    gates.push({ type: 'spell', word: cands[rand(cands.length)] });
  }
  for (let i = 0; i < cfg.owlGates; i++) {
    const s = SENTENCES[rand(SENTENCES.length)];
    gates.push({ type: 'owl', sentence: s });
  }
  return shuffle(gates);
}

/* Turn gates into positioned world objects */
function layoutLevel(gates) {
  G.track.innerHTML = '';
  G.objects = []; G.gates = [];
  const spacing = 800;
  let x = document.getElementById('world').clientWidth * 0.75;
  // lane markers
  LANE_Y.forEach(y => {
    const m = document.createElement('div');
    m.className = 'lane-mark'; m.style.top = `calc(${y}% + 42px)`;
    G.track.appendChild(m);
  });
  gates.forEach((gate, gi) => {
    if (gate.type === 'word') {
      const others = shuffle(WORDS.filter(w => w.en !== gate.word.en)).slice(0, 2);
      const opts = shuffle([gate.word, ...others]);
      const bubbles = opts.map((w, lane) => spawnBubble(x, lane, w.emoji, { kind: 'word', en: w.en, gate: gi, correct: w.en === gate.word.en }));
      if (G.level === 0 && gi < 2) bubbles.find(b => b.meta.correct).el.classList.add('hint');
      G.gates.push(Object.assign({ bubbles, x, done: false, announced: false }, gate));
      x += spacing;
    } else if (gate.type === 'spell') {
      const letters = gate.word.en.split('');
      const steps = letters.map((need, si) => {
        const poolL = 'abcdefgimnorstwy'.split('').filter(c => c !== need);
        const opts = shuffle([need, poolL[rand(poolL.length)], poolL[(rand(poolL.length) + 5) % poolL.length]]);
        const bubbles = opts.map((ch, lane) => spawnBubble(x + si * 340, lane, null, { kind: 'letter', ch, gate: gi, step: si, correct: ch === need }, ch));
        return { need, bubbles, done: false };
      });
      G.gates.push(Object.assign({ steps, x, done: false, announced: false, endX: x + (letters.length - 1) * 340 }, gate));
      x += letters.length * 340 + spacing - 250;
    } else {
      G.gates.push(Object.assign({ x, done: false, announced: false }, gate));
      x += spacing * 0.7;
    }
  });
  G.endX = x + 200;
  G.track.querySelectorAll('.lane-mark').forEach(m => { m.style.width = G.endX + 'px'; });
  // trees decoration
  for (let tx = 300; tx < x; tx += 340) {
    const t = document.createElement('div');
    t.className = 'obj tree'; t.textContent = ['🌳','🌲','🌴','🌻'][rand(4)];
    t.style.left = tx + 'px'; t.style.top = 'auto';
    t.style.bottom = '24%';
    G.track.appendChild(t);
  }
}

function spawnBubble(x, lane, emoji, meta, ch) {
  const b = document.createElement('div');
  b.className = 'obj bubble';
  b.innerHTML = ch ? `<span class="ch">${ch}</span>` : emoji;
  b.style.left = x + 'px';
  b.style.top = `calc(${LANE_Y[lane]}%)`;
  b.dataset.lane = lane;
  b.style.animationDelay = (Math.random() * 1.5) + 's';
  G.track.appendChild(b);
  const o = { el: b, x, lane, meta, taken: false };
  G.objects.push(o);
  return o;
}

function announce(gate) {
  const banner = document.getElementById('banner');
  if (gate.type === 'word') {
    banner.dataset.replay = gate.word.en;
    document.getElementById('banner-he').textContent = `תפסו את: ${gate.word.he} ${gate.word.emoji}`;
    document.getElementById('banner-sub').textContent = 'שומעים את המילה באנגלית ואוספים את התמונה הנכונה';
    speak(gate.word.en);
  } else if (gate.type === 'spell') {
    banner.dataset.replay = gate.word.en;
    document.getElementById('banner-he').textContent = `אייתו: ${gate.word.he} ${gate.word.emoji}`;
    document.getElementById('banner-sub').textContent = 'אוספים את האותיות באנגלית, אחת אחת, בסדר הנכון';
    speak(gate.word.en);
  } else {
    banner.dataset.replay = '';
  }
  banner.classList.add('on');
}
function hideBanner() { document.getElementById('banner').classList.remove('on'); }
document.getElementById('banner-replay').addEventListener('click', () => {
  const w = document.getElementById('banner').dataset.replay;
  if (w) speak(w);
});

function sparkleAt(o, txt) {
  const s = document.createElement('div');
  s.className = 'sparkle'; s.textContent = txt || '✨';
  const r = o.el.getBoundingClientRect();
  const wr = document.getElementById('world').getBoundingClientRect();
  s.style.left = (r.left - wr.left + 20) + 'px';
  s.style.top = (r.top - wr.top) + 'px';
  document.getElementById('world').appendChild(s);
  setTimeout(() => s.remove(), 850);
}

function learned(w) {
  if (!G.learnedThisLevel.some(x => x.en === w.en)) G.learnedThisLevel.push(w);
  const st = store.get();
  const arr = st.learned || [];
  if (!arr.includes(w.en)) { arr.push(w.en); store.patch({ learned: arr }); }
}
function missed(w) {
  G.misses++;
  G.missedWords.push(w);
  const st = store.get();
  const arr = st.missedEver || [];
  if (!arr.includes(w.en)) { arr.push(w.en); store.patch({ missedEver: arr }); }
}

function hitCorrect(o, gate) {
  o.taken = true; o.el.classList.add('taken');
  gate.done = true;
  hideBanner();
  G.streak++; G.score += 10 + Math.min(G.streak, 10);
  sfx.collect(G.streak);
  sparkleAt(o, '✨');
  const w = W[o.meta.en];
  speak(w.en, 0.7);
  learned(w);
  if (G.streak > 1 && G.streak % 3 === 0) { toast(`🔥 רצף ${G.streak}! ${cheer()}`); } else { toast(`${cheer()} ${w.he} = ${w.en}`); }
  updateHud();
}

function hitWrong(o, gate) {
  G.streak = 0;
  sfx.wrong();
  G.player.classList.remove('hurt'); void G.player.offsetWidth; G.player.classList.add('hurt');
  if (o.meta.kind === 'word') { missed(gate.word); toast(`לא נורא! ${gate.word.he} = ${gate.word.en} - עוד פעם בדרך 💪`); speak(gate.word.en); }
  gate.done = true;
  hideBanner();
  updateHud();
}

function owlGate(gate) {
  G.paused = true;
  hideBanner();
  sfx.owl();
  const s = gate.sentence;
  const fullEn = s.en.replace('___', s.answer);
  const shown = s.en.replace('___', '❓');
  document.getElementById('owl-he').textContent = s.he;
  document.getElementById('owl-en').textContent = shown;
  const opts = shuffle([s.answer, ...shuffle(WORDS.filter(w => w.en !== s.answer && sentenceFits(s, w.en))).slice(0, 2).map(w => w.en)]);
  const box = document.getElementById('owl-opts');
  box.innerHTML = '';
  let triedWrong = false;
  opts.forEach(en => {
    const b = document.createElement('button');
    b.className = 'owl-opt'; b.textContent = `${W[en].emoji} ${en}`;
    b.addEventListener('click', () => {
      speak(en);
      if (en === s.answer) {
        b.classList.add('ok');
        document.getElementById('owl-en').textContent = fullEn;
        sfx.collect(3);
        if (triedWrong) missed(W[s.answer]); else { G.score += 25; G.streak++; }
        learned(W[s.answer]);
        setTimeout(() => speak(fullEn, 0.85), 350);
        setTimeout(() => {
          document.getElementById('owl-panel').classList.remove('on');
          gate.done = true; G.paused = false;
          updateHud();
        }, 1900);
      } else {
        b.classList.add('bad'); b.disabled = true;
        triedWrong = true;
        sfx.wrong();
      }
    });
    box.appendChild(b);
  });
  document.getElementById('owl-panel').classList.add('on');
  speak(shown.replace('❓', ''), 0.85);
}
function sentenceFits(s, en) {
  // crude fit: drink/eat verbs take food/drink words
  const edible = ['apple','water','milk','bread','cake','egg','banana','cheese'];
  if (/drink|eat/.test(s.en)) return edible.includes(en);
  return !edible.includes(en) || en === s.answer;
}

function updateHud() {
  document.getElementById('hud-score').textContent = G.score;
  document.getElementById('hud-streak').textContent = G.streak;
  document.getElementById('hud-level').textContent = `${LEVELS[G.level].emoji} ${LEVELS[G.level].name}`;
  const doneCount = G.gates.filter(g => g.done).length;
  document.querySelector('#progressbar i').style.width = (doneCount / G.gates.length * 100) + '%';
}

function frame(t) {
  if (!G.running) return;
  const dt = Math.min(0.05, (t - G.last) / 1000); G.last = t;
  if (!G.paused) {
    G.speed = (G.level === 0 && G.gates.filter(g => g.done).length < 2) ? 110 : 165;
    G.x += G.speed * dt;
    const camX = G.x - document.getElementById('world').clientWidth * PLAYER_X;
    G.track.style.transform = `translateX(${-camX}px)`;

    const worldW = document.getElementById('world').clientWidth;
    for (const gate of G.gates) {
      if (gate.done) continue;
      const dist = gate.x - G.x;
      if (!gate.announced && dist < worldW * 0.30) { gate.announced = true; if (gate.type !== 'owl') announce(gate); }
      if (gate.type === 'owl' && dist < 60) { owlGate(gate); continue; }
      if (gate.type === 'word') {
        for (const b of gate.bubbles) {
          if (b.taken) continue;
          const dx = b.x - G.x;
          if (Math.abs(dx) < 46 && b.lane === G.lane) {
            b.taken = true;
            if (b.meta.correct) hitCorrect(b, gate); else hitWrong(b, gate);
            break;
          }
        }
        if (!gate.done && dist < -120) {
          gate.done = true; G.streak = 0; missed(gate.word);
          toast(`פספסנו את ${gate.word.he} (${gate.word.en}) - היא תחזור!`);
          hideBanner(); updateHud();
        }
      } else if (gate.type === 'spell') {
        for (const step of gate.steps) {
          if (step.done) continue;
          for (const b of step.bubbles) {
            if (b.taken) continue;
            const dx = b.x - G.x;
            if (Math.abs(dx) < 40 && b.lane === G.lane) {
              b.taken = true;
              if (b.meta.correct) {
                step.done = true; sfx.letter();
                sparkleAt(b, b.meta.ch.toUpperCase());
                G.collectedLetters.push(b.meta.ch);
                G.score += 5;
                document.getElementById('banner-he').textContent =
                  `אייתו: ${gate.word.he} ${gate.word.emoji}  ·  ` + gate.word.en.split('').map((c, i) => i < G.collectedLetters.length ? c : '_').join(' ');
                updateHud();
              } else {
                step.done = true; sfx.wrong(); G.streak = 0; missed(gate.word);
                G.player.classList.remove('hurt'); void G.player.offsetWidth; G.player.classList.add('hurt');
              }
              break;
            }
          }
          if (!step.done && step.bubbles[0].x - G.x < -120) { step.done = true; missed(gate.word); }
        }
        if (!gate.done && G.x > gate.endX + 80) {
          gate.done = true;
          G.collectedLetters = [];
          if (gate.steps.every(s => s.done && s.bubbles.find(b => b.meta.correct).taken)) {
            G.streak++; G.score += 20;
            sfx.collect(G.streak);
            const spelled = gate.word.en.split('').join(' ');
            toast(`🎉 ${gate.word.he} = ${gate.word.en}!`);
            speak(spelled, 0.7);
            setTimeout(() => speak(gate.word.en), 1400);
            learned(gate.word);
            // word returns if any letter step was a wrong-hit/miss
            if (gate.steps.some(s => !s.bubbles.find(b => b.meta.correct).taken)) missed(gate.word);
          }
          hideBanner(); updateHud();
        }
      }
    }
    if (G.x > G.endX) { levelComplete(); return; }
  }
  G.raf = requestAnimationFrame(frame);
}

const TUT_STEPS = [
  { e: '🦊', t: 'היי! אני השועל. אני רץ קדימה כל הזמן - ואתה מוביל אותי.' },
  { e: '⬆️⬇️', t: 'עוברים בין שלושת הנתיבים: בכפתורים למטה, במקשי החצים, או בהחלקה למעלה ולמטה בטלפון.' },
  { e: '🔊', t: 'בכל שער תשמע מילה חדשה באנגלית. למעלה תראה מה היא אומרת בעברית.' },
  { e: '🍎', t: 'המשימה: לאסוף את הבועה עם התמונה שמתאימה למילה ששמעת! הבועה הנכונה זורחת בזהב בשני השערים הראשונים. בהצלחה!' },
];
let tutStep = 0;
function showTut(onDone) {
  tutStep = 0;
  const el = document.getElementById('tut');
  el.classList.add('on');
  const render = () => {
    const s = TUT_STEPS[tutStep];
    document.getElementById('tut-emoji').textContent = s.e;
    document.getElementById('tut-text').textContent = s.t;
    document.getElementById('tut-next').textContent = tutStep === TUT_STEPS.length - 1 ? 'יאללה! 🦊' : 'הבא ←';
  };
  render();
  document.getElementById('tut-next').onclick = () => {
    sfx.unlock();
    tutStep++;
    if (tutStep < TUT_STEPS.length) { render(); }
    else { el.classList.remove('on'); store.patch({ tut: 1 }); onDone(); }
  };
}

function startLevel(li) {
  sfx.unlock();
  if (li === 0 && !store.get().tut) {
    startLevelRun(li);
    G.paused = true;
    showTut(() => { G.paused = false; G.last = performance.now(); });
    return;
  }
  startLevelRun(li);
}

function startLevelRun(li) {
  G.level = li; G.x = 0; G.lane = 1; G.score = 0; G.streak = 0; G.misses = 0;
  G.learnedThisLevel = []; G.missedWords = []; G.collectedLetters = [];
  G.gates = buildLevel(li);
  // interleave global missed words as extra word gates (spaced repetition)
  const st = store.get();
  const due = (st.missedEver || []).map(en => W[en]).filter(Boolean).filter(w => w.tier <= LEVELS[li].maxTier).slice(0, 2);
  due.forEach(w => G.gates.splice(rand(G.gates.length), 0, { type: 'word', word: w }));
  layoutLevel(G.gates);
  show('game');
  placePlayer();
  G.track.style.transform = 'translateX(0)';
  hideBanner();
  document.getElementById('owl-panel').classList.remove('on');
  updateHud();
  G.paused = false; G.running = true; G.last = performance.now();
  cancelAnimationFrame(G.raf);
  G.raf = requestAnimationFrame(frame);
  toast(`${LEVELS[li].emoji} ${LEVELS[li].name} - בהצלחה!`);
}

function levelComplete() {
  G.running = false;
  cancelAnimationFrame(G.raf);
  hideBanner();
  sfx.fanfare();
  const stars = G.misses === 0 ? 3 : G.misses <= 3 ? 2 : 1;
  const st = store.get();
  const starsArr = st.stars || {};
  starsArr[G.level] = Math.max(starsArr[G.level] || 0, stars);
  store.patch({ stars: starsArr, unlocked: Math.max(st.unlocked || 0, Math.min(G.level + 1, LEVELS.length - 1)) });
  // words no longer "missed" if learned well
  if (G.misses === 0) {
    const stillMissed = (st.missedEver || []).filter(en => !G.learnedThisLevel.some(w => w.en === en));
    store.patch({ missedEver: stillMissed });
  }
  document.getElementById('done-stars').innerHTML = [1,2,3].map(i => `<span class="${i <= stars ? '' : 'dim'}">⭐</span>`).join('');
  document.getElementById('done-title').textContent = stars === 3 ? 'מושלם! אלופי הממלכה!' : 'שלב הושלם! 🎉';
  document.getElementById('done-sub').textContent = `${LEVELS[G.level].name} · ${G.score} נקודות · ${G.learnedThisLevel.length} מילים חדשות`;
  const dw = document.getElementById('done-words');
  dw.innerHTML = '';
  G.learnedThisLevel.forEach(w => {
    const c = document.createElement('button');
    c.className = 'word-chip'; c.textContent = `${w.emoji} ${w.en}`;
    c.addEventListener('click', () => speak(w.en));
    dw.appendChild(c);
  });
  const next = document.getElementById('btn-next');
  if (G.level + 1 < LEVELS.length) { next.style.display = ''; next.onclick = () => startLevel(G.level + 1); }
  else { next.style.display = 'none'; }
  show('done');
}

document.getElementById('btn-quit').addEventListener('click', () => { G.running = false; show('menu'); });

/* level select */
function renderLevels() {
  const st = store.get();
  const unlocked = st.unlocked || 0;
  const stars = st.stars || {};
  const box = document.getElementById('level-cards');
  box.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    const locked = i > unlocked;
    b.className = 'level-card' + (locked ? ' locked' : '');
    b.innerHTML = `<div class="lv-emoji">${locked ? '🔒' : lv.emoji}</div>
      <div class="lv-name">${lv.name}</div>
      <div class="lv-desc">${lv.desc}</div>
      <div class="lv-stars">${[1,2,3].map(s => `<span class="${s <= (stars[i]||0) ? '' : 'dim'}" style="${s <= (stars[i]||0) ? '' : 'opacity:.25;filter:grayscale(1)'}">⭐</span>`).join('')}</div>`;
    if (!locked) b.addEventListener('click', () => startLevel(i));
    box.appendChild(b);
  });
}
document.getElementById('btn-adventure').addEventListener('click', () => { renderLevels(); show('levels'); });
document.getElementById('btn-menu2').addEventListener('click', () => show('menu'));

/* ============ RACE MODE (2 players) ============ */
const R = { on: false, scores: [0, 0], frozen: [false, false], locked: false, round: null };
const RACE_TARGET = 10;
function raceRound() {
  const word = pickWord(2);
  const others = shuffle(WORDS.filter(w => w.en !== word.en)).slice(0, 2).map(w => w.en);
  return { word, options: [shuffle([word.en, ...others]), shuffle([word.en, ...others])] };
}
function renderRace() {
  const w = document.getElementById('race-wrap');
  w.innerHTML = `
    <div class="race-track" dir="ltr">
      ${[0,1].map(p => `<div class="race-lane"><span class="rn">${['שחקן 1','שחקן 2'][p]}</span><span class="rc" id="rc${p}" style="left:8%">${['🦊','🐰'][p]}</span><span class="fl">🏁</span></div>`).join('')}
    </div>
    <div class="rside p1" id="rs1"><div class="rh"><span>🐰 שחקן 2</span><span id="rscore1">0</span></div><div class="ra" id="ra1"></div></div>
    <div class="race-center"><div class="pe" id="rpe"></div><div class="pw" id="rpw"></div><div style="font-weight:700;color:#8a6d00">מה זה באנגלית? לחצו על המילה ותשמעו אותה 🔊</div></div>
    <div class="rside p0" id="rs0"><div class="rh"><span>🦊 שחקן 1</span><span id="rscore0">0</span></div><div class="ra" id="ra0"></div></div>`;
  raceNext();
}
function raceNext() {
  R.round = raceRound(); R.locked = false;
  document.getElementById('rpe').textContent = R.round.word.emoji;
  document.getElementById('rpw').textContent = R.round.word.he;
  [0, 1].forEach(p => {
    const box = document.getElementById('ra' + p);
    box.innerHTML = '';
    R.round.options[p].forEach(en => {
      const b = document.createElement('button');
      b.textContent = en + ' 🔊';
      b.addEventListener('click', () => racePick(p, en));
      box.appendChild(b);
    });
    document.getElementById('rs' + p).classList.remove('frozen', 'hit', 'miss');
  });
  speak(R.round.word.en);
}
function racePick(p, en) {
  if (R.locked || R.frozen[p]) return;
  speak(en);
  if (en === R.round.word.en) {
    R.locked = true;
    R.scores[p]++;
    sfx.collect(3);
    document.getElementById('rs' + p).classList.add('hit');
    document.getElementById('rscore' + p).textContent = R.scores[p];
    document.getElementById('rc' + p).style.left = (8 + R.scores[p] / RACE_TARGET * 78) + '%';
    if (R.scores[p] >= RACE_TARGET) {
      sfx.fanfare();
      setTimeout(() => {
        const w = document.getElementById('race-wrap');
        w.innerHTML = `<div class="done-card" style="margin:auto">
          <div class="done-stars">🏆</div>
          <div class="done-title">${['🦊 שחקן 1','🐰 שחקן 2'][p]} מנצח!</div>
          <div class="done-sub" dir="ltr">${R.scores[0]} : ${R.scores[1]}</div>
          <div class="done-btns"><button class="mbtn adv" id="race-again">🔁 עוד משחק</button><button class="mbtn dict" id="race-menu">תפריט</button></div>
        </div>`;
        document.getElementById('race-again').addEventListener('click', startRace);
        document.getElementById('race-menu').addEventListener('click', () => show('menu'));
      }, 700);
      return;
    }
    setTimeout(raceNext, 900);
  } else {
    R.frozen[p] = true;
    sfx.wrong();
    document.getElementById('rs' + p).classList.add('miss', 'frozen');
    setTimeout(() => { R.frozen[p] = false; document.getElementById('rs' + p).classList.remove('miss', 'frozen'); }, 1500);
  }
}
function startRace() { sfx.unlock(); R.scores = [0, 0]; R.frozen = [false, false]; show('race'); renderRace(); }
document.getElementById('btn-race').addEventListener('click', startRace);

/* ============ DICTIONARY ============ */
document.getElementById('btn-dict').addEventListener('click', () => {
  const st = store.get();
  const learnedArr = st.learned || [];
  const grid = document.getElementById('dict-grid');
  grid.innerHTML = '';
  if (!learnedArr.length) {
    grid.innerHTML = '<div class="dict-empty">עוד לא אספתם מילים - צאו להרפתקה! 🦊</div>';
  } else {
    WORDS.forEach(w => {
      const got = learnedArr.includes(w.en);
      const b = document.createElement('button');
      b.className = 'dcard' + (got ? '' : ' ghost');
      b.innerHTML = got ? `<div class="de">${w.emoji}</div><div class="den">${w.en}</div><div class="dhe">${w.he}</div>`
                        : `<div class="de">❓</div><div class="den">???</div><div class="dhe">עוד לא נאספה</div>`;
      if (got) b.addEventListener('click', () => { speak(w.en); sfx.letter(); });
      grid.appendChild(b);
    });
  }
  show('dict');
});

/* unlock audio on first interaction */
document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

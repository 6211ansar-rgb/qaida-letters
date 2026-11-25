(() => {
  const page = window.QAIDA_PAGES[0];
  const L = page.letters;
  const $ = (id) => document.getElementById(id);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  // ---------- storage (never let it break the app) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("qaida:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("qaida:" + k, JSON.stringify(v)); } catch {} }
  };

  const settings = {
    speed: store.get("speed", 0),
    color: store.get("color", "color"),
    sound: store.get("sound", "on")
  };
  const STUDENT = "Zaid";
  let picked = new Set(store.get("picked", []));
  let lastSet = [];

  L.forEach((l) => { const i = new Image(); i.src = l.img; });

  // ---------- Noor, the little moon who cheers him on ----------
  let noorId = 0;
  function noorSVG(mood = "idle") {
    const id = "n" + (noorId++);
    return `
<svg class="noor" data-mood="${mood}" viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <radialGradient id="${id}g" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffe9a3"/><stop offset=".6" stop-color="#ffd25a"/><stop offset="1" stop-color="#f7b52c"/>
    </radialGradient>
  </defs>
  <ellipse cx="60" cy="112" rx="30" ry="5" fill="#2f2940" opacity=".08"/>
  <g class="body">
    <circle cx="60" cy="60" r="44" fill="url(#${id}g)"/>
    <path d="M86 26a44 44 0 0 1 0 68a40 40 0 0 0 0-68z" fill="#f2a91c" opacity=".35"/>
    <circle cx="38" cy="40" r="5" fill="#fff" opacity=".55"/>
    <circle cx="76" cy="86" r="3.5" fill="#e9a21d" opacity=".5"/>
    <circle cx="84" cy="76" r="2.2" fill="#e9a21d" opacity=".5"/>
    <g class="eyes-open" fill="#2f2940">
      <ellipse cx="46" cy="57" rx="5.2" ry="6.8"/><ellipse cx="74" cy="57" rx="5.2" ry="6.8"/>
      <circle cx="47.8" cy="54.4" r="1.9" fill="#fff"/><circle cx="75.8" cy="54.4" r="1.9" fill="#fff"/>
    </g>
    <g class="eyes-happy" fill="none" stroke="#2f2940" stroke-width="4" stroke-linecap="round">
      <path d="M40 59q6-8 12 0"/><path d="M68 59q6-8 12 0"/>
    </g>
    <ellipse cx="36" cy="70" rx="6.5" ry="4" fill="#ff8a7a" opacity=".55"/>
    <ellipse cx="84" cy="70" rx="6.5" ry="4" fill="#ff8a7a" opacity=".55"/>
    <path class="mouth-smile" d="M52 71q8 8 16 0" fill="none" stroke="#2f2940" stroke-width="3.6" stroke-linecap="round"/>
    <g class="mouth-big"><path d="M49 69q11 15 22 0z" fill="#2f2940" stroke="#2f2940" stroke-width="2" stroke-linejoin="round"/><path d="M54 75.5q6 4 12 0q-6-3-12 0z" fill="#ff7b8a"/></g>
    <ellipse class="mouth-o" cx="60" cy="73" rx="4" ry="4.6" fill="#2f2940"/>
  </g>
  <path class="twinkle" d="M98 12l2.6 7.4 7.4 2.6-7.4 2.6L98 32l-2.6-7.4L88 22l7.4-2.6z" fill="#fff" stroke="#f7b52c" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;
  }
  document.querySelectorAll(".mascot-slot").forEach((s) => { s.innerHTML = noorSVG(); });
  const mood = (slotId, m) => { const s = $(slotId).querySelector(".noor"); if (s) s.dataset.mood = m; };
  function hop(slotId) {
    const s = $(slotId).querySelector(".noor"); if (!s) return;
    s.classList.remove("hop"); void s.getBoundingClientRect(); s.classList.add("hop");
  }

  // ---------- gentle sounds + a tiny buzz on Android ----------
  let actx = null;
  function tone(notes, type = "sine", vol = 0.12) {
    if (settings.sound !== "on") return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime;
      notes.forEach(([f, at, dur]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + at);
        g.gain.linearRampToValueAtTime(vol, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(g).connect(actx.destination);
        o.start(t0 + at); o.stop(t0 + at + dur + 0.05);
      });
    } catch {}
  }
  const sfx = {
    good: () => tone([[784, 0, 0.16], [1175, 0.08, 0.22]], "triangle"),
    miss: () => tone([[392, 0, 0.18], [330, 0.1, 0.24]], "sine", 0.09),
    tap: () => tone([[880, 0, 0.06]], "triangle", 0.05),
    win: () => tone([[523, 0, 0.2], [659, 0.12, 0.2], [784, 0.24, 0.2], [1047, 0.36, 0.4]], "triangle", 0.11)
  };
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    if (id === "home") refreshHome();
    if (id !== "drill") releaseWake();
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }


  // ---------- home ----------
  $("startAllSub").textContent = `All ${L.length} letters, shuffled`;

  function refreshHome() {
    mood("homeMascot", "idle");
  }

  function renderTimerHelp() {
    $("timerHelp").innerHTML = settings.speed
      ? `${STUDENT} gets <b>${settings.speed} seconds</b> to say each letter. If time runs out, it counts as a mistake.`
      : `How long ${STUDENT} gets to say each letter before it counts as a mistake.`;
  }

  function segInit(segId, key, apply) {
    const seg = $(segId);
    const setOn = () => seg.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.v == settings[key];
      b.classList.toggle("on", on); b.setAttribute("aria-checked", on); b.setAttribute("role", "radio");
    });
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      settings[key] = key === "speed" ? Number(b.dataset.v) : b.dataset.v;
      store.set(key, settings[key]); setOn(); apply && apply(); sfx.tap();
    });
    setOn(); apply && apply();
  }
  // clock dials: the arc shows the share of 8 seconds
  $("timerName").textContent = STUDENT;
  $("speedSeg").innerHTML = [0, 3, 5, 8].map((v) => `
    <button class="dial" data-v="${v}" aria-label="${v ? v + " seconds" : "No time limit"}">
      <svg viewBox="0 0 44 44">
        <circle class="face" cx="22" cy="22" r="19"/>
        ${v ? `<circle class="arc" cx="22" cy="22" r="14" pathLength="100" stroke-dasharray="${(v / 8) * 100 - 0.01} 100"/>
               <text class="num" x="22" y="27.5" text-anchor="middle">${v}</text>`
            : `<line class="slash" x1="15" y1="29" x2="29" y2="15"/>`}
      </svg>
      <b>${v ? v + " sec" : "No limit"}</b>
    </button>`).join("");
  segInit("speedSeg", "speed", renderTimerHelp);

  const sw = $("soundSwitch");
  const paintSound = () => { const on = settings.sound === "on"; sw.setAttribute("aria-checked", on); $("soundLabel").textContent = on ? "On" : "Off"; };
  sw.onclick = () => { settings.sound = settings.sound === "on" ? "off" : "on"; store.set("sound", settings.sound); paintSound(); sfx.tap(); };
  paintSound();
  segInit("colorSeg", "color", () => document.body.classList.toggle("black-letters", settings.color === "black"));

  $("startAll").onclick = () => startRound(L.map((_, i) => i));
  $("openPicker").onclick = openPicker;

  // ---------- picker ----------
  const grid = $("pickGrid");
  grid.style.setProperty("--cols", page.cols);
  L.forEach((l, i) => {
    const t = document.createElement("div");
    t.className = "tile"; t.dataset.i = i;
    t.innerHTML = `<img src="${l.img}" alt="${l.name}" draggable="false"><span class="tick"><svg><use href="#i-check"/></svg></span>`;
    grid.appendChild(t);
  });

  function paintPicks() {
    grid.querySelectorAll(".tile").forEach((t) => t.classList.toggle("sel", picked.has(+t.dataset.i)));
    grid.classList.toggle("has-sel", picked.size > 0);
    const n = picked.size;
    $("pickStart").disabled = n === 0;
    $("pickStartLabel").textContent = n === 0 ? "Pick some letters" : `Start with ${plural(n, "letter")}`;
  }

  function playGhost() {
    const g = $("ghost");
    g.style.setProperty("--swipe", grid.clientWidth * 0.7 + "px");
    g.classList.remove("play"); void g.offsetWidth; g.classList.add("play");
  }
  const stopGhost = () => $("ghost").classList.remove("play");

  function openPicker() {
    show("picker");
    paintPicks();
    if (picked.size === 0 || !store.get("ghostSeen", false)) requestAnimationFrame(playGhost);
  }

  // tap or drag across tiles; the first tile touched decides add vs remove
  let dragMode = null, touched = null, last = null;
  const tileAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest(".tile") : null; };
  function applyTile(t) {
    if (!t) return; const i = +t.dataset.i;
    if (touched.has(i)) return; touched.add(i);
    dragMode === "add" ? picked.add(i) : picked.delete(i);
    sfx.tap(); buzz(6);
    paintPicks();
  }
  grid.addEventListener("pointerdown", (e) => {
    const t = tileAt(e.clientX, e.clientY); if (!t) return;
    stopGhost(); store.set("ghostSeen", true);
    dragMode = picked.has(+t.dataset.i) ? "remove" : "add";
    touched = new Set(); last = { x: e.clientX, y: e.clientY };
    try { grid.setPointerCapture(e.pointerId); } catch {}
    applyTile(t);
  });
  grid.addEventListener("pointermove", (e) => {
    if (!dragMode) return;
    const x = e.clientX, y = e.clientY;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - last.x, y - last.y) / 12));
    for (let s = 1; s <= steps; s++) applyTile(tileAt(last.x + (x - last.x) * s / steps, last.y + (y - last.y) * s / steps));
    last = { x, y };
  });
  const endDrag = () => { if (dragMode) store.set("picked", [...picked]); dragMode = null; last = null; };
  grid.addEventListener("pointerup", endDrag);
  grid.addEventListener("pointercancel", endDrag);

  $("pickAll").onclick = () => { stopGhost(); L.forEach((_, i) => picked.add(i)); store.set("picked", [...picked]); paintPicks(); };
  $("pickNone").onclick = () => { picked.clear(); store.set("picked", []); paintPicks(); };
  $("pickerBack").onclick = () => show("home");
  $("pickerHelp").onclick = playGhost;
  $("pickStart").onclick = () => startRound([...picked].sort((a, b) => a - b));

  // ---------- drill ----------
  const CARDS = [
    ["#fff1f0", "#f6d3cf"], ["#fff7d9", "#f1e2a6"], ["#e9faf1", "#c4ecd7"], ["#eaf4ff", "#c9def8"],
    ["#f2edff", "#d9cff8"], ["#fff0f7", "#f5cfe2"], ["#e8fbfd", "#c3eaef"], ["#fff3e6", "#f4d9bb"]
  ];
  let queue, pos, history, missed, lateSet, firstTry, times, timerId, colorStart, shownAt, timedOut = false;

  function startRound(indices) {
    if (!indices.length) return;
    lastSet = indices.slice();
    queue = shuffle(indices).map((i) => ({ i, retry: false }));
    pos = 0; history = []; missed = new Set(); lateSet = new Set(); firstTry = new Map(); times = new Map();
    colorStart = Math.floor(Math.random() * CARDS.length);
    show("drill");
    keepAwake();
    render(true);
  }

  function render(animate) {
    const item = queue[pos], l = L[item.i];
    const card = $("card");
    $("cardImg").src = l.img;
    $("cardImg").alt = l.name;
    const [bg, edge] = CARDS[(colorStart + pos) % CARDS.length];
    card.style.setProperty("--card-bg", bg);
    card.style.setProperty("--card-edge", edge);
    $("retryTag").classList.toggle("hidden", !item.retry);
    $("peekName").textContent = l.name;
    $("peekAr").textContent = l.ar || "";
    $("peek").classList.remove("show", "speaking");
    try { speechSynthesis.cancel(); } catch {}
    const pct = (pos / queue.length) * 100;
    $("progFill").style.width = pct + "%";
    $("rider").style.left = pct + "%";
    $("progCount").textContent = `${pos + 1}/${queue.length}`;
    $("prevBtn").disabled = pos === 0;
    mood("riderMascot", item.retry ? "think" : "idle");
    card.className = "card";
    setTimedOut(false);
    if (animate) { void card.offsetWidth; card.classList.add("pop"); }
    shownAt = performance.now();
    startTimer();
  }

  function startTimer() {
    clearTimeout(timerId);
    const tm = $("timer"), fill = $("timerFill");
    fill.classList.remove("run");
    if (!settings.speed) { tm.classList.add("hidden"); return; }
    tm.classList.remove("hidden");
    fill.style.setProperty("--t", settings.speed + "s");
    void fill.offsetWidth; fill.classList.add("run");
    timerId = setTimeout(() => { setTimedOut(true); sfx.miss(); $("card").classList.add("late"); mood("riderMascot", "think"); buzz([10, 50, 10]); }, settings.speed * 1000);
  }

  function setTimedOut(on) {
    timedOut = on;
    $("lateTag").classList.toggle("hidden", !on);
    $("card").classList.toggle("timed-out", on);
    document.querySelector(".drill-foot").classList.toggle("late", on);
  }

  function burst(fromEl) {
    const r = fromEl.getBoundingClientRect();
    const b = document.createElement("div");
    b.className = "burst"; b.style.left = r.left + r.width / 2 + "px"; b.style.top = r.top + r.height / 2 + "px";
    const cols = ["#ffc93c", "#ffffff", "#7ee0b0", "#ffd25a"];
    for (let k = 0; k < 9; k++) {
      const a = (Math.PI * 2 * k) / 9 + Math.random() * 0.4, d = 50 + Math.random() * 40;
      b.innerHTML += `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;color:${cols[k % cols.length]}"><svg viewBox="0 0 24 24"><use href="#i-star"/></svg></i>`;
    }
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 700);
  }

  let busy = false;
  function answer(knew) {
    if (busy || !queue || pos >= queue.length) return; busy = true;
    clearTimeout(timerId);
    if (timedOut) knew = false;          // too slow = a mistake, whatever was pressed
    const wasLate = timedOut;
    const item = queue[pos];
    const dt = Math.min(30000, performance.now() - shownAt);
    const rec = { pos, i: item.i, knew, inserted: null, wasNewMiss: false, wasNewLate: false, firstSet: false };
    if (wasLate && !missed.has(item.i) && !lateSet.has(item.i)) { lateSet.add(item.i); rec.wasNewLate = true; }
    if (!firstTry.has(item.i)) { firstTry.set(item.i, knew); times.set(item.i, dt); rec.firstSet = true; }
    if (!knew) {
      if (!missed.has(item.i)) { missed.add(item.i); rec.wasNewMiss = true; }
      if (!item.retry) {   // bring it back a few cards later for another go
        const at = Math.min(queue.length, pos + 4 + Math.floor(Math.random() * 3));
        queue.splice(at, 0, { i: item.i, retry: true });
        rec.inserted = at;
      }
    }
    history.push(rec);

    const card = $("card");
    card.classList.remove("pop", "late");
    card.classList.add(knew ? "out-good" : "out-miss");
    if (knew) { sfx.good(); buzz(12); burst($("gotBtn")); hop("riderMascot"); mood("riderMascot", "happy"); }
    else { sfx.miss(); buzz([8, 40, 8]); mood("riderMascot", "think"); }

    setTimeout(() => {
      busy = false;
      pos++;
      if (pos >= queue.length) finish(); else render(true);
    }, 230);
  }

  function back() {
    if (busy || pos === 0 || !history.length) return;
    const rec = history.pop();
    if (rec.inserted != null) queue.splice(rec.inserted, 1);
    if (rec.wasNewMiss) missed.delete(rec.i);
    if (rec.wasNewLate) lateSet.delete(rec.i);
    if (rec.firstSet) { firstTry.delete(rec.i); times.delete(rec.i); }
    pos = rec.pos;
    render(true);
  }

  $("gotBtn").onclick = () => answer(true);
  $("missBtn").onclick = () => answer(false);
  $("lateBtn").onclick = () => answer(false);
  $("prevBtn").onclick = back;
  // the answer: show the name and say it with the phone's Arabic voice
  let arVoice = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices().filter((v) => /^ar/i.test(v.lang));
      arVoice = vs.find((v) => /SA|Saudi/i.test(v.lang + v.name)) || vs[0] || null;
    } catch {}
  }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch {}

  function sayAnswer() {
    const l = L[queue[pos].i], p = $("peek");
    p.classList.add("show");
    clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove("show", "speaking"), 3500);
    try {
      speechSynthesis.cancel();
      if (!arVoice) pickVoice();
      // Arabic voice says the Arabic name; a phone without one says "Kaaf" etc. in English
      const u = new SpeechSynthesisUtterance(arVoice ? l.ar : l.name);
      if (arVoice) { u.voice = arVoice; u.lang = arVoice.lang; }
      u.rate = 0.75;
      u.onstart = () => p.classList.add("speaking");
      u.onend = u.onerror = () => p.classList.remove("speaking");
      speechSynthesis.speak(u);
    } catch {}
  }
  $("peek").onclick = sayAnswer;
  $("drillQuit").onclick = () => { clearTimeout(timerId); $("quitModal").classList.remove("hidden"); mood("quitMascot", "think"); };
  $("quitNo").onclick = () => { $("quitModal").classList.add("hidden"); startTimer(); };
  $("quitYes").onclick = () => { $("quitModal").classList.add("hidden"); show("home"); };

  document.addEventListener("keydown", (e) => {
    if (!$("drill").classList.contains("active") || !$("quitModal").classList.contains("hidden")) return;
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") { e.preventDefault(); answer(true); }
    else if (e.key === "ArrowDown" || e.key.toLowerCase() === "x") answer(false);
    else if (e.key === "ArrowLeft" || e.key === "Backspace") back();
  });

  // ---------- done ----------
  function finish() {
    clearTimeout(timerId);
    const total = firstTry.size;
    const knewFirst = [...firstTry.values()].filter(Boolean).length;

    // "slow" = knew it, but took much longer than his usual pace
    const known = [...times].filter(([i]) => firstTry.get(i)).map(([, t]) => t).sort((a, b) => a - b);
    const median = known.length ? known[Math.floor(known.length / 2)] : 0;
    const slowCut = Math.max(4000, median * 1.8);
    const slow = !settings.speed && known.length >= 4 ? [...times].filter(([i, t]) => firstTry.get(i) && t > slowCut).map(([i]) => i) : [];
    const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length / 1000 : 0;

    const tricky = [...[...missed].map((i) => ({ i, why: lateSet.has(i) ? "late" : "miss" })), ...slow.map((i) => ({ i, why: "slow" }))]
      .sort((a, b) => a.i - b.i);
    store.set("tricky", tricky);


    const ratio = total ? knewFirst / total : 1;
    const starCount = ratio === 1 ? 3 : ratio >= 0.75 ? 2 : 1;
    $("stars").innerHTML = [0, 1, 2].map((k) =>
      `<svg viewBox="0 0 24 24" class="${k < starCount ? "" : "off"}" style="animation-delay:${0.25 + k * 0.18}s"><use href="#i-star"/></svg>`).join("");
    $("doneTitle").textContent = ratio === 1 ? "MashaAllah!" : ratio >= 0.75 ? "Great job!" : "Well done!";
    $("statFirst").textContent = `${knewFirst}/${total}`;
    $("statSpeed").textContent = known.length ? `${avg.toFixed(1)}s` : "–";

    $("practiceBox").classList.toggle("hidden", tricky.length === 0);
    $("practiceGrid").innerHTML = tricky.map((t) =>
      `<div class="p-item"><div class="p-img"><img src="${L[t.i].img}" alt="${L[t.i].name}"></div><span class="p-tag ${t.why}">${{ miss: "Not yet", late: "Too slow", slow: "Slow" }[t.why]}</span></div>`).join("");
    $("doneRedo").classList.toggle("hidden", tricky.length === 0);
    $("doneRedoSub").textContent = `Only the ${plural(tricky.length, "tricky letter")}`;

    show("done");
    mood("doneMascot", "happy");
    sfx.win();
    confetti(ratio === 1 ? 170 : 100);
  }
  $("doneRedo").onclick = () => startRound(store.get("tricky", []).map((t) => t.i));
  $("doneAgain").onclick = () => startRound(lastSet);
  $("doneHome").onclick = () => show("home");

  // ---------- confetti: stars, dots and ribbons in the app colours ----------
  function confetti(n) {
    const c = $("confetti"), ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = ["#ffc93c", "#22b573", "#3d9bff", "#ff8a4c", "#7c5cff", "#ff7b8a"];
    const ps = Array.from({ length: n }, (_, k) => ({
      x: innerWidth * (k % 2 ? 0.2 : 0.8), y: innerHeight * 0.35,
      vx: (k % 2 ? 1 : -1) * (2 + Math.random() * 7), vy: -Math.random() * 13 - 5,
      s: 7 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: cols[(Math.random() * cols.length) | 0], shape: k % 3
    }));
    const star = (s) => {
      ctx.beginPath();
      for (let j = 0; j < 10; j++) { const a = (Math.PI / 5) * j - Math.PI / 2, rr = j % 2 ? s * 0.42 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    };
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.shape === 0) star(p.s * 0.7);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s / 3, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 5, p.s, p.s / 2.5);
        ctx.restore();
      });
      if (t - t0 < 3800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  // ---------- keep the screen awake during a round ----------
  let wake = null;
  async function keepAwake() { try { wake = await navigator.wakeLock?.request("screen"); } catch {} }
  function releaseWake() { try { wake && wake.release(); } catch {} wake = null; }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && $("drill").classList.contains("active")) keepAwake();
  });

  show("home");
})();

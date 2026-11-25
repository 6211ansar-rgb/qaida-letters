(() => {
  const page = window.QAIDA_PAGES[0];
  const L = page.letters;
  const $ = (id) => document.getElementById(id);

  // ---------- small storage helpers (never let storage break the app) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("qaida:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("qaida:" + k, JSON.stringify(v)); } catch {} }
  };

  const settings = { speed: store.get("speed", 0), color: store.get("color", "color") };
  let picked = new Set(store.get("picked", []));
  let lastSet = [];          // letters used in the round just played

  // ---------- preload images ----------
  L.forEach((l) => { const i = new Image(); i.src = l.img; });

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
    const missed = store.get("missed", []);
    $("redoMissed").classList.toggle("hidden", missed.length === 0);
    $("redoSub").textContent = `${missed.length} letter${missed.length === 1 ? "" : "s"} from last time`;
    $("pickSub").textContent = picked.size ? `${picked.size} picked last time` : "Pick just the ones you want";
  }

  function segInit(segId, key, apply) {
    const seg = $(segId);
    const setOn = () => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v == settings[key]));
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      settings[key] = key === "speed" ? Number(b.dataset.v) : b.dataset.v;
      store.set(key, settings[key]); setOn(); apply && apply();
    });
    setOn(); apply && apply();
  }
  const applyColor = () => document.body.classList.toggle("black-letters", settings.color === "black");
  segInit("speedSeg", "speed");
  segInit("colorSeg", "color", applyColor);

  $("startAll").onclick = () => startRound(L.map((_, i) => i));
  $("openPicker").onclick = openPicker;
  $("redoMissed").onclick = () => startRound(store.get("missed", []));

  // ---------- picker ----------
  const grid = $("pickGrid");
  grid.style.setProperty("--cols", page.cols);
  L.forEach((l, i) => {
    const t = document.createElement("div");
    t.className = "tile"; t.dataset.i = i;
    t.innerHTML = `<img src="${l.img}" alt="${l.name}" draggable="false">`;
    grid.appendChild(t);
  });

  function paintPicks() {
    grid.querySelectorAll(".tile").forEach((t) => t.classList.toggle("sel", picked.has(+t.dataset.i)));
    grid.classList.toggle("has-sel", picked.size > 0);
    const n = picked.size;
    $("pickStart").disabled = n === 0;
    $("pickStartLabel").textContent = n === 0 ? "Pick some letters" : `Start with ${n} letter${n === 1 ? "" : "s"} ▶`;
  }

  function playGhost() {
    const g = $("ghost");
    g.style.setProperty("--swipe", grid.clientWidth * 0.72 + "px");
    g.classList.remove("play"); void g.offsetWidth; g.classList.add("play");
  }
  const stopGhost = () => $("ghost").classList.remove("play");

  function openPicker() {
    show("picker");
    paintPicks();
    if (picked.size === 0 || !store.get("ghostSeen", false)) playGhost();
  }

  // tap or drag across tiles. The first tile touched decides add vs remove.
  let dragMode = null, touched = null;
  const tileAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest && el.closest(".tile"); };
  function applyTile(t) {
    if (!t) return; const i = +t.dataset.i;
    if (touched.has(i)) return; touched.add(i);
    dragMode === "add" ? picked.add(i) : picked.delete(i);
    paintPicks();
  }
  grid.addEventListener("pointerdown", (e) => {
    const t = tileAt(e.clientX, e.clientY); if (!t) return;
    stopGhost(); store.set("ghostSeen", true);
    dragMode = picked.has(+t.dataset.i) ? "remove" : "add";
    touched = new Set();
    grid.setPointerCapture(e.pointerId);
    applyTile(t);
  });
  let last = null;
  grid.addEventListener("pointermove", (e) => {
    if (!dragMode) return;
    // fill in the gap since the last event so a fast swipe never skips a letter
    const x = e.clientX, y = e.clientY;
    const steps = last ? Math.max(1, Math.ceil(Math.hypot(x - last.x, y - last.y) / 12)) : 1;
    for (let s = 1; s <= steps; s++) {
      const px = last ? last.x + (x - last.x) * s / steps : x;
      const py = last ? last.y + (y - last.y) * s / steps : y;
      applyTile(tileAt(px, py));
    }
    last = { x, y };
  });
  grid.addEventListener("pointerdown", (e) => { last = { x: e.clientX, y: e.clientY }; });
  const endDrag = () => { if (dragMode) store.set("picked", [...picked]); dragMode = null; last = null; };
  grid.addEventListener("pointerup", endDrag);
  grid.addEventListener("pointercancel", endDrag);

  $("pickAll").onclick = () => { stopGhost(); L.forEach((_, i) => picked.add(i)); store.set("picked", [...picked]); paintPicks(); };
  $("pickNone").onclick = () => { picked.clear(); store.set("picked", []); paintPicks(); };
  $("pickerBack").onclick = () => show("home");
  $("pickerHelp").onclick = playGhost;
  $("pickStart").onclick = () => startRound([...picked].sort((a, b) => a - b));

  // ---------- drill ----------
  const CARD_COLORS = ["#ffe3e3", "#fff1c1", "#d9f7e6", "#dcefff", "#ece2ff", "#ffe6f4", "#e3fbff", "#fff0dd"];
  let queue, pos, history, missed, firstTry, timerId, colorStart;

  function startRound(indices) {
    if (!indices.length) return;
    lastSet = indices.slice();
    queue = shuffle(indices).map((i) => ({ i, retry: false }));
    pos = 0; history = []; missed = new Set(); firstTry = new Map();
    colorStart = Math.floor(Math.random() * CARD_COLORS.length);
    show("drill");
    keepAwake();
    render(true);
  }

  function render(animate) {
    const item = queue[pos], l = L[item.i];
    const card = $("card");
    $("cardImg").src = l.img;
    $("cardImg").alt = l.name;
    card.style.setProperty("--card-bg", CARD_COLORS[(colorStart + pos) % CARD_COLORS.length]);
    $("retryTag").classList.toggle("hidden", !item.retry);
    $("peekName").textContent = l.name;
    $("peek").classList.remove("show");
    $("progFill").style.width = (pos / queue.length) * 100 + "%";
    $("progCount").textContent = `${pos + 1}/${queue.length}`;
    $("prevBtn").disabled = pos === 0;
    card.className = "card";
    if (animate) { void card.offsetWidth; card.classList.add("pop"); }
    startTimer();
  }

  function startTimer() {
    clearTimeout(timerId);
    const tm = $("timer"), fill = $("timerFill");
    tm.classList.remove("late");
    fill.classList.remove("run");
    if (!settings.speed) { tm.classList.add("hidden"); return; }
    tm.classList.remove("hidden");
    fill.style.setProperty("--t", settings.speed + "s");
    void fill.offsetWidth; fill.classList.add("run");
    timerId = setTimeout(() => { tm.classList.add("late"); $("card").classList.add("late"); }, settings.speed * 1000);
  }

  let busy = false;
  function answer(knew) {
    if (busy) return; busy = true;
    clearTimeout(timerId);
    const item = queue[pos];
    const rec = { pos, i: item.i, knew, inserted: null, wasNewMiss: false, firstSet: false };
    if (!firstTry.has(item.i)) { firstTry.set(item.i, knew); rec.firstSet = true; }
    if (!knew) {
      if (!missed.has(item.i)) { missed.add(item.i); rec.wasNewMiss = true; }
      // bring it back a few cards later so he gets another go this round
      if (!item.retry) {
        const at = Math.min(queue.length, pos + 1 + 3 + Math.floor(Math.random() * 3));
        queue.splice(at, 0, { i: item.i, retry: true });
        rec.inserted = at;
      }
    }
    history.push(rec);
    const card = $("card");
    card.classList.remove("pop", "late");
    card.classList.add(knew ? "out-good" : "out-miss");
    setTimeout(() => {
      busy = false;
      pos++;
      if (pos >= queue.length) finish(); else render(true);
    }, 200);
  }

  function back() {
    if (busy || pos === 0 || !history.length) return;
    const rec = history.pop();
    if (rec.inserted != null) queue.splice(rec.inserted, 1);
    if (rec.wasNewMiss) missed.delete(rec.i);
    if (rec.firstSet) firstTry.delete(rec.i);
    pos = rec.pos;
    render(true);
  }

  $("gotBtn").onclick = () => answer(true);
  $("missBtn").onclick = () => answer(false);
  $("prevBtn").onclick = back;
  $("peek").onclick = () => {
    const p = $("peek"); p.classList.add("show");
    clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove("show"), 2000);
  };
  $("drillQuit").onclick = () => $("quitModal").classList.remove("hidden");
  $("quitNo").onclick = () => $("quitModal").classList.add("hidden");
  $("quitYes").onclick = () => { $("quitModal").classList.add("hidden"); clearTimeout(timerId); show("home"); };

  // keyboard support for a laptop / tablet keyboard
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
    const missList = [...missed].sort((a, b) => a - b);
    store.set("missed", missList);

    const ratio = total ? knewFirst / total : 1;
    const starCount = ratio === 1 ? 3 : ratio >= 0.75 ? 2 : 1;
    $("stars").innerHTML = Array.from({ length: 3 }, (_, k) =>
      `<span style="animation-delay:${k * 0.15}s;${k < starCount ? "" : "filter:grayscale(1);opacity:.3"}">⭐</span>`).join("");
    $("doneTitle").textContent = ratio === 1 ? "MashaAllah!" : ratio >= 0.75 ? "Great job!" : "Well done!";
    $("doneSub").textContent = ratio === 1
      ? `Knew all ${total} letters!`
      : `Knew ${knewFirst} of ${total} straight away`;

    $("missedBox").classList.toggle("hidden", missList.length === 0);
    $("missedGrid").innerHTML = missList.map((i) => `<div><img src="${L[i].img}" alt="${L[i].name}"></div>`).join("");
    $("doneRedo").classList.toggle("hidden", missList.length === 0);
    $("doneRedoSub").textContent = `Only the ${missList.length} he found tricky`;

    show("done");
    confetti(ratio === 1 ? 160 : 90);
  }
  $("doneRedo").onclick = () => startRound(store.get("missed", []));
  $("doneAgain").onclick = () => startRound(lastSet);
  $("doneHome").onclick = () => show("home");

  // ---------- confetti ----------
  function confetti(n) {
    const c = $("confetti"), ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const cols = ["#e2463c", "#ffc947", "#2bb673", "#4aa8ff", "#9b6bff", "#ff8a3d"];
    const ps = Array.from({ length: n }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.3,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
      s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: cols[(Math.random() * cols.length) | 0]
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (t - t0 < 3500) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
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

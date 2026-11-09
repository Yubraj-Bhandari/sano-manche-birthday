/* =========================================================
   Sano Manche · The Birthday Vault
   ========================================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const TARGET_HEARTS = 19;

  const state = {
    muted: false,
    attempts: 0,
    noCount: 0,
    bootDone: false
  };

  /* -------------------------------------------------------
     Sound + haptics
     ------------------------------------------------------- */

  let audioCtx = null;

  function beep(freq, dur = 0.1, type = "sine", vol = 0.05) {
    if (state.muted) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    } catch (err) {
      /* audio is a bonus, never a blocker */
    }
  }

  function chord() {
    beep(523.25, 0.2, "sine", 0.05);
    setTimeout(() => beep(659.25, 0.2, "sine", 0.05), 95);
    setTimeout(() => beep(783.99, 0.34, "sine", 0.05), 190);
  }

  function buzz(pattern = 10) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (err) {
      /* ignore */
    }
  }

  /* -------------------------------------------------------
     Toast
     ------------------------------------------------------- */

  const toastEl = $("#toast");
  let toastTimer = null;

  function toast(message, ms = 3400) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  /* -------------------------------------------------------
     Screen router + cinematic level wipe
     ------------------------------------------------------- */

  const LEVELS = {
    lock: { num: "00", name: "The Lock" },
    gift: { num: "02", name: "Consent Form" },
    hearts: { num: "03", name: "Catch 19" },
    unbox: { num: "04", name: "The Gift" },
    reveal: { num: "19", name: "Unlocked" }
  };

  const screenStep = { lock: 1, gift: 2, hearts: 3, unbox: 4, reveal: 5 };

  let navShowTimer = null;
  let navEndTimer = null;

  function go(name, options = {}) {
    const meta = LEVELS[name];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!meta || reduce || options.instant) {
      showScreen(name);
      return;
    }

    clearTimeout(navShowTimer);
    clearTimeout(navEndTimer);

    const wipe = $("#levelWipe");
    $("#wipeNum").textContent = "LEVEL " + meta.num;
    $("#wipeName").textContent = meta.name;

    wipe.classList.remove("play");
    void wipe.offsetWidth;
    wipe.classList.add("play");

    beep(170, 0.22, "sine", 0.04);
    setTimeout(() => beep(430, 0.16, "sine", 0.03), 240);

    navShowTimer = setTimeout(() => showScreen(name), 430);
    navEndTimer = setTimeout(() => wipe.classList.remove("play"), 1100);
  }

  function showScreen(name) {
    $$(".screen").forEach((screen) => {
      screen.classList.toggle("active", screen.dataset.screen === name);
    });
    document.body.dataset.screen = name;

    $("#hud").hidden = name === "boot";
    document.body.classList.toggle("on-reveal", name === "reveal");
    updatePips(screenStep[name] || 0);

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (name === "lock" && window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => $("#lockInput").focus(), 350);
    }
    if (name === "reveal") enterReveal();
  }

  function updatePips(step) {
    $$("#pips li").forEach((pip) => {
      const n = Number(pip.dataset.step);
      pip.classList.toggle("done", n < step);
      pip.classList.toggle("now", n === step);
    });
  }

  /* -------------------------------------------------------
     Boot sequence
     ------------------------------------------------------- */

  const bootLines = [
    { html: '$ boot --user="sano.manche"', cls: "" },
    { html: "> waking the birthday mainframe ......... <span class='ok'>ok</span>", cls: "" },
    { html: "> locating one (1) tiny human ........... <span class='ok'>found</span>", cls: "" },
    { html: "> name ................................ <span class='name'>SANO MANCHE</span>", cls: "" },
    { html: "> age ................................. 19 <span class='warn'>(allegedly)</span>", cls: "" },
    { html: "> cuteness ............................ <span class='warn'>off the charts</span>", cls: "" },
    { html: "> vault status ........................ <span class='warn'>LOCKED</span>", cls: "" }
  ];

  const bootLog = $("#bootLog");
  const bootFoot = $("#bootFoot");
  let bootTimers = [];

  function appendBootLine(line) {
    const span = document.createElement("span");
    span.className = "ln " + line.cls;
    span.innerHTML = line.html;
    bootLog.appendChild(span);
  }

  function runBoot() {
    bootLog.innerHTML = "";
    bootFoot.hidden = true;
    let delay = 300;

    bootLines.forEach((line, index) => {
      bootTimers.push(setTimeout(() => {
        if (state.bootDone) return;
        appendBootLine(line);
        beep(380 + index * 26, 0.035, "square", 0.012);

        if (index === bootLines.length - 1) {
          bootFoot.hidden = false;
          bootTimers.push(setTimeout(finishBoot, 850));
        }
      }, delay));
      delay += 340;
    });

    bootTimers.push(setTimeout(finishBoot, delay + 900));
  }

  function finishBoot() {
    if (state.bootDone) return;
    state.bootDone = true;
    go("lock", { instant: true });
  }

  function skipBoot() {
    if (state.bootDone) return;
    bootTimers.forEach(clearTimeout);
    bootTimers = [];
    bootLog.innerHTML = "";
    bootLines.forEach(appendBootLine);
    bootFoot.hidden = false;
    state.bootDone = true;
    setTimeout(() => go("lock", { instant: true }), 400);
  }

  $("#screen-boot").addEventListener("click", skipBoot);

  /* -------------------------------------------------------
     Level 00 · name lock
     ------------------------------------------------------- */

  const lockForm = $("#lockForm");
  const lockInput = $("#lockInput");
  const lockCard = $("#lockCard");

  const denyLines = [
    "Denied. That is not you. (Cute attempt, though.)",
    "Still no. The vault is laughing at you.",
    "Third strike. The vault is now charging rent.",
    "I can do this all day. — The Vault"
  ];

  function normalize(value) {
    return value.toLowerCase().replace(/[^a-z]/g, "");
  }

  lockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (lockForm.dataset.busy) return;

    const value = normalize(lockInput.value);
    if (!value) {
      beep(180, 0.09, "square", 0.04);
      return;
    }

    if (value.includes("sano") || value.includes("sanu") || value.includes("manche")) {
      unlockVault();
    } else {
      denyVault();
    }
  });

  function denyVault() {
    state.attempts += 1;

    lockCard.classList.remove("shake");
    void lockCard.offsetWidth;
    lockCard.classList.add("shake");

    beep(150, 0.14, "sawtooth", 0.04);
    buzz(24);
    toast(denyLines[Math.min(state.attempts - 1, denyLines.length - 1)]);

    if (state.attempts >= 2) $("#lockHint").hidden = false;

    lockInput.value = "";
    if (window.matchMedia("(pointer: fine)").matches) lockInput.focus();
  }

  function unlockVault() {
    lockForm.dataset.busy = "1";
    lockInput.disabled = true;

    const submit = lockForm.querySelector(".btn");
    submit.disabled = true;
    submit.textContent = "Scanning…";

    beep(520, 0.09, "sine", 0.04);
    setTimeout(() => beep(640, 0.09, "sine", 0.04), 170);

    setTimeout(() => {
      toast("ERROR: cuteness exceeds security limits. Bypassing…", 2200);
      chord();
      buzz([12, 40, 12]);
      lockCard.classList.add("unlocked");
      setTimeout(() => go("gift"), 950);
    }, 900);
  }

  /* -------------------------------------------------------
     Level 01 · consent form with a cowardly "No"
     ------------------------------------------------------- */

  const acceptBtn = $("#acceptBtn");
  const declineBtn = $("#declineBtn");
  const giftNote = $("#giftNote");

  const noLines = [
    "Are you sure?",
    "Think about it.",
    "This button is decorative.",
    "You cannot refuse a gift. It is the law."
  ];

  declineBtn.addEventListener("click", () => {
    state.noCount += 1;

    if (state.noCount >= 5) {
      declineBtn.disabled = true;
      declineBtn.style.opacity = "0";
      declineBtn.style.transform = "scale(0.6) translateY(24px)";
      giftNote.textContent = "The “No” button has resigned. Only one option left.";
      acceptBtn.classList.add("pulse");
      toast("That button was never real. The gift is happening.");
      return;
    }

    declineBtn.textContent = noLines[state.noCount - 1];

    const x = Math.random() * 120 - 60;
    const y = Math.random() * 36 - 18;
    declineBtn.style.transform = `translate(${x}px, ${y}px) scale(${1 - state.noCount * 0.07})`;

    beep(320 - state.noCount * 22, 0.07, "triangle", 0.03);
    buzz(8);
  });

  acceptBtn.addEventListener("click", () => {
    heroConfetti(60);
    go("hearts");
  });

  /* -------------------------------------------------------
     Level 02 · catch 19 hearts
     ------------------------------------------------------- */

  const field = $("#heartfield");
  const basket = $("#basket");
  const overlay = $("#gameOverlay");
  const heartCount = $("#heartCount");
  const heartBar = $("#heartBar");
  const heartNote = $("#heartNote");

  const HEART_COLORS = ["#ff9fbf", "#ffb3c6", "#ffd68f", "#ff5f87", "#c8a6ff", "#ffc2a8"];

  const CATCH_NOTES = [
    "one.", "cute.", "obviously.", "keep going.", "iconic.", "of course.",
    "adorable.", "another.", "unfair.", "show-off.", "main character.",
    "smooth.", "still going.", "obviously.", "one more.", "almost.",
    "do not fumble.", "deep breath.", "nineteen."
  ];

  let hearts = [];
  let running = false;
  let rafId = null;
  let caught = 0;
  let spawnAcc = 0;
  let lastTs = 0;
  let ratio = 0.5;
  let targetRatio = 0.5;
  let fieldW = 0;
  let fieldH = 0;

  function startGame() {
    overlay.classList.add("hide");
    clearHearts();

    caught = 0;
    spawnAcc = 0;
    lastTs = 0;
    ratio = 0.5;
    targetRatio = 0.5;
    heartCount.textContent = "0";
    heartBar.style.width = "0%";
    heartNote.textContent = "Catch one for every year. Miss one and I’ll be mildly devastated.";

    const rect = field.getBoundingClientRect();
    fieldW = rect.width;
    fieldH = rect.height;

    running = true;
    beep(660, 0.1, "sine", 0.04);
    rafId = requestAnimationFrame(loop);
  }

  function clearHearts() {
    hearts.forEach((heart) => heart.el.remove());
    hearts = [];
    $$(".float-note", field).forEach((node) => node.remove());
  }

  function setTargetFromEvent(event) {
    const rect = field.getBoundingClientRect();
    const raw = (event.clientX - rect.left) / rect.width;
    targetRatio = Math.min(0.96, Math.max(0.04, raw));
  }

  field.addEventListener("pointermove", (event) => {
    if (!running) return;
    setTargetFromEvent(event);
  });

  field.addEventListener("pointerdown", (event) => {
    if (!running) return;
    setTargetFromEvent(event);
  });

  document.addEventListener("keydown", (event) => {
    if (!running) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      targetRatio = Math.max(0.04, targetRatio - 0.09);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      targetRatio = Math.min(0.96, targetRatio + 0.09);
    }
  });

  function spawnHeart() {
    const size = 30 + Math.random() * 14;
    const el = document.createElement("div");
    el.className = "heart";
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.setProperty("--hc", HEART_COLORS[(Math.random() * HEART_COLORS.length) | 0]);

    const x = 8 + Math.random() * Math.max(20, fieldW - size - 16);
    const y = -70 - Math.random() * 90;

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    field.appendChild(el);

    const heart = {
      el,
      x,
      y,
      size,
      vy: 118 + Math.random() * 66 + caught * 1.4,
      rot: Math.random() * 26 - 13,
      vr: Math.random() * 34 - 17,
      dead: false
    };

    el.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (!running || heart.dead) return;
      setTargetFromEvent(event);
      collectHeart(heart);
    });

    hearts.push(heart);
  }

  function collectHeart(heart) {
    if (heart.dead || !running) return;

    heart.dead = true;
    heart.el.style.transition = "transform 0.24s ease, opacity 0.24s ease";
    heart.el.style.opacity = "0";
    heart.el.style.transform += " scale(1.7)";
    setTimeout(() => heart.el.remove(), 260);

    caught += 1;
    heartCount.textContent = String(caught);
    heartBar.style.width = Math.min(100, (caught / TARGET_HEARTS) * 100) + "%";

    beep(500 + caught * 22, 0.08, "sine", 0.045);
    buzz(6);
    floatNote(heart.x + heart.size / 2, Math.max(18, heart.y - 8), CATCH_NOTES[Math.min(caught - 1, CATCH_NOTES.length - 1)]);

    if (caught === 5) heartNote.textContent = "Five. Look at you — emotionally available and athletic.";
    if (caught === 12) heartNote.textContent = "Twelve. Seven more and the vault has to admit you are grown up.";
    if (caught === 18) heartNote.textContent = "One more. One. Do not fumble this.";

    if (caught >= TARGET_HEARTS) winGame();
  }

  function floatNote(x, y, text) {
    const note = document.createElement("span");
    note.className = "float-note";
    note.textContent = text;
    note.style.left = x + "px";
    note.style.top = y + "px";
    field.appendChild(note);
    setTimeout(() => note.remove(), 1000);
  }

  function loop(timestamp) {
    if (!running) return;

    if (!lastTs) lastTs = timestamp;
    const dt = Math.min(0.05, (timestamp - lastTs) / 1000);
    lastTs = timestamp;

    const rect = field.getBoundingClientRect();
    fieldW = rect.width;
    fieldH = rect.height;

    ratio += (targetRatio - ratio) * Math.min(1, dt * 15);
    basket.style.transform = `translateX(${ratio * fieldW}px)`;

    spawnAcc += dt;
    if (spawnAcc > 0.6) {
      spawnAcc = 0;
      spawnHeart();
    }

    const basketX = ratio * fieldW;

    for (const heart of hearts) {
      if (heart.dead) continue;

      heart.y += heart.vy * dt;
      heart.rot += heart.vr * dt;
      heart.el.style.transform =
        `translate3d(${heart.x}px, ${heart.y}px, 0) rotate(${heart.rot}deg)`;

      const reachable = heart.y > fieldH - 112 && heart.y < fieldH - 26;
      if (reachable && Math.abs(heart.x + heart.size / 2 - basketX) < 56) {
        collectHeart(heart);
        continue;
      }

      if (heart.y > fieldH + 70) {
        heart.dead = true;
        heart.el.remove();
      }
    }

    hearts = hearts.filter((heart) => !heart.dead);
    rafId = requestAnimationFrame(loop);
  }

  function winGame() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    heroConfetti(70);
    chord();
    heartNote.textContent = "19 / 19. Officially nineteen. Legally unstoppable.";
    setTimeout(() => go("unbox"), 1250);
  }

  $("#startGameBtn").addEventListener("click", startGame);

  /* -------------------------------------------------------
     Level 03 · unboxing
     ------------------------------------------------------- */

  const giftbox = $("#giftbox");
  const unboxNote = $("#unboxNote");
  let unboxTaps = 0;
  let unboxDone = false;

  function sparkleBox() {
    for (let i = 0; i < 10; i += 1) {
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.style.left = "50%";
      spark.style.top = "50%";
      spark.style.setProperty("--sx", (Math.random() * 200 - 100) + "px");
      spark.style.setProperty("--sy", (Math.random() * 200 - 120) + "px");
      spark.style.background = ["#ffd68f", "#ffb3c6", "#fff4e9", "#c8a6ff"][(Math.random() * 4) | 0];
      giftbox.appendChild(spark);
      setTimeout(() => spark.remove(), 900);
    }
  }

  giftbox.addEventListener("click", () => {
    if (unboxDone) return;

    unboxTaps += 1;
    giftbox.classList.remove("shake");
    void giftbox.offsetWidth;
    giftbox.classList.add("shake");

    beep(300 + unboxTaps * 90, 0.08, "triangle", 0.04);
    buzz(12);
    sparkleBox();

    if (unboxTaps < 3) {
      unboxNote.textContent = "Tap count: " + unboxTaps + " / 3" + (unboxTaps === 1 ? " — again." : " — one more.");
      return;
    }

    unboxDone = true;
    unboxNote.textContent = "Opening…";
    giftbox.classList.add("open");
    giftbox.setAttribute("aria-label", "Gift opened");

    chord();
    buzz([14, 50, 14]);
    heroConfetti(130);

    setTimeout(() => go("reveal"), 1200);
  });

  /* -------------------------------------------------------
     Level 19 · reveal
     ------------------------------------------------------- */

  let revealStarted = false;

  function enterReveal() {
    if (revealStarted) return;
    revealStarted = true;

    $("#easterHeart").hidden = false;
    $("#year").textContent = String(new Date().getFullYear());

    buildFloatHearts();

    requestAnimationFrame(() => {
      initReasons();
      updateScrollRail();
    });

    confettiRain();
    setTimeout(() => heroConfetti(110), 420);
  }

  function buildFloatHearts() {
    const wrap = $("#floatHearts");
    if (wrap.childElementCount) return;

    for (let i = 0; i < 14; i += 1) {
      const heart = document.createElement("span");
      const size = 10 + Math.random() * 12;
      heart.style.left = Math.random() * 100 + "%";
      heart.style.width = size + "px";
      heart.style.height = size + "px";
      heart.style.animationDuration = 9 + Math.random() * 8 + "s";
      heart.style.animationDelay = -Math.random() * 12 + "s";
      wrap.appendChild(heart);
    }
  }

  /* -------------------------------------------------------
     Candles
     ------------------------------------------------------- */

  const CANDLE_COUNT = 19;
  const candlesWrap = $("#candles");
  let candlesOut = 0;
  let wishDone = false;

  function buildCandles() {
    if (candlesWrap.childElementCount) return;

    for (let i = 0; i < CANDLE_COUNT; i += 1) {
      const candle = document.createElement("button");
      candle.type = "button";
      candle.className = "candle";
      candle.style.height = 24 + Math.random() * 9 + "px";
      candle.innerHTML = '<span class="flame"></span>';
      candle.setAttribute("aria-label", "Blow out candle " + (i + 1));
      candle.addEventListener("click", () => blowCandle(candle));
      candlesWrap.appendChild(candle);
    }
  }

  function blowCandle(candle) {
    if (wishDone || candle.classList.contains("out")) return;

    candle.classList.add("out");
    candlesOut += 1;
    beep(300 + Math.random() * 90, 0.05, "triangle", 0.018);
    buzz(6);

    if (candlesOut >= CANDLE_COUNT) finishWish();
  }

  function finishWish() {
    if (wishDone) return;
    wishDone = true;

    $("#cake").classList.add("wished");
    $("#wishNote").textContent = "Wish locked in. No refunds, no take-backs.";
    $("#blowBtn").disabled = true;
    $("#blowBtn").textContent = "Wish secured";

    heroConfetti(80);
    chord();
    buzz([10, 40, 10]);
  }

  $("#blowBtn").addEventListener("click", () => {
    $$("#candles .candle").forEach((candle, index) => {
      setTimeout(() => blowCandle(candle), index * 55);
    });
  });

  /* -------------------------------------------------------
     19 reasons deck
     ------------------------------------------------------- */

  const reasons = [
    "You laugh at your own jokes before you finish them. Half of them are terrible. I laugh anyway.",
    "You make ordinary places look like album covers.",
    "You are dramatic about small things and weirdly calm about big ones.",
    "You remember the tiny things people tell you.",
    "You say “I’m fine” in a tone that has never fooled anyone.",
    "Your voice changes when you talk about something you love.",
    "You take 47 photos and still claim you are not photogenic.",
    "You defend your friends before you ask questions.",
    "You are the reason “one more song” exists.",
    "You will fight a waiter over the bill. Politely.",
    "You notice when someone is quiet.",
    "Your confidence arrives two minutes after you needed it, and it is hilarious.",
    "You make bad ideas sound like a group project.",
    "You are impossible to embarrass, which is unfair to the rest of us.",
    "You never let anyone stay sad alone.",
    "You have opinions about songs nobody else notices.",
    "You are the plot twist in every boring day.",
    "You grew up and stayed ridiculous at the same time.",
    "You make 19 feel like a beginning, not a number."
  ];

  const reasonCard = $("#reasonCard");
  const reasonNum = $("#reasonNum");
  const reasonText = $("#reasonText");
  const reasonCount = $("#reasonCount");
  const nextReason = $("#nextReason");

  let reasonOrder = [];
  let reasonPos = 0;
  let isFlipped = false;
  const seenReasons = new Set();

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function initReasons() {
    if (reasonOrder.length) return;
    reasonOrder = shuffle(Array.from(reasons.keys()));
    showReason(reasonOrder[0]);
  }

  function showReason(index) {
    reasonNum.textContent = String(index + 1).padStart(2, "0");
    reasonText.textContent = reasons[index];
  }

  reasonCard.addEventListener("click", () => {
    if (isFlipped) return;

    isFlipped = true;
    reasonCard.classList.add("flipped");
    reasonCard.setAttribute("aria-label", "Flip the card back to draw another");

    const index = reasonOrder[reasonPos];
    beep(620, 0.07, "sine", 0.035);
    buzz(8);

    if (!seenReasons.has(index)) {
      seenReasons.add(index);
      reasonCount.textContent = seenReasons.size + " / 19 seen";

      if (seenReasons.size === 19) {
        nextReason.textContent = "Deck complete";
        nextReason.disabled = true;
        setTimeout(() => {
          heroConfetti(70);
          toast("Nineteen reasons. You are welcome.");
        }, 500);
        return;
      }
    }

    nextReason.disabled = false;
  });

  nextReason.addEventListener("click", () => {
    if (!isFlipped) return;

    isFlipped = false;
    reasonCard.classList.remove("flipped");
    nextReason.disabled = true;
    reasonCard.setAttribute("aria-label", "Flip this card");

    setTimeout(() => {
      let guard = 0;
      do {
        reasonPos = (reasonPos + 1) % reasonOrder.length;
        guard += 1;
      } while (seenReasons.has(reasonOrder[reasonPos]) && guard < reasonOrder.length);

      showReason(reasonOrder[reasonPos]);
    }, 380);
  });

  /* -------------------------------------------------------
     Gallery + lightbox
     ------------------------------------------------------- */

  const photos = [
    { src: "assets/photos/01-mirror.jpg", cap: "The mirror did not stand a chance." },
    { src: "assets/photos/02-phone.jpg", cap: "9 out of 10 photos in your gallery are you. The tenth is also you." },
    { src: "assets/photos/03-courtyard.jpg", cap: "You walked in and the tree put its lights on. Show-off." },
    { src: "assets/photos/04-sunset.jpg", cap: "Golden hour showed up just to be in the same frame as you." },
    { src: "assets/photos/05-city.jpg", cap: "You: fixing your hair. The entire city: not even looking. Rude." },
    { src: "assets/photos/06-pizzeria.jpg", cap: "Even the neon learned how to spell “iconic”." },
    { src: "assets/photos/07-yellow.jpg", cap: "Main character. Side quest location. Same energy." },
    { src: "assets/photos/08-blue.jpg", cap: "The building wore yellow so you would stand out more. It worked." },
    { src: "assets/photos/09-pizzeria-stairs.jpg", cap: "Alphabet Pizzeria. You are the whole sentence." },
    { src: "assets/photos/10-saree.jpg", cap: "Nineteen years old and still refusing to admit the camera loves you." },
    { src: "assets/photos/11-childhood.jpg", cap: "Exhibit A: the original Sano Manche. Already iconic." },
    { src: "assets/photos/12-street.jpg", cap: "Street style: 10/10. Facial expression: “why are you taking a photo”." }
  ];

  const gallery = $("#gallery");

  photos.forEach((photo, index) => {
    const figure = document.createElement("figure");
    figure.innerHTML = `
      <img src="${photo.src}" alt="Sano Manche, photo ${index + 1}" loading="lazy">
      <figcaption>${photo.cap}</figcaption>
    `;
    figure.addEventListener("click", () => openLightbox(photo));
    gallery.appendChild(figure);
  });

  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxCap = $("#lightboxCap");

  function openLightbox(photo) {
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.cap;
    lightboxCap.textContent = photo.cap;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    beep(620, 0.06, "sine", 0.03);
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    document.body.style.overflow = "";
  }

  $("#lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  /* -------------------------------------------------------
     Video — only appears if a real file exists
     ------------------------------------------------------- */

  const video = $("#bdayVideo");
  const videoWrap = $("#videoWrap");

  video.addEventListener("loadedmetadata", () => {
    videoWrap.hidden = false;
  });
  video.addEventListener("error", () => {
    videoWrap.hidden = true;
  });

  /* -------------------------------------------------------
     Secret, modal, easter eggs
     ------------------------------------------------------- */

  const modal = $("#modal");
  let modalReturnFocus = null;

  function openModal(title, text, eyebrow) {
    $("#modalEyebrow").textContent = eyebrow || "Secret";
    $("#modalTitle").textContent = title;
    $("#modalText").textContent = text;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modalReturnFocus = document.activeElement;
    $("#modalOk").focus();
    beep(700, 0.1, "sine", 0.04);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
      modalReturnFocus.focus();
    }
  }

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOk").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!modal.hidden) closeModal();
    if (!lightbox.hidden) closeLightbox();
  });

  $("#secretBtn").addEventListener("click", () => {
    const text = $("#secretText");
    text.textContent =
      "I am not saying you are my favorite person. I am saying I built an entire website and made you fight a vault for it. Read between the lines, Sano Manche.";
    text.classList.add("show");
    $("#secretBtn").disabled = true;
    $("#secretBtn").textContent = "Message delivered.";
    heroConfetti(70);
    chord();
  });

  const eggLines = [
    "You were the plot twist.",
    "This website is a lot of code. Most of it is about you.",
    "You are allowed to screenshot this and act surprised.",
    "If you are reading this twice, that means something.",
    "Fine. You are my favorite. Do not tell anyone."
  ];

  let heartTaps = 0;

  $("#easterHeart").addEventListener("click", () => {
    heartTaps += 1;
    beep(680 + heartTaps * 30, 0.06, "sine", 0.03);

    if (heartTaps < 5) {
      toast(eggLines[(heartTaps - 1) % eggLines.length]);
      return;
    }

    heartTaps = 0;
    heroConfetti(60);
    openModal(
      "You found the hidden heart.",
      "There is no deeper secret. Only this: you are my favorite person to be ridiculous with. Do not make it weird. (Fine — make it a little weird.)",
      "Easter egg"
    );
  });

  $("#doNotPress").addEventListener("click", () => {
    heroConfetti(30);
    openModal(
      "You pressed it.",
      "I said do not press. You pressed immediately. This is exactly why we are friends, Sano Manche.",
      "Told you"
    );
  });

  $("#replayBtn").addEventListener("click", () => window.location.reload());

  /* -------------------------------------------------------
     Scroll progress + scroll-in sections
     ------------------------------------------------------- */

  const scrollFill = $("#scrollFill");

  function updateScrollRail() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    scrollFill.style.transform = "scaleX(" + progress + ")";
  }

  window.addEventListener("scroll", updateScrollRail, { passive: true });
  window.addEventListener("resize", updateScrollRail);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    $$(".fade-on-scroll").forEach((el) => observer.observe(el));
  } else {
    $$(".fade-on-scroll").forEach((el) => el.classList.add("in"));
  }

  /* -------------------------------------------------------
     Confetti
     ------------------------------------------------------- */

  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const CONF_COLORS = ["#ffd68f", "#ffb3c6", "#ff5f87", "#c8a6ff", "#9fe8d2", "#fff4e9"];

  let particles = [];
  let confettiRaf = null;

  function sizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  function makeParticle(x, y, spread, upward) {
    const roll = Math.random();
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * spread,
      vy: upward ? -Math.random() * 500 - 120 : 70 + Math.random() * 130,
      size: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 12,
      color: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0],
      life: 0,
      ttl: 4 + Math.random() * 2.4,
      shape: roll < 0.16 ? "heart" : roll < 0.34 ? "circle" : "rect"
    };
  }

  function heroConfetti(count) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.3;
    for (let i = 0; i < count; i += 1) {
      particles.push(makeParticle(cx, cy, 540, true));
    }
    startConfetti();
  }

  function confettiRain() {
    let ticks = 0;
    const timer = setInterval(() => {
      for (let i = 0; i < 9; i += 1) {
        particles.push(makeParticle(Math.random() * window.innerWidth, -20, 140, false));
      }
      startConfetti();
      ticks += 1;
      if (ticks > 7) clearInterval(timer);
    }, 230);
  }

  function drawParticle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;

    const s = p.size;
    if (p.shape === "heart") {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.38);
      ctx.bezierCurveTo(-s * 0.62, -s * 0.16, -s * 0.36, -s * 0.8, 0, -s * 0.36);
      ctx.bezierCurveTo(s * 0.36, -s * 0.8, s * 0.62, -s * 0.16, 0, s * 0.38);
      ctx.fill();
    } else if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-s / 2, -s * 0.7, s, s * 1.4);
    }

    ctx.restore();
  }

  function startConfetti() {
    if (confettiRaf) return;

    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles = particles.filter((p) => {
        p.life += dt;
        p.vy += 640 * dt;
        p.vx *= 0.995;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        if (p.life > p.ttl || p.y > window.innerHeight + 60) return false;

        ctx.globalAlpha = Math.max(0, Math.min(1, (p.ttl - p.life) / 0.8));
        drawParticle(p);
        return true;
      });

      ctx.globalAlpha = 1;

      if (particles.length) {
        confettiRaf = requestAnimationFrame(tick);
      } else {
        confettiRaf = null;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    confettiRaf = requestAnimationFrame(tick);
  }

  /* -------------------------------------------------------
     Sound toggle + init
     ------------------------------------------------------- */

  const soundBtn = $("#soundBtn");

  soundBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    soundBtn.setAttribute("aria-pressed", String(!state.muted));
    soundBtn.setAttribute("aria-label", state.muted ? "Turn sound on" : "Turn sound off");
    if (!state.muted) beep(660, 0.08, "sine", 0.04);
  });

  document.body.dataset.screen = "boot";
  $("#year").textContent = String(new Date().getFullYear());

  buildCandles();
  runBoot();
})();

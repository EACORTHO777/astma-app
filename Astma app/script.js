import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const MAX_PUFFS = 120;
const WARNING_LIMIT = 10;

// 🔹 Firebase-config
const configResponse = await fetch("./config.json");
const configData = await configResponse.json();
const firebaseConfig = configData.firebase;

// 🔥 Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔹 Datum (YYYY-MM-DD)
const today = new Date().toISOString().split("T")[0];

// 🔹 Databas-referenser
const blueRef = ref(db, "apps/astmaApp/inhalers/blue");
const orangeRef = ref(db, "apps/astmaApp/inhalers/orange");

const blueTodayRef = ref(db, `apps/astmaApp/logs/blue/${today}`);
const orangeTodayRef = ref(db, `apps/astmaApp/logs/orange/${today}`);

// 🔹 UI-element
const blueCountEl = document.getElementById("blueCount");
const orangeCountEl = document.getElementById("orangeCount");

const blueWarningEl = document.getElementById("blueWarning");
const orangeWarningEl = document.getElementById("orangeWarning");

const blueTodayEl = document.getElementById("blueToday");
const orangeTodayEl = document.getElementById("orangeToday");

const blueMinus = document.getElementById("blueMinus");
const bluePlus = document.getElementById("bluePlus");
const blueReset = document.getElementById("blueResetBtn");

const orangeMinus = document.getElementById("orangeMinus");
const orangePlus = document.getElementById("orangePlus");
const orangeReset = document.getElementById("orangeResetBtn");

// 🔹 Säkerställ startvärden
async function ensureInitial(ref, value) {
  const snap = await get(ref);
  if (snap.val() === null) {
    await set(ref, value);
  }
}

await ensureInitial(blueRef, MAX_PUFFS);
await ensureInitial(orangeRef, MAX_PUFFS);
await ensureInitial(blueTodayRef, 0);
await ensureInitial(orangeTodayRef, 0);

// 🔄 UI-uppdatering
function updateUI(count, countEl, warningEl) {
  countEl.innerText = count;

  if (count === 0) {
    warningEl.innerText = "❌ Slut – byt inhalator NU";
  } else if (count <= WARNING_LIMIT) {
    warningEl.innerText = "⚠️ Dags att köpa ny inhalator";
  } else {
    warningEl.innerText = "";
  }
}

// 🔄 Live-sync puffar kvar
onValue(blueRef, (snap) => {
  updateUI(snap.val() ?? 0, blueCountEl, blueWarningEl);
});

onValue(orangeRef, (snap) => {
  updateUI(snap.val() ?? 0, orangeCountEl, orangeWarningEl);
});

// 🔄 Live-sync dagens puffar
onValue(blueTodayRef, (snap) => {
  blueTodayEl.innerText = `Idag: ${snap.val() ?? 0} puffar`;
});

onValue(orangeTodayRef, (snap) => {
  orangeTodayEl.innerText = `Idag: ${snap.val() ?? 0} puffar`;
});

// ➖ Minus = ta puff + logga idag
function takePuff(inhalerRef, todayRef) {
  runTransaction(inhalerRef, (current) => {
    if (current > 0) return current - 1;
    return current;
  });

  runTransaction(todayRef, (current) => {
    return (current ?? 0) + 1;
  });
}

blueMinus.addEventListener("click", () => {
  takePuff(blueRef, blueTodayRef);
});

orangeMinus.addEventListener("click", () => {
  takePuff(orangeRef, orangeTodayRef);
});

// ➕ Plus = korrigera (påverkar INTE idag)
function addBack(inhalerRef) {
  runTransaction(inhalerRef, (current) => {
    if (current < MAX_PUFFS) return current + 1;
    return current;
  });
}

bluePlus.addEventListener("click", () => {
  addBack(blueRef);
});

orangePlus.addEventListener("click", () => {
  addBack(orangeRef);
});

// 🔁 Ny inhalator = reset
blueReset.addEventListener("click", () => {
  if (confirm("Är du säker på att du vill byta inhalator?")) {
    set(blueRef, MAX_PUFFS);
    set(blueTodayRef, 0);
  }
});

orangeReset.addEventListener("click", () => {
  if (confirm("Är du säker på att du vill byta inhalator?")) {
    set(orangeRef, MAX_PUFFS);
    set(orangeTodayRef, 0);
  }
});
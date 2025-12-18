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

// 🔹 Datum-hjälpare
function getDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

const today = getDate(0);

// 🔹 Databas-referenser
const blueRef = ref(db, "apps/astmaApp/inhalers/blue");
const orangeRef = ref(db, "apps/astmaApp/inhalers/orange");

const blueLogsRef = ref(db, "apps/astmaApp/logs/blue");
const orangeLogsRef = ref(db, "apps/astmaApp/logs/orange");

// 🔹 UI-element
const blueCountEl = document.getElementById("blueCount");
const orangeCountEl = document.getElementById("orangeCount");

const blueWarningEl = document.getElementById("blueWarning");
const orangeWarningEl = document.getElementById("orangeWarning");

const blueTodayEl = document.getElementById("blueToday");
const orangeTodayEl = document.getElementById("orangeToday");

const blueHistoryEl = document.getElementById("blueHistory");
const orangeHistoryEl = document.getElementById("orangeHistory");

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

// 🔄 UI – puffar kvar
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

onValue(blueRef, (snap) => {
  updateUI(snap.val() ?? 0, blueCountEl, blueWarningEl);
});

onValue(orangeRef, (snap) => {
  updateUI(snap.val() ?? 0, orangeCountEl, orangeWarningEl);
});

// 🔄 Dagssummering + historik
function updateHistory(logs, todayEl, historyEl) {
  let todayCount = logs?.[today] ?? 0;
  todayEl.innerText = `Idag: ${todayCount} puffar`;

  let total7 = 0;
  let rows = [];

  for (let i = 0; i < 7; i++) {
    const date = getDate(-i);
    const count = logs?.[date] ?? 0;
    total7 += count;

    if (i === 1) {
      rows.push(`Igår: ${count} puffar`);
    }
  }

  rows.push(`Senaste 7 dagar: ${total7} puffar`);
  historyEl.innerText = rows.join(" · ");
}

onValue(blueLogsRef, (snap) => {
  updateHistory(snap.val(), blueTodayEl, blueHistoryEl);
});

onValue(orangeLogsRef, (snap) => {
  updateHistory(snap.val(), orangeTodayEl, orangeHistoryEl);
});

// ➖ Minus = ta puff + logga
function takePuff(inhalerRef, logsRef) {
  const todayRef = ref(db, `${logsRef.key}/${today}`);

  runTransaction(inhalerRef, (current) => {
    if (current > 0) return current - 1;
    return current;
  });

  runTransaction(todayRef, (current) => {
    return (current ?? 0) + 1;
  });
}

blueMinus.addEventListener("click", () => {
  takePuff(blueRef, blueLogsRef);
});

orangeMinus.addEventListener("click", () => {
  takePuff(orangeRef, orangeLogsRef);
});

// ➕ Plus = korrigera
function addBack(inhalerRef) {
  runTransaction(inhalerRef, (current) => {
    if (current < MAX_PUFFS) return current + 1;
    return current;
  });
}

bluePlus.addEventListener("click", () => addBack(blueRef));
orangePlus.addEventListener("click", () => addBack(orangeRef));

// 🔁 Ny inhalator
blueReset.addEventListener("click", () => {
  if (confirm("Är du säker på att du vill byta inhalator?")) {
    set(blueRef, MAX_PUFFS);
  }
});

orangeReset.addEventListener("click", () => {
  if (confirm("Är du säker på att du vill byta inhalator?")) {
    set(orangeRef, MAX_PUFFS);
  }
});
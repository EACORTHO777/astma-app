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

// 🔹 Datum helpers
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
const blueCard = document.querySelector(".card.blue");
const orangeCard = document.querySelector(".card.orange");

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

// 🔹 Initiera värden
async function ensureInitial(ref, value) {
  const snap = await get(ref);
  if (snap.val() === null) await set(ref, value);
}

await ensureInitial(blueRef, MAX_PUFFS);
await ensureInitial(orangeRef, MAX_PUFFS);

// 🔄 Puff-animation
function puffFeedback(el) {
  el.classList.remove("puff");
  void el.offsetWidth;
  el.classList.add("puff");
}

// 🔄 Uppdatera UI + varningsfärger
function updateUI(count, countEl, warningEl, cardEl) {
  countEl.innerText = count;

  cardEl.classList.remove("warning", "critical");

  if (count === 0) {
    warningEl.innerText = "❌ Slut – byt inhalator NU";
    cardEl.classList.add("critical");
  } else if (count <= WARNING_LIMIT) {
    warningEl.innerText = "⚠️ Dags att köpa ny inhalator";
    cardEl.classList.add("warning");
  } else {
    warningEl.innerText = "";
  }
}

// 🔄 Live-sync puffar kvar
onValue(blueRef, snap => {
  updateUI(snap.val() ?? 0, blueCountEl, blueWarningEl, blueCard);
});

onValue(orangeRef, snap => {
  updateUI(snap.val() ?? 0, orangeCountEl, orangeWarningEl, orangeCard);
});

// 🔄 Dagssummering + historik
function updateHistory(logs, todayEl, historyEl) {
  const todayCount = logs?.[today] ?? 0;
  todayEl.innerText = `Idag: ${todayCount} doser`;

  let total7 = 0;
  let yesterday = logs?.[getDate(-1)] ?? 0;

  for (let i = 0; i < 7; i++) {
    total7 += logs?.[getDate(-i)] ?? 0;
  }

  historyEl.innerText =
    `Igår: ${yesterday} doser · Senaste 7 dagar: ${total7} doser`;
}

onValue(blueLogsRef, snap => {
  updateHistory(snap.val(), blueTodayEl, blueHistoryEl);
});

onValue(orangeLogsRef, snap => {
  updateHistory(snap.val(), orangeTodayEl, orangeHistoryEl);
});

// ➖ Ta puff + logga
function takePuff(inhalerRef, logsRef, countEl) {
  const todayRef = ref(db, `${logsRef.key}/${today}`);

  puffFeedback(countEl);

  runTransaction(inhalerRef, current =>
    current > 0 ? current - 1 : current
  );

  runTransaction(todayRef, current =>
    (current ?? 0) + 1
  );
}

blueMinus.addEventListener("click", () =>
  takePuff(blueRef, blueLogsRef, blueCountEl)
);

orangeMinus.addEventListener("click", () =>
  takePuff(orangeRef, orangeLogsRef, orangeCountEl)
);

// ➕ Lägg tillbaka puff (korrigering)
function addBack(inhalerRef) {
  runTransaction(inhalerRef, current =>
    current < MAX_PUFFS ? current + 1 : current
  );
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
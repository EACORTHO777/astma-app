import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const WARNING_LIMIT = 10;
const MAX_PUFFS = 120;

// 🔹 Hämta Firebase-config
const configResponse = await fetch("./config.json");
const configData = await configResponse.json();
const firebaseConfig = configData.firebase;

// 🔥 Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔹 Databas-referenser
const blueRef = ref(db, "apps/astmaApp/inhalers/blue");
const orangeRef = ref(db, "apps/astmaApp/inhalers/orange");

// 🔹 UI-element
const blueCountEl = document.getElementById("blueCount");
const orangeCountEl = document.getElementById("orangeCount");
const blueWarningEl = document.getElementById("blueWarning");
const orangeWarningEl = document.getElementById("orangeWarning");

const blueBtn = document.getElementById("blueBtn");
const orangeBtn = document.getElementById("orangeBtn");

const blueResetBtn = document.getElementById("blueResetBtn");
const orangeResetBtn = document.getElementById("orangeResetBtn");

// 🔹 Säkerställ startvärde
async function ensureInitialValue(ref) {
  const snap = await get(ref);
  if (snap.val() === null) {
    await set(ref, MAX_PUFFS);
  }
}

await ensureInitialValue(blueRef);
await ensureInitialValue(orangeRef);

// 🔄 Uppdatera UI
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

// 🔄 Live-sync
onValue(blueRef, (snapshot) => {
  updateUI(snapshot.val() ?? 0, blueCountEl, blueWarningEl);
});

onValue(orangeRef, (snapshot) => {
  updateUI(snapshot.val() ?? 0, orangeCountEl, orangeWarningEl);
});

// ➖ Ta puff (race-safe)
blueBtn.addEventListener("click", () => {
  runTransaction(blueRef, (current) => {
    if (current > 0) return current - 1;
    return current;
  });
});

orangeBtn.addEventListener("click", () => {
  runTransaction(orangeRef, (current) => {
    if (current > 0) return current - 1;
    return current;
  });
});

// 🔁 Ny inhalator (reset till 120)
blueResetBtn.addEventListener("click", () => {
  set(blueRef, MAX_PUFFS);
});

orangeResetBtn.addEventListener("click", () => {
  set(orangeRef, MAX_PUFFS);
});

const blueMinus = document.getElementById("blueMinus");
const bluePlus = document.getElementById("bluePlus");
const orangeMinus = document.getElementById("orangeMinus");
const orangePlus = document.getElementById("orangePlus");

blueMinus.addEventListener("click", () => {
  runTransaction(blueRef, (current) => {
    if (current > 0) return current - 1;
    return current;
  });
});

orangeMinus.addEventListener("click", () => {
  runTransaction(orangeRef, (current) => {
    if (current > 0) return current - 1;
    return current;
  });
});

bluePlus.addEventListener("click", () => {
  runTransaction(blueRef, (current) => {
    if (current < MAX_PUFFS) return current + 1;
    return current;
  });
});

orangePlus.addEventListener("click", () => {
  runTransaction(orangeRef, (current) => {
    if (current < MAX_PUFFS) return current + 1;
    return current;
  });
});

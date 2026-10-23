import { COUPLE, PHOTOS, RELATIONS } from "./config.js";
import { $, esc, fmtDate, toast, renderFooter, renderQR, QR_TEXT, photoUrl } from "./common.js";
import {
  db, ensureGuest, collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp
} from "./firebase.js";

/* ---------- Textes fixes ---------- */
$("#full-names").textContent = `${COUPLE.groomFull} & ${COUPLE.brideFull}`;
$("#wed-date").textContent = COUPLE.dateLabel;
$("#welcome").textContent = COUPLE.welcome;
$("#qr-text").textContent = QR_TEXT;
$("#relations").innerHTML = RELATIONS.map((r) => `<option value="${esc(r)}">`).join("");
renderFooter();
renderQR("#qr", 168);

/* ---------- Carrousel ---------- */
(function carousel() {
  const frame = $("#frame"), dots = $("#dots"), cap = $("#caption");
  let cur = 0, timer = null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  frame.innerHTML = PHOTOS.map((p, i) => `
    <figure class="slide ${i === 0 ? "on" : ""}" aria-hidden="${i !== 0}">
      <img class="bg" src="${photoUrl(p.file)}" alt="" ${i > 1 ? 'loading="lazy"' : ""}>
      <img class="fg" src="${photoUrl(p.file)}" alt="${esc(p.caption)}" ${i > 1 ? 'loading="lazy"' : ""}>
    </figure>`).join("");
  dots.innerHTML = PHOTOS.map((p, i) => `<button type="button" aria-label="Photo ${i + 1} : ${esc(p.caption)}"></button>`).join("");
  const slides = [...frame.children], dotBtns = [...dots.children];

  function go(n) {
    cur = (n + PHOTOS.length) % PHOTOS.length;
    slides.forEach((s, i) => { s.classList.toggle("on", i === cur); s.setAttribute("aria-hidden", i !== cur); });
    dotBtns.forEach((d, i) => d.setAttribute("aria-current", i === cur));
    cap.textContent = PHOTOS[cur].caption;
  }
  const start = () => { if (!reduce) { stop(); timer = setInterval(() => go(cur + 1), 5000); } };
  const stop = () => clearInterval(timer);

  $("#prev").onclick = () => { go(cur - 1); start(); };
  $("#next").onclick = () => { go(cur + 1); start(); };
  dotBtns.forEach((d, i) => d.onclick = () => { go(i); start(); });
  frame.addEventListener("mouseenter", stop);
  frame.addEventListener("mouseleave", start);

  // Balayage tactile
  let x0 = null;
  frame.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  frame.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); start(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input,textarea")) return;
    if (e.key === "ArrowLeft") go(cur - 1);
    if (e.key === "ArrowRight") go(cur + 1);
  });
  go(0); start();
})();

/* ---------- Compteur de caractères ---------- */
const msgBox = $("#f-msg");
msgBox.addEventListener("input", () => { $("#count").textContent = `${msgBox.value.length} / 1500`; });

/* ---------- Firestore ---------- */
let user = null;
const col = collection(db, "messages");

const card = (m, { mine = false } = {}) => {
  const badge = { pending: ["b-pending", "En attente de validation"], approved: ["b-approved", "Publié"], rejected: ["b-rejected", "Non retenu"] }[m.status] || ["", ""];
  return `
  <article class="msg" data-id="${esc(m.id)}">
    ${mine ? `<span class="badge ${badge[0]}">${badge[1]}</span><br><br>` : ""}
    <p>${esc(m.message)}</p>
    <footer><span class="who">${esc(m.name)}</span><span>${esc(m.relation)}${m.createdAt ? " · " + fmtDate(m.createdAt) : ""}</span></footer>
    ${mine ? `<div class="row-actions">
      <button class="btn btn-ghost btn-sm" data-act="edit">Modifier</button>
      <button class="btn btn-danger btn-sm" data-act="del">Supprimer</button></div>` : ""}
  </article>`;
};
const byDateDesc = (a, b) => (b.createdAt?.seconds ?? 9e12) - (a.createdAt?.seconds ?? 9e12);

let approved = [], mine = [];

function drawWall() {
  const q = $("#search").value.trim().toLowerCase();
  const list = approved.filter((m) => !q || String(m.name).toLowerCase().includes(q));
  $("#wall").innerHTML = list.length
    ? list.map((m) => card(m)).join("")
    : `<div class="empty">${approved.length ? "Aucun message à ce nom." : "Les premiers messages apparaîtront ici dès qu'ils seront validés."}</div>`;
}
function drawMine() {
  $("#mine-sec").hidden = mine.length === 0;
  $("#mine").innerHTML = mine.map((m) => card(m, { mine: true })).join("");
}
$("#search").addEventListener("input", drawWall);

async function start() {
  try {
    user = await ensureGuest();
  } catch (e) {
    console.error(e);
    toast("Connexion impossible. Vérifiez que l'authentification anonyme est activée dans Firebase.", "err", 9000);
    $("#wall").innerHTML = `<div class="empty">Connexion impossible (${esc(e.code || e.message)}).</div>`;
    return;
  }

  // Messages approuvés : uniquement ceux confirmés par le serveur
  onSnapshot(query(col, where("status", "==", "approved")), { includeMetadataChanges: true }, (snap) => {
    approved = snap.docs.filter((d) => !d.metadata.hasPendingWrites)
      .map((d) => ({ id: d.id, ...d.data() })).sort(byDateDesc);
    drawWall();
  }, (e) => {
    console.error(e);
    $("#wall").innerHTML = `<div class="empty">Impossible de charger les messages (${esc(e.code || e.message)}).</div>`;
  });

  // Mes messages (écrits depuis cet appareil)
  onSnapshot(query(col, where("ownerUid", "==", user.uid)), { includeMetadataChanges: true }, (snap) => {
    mine = snap.docs.filter((d) => !d.metadata.hasPendingWrites)
      .map((d) => ({ id: d.id, ...d.data() })).sort(byDateDesc);
    drawMine();
  }, (e) => console.error(e));
}
start();

/* ---------- Envoi ---------- */
$("#form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if ($("#f-hp").value) return;                       // anti-robot
  const name = $("#f-name").value.trim(), relation = $("#f-rel").value.trim(), message = $("#f-msg").value.trim();
  if (!name || !relation || !message) { toast("Merci de remplir le nom, le lien et le message.", "err"); return; }
  const last = +localStorage.getItem("lastSend") || 0;
  if (Date.now() - last < 15000) { toast("Un instant avant d'envoyer un autre message.", "err"); return; }
  if (!user) { toast("Connexion en cours, réessayez dans un instant.", "err"); return; }

  const btn = $("#send"); btn.disabled = true; btn.textContent = "Envoi…";
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), 15000));
    await Promise.race([
      addDoc(col, { name, relation, message, status: "pending", ownerUid: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
      timeout
    ]);
    localStorage.setItem("lastSend", Date.now());
    ev.target.reset(); $("#count").textContent = "0 / 1500";
    toast("Merci ! Votre message a bien été envoyé. Il sera publié dès qu'il aura été validé par les mariés.");
    $("#mine-sec").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    console.error(e);
    toast(e.code === "timeout"
      ? "Pas de réponse du serveur. Vérifiez votre connexion et réessayez."
      : "Le message n'a pas pu être envoyé (" + (e.code || e.message) + ").", "err", 8000);
  } finally { btn.disabled = false; btn.textContent = "Envoyer mon message"; }
});

/* ---------- Modifier / supprimer ---------- */
const dlg = $("#dlg"); let editId = null;
$("#mine").addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, m = mine.find((x) => x.id === id);
  if (b.dataset.act === "edit") {
    editId = id; $("#e-name").value = m.name; $("#e-rel").value = m.relation; $("#e-msg").value = m.message; dlg.showModal();
  } else if (confirm("Supprimer définitivement ce message ?")) {
    try { await deleteDoc(doc(db, "messages", id)); toast("Message supprimé."); }
    catch (e) { console.error(e); toast("Suppression impossible.", "err"); }
  }
});
$("#e-cancel").onclick = () => dlg.close();
$("#edit-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    await updateDoc(doc(db, "messages", editId), {
      name: $("#e-name").value.trim(), relation: $("#e-rel").value.trim(), message: $("#e-msg").value.trim(),
      status: "pending", updatedAt: serverTimestamp()
    });
    dlg.close();
    toast("Message modifié. Il sera de nouveau publié après validation.");
  } catch (e) { console.error(e); toast("Modification impossible.", "err"); }
});

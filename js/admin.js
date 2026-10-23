import { $, esc, fmtDate, renderFooter } from "./common.js";
import {
  db, auth, isAdmin, collection, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
  query, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "./firebase.js";

renderFooter();
let all = [], filter = "pending", unsub = null, editId = null, statusTimer = null;
const LABELS = { pending: "En attente", approved: "Approuvés", rejected: "Refusés", all: "Tous" };
const STATUS = { pending: ["b-pending", "En attente"], approved: ["b-approved", "Publié"], rejected: ["b-rejected", "Refusé"] };

/* ---------- Bandeau d'état en haut de l'écran (toujours visible, même sur iPhone) ---------- */
function flash(text, kind = "ok", ms = 4000) {
  const el = $("#status");
  if (!el) return;
  clearTimeout(statusTimer);
  el.hidden = false;
  el.textContent = text;
  el.style.background = kind === "ok" ? "#17603a" : kind === "wait" ? "#223259" : "#9a1c33";
  el.style.color = "#fff";
  if (ms) statusTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), ms))]);
}

/* ---------- Message sous le formulaire de connexion ---------- */
function setMsg(text, kind = "err") {
  const el = $("#login-msg");
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || "";
  el.style.background = kind === "ok" ? "#d9f1e3" : "#fbe0e3";
  el.style.color = kind === "ok" ? "#17603a" : "#7a1527";
}

const ERRORS = {
  "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
  "auth/wrong-password": "Mot de passe incorrect.",
  "auth/user-not-found": "Aucun compte avec cet e-mail dans Firebase Authentication.",
  "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/too-many-requests": "Trop d'essais. Attendez quelques minutes.",
  "auth/operation-not-allowed": "La méthode « E-mail/Mot de passe » est désactivée dans Firebase → Authentication → Méthode de connexion.",
  "auth/unauthorized-domain": "Domaine non autorisé : ajoutez livre-or-idriss-michou.vercel.app dans Authentication → Paramètres → Domaines autorisés.",
  "auth/network-request-failed": "Problème de réseau. Vérifiez votre connexion."
};

function show(v) {
  $("#loading").hidden = true;
  $("#login-view").hidden = v !== "login";
  $("#dash-view").hidden = v !== "dash";
}

/* ---------- Session ---------- */
onAuthStateChanged(auth, async (user) => {
  if (unsub) { unsub(); unsub = null; }
  if (!user || user.isAnonymous) { show("login"); return; }
  if (!(await isAdmin(user))) {
    show("login");
    setMsg(`Le compte ${user.email || "(sans e-mail)"} n'est pas l'administrateur de ce livre d'or.`);
    await signOut(auth);
    return;
  }
  show("dash");
  unsub = onSnapshot(query(collection(db, "messages")), (snap) => {
    all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 9e12) - (a.createdAt?.seconds ?? 9e12));
    $("#dash-msg").hidden = true;
    draw();
  }, (e) => {
    console.error(e);
    const m = $("#dash-msg");
    m.hidden = false;
    m.textContent = e.code === "permission-denied"
      ? "Lecture refusée par Firestore : vérifiez que les règles sont publiées et que l'e-mail admin est le bon."
      : "Erreur de lecture : " + (e.code || e.message);
  });
});

/* ---------- Connexion ---------- */
$("#login-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const b = $("#login-btn"); b.disabled = true;
  setMsg("Connexion en cours… patientez (le réseau peut être lent).", "ok");
  try {
    await withTimeout(signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#pw").value), 40000);
    setMsg("Connecté ✓ chargement…", "ok");
  } catch (e) {
    console.error(e);
    setMsg(e.code === "timeout"
      ? "Le réseau est très lent. Réessayez dans un instant."
      : (ERRORS[e.code] || `Erreur : ${e.code || e.message}`));
  } finally { b.disabled = false; }
});
$("#logout").addEventListener("click", () => signOut(auth));

/* ---------- Affichage ---------- */
function draw() {
  const count = (s) => s === "all" ? all.length : all.filter((m) => m.status === s).length;
  $("#tabs").innerHTML = Object.keys(LABELS).map((k) =>
    `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${LABELS[k]}<span class="n">${count(k)}</span></button>`).join("");
  const list = filter === "all" ? all : all.filter((m) => m.status === filter);
  $("#list").innerHTML = list.length ? list.map(item).join("") : `<div class="empty">Aucun message dans cette catégorie.</div>`;
}

function item(m) {
  const [cls, label] = STATUS[m.status] || ["", m.status];
  return `<article class="msg" data-id="${esc(m.id)}">
    <div class="meta"><span class="badge ${cls}">${label}</span><span class="who">${esc(m.name)}</span>
      <span class="hint">${esc(m.relation)} · ${fmtDate(m.createdAt)}</span></div>
    <p>${esc(m.message)}</p>
    <div class="row-actions">
      ${m.status !== "approved" ? `<button type="button" class="btn btn-ok btn-sm" data-act="approved">Accepter</button>` : ""}
      ${m.status !== "rejected" ? `<button type="button" class="btn btn-ghost btn-sm" data-act="rejected">Refuser</button>` : ""}
      <button type="button" class="btn btn-ghost btn-sm" data-act="edit">Modifier</button>
      <button type="button" class="btn btn-danger btn-sm" data-act="del">Supprimer</button>
    </div></article>`;
}

/* ---------- Onglets ---------- */
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (b) { filter = b.dataset.f; draw(); }
});

/* ---------- Actions : Accepter / Refuser / Modifier / Supprimer ---------- */
$("#list").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, m = all.find((x) => x.id === id), act = b.dataset.act;
  if (!m) return;

  if (act === "edit") {
    editId = id; $("#e-name").value = m.name; $("#e-rel").value = m.relation; $("#e-msg").value = m.message;
    $("#dlg").showModal();
    return;
  }
  if (act === "del" && !confirm("Supprimer définitivement ce message ?")) return;

  b.disabled = true;
  flash("Action en cours…", "wait", 0);
  try {
    if (act === "approved" || act === "rejected") {
      await withTimeout(updateDoc(doc(db, "messages", id), { status: act, updatedAt: serverTimestamp() }), 15000);
      flash(act === "approved" ? "✓ Message approuvé : il est maintenant public." : "✓ Message refusé.");
    } else if (act === "del") {
      await withTimeout(deleteDoc(doc(db, "messages", id)), 15000);
      flash("✓ Message supprimé.");
    }
  } catch (err) {
    console.error(err);
    flash(err.code === "timeout"
      ? "Pas de réponse du serveur. Vérifiez la connexion puis réessayez."
      : err.code === "permission-denied"
        ? "Refusé par Firestore : l'e-mail admin des règles doit être exactement gabbyumba344@gmail.com (règles publiées ?)."
        : "Échec : " + (err.code || err.message), "err", 9000);
    b.disabled = false;
  }
});

/* ---------- Modification ---------- */
$("#e-cancel").addEventListener("click", () => $("#dlg").close());
$("#edit-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  flash("Enregistrement…", "wait", 0);
  try {
    await withTimeout(updateDoc(doc(db, "messages", editId), {
      name: $("#e-name").value.trim(), relation: $("#e-rel").value.trim(),
      message: $("#e-msg").value.trim(), updatedAt: serverTimestamp()
    }), 15000);
    $("#dlg").close();
    flash("✓ Message modifié.");
  } catch (err) {
    console.error(err);
    flash(err.code === "timeout" ? "Pas de réponse du serveur." : "Modification impossible : " + (err.code || err.message), "err", 9000);
  }
});

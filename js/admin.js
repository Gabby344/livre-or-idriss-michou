import { $, esc, fmtDate, toast, renderFooter } from "./common.js";
import {
  db, auth, isAdmin, collection, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
  query, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "./firebase.js";

renderFooter();
let all = [], filter = "pending", unsub = null, editId = null;
const LABELS = { pending: "En attente", approved: "Approuvés", rejected: "Refusés", all: "Tous" };
const STATUS = { pending: ["b-pending", "En attente"], approved: ["b-approved", "Publié"], rejected: ["b-rejected", "Refusé"] };

/* Message affiché dans la page (visible aussi sur téléphone) */
function setMsg(text, kind = "err") {
  const el = $("#login-msg");
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
  "auth/unauthorized-domain": "Domaine non autorisé : ajoutez gabby344.github.io dans Authentication → Paramètres → Domaines autorisés.",
  "auth/network-request-failed": "Problème de réseau. Vérifiez votre connexion."
};

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
      ? "Lecture refusée par Firestore : publiez le fichier firestore.rules (onglet Règles → Publier)."
      : "Erreur de lecture : " + (e.code || e.message);
  });
});

function show(v) {
  $("#login-view").hidden = v !== "login";
  $("#dash-view").hidden = v !== "dash";
}

$("#login-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const b = $("#login-btn"); b.disabled = true;
  setMsg("Connexion en cours…", "ok");
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), 15000));
    await Promise.race([signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#pw").value), timeout]);
    setMsg("Connecté ✓ chargement…", "ok");
  } catch (e) {
    console.error(e);
    setMsg(e.code === "timeout"
      ? "Pas de réponse de Firebase (réseau lent ou domaine non autorisé). Réessayez."
      : (ERRORS[e.code] || `Erreur : ${e.code || e.message}`));
  } finally { b.disabled = false; }
});
$("#logout").onclick = () => signOut(auth);

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
      ${m.status !== "approved" ? `<button class="btn btn-ok btn-sm" data-act="approved">Accepter</button>` : ""}
      ${m.status !== "rejected" ? `<button class="btn btn-ghost btn-sm" data-act="rejected">Refuser</button>` : ""}
      <button class="btn btn-ghost btn-sm" data-act="edit">Modifier</button>
      <button class="btn btn-danger btn-sm" data-act="del">Supprimer</button>
    </div></article>`;
}

$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; draw(); }
});

$("#list").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, m = all.find((x) => x.id === id), act = b.dataset.act;
  try {
    if (act === "approved" || act === "rejected") {
      await updateDoc(doc(db, "messages", id), { status: act, updatedAt: serverTimestamp() });
      toast(act === "approved" ? "Message approuvé : il est maintenant public." : "Message refusé.");
    } else if (act === "edit") {
      editId = id; $("#e-name").value = m.name; $("#e-rel").value = m.relation; $("#e-msg").value = m.message; $("#dlg").showModal();
    } else if (act === "del" && confirm("Supprimer définitivement ce message ?")) {
      await deleteDoc(doc(db, "messages", id)); toast("Message supprimé.");
    }
  } catch (err) { console.error(err); toast("Action impossible : " + (err.code || err.message), "err"); }
});

$("#e-cancel").onclick = () => $("#dlg").close();
$("#edit-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    await updateDoc(doc(db, "messages", editId), {
      name: $("#e-name").value.trim(), relation: $("#e-rel").value.trim(),
      message: $("#e-msg").value.trim(), updatedAt: serverTimestamp()
    });
    $("#dlg").close(); toast("Message modifié.");
  } catch (err) { console.error(err); toast("Modification impossible.", "err"); }
});

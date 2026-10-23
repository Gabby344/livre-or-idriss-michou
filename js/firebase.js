import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL } from "./config.js";

export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const app = initializeApp(firebaseConfig);

/* Détecte si la base s'appelle "(default)" ou "default" :
   une base inexistante répond 404, une base existante répond 403 (règles). */
async function detectDatabaseId() {
  for (const id of ["(default)", "default"]) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${encodeURIComponent(id)}/documents/messages?pageSize=1&key=${firebaseConfig.apiKey}`;
      const r = await fetch(url);
      if (r.status !== 404) return id;
    } catch (e) { return "(default)"; }
  }
  return "(default)";
}
const DATABASE_ID = await detectDatabaseId();
console.log("[firestore] base utilisée :", DATABASE_ID);

/* Long polling forcé : évite les écritures qui restent « en attente » sur certains réseaux. */
export const db = initializeFirestore(app, { experimentalForceLongPolling: true }, DATABASE_ID);
export const auth = getAuth(app);

/** Garantit qu'un utilisateur (anonyme pour les invités) est connecté. */
export async function ensureGuest() {
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}

/** Administrateur = compte dont l'e-mail est ADMIN_EMAIL.
 *  La vraie protection est dans firestore.rules (vérification côté serveur). */
export async function isAdmin(user) {
  if (!user || user.isAnonymous || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

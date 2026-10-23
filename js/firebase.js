import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL, DATABASE_ID } from "./config.js";

export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const app = initializeApp(firebaseConfig);

/* Base explicite + long polling (évite les écritures bloquées sur certains réseaux). */
export const db = initializeFirestore(app, { experimentalForceLongPolling: true }, DATABASE_ID);
export const auth = getAuth(app);
console.log("[firestore] projet :", firebaseConfig.projectId, "· base :", DATABASE_ID);

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

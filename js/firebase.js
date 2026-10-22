import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** Garantit qu'un utilisateur (anonyme pour les invités) est connecté. */
export async function ensureGuest() {
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}

/** Vrai si l'utilisateur possède un document admin/{uid}. */
export async function isAdmin(user) {
  if (!user || user.isAnonymous) return false;
  try {
    const snap = await getDoc(doc(db, "admin", user.uid));
    return snap.exists();
  } catch { return false; }
}

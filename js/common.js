import { SITE_URL, DEV, COUPLE } from "./config.js";

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
}

export function toast(message, kind = "ok", ms = 5200) {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
  const t = document.createElement("div");
  t.className = `toast ${kind}`;
  t.textContent = message;
  box.append(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, ms);
}

/** Pied de page obligatoire. */
export function renderFooter(target = "#site-footer") {
  const el = $(target);
  if (!el) return;
  const li = DEV.linkedinUrl
    ? `<a href="${esc(DEV.linkedinUrl)}" target="_blank" rel="noopener">${esc(DEV.linkedinLabel)}</a>`
    : esc(DEV.linkedinLabel);
  el.innerHTML = `Développé par ${esc(DEV.name)} | WhatsApp : <a href="${esc(DEV.whatsappUrl)}" target="_blank" rel="noopener">${esc(DEV.whatsapp)}</a> | LinkedIn : ${li}`;
}

export const QR_TEXT =
  "Veuillez scanner ici pour laisser un petit mot dans le livre d'or de nos heureux mariés Idriss & Michou.";

/** Dessine le code QR (bibliothèque qrcodejs chargée en <script>). */
export function renderQR(target, size = 168, dark = "#1b2a4a") {
  const el = typeof target === "string" ? $(target) : target;
  if (!el) return;
  el.innerHTML = "";
  if (!window.QRCode) { el.textContent = SITE_URL; return; }
  new window.QRCode(el, { text: SITE_URL, width: size, height: size, colorDark: dark, colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Code QR vers le livre d'or");
}

export function photoUrl(file) { return `images/${file}`; }
export const names = `${COUPLE.groom} & ${COUPLE.bride}`;

import { COUPLE, PHOTOS, BOOK, DEV } from "./config.js";
import { $, esc, photoUrl, renderQR, QR_TEXT } from "./common.js";
import { db, auth, isAdmin, collection, query, where, getDocs, onAuthStateChanged } from "./firebase.js";

/* Générateur pseudo-aléatoire reproductible : les photos ne changent pas à chaque ouverture. */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, seed) { const r = mulberry32(seed), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

let seed = +localStorage.getItem("bookSeed") || 2026;
let messages = [];

onAuthStateChanged(auth, async (user) => {
  if (!(await isAdmin(user))) { $("#gate").hidden = false; $("#toolbar").hidden = true; return; }
  $("#gate").hidden = true; $("#toolbar").hidden = false;
  try {
    const snap = await getDocs(query(collection(db, "messages"), where("status", "==", "approved")));
    messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    build();
  } catch (e) { console.error(e); $("#stat").textContent = "Impossible de charger les messages."; }
});

$("#print").onclick = () => window.print();
$("#shuffle").onclick = () => { seed = Math.floor(Math.random() * 1e6); localStorage.setItem("bookSeed", seed); build(); };

function build() {
  const pool = PHOTOS.filter((p) => PHOTOS.length <= 4 || (p.file !== BOOK.coverPhoto && p.file !== BOOK.closingPhoto));
  const deck = shuffled(pool, seed);
  const pages = [];

  // Couverture
  pages.push(`<section class="page cover">
    <img class="full" src="${photoUrl(BOOK.coverPhoto)}" alt="">
    <div class="txt">
      <h1 class="t1">${esc(COUPLE.groom)}<small>&amp;</small>${esc(COUPLE.bride)}</h1>
      <div class="rule"></div>
      <p class="t2">${esc(BOOK.title)}</p>
      <p class="t3">${esc(COUPLE.dateLabel)}</p>
    </div></section>`);

  // Préface
  pages.push(`<section class="page preface"><h2>${esc(BOOK.prefaceTitle)}</h2>
    ${BOOK.preface.map((p) => `<p>${esc(p)}</p>`).join("")}
    <p class="sign">${esc(BOOK.signature)}</p></section>`);

  // Messages : une page chacun, photo tirée au hasard dans la galerie
  messages.forEach((m, i) => {
    const photo = deck[i % deck.length], len = m.message.length;
    const size = len > 1000 ? "xlong" : len > 600 ? "long" : "";
    pages.push(`<section class="page mpage ${size}">
      <div class="ph"><img class="bg" src="${photoUrl(photo.file)}" alt=""><img class="fg" src="${photoUrl(photo.file)}" alt=""></div>
      <div class="body"><div class="quote">${esc(m.message)}</div>
        <div class="by"><b>${esc(m.name)}</b>${esc(m.relation)}</div></div>
      <div class="pn">${i + 3}</div></section>`);
  });

  // Page de fin
  pages.push(`<section class="page closing">
    <div class="ph"><img src="${photoUrl(BOOK.closingPhoto)}" alt=""></div>
    <div class="in">
      <h2>${esc(BOOK.thanksTitle)}</h2>
      <p>${esc(BOOK.thanks)}</p>
      <p class="sig">${esc(BOOK.signature)}</p>
      <div class="qrrow"><div class="q" id="qr-end"></div><span>${esc(QR_TEXT)}</span></div>
      <p style="font-size:7.5pt;color:#98a3ba;margin-top:2mm">Développé par ${esc(DEV.name)} | WhatsApp : ${esc(DEV.whatsapp)} | LinkedIn : ${esc(DEV.linkedinLabel)}</p>
    </div></section>`);

  $("#book").innerHTML = pages.join("");
  renderQR("#qr-end", 80);
  $("#stat").textContent = `${messages.length} message${messages.length > 1 ? "s" : ""} approuvé${messages.length > 1 ? "s" : ""} · ${pages.length} pages`;
}

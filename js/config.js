// ============================================================
//  CONFIGURATION — le seul fichier à modifier avant la mise en ligne
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCNtMKGJXYj7kEMtW1M421D_rtHW7-Nn4s",
  authDomain: "mariageidrissetmichou.firebaseapp.com",
  projectId: "mariageidrissetmichou",
  storageBucket: "mariageidrissetmichou.firebasestorage.app",
  messagingSenderId: "1061478874051",
  appId: "1:1061478874051:web:524b350ddec29e5d9fdb76"
};

// URL publique du site (sert au code QR). À remplacer après la publication sur GitHub Pages.
// Exemple : "https://gabbyumba.github.io/livre-or-mariage/"
export const SITE_URL = "https://livre-or-idriss-michou.vercel.app/";

export const COUPLE = {
  groom: "Idriss",
  bride: "Michou",
  groomFull: "Idriss MWANGAL KAFUND",
  brideFull: "Michou KARAJ MONGA",
  dateLabel: "Vendredi 23 Octobre 2026",
  welcome: "Bienvenue au mariage d'Idriss & Michou ! Laissez votre empreinte en écrivant un mot doux dans notre livre d'or."
};

// Signature (pied de page)
export const DEV = {
  name: "Gabby Umba",
  whatsapp: "+243 99 72 27 819",
  whatsappUrl: "https://wa.me/243997227819",
  linkedinLabel: "Gabby Umba",
  linkedinUrl: ""            // collez ici l'adresse de votre profil LinkedIn (facultatif)
};

// Photos : fichiers dans /images, nommés photo1.jpg, photo2.jpg, ...
// Pour en ajouter : copiez photo16.jpg dans /images puis ajoutez une ligne ci-dessous.
export const PHOTOS = [
  { file: "photo1.jpg",  caption: "Prêts à se dire oui" },
  { file: "photo2.jpg",  caption: "La tendresse d'un geste" },
  { file: "photo3.jpg",  caption: "Main dans la main" },
  { file: "photo4.jpg",  caption: "Un moment de complicité" },
  { file: "photo5.jpg",  caption: "L'entrée sous les regards émus" },
  { file: "photo6.jpg",  caption: "Le cortège avance" },
  { file: "photo7.jpg",  caption: "Des éclats de rire au soleil" },
  { file: "photo8.jpg",  caption: "Élégance en bleu" },
  { file: "photo9.jpg",  caption: "Le regard qui dit tout" },
  { file: "photo10.jpg", caption: "Un pas vers l'avenir" },
  { file: "photo11.jpg", caption: "Douceur" },
  { file: "photo12.jpg", caption: "Au fil des jardins" },
  { file: "photo13.jpg", caption: "Portrait aux couleurs chaudes" },
  { file: "photo14.jpg", caption: "Côte à côte, pour la vie" },
  { file: "photo15.jpg", caption: "Sous les lumières du soir" }
];

// Livre imprimé
export const BOOK = {
  coverPhoto: "photo11.jpg",
  closingPhoto: "photo13.jpg",
  title: "Livre d'or",
  prefaceTitle: "Préface",
  preface: [
    "Il y a des jours qui ne ressemblent à aucun autre. Le 23 octobre 2026, Idriss et Michou ont choisi de s'unir, entourés de ceux qui les aiment.",
    "Ces pages rassemblent les mots que vous leur avez laissés : des vœux, des souvenirs, des prières, des rires. Chacun est un petit morceau de cette journée, à relire dans dix ans, dans vingt ans, quand le temps aura fait son œuvre.",
    "Merci d'avoir été là, et d'avoir écrit avec eux la première page de leur histoire commune."
  ],
  thanksTitle: "Merci",
  thanks: "Merci à toutes celles et ceux qui ont partagé ce jour avec nous. Votre présence et vos mots sont notre plus beau cadeau.",
  signature: "Idriss & Michou"
};

export const RELATIONS = [
  "Famille de la mariée",
  "Famille du marié",
  "Collègue",
  "Communauté / Église",
  "Voisin(e)"
];

export const ADMIN_EMAIL = "gabbyumba344@gmail.com";

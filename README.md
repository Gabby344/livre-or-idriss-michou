# Livre d'or — Idriss & Michou (23 octobre 2026)

Site statique (HTML / CSS / JS) + Firebase (Firestore et Authentication). Aucun outil de build : on envoie les fichiers tels quels sur GitHub Pages.

```
index.html      page invités (carrousel, formulaire, messages, QR)
admin.html      modération (connexion admin)
print.html      livre imprimable A5 (admin)
setup.html      création unique du compte admin (à supprimer ensuite)
css/            styles.css, print.css
js/             config.js (à éditer), firebase.js, common.js, index.js, admin.js, print.js
images/         photo1.jpg … photo15.jpg
firestore.rules règles de sécurité à coller dans Firebase
```

## 1. Préparer Firebase (projet « MariageIdrissetMichou »)

1. **Authentication → Sign-in method** : activer **Anonyme** (pour les invités) et **E-mail/Mot de passe** (pour l'admin).
2. **Authentication → Paramètres → Domaines autorisés** : ajouter `VOTRE-PSEUDO.github.io`.
3. **Firestore Database** : créer la base (mode production).
4. **Firestore → Règles** : coller le contenu de `firestore.rules` puis **Publier**. Ne sautez pas cette étape : sans règles, la base est soit fermée, soit ouverte à tous.

## 2. Mettre en ligne sur GitHub Pages

1. Créer un dépôt public `livre-or-mariage` sur GitHub, y envoyer **tout le contenu de ce dossier** (y compris le fichier caché `.nojekyll`).
2. **Settings → Pages → Branch : main, dossier / (root) → Save**.
3. Le site sera sur `https://VOTRE-PSEUDO.github.io/livre-or-mariage/`.
4. Dans `js/config.js`, remplacer `SITE_URL` par cette adresse exacte (le QR code pointe dessus), puis renvoyer le fichier.
5. Facultatif : coller votre lien de profil LinkedIn dans `DEV.linkedinUrl`.

## 3. Créer l'administrateur (une seule fois)

Ouvrir `https://…/setup.html`, choisir **votre** e-mail et **votre** mot de passe (10 caractères minimum). La page crée le compte, enregistre le document `admin/{uid}` et pose un verrou (`meta/setup`) : personne d'autre ne peut ensuite se déclarer admin. **Supprimez ensuite `setup.html` du dépôt.**

Choix volontaire : le mot de passe admin n'est écrit nulle part dans le code. Dans un site statique, tout le code est lisible par les visiteurs ; un mot de passe « par défaut » dans le JavaScript donnerait l'accès à n'importe qui.
La collection `messages` se crée toute seule au premier message.

## 4. Fonctionnement

- **Invités** : ils sont connectés anonymement, écrivent un message (statut `pending`), le voient dans « Mes messages » sur leur appareil, peuvent le modifier (il repasse en validation) ou le supprimer. Les messages approuvés s'affichent pour tous, avec recherche par nom.
- **Admin** (`admin.html`) : onglets En attente / Approuvés / Refusés / Tous ; Accepter, Refuser, Modifier, Supprimer à tout moment. Seuls les messages **approuvés** vont dans le livre.
- **Livre** (`print.html`) : couverture, préface, un message par page avec une photo tirée au hasard, page de remerciements avec QR. « Changer les photos » retire les photos au sort. Dans la fenêtre d'impression : format A5, marges aucune, désactiver « En-têtes et pieds de page », cocher « Graphiques d'arrière-plan ». Le plus simple est d'« Enregistrer au format PDF ».
- Les textes de la préface et des remerciements se modifient dans `js/config.js` (`BOOK`).
- Limite connue : « mes messages » est lié à l'appareil/navigateur utilisé pour écrire (si l'invité efface les données du navigateur, il ne peut plus modifier son message ; l'admin le peut).

## 5. Photos

15 photos sont fournies (`photo1.jpg` à `photo15.jpg`). Pour en ajouter, copier `photo16.jpg`… dans `images/` et ajouter une ligne dans `PHOTOS` (`js/config.js`). Couverture et page finale : `BOOK.coverPhoto` / `BOOK.closingPhoto`.

## 6. Tester en local

Les modules JS ne fonctionnent pas en double-cliquant sur le fichier. Dans le dossier :
```
python3 -m http.server 8000      # puis ouvrir http://localhost:8000
```
(`localhost` est autorisé par défaut dans Firebase Authentication.)

## 7. Scénario de test (simulation)

| # | Action | Résultat attendu |
|---|--------|------------------|
| 1 | Ouvrir `setup.html`, créer l'admin | Redirection vers `admin.html` ; recharger `setup.html` affiche « déjà faite » |
| 2 | Sur `index.html` (navigation privée), envoyer « Test 1 » | Notification de confirmation ; message « En attente » dans *Mes messages* ; **absent** de la liste publique |
| 3 | Modifier « Test 1 » | Il reste « En attente » |
| 4 | Dans `admin.html`, Accepter « Test 1 » | Il apparaît en direct dans la liste publique et dans *Mes messages* (« Publié ») |
| 5 | Envoyer « Test 2 », puis le Refuser côté admin | Il n'apparaît pas publiquement ; statut « Non retenu » chez l'invité |
| 6 | Depuis un autre navigateur, tenter de lire/modifier le message d'un autre invité | Impossible (règles Firestore) |
| 7 | Ouvrir `print.html` sans être connecté | « Accès réservé » ; connecté en admin : seul « Test 1 » est dans le livre |
| 8 | Imprimer en PDF | Couverture, préface, 1 page par message, page finale avec QR |
| 9 | Scanner le QR avec un téléphone | Ouvre le livre d'or |
| 10 | Supprimer les messages de test dans l'admin | Les listes se vident |

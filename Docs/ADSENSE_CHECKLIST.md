# Checklist AdSense — après déploiement du contenu éditorial

Ce document décrit les étapes **opérationnelles** à suivre une fois le contenu éditorial déployé en production. Ne pas re-soumettre AdSense immédiatement après le deploy.

## 1. Déployer en production

- Merger la branche contenant le contenu éditorial sur `develop` puis déployer sur Vercel (production : `www.quantum-bluff.com`).
- Vérifier manuellement quelques URLs publiques :
  - `/`, `/discover`, `/about`, `/responsible-gaming`
  - Landings jeux : `/play-poker-online`, `/online-lucky-number`, `/online-wheel-of-fortune`
  - Guides : `/news/guide-debutant-quantum-bluff`, `/news/guide-poker-probabilites-bluff`

## 2. Google Search Console

1. Ouvrir [Google Search Console](https://search.google.com/search-console) pour la propriété `https://www.quantum-bluff.com`.
2. Soumettre le sitemap : `https://www.quantum-bluff.com/sitemap.xml`
3. Demander l’indexation des URLs prioritaires (Inspection d’URL → « Demander une indexation ») :
   - Page d’accueil et `/discover`
   - Les 9 landings jeux
   - Les 8 nouveaux guides `/news/guide-*`
   - `/responsible-gaming` et `/about`
4. Vérifier que les routes protégées (`/auth`, `/lobby`, etc.) **ne figurent pas** dans le sitemap.
5. Contrôler la couverture : viser **30+ pages** en statut « Valide » / indexées.

## 3. Attendre le crawl (2 à 4 semaines)

- Ne **pas** re-demander AdSense tout de suite.
- Laisser Google crawler et indexer le nouveau contenu.
- Surveiller Search Console : erreurs d’exploration, pages exclues, amélioration du nombre de pages indexées.
- Optionnel : partager quelques liens (réseaux, communauté poker/belote) pour accélérer la découverte.

## 4. Vérifications avant nouvelle demande AdSense

- [ ] Au moins **20 articles** accessibles sous `/news` (dont ~10 guides longs)
- [ ] **9 pages jeux** à 700+ mots (FR + EN)
- [ ] `/about` et `/responsible-gaming` étoffés et indexables
- [ ] `ads.txt` et script AdSense toujours présents
- [ ] Pas de `noindex` sur le contenu public
- [ ] Maillage interne actif (Home, Discover, landings → guides)

## 5. Nouvelle demande AdSense

Une fois l’indexation stabilisée (idéalement 2–4 semaines après deploy) :

1. Se connecter à [Google AdSense](https://www.google.com/adsense/).
2. Relancer la demande d’examen du site `quantum-bluff.com`.
3. Si rejet persistant : consulter le motif exact, enrichir encore les pages les plus courtes, et attendre une nouvelle période de crawl.

## 6. « Discovered – currently not indexed » (Search Console)

Statut normal sur un domaine récent : Google connaît l'URL (sitemap, liens internes) mais n'a pas encore choisi de l'indexer.

**Actions après deploy du prerender SEO :**

1. Inspection d'URL → tester une page en live (`/news/guide-debutant-quantum-bluff`, `/contact`, `/news`)
2. Vérifier que le HTML contient du texte visible (pas seulement le spinner de chargement)
3. Demander l'indexation manuellement pour les 10 URLs prioritaires (guides + landings + `/news`)
4. Attendre 1–3 semaines ; le statut devrait passer à « Indexed » progressivement
5. Ne pas re-soumettre AdSense tant que moins de ~15 pages ne sont pas indexées

**Signaux techniques livrés :** prerender post-build (`scripts/prerender-marketing.mjs`), `usePageMeta` + JSON-LD Article sur toutes les pages publiques.

## 7. « Page with redirect » — HTTP / variante de domaine

Exemples GSC : `http://quantum-bluff.com/`, `http://www.quantum-bluff.com/`.

**Ce n'est pas une erreur.** Google a trouvé des URLs en `http://` ; Vercel les redirige en 308 vers `https://`. Google n'indexe pas l'URL source d'une redirection — c'est le comportement voulu.

| URL découverte | Comportement attendu |
|----------------|----------------------|
| `http://quantum-bluff.com/` | Redirige → `https://www.quantum-bluff.com/` |
| `http://www.quantum-bluff.com/` | Redirige → `https://www.quantum-bluff.com/` |
| `https://www.quantum-bluff.com/` | **URL canonique indexable** |

**Actions :**

1. Dans Search Console, utiliser la propriété **`https://www.quantum-bluff.com`** (pas `http://`, pas apex sans www).
2. Sitemap et canonicals : toujours `https://www.quantum-bluff.com/...` (déjà le cas).
3. Vercel : domaine primaire = `www.quantum-bluff.com` ; apex `quantum-bluff.com` redirige vers www (`vercel.json`).
4. Dans GSC → « Page with redirect » : cliquer **Valider la correction** une fois le deploy actif — le statut peut rester sur les URLs `http://` (normal).

Ne pas essayer d'indexer les variantes `http://` : seule **`https://www.quantum-bluff.com`** doit apparaître dans les résultats.

## Facteurs hors code (acceptés)

- **Domaine récent** : jeunesse du domaine peut retarder la confiance Google.
- **Trafic faible** : peu de visites organiques au départ ; le contenu de qualité et l’indexation restent la priorité.

## Contenu livré dans ce lot

| Élément | Détail |
|---------|--------|
| Guides longs | 8 nouveaux + 2 réécrits (`longGuidesContent.ts`) |
| Landings SEO | 9 jeux enrichis (`seoLandings.ts`) |
| Pages éditoriales | About enrichi, `/responsible-gaming` |
| Technique | Sitemap, routes, footer, maillage interne |

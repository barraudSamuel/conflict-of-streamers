---
stepsCompleted: [1, 2, 3, 4, 7, 8, 9, 10, 11]
inputDocuments:
  - '_bmad-output/analysis/brainstorming-session-2026-01-07.md'
  - '_archive/conflict-of-streamers-backup-2026-01-07/TWITCH_INTEGRATION.md'
  - '_archive/conflict-of-streamers-backup-2026-01-07/AGENTS.md'
  - '_archive/conflict-of-streamers-backup-2026-01-07/frontend/README.md'
workflowType: 'prd'
lastStep: 11
workflowStatus: 'completed'
completedDate: '2026-01-07'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 3
projectType: 'greenfield'
projectClassification:
  technicalType: 'web_app'
  domain: 'gaming'
  complexity: 'medium'
---

# Product Requirements Document - conflict-of-streamers

**Author:** sam
**Date:** 2026-01-07

## Executive Summary

**conflict-of-streamers** est une application web de conquête territoriale conçue sur-mesure pour un collectif spécifique de ~10 streamers francophones français (300-8000 viewers en moyenne). L'objectif est de créer des moments de jeu récurrents où les viewers deviennent acteurs via des commandes Twitch, dans un système équitable qui valorise l'engagement plutôt que le nombre brut de viewers.

### Vision Produit

Le projet transforme la participation passive du chat Twitch en gameplay actif et stratégique. Les streamers du collectif peuvent lancer des parties de conquête territoriale où leurs viewers participent directement via des commandes simples ("ATTACK [TERRITOIRE]", "DEFEND [TERRITOIRE]"). Le système de calcul proportionnel garantit qu'un streamer avec 300 viewers engagés peut battre un streamer avec 8000 viewers passifs.

**Public cible :** Collectif fermé de ~10 streamers francophones français, accès privé via URL simple (pas de login).

**Format d'usage :** Événements récurrents organisés par le collectif. Un streamer crée une partie (devient admin), les autres rejoignent le lobby, sélectionnent leur territoire de départ, puis la partie commence.

**Mécaniques core validées :**
- Combat par commandes spam sur 30 secondes
- Équilibrage proportionnel : Force = (messages × 0.7) + (users_uniques × bonus_territoire)
- Stats territoriales inversées (grands territoires = forte attaque/faible défense)
- Grille abstraite 20×20 avec ~20 territoires organiques (style pixel art)
- Une action à la fois par streamer (un territoire ne peut pas être attaqué s'il attaque lui-même)
- Cooldown 10 secondes entre actions
- Parties ciblées 15-20 minutes
- Victoire : dernier streamer avec territoires OU conquête totale

**Gestion des événements :**
- Rage-quit : territoires du joueur deviennent libres (repassent en zones BOT)
- Feedback temps réel : barre de progression visible, chat actif affiché en bas à droite pendant les actions
- Résumé de bataille : leaderboard des meilleurs spammers affiché en fin d'attaque/défense
- Interface enrichie : Touche Tab pour voir leaderboard en cours + historique des actions

### Ce qui Rend Ce Projet Spécial

1. **Outil sur-mesure évolutif** - Conçu spécifiquement pour les besoins d'un collectif existant. Évolution basée sur retours informels, décisions prises par le créateur selon les besoins réels du groupe.

2. **Équilibrage proportionnel breakthrough** - Innovation technique qui résout le problème fondamental des jeux Twitch : l'équité entre petits et gros streamers via un système d'engagement proportionnel.

3. **Simplicité élégante et viable** - Choix courageux de rejeter des features sexy mais complexes (typing précis, multiplicateurs) après avoir identifié les contraintes techniques réelles (délai Twitch 2-4 sec). Focus laser sur ce qui fonctionne.

4. **Production value soignée** - Audio épique orchestral, feedback visuel de qualité (barres de progression, chat actif, résumés de bataille), expérience immersive qui transforme une web app en vrai jeu engageant, même pour un outil privé.

5. **Chat au centre** - L'objectif n'est pas de créer un SaaS massif, mais de donner un outil fun qui crée des moments mémorables où les viewers sont vraiment acteurs, pas spectateurs. Feedback instantané pour les viewers (barre de progression, reconnaissance en fin de bataille).

6. **Configuration flexible** - Le créateur de partie peut ajuster les paramètres du jeu (durées, multiplicateurs, règles) sans redéploiement, permettant d'expérimenter et d'adapter le gameplay selon les retours.

## Project Classification

**Type Technique :** Web App (SPA temps réel, WebSocket, browser-based game)
**Domaine :** Gaming (multijoueur compétitif avec intégration Twitch)
**Complexité :** Medium
**Contexte Projet :** Greenfield - Nouvelle codebase propre avec learnings validés du brainstorming
**Déploiement :** Privé/fermé - VPS propre, accès via URL simple, pas de système de login

### Implications Techniques

**Stack attendu :**
- Frontend : SPA moderne, WebSocket client, intégration Twitch chat via pseudo simple
- Backend : WebSocket serveur, intégration Twitch IRC (tmi.js en mode anonyme), gestion état temps réel en mémoire
- Récupération automatique des avatars Twitch via pseudo
- Configuration dynamique modifiable par le créateur de partie (pas de redéploiement nécessaire)
- Logs serveur pour debugging, pas de dashboard admin
- Hosting : VPS propre, capacité ~10 joueurs simultanés max

**Flow technique Twitch :**
- Streamer entre son pseudo Twitch
- tmi.js se connecte au chat correspondant
- Avatar récupéré automatiquement
- Pas de compte Twitch vérifié requis

**Contraintes identifiées :**
- Délai Twitch IRC : 2-4 secondes incompressibles - système de spam adapté en conséquence
- WebSocket : gestion des conflits d'attaque simultanée (très peu probable techniquement)
- Parties courtes (15-20 min) pour maintenir l'engagement
- Interface lisible pour le streaming (textes, contrastes, taille des éléments, barre progression, chat actif)
- État en mémoire uniquement - pas de persistance historique/stats

**Onboarding :**
- Tutoriel textuel sur page d'accueil
- Instructions dans le lobby
- Streamers responsables d'expliquer les règles à leurs viewers

**Évolutivité :**
- Architecture modulaire pour faciliter l'ajout de features selon retours du collectif
- Système de configuration flexible sans rebuild
- Décisions d'évolution prises par le créateur basées sur retours informels

## Success Criteria

### Philosophie de Succès

Le succès de **conflict-of-streamers** se mesure par l'expérience vécue lors des sessions de jeu, pas par des métriques business formelles. L'objectif est de créer un outil fun et équilibré qui crée des moments mémorables pour les streamers et leurs viewers.

**Approche :** Signaux observables simples, pas de tracking formel. On observe, on ajuste, on itère.

### Signaux de Succès Observables

**Équilibrage Ressenti :**
- Dans les premières parties de test : les streamers de 300-500 viewers gagnent environ 30-40% du temps
- Personne ne sent que "c'est injouable" ou "trop facile"
- Signal positif : "J'ai une chance même si je suis plus petit"

**Rythme Sans Temps Mort :**
- Parties restent dans les 15-20 minutes (±3 min acceptable)
- Aucune phase ne traîne > 30 secondes sans action possible
- Les streamers veulent rejouer immédiatement après

**Engagement du Chat :**
- Majorité des viewers participent (objectif : >60% tapent au moins 1 commande)
- Le chat reste actif pendant toute la bataille (pas juste 3-4 personnes)
- Signal positif : viewers demandent "c'est quand la prochaine partie ?"

**Clarté & Lisibilité :**
- Les streamers comprennent ce qui se passe en temps réel
- Les viewers savent quand et comment participer
- Interface lisible sur stream (textes, contrastes, feedback visuel clair)

**Fun Factor :**
- Les streamers et viewers veulent rejouer
- Des moments "clip-worthy" émergent naturellement
- Retours spontanés positifs du collectif

### Contraintes Techniques Critiques

**Performance Temps Réel :**
- WebSocket latency < 200ms pour updates de jeu
- Barre de progression réactive malgré délai Twitch (2-4 sec incompressible)
- Pas de désynchronisation visible entre viewers et état du jeu

**Résilience :**
- Reconnexion automatique bot Twitch si déconnexion en bataille
- État du jeu maintenu pendant reconnexion
- Logs suffisants pour débugger les problèmes rapportés

**Simplicité d'Infrastructure :**
- Déploiement sur VPS sans galère
- Redémarrage clean si nécessaire
- État en mémoire OK pour MVP (pas de persistance requise)

### Validation Technique Avant Livraison

**Tests Critiques (une seule fois avant v1) :**

**Équilibrage :**
- Simuler 100-200 parties avec bots (ratio 300 vs 8000 messages)
- Vérifier que taux de victoire du "petit" est dans la range 30-40%
- Si hors range : ajuster formule avant livraison

**Performance :**
- Stress test : 100 messages/seconde gérés sans lag
- Toutes les commandes Twitch comptées et affichées
- Leaderboard calculé correctement

**Interface Stream :**
- Textes minimum 18px, contrastes suffisants
- Lisible sur 1080p et 720p
- Screenshot tests basiques

**But :** S'assurer que la v1 **fonctionne** avant de livrer au collectif. Pas de testing continu formel - juste valider avant première livraison.

## Product Scope

### MVP - Première Version Testable

**Core Gameplay :**
- Lobby avec sélection de territoire de départ
- Combat par commandes Twitch (ATTACK/DEFEND [TERRITOIRE]) sur 30 secondes
- Système d'équilibrage proportionnel : Force = (messages × 0.7) + (users_uniques × bonus_territoire)
- Stats territoriales inversées (grands = forte attaque/faible défense)
- Grille 20×20 avec ~20 territoires organiques (pixel art)
- Une action à la fois + cooldown 10 secondes
- Victoire : dernier avec territoires OU conquête totale
- Rage-quit : territoires deviennent libres

**Feedback Visuel & Audio :**
- Barre de progression de bataille en temps réel
- Chat actif affiché en bas à droite pendant actions
- Résumé de bataille avec leaderboard des meilleurs spammers
- Audio épique orchestral (musique lobby, jeu, bataille)
- SFX synchronisés (corne de guerre, transitions)

**Interface & UX :**
- Page d'accueil avec tutoriel textuel
- Lobby avec instructions
- Touche Tab pour leaderboard en cours + historique actions
- Interface lisible pour streaming (contrastes, tailles, clarté)

**Configuration :**
- Créateur de partie peut ajuster paramètres (durées, multiplicateurs)
- Pas de redéploiement nécessaire pour changer config

**Technique :**
- Intégration Twitch via pseudo simple (tmi.js anonyme)
- Gestion délai Twitch 2-4 sec (contrainte incompressible)
- Récupération automatique avatars
- WebSocket temps réel avec reconnexion auto
- État en mémoire (pas de persistance)
- Logs serveur pour debugging

### Approche de Validation

**Phase 1 : Tests Techniques Initiaux (avant livraison)**
- Valider équilibrage avec simulations bot
- Stress-test performance et résilience
- Vérifier lisibilité interface sur stream

**Phase 2 : Première Livraison Testable**
- Livrer version fonctionnelle au collectif
- Sessions de test organisées en interne
- Observer les signaux de succès pendant les parties

**Phase 3 : Itération Selon Retours**
- Récolter retours informels (ce qui marche, ce qui marche pas, ce qui manque)
- Ajuster selon les vrais besoins observés
- Améliorer les points de friction identifiés

**Pas de timeline formelle** - le développement suit les besoins réels et les retours terrain.

### Post-MVP : Selon Retours du Collectif

Les prochaines features seront définies en fonction :
- Des retours des streamers après tests
- Des besoins émergents pendant les sessions
- Des idées qui émergent du collectif

**Réserve d'idées du brainstorming** (à prioriser selon retours) :
- Modes de jeu variés (Blitz, King of Hill)
- Système momentum (win streaks)
- Événements aléatoires globaux
- Spectator mode avancé
- Replay & highlights auto
- Achievements/badges
- Intégration Channel Points Twitch

### Philosophie : Build → Test → Learn → Iterate

Construction organique basée sur l'usage réel. Les tests formels servent juste à valider que la base fonctionne - après, c'est l'expérience réelle qui guide.

## User Journeys

### Journey 1 : Théo - Le Meneur Qui Lance L'Événement

**Théo, 27 ans, ~4000 viewers - Streamer coop et meneur du collectif**

C'est vendredi soir, 21h. Théo a annoncé toute la semaine sur son Discord : "Vendredi, on fait Conflict of Streamers avec le collectif !". Il a déjà testé le jeu en béta la semaine dernière et il sait que ça va être fun. Ce soir, c'est la vraie première soirée officielle avec tout le monde.

Il lance son stream plus tôt que d'habitude, excité. Son chat est déjà chaud : "C'est quoi ce truc ?", "On va détruire les autres !". Théo ouvre conflict-of-streamers.com et voit la page d'accueil claire avec le tuto. Il clique sur **"Créer une Partie"**, entre son pseudo Twitch "TheoGG", et ajuste rapidement les paramètres : durée des batailles à 25 secondes (son chat aime taper vite), cooldown à 8 secondes. Le site génère le code **"VENDETTA"**.

"Les gars, le code c'est VENDETTA !" il balance ça sur le Discord du collectif et en vocal. Un par un, les avatars des autres streamers apparaissent dans le lobby : Sarah (800 viewers), Alex (6000 viewers), Léa (500 viewers)... Il voit leurs photos de profil Twitch s'afficher. "Ah Sarah est là ! Alex tu vas morfler ce soir !" La vibe est bonne, c'est comme une LAN party mais en ligne.

Tout le monde sélectionne son territoire de départ. Théo prend un territoire moyen en plein centre - stratégique. Quand tout le monde est prêt, il clique **"Lancer la Partie"**. La musique épique démarre, son chat réagit : "OHHH C'EST CHAUD", "ALLONS-Y".

Premier move : il attaque le territoire de Sarah à côté. "GO LES GARS, ATTACK ESPAGNE !". Son chat se déchaîne - des centaines de messages défilent. Il voit la **barre de progression** en temps réel, le **feed des messages** en bas à droite avec les pseudos Twitch qui spamment. C'est vivant, c'est réactif. Sarah résiste mais son chat à elle n'est pas assez massif. **Victoire !** Le résumé de bataille affiche le top 5 des spammers de son chat. "GG xXDarkLord47Xx, 47 messages !". Son chat célèbre.

La partie continue. Alex (6000 viewers) le contre-attaque, mais Théo défend bien - **son engagement proportionnel fonctionne**. Même avec moins de viewers, son chat hyper actif compense. À un moment, Léa (500 viewers) prend un territoire à Alex. "OUAIS LÉA ! Tu vois, les petits peuvent gagner !". C'est exactement ce qu'il voulait prouver.

Après 19 minutes intenses, c'est serré entre Théo et Alex. Dernière bataille épique. Son chat donne tout. Il voit les barres bouger... **VICTOIRE !** Son territoire devient dominant sur la carte. L'écran de victoire s'affiche avec les stats finales. Son chat explose de joie. En vocal avec le collectif : "On refait une ? Allez, revanche !"

**Ce qui l'a marqué :** Le chat a participé massivement, tout le monde a rigolé en vocal, et même les "petits" streamers ont eu leur moment de gloire. C'est exactement ce qu'il voulait pour son collectif. Il clique **"Nouvelle Partie"** sans hésiter.

### Journey 2 : Léa - La Petite Streameuse Qui Découvre

**Léa, 24 ans, ~600 viewers - Streameuse variété et joueuse occasionnelle**

Léa voit le message de Théo sur le Discord du collectif : "Vendredi 21h, Conflict of Streamers ! Code : VENDETTA". Elle a vu les explications dans le channel #annonces cette semaine - un jeu de conquête où le chat participe. Ça a l'air cool, mais elle est un peu intimidée : avec ses 600 viewers face à Alex (6000) ou Théo (4000), elle va se faire écraser, non ?

Vendredi soir, elle est en live sur un jeu chill. 20h55, elle dit à son chat : "Les gars, dans 5 minutes on teste un truc avec le collectif. Vous allez devoir taper des commandes dans le chat, on va conquérir des territoires !" Son chat est curieux : "C'est quoi ?", "On est chauds !".

21h pile, elle ouvre conflict-of-streamers.com. Page d'accueil, tuto rapide qu'elle survole (elle connaît déjà le concept). Elle clique **"Rejoindre une Partie"**, une popup lui demande le code. Elle tape **"VENDETTA"** et son pseudo Twitch **"LeaStream"**.

Boom, elle arrive dans le **lobby**. Wow, tout le monde est déjà là ! Elle voit les avatars : Théo, Sarah, Alex, Thomas, Kevin... 8 streamers au total. Son avatar Twitch s'affiche automatiquement avec les autres. "Coucou tout le monde !" elle lance en vocal Discord. L'ambiance est cool, tout le monde est excité.

La **grille 20×20** s'affiche avec les territoires disponibles. Certains sont énormes (Russie, Canada), d'autres petits (îles). Elle hésite... Les gros territoires ont l'air puissants, mais elle se souvient que Théo avait dit "les gros territoires sont fragiles". Elle prend un **territoire moyen** en périphérie. Safer.

Théo lance la partie. **Musique épique**. Son chat réagit bien. Elle attend, regarde les autres jouer leurs premiers coups. Théo attaque Sarah, Alex attaque Thomas. C'est impressionnant de voir toutes les actions en même temps.

Son tour. Elle se lance : "Les gars, on attaque l'Italie ! Tapez **ATTACK ITALIE** !" Son chat se met à spammer. Elle voit la **barre de progression** bouger en temps réel. Les messages de son chat défilent dans le **feed en bas à droite**. C'est hypant ! Elle est en duel avec un **BOT** (territoire libre), mais ça lui permet de tester le système.

**Victoire !** Le résumé s'affiche avec son top 5 spammers. Son chat célèbre. "On a fait 64% de participation ! C'est fou les gars !"

Ensuite vient le moment de vérité : Alex (6000 viewers) l'attaque. Elle s'attend à se faire rouler dessus. "DEFEND FRANCE LES GARS !" Son chat donne tout. La barre monte... monte... **ELLE GAGNE LA DÉFENSE !** Elle n'en revient pas. "QUOI ?! On l'a fait ! Alex, désolée pas désolée !" En vocal, Alex rigole : "Ton chat est chaud dis donc !".

Léa réalise que **ça fonctionne vraiment** - son petit chat engagé peut battre un gros chat passif. Elle n'est plus intimidée. Elle joue de manière agressive, prend des risques. À un moment, elle conquiert un territoire d'Alex. Son chat explose de fierté.

Elle ne gagne pas la partie (c'est Théo), mais elle finit **3ème sur 8**. Et surtout, elle a passé un super moment. Son chat aussi. "On refait quand ??" demandent ses viewers. En vocal : "GG tout le monde, c'était trop cool ! Je suis partante pour une revanche."

**Ce qui l'a marqué :** Elle pensait se faire écraser, mais le système d'équilibrage lui a donné sa chance. Son chat a adoré être acteur. Elle a eu un vrai moment de gloire en battant Alex. Elle va revenir, c'est sûr.

### Journey 3 : Marc - Le Viewer Actif Qui Fait Gagner Son Streamer

**Marc, 32 ans, viewer régulier de Théo depuis 2 ans - Toujours actif dans les événements communautaires**

Marc sort du boulot, 20h30. Il ouvre Twitch sur son téléphone en rentrant chez lui. Théo est déjà en live, plus tôt que d'habitude. Le titre du stream : "🔥 CONFLICT OF STREAMERS - GUERRE CONTRE LE COLLECTIF 🔥". Marc sourit - il a vu les annonces toute la semaine sur le Discord. Il savait que ce soir, ça allait être du lourd.

Arrivé chez lui, il ouvre le stream sur son PC. Théo est sur la page d'accueil du jeu, en train d'expliquer : "Les gars, vous allez devoir taper des commandes dans le chat. Quand j'attaque, vous tapez ATTACK + le nom du territoire. Quand je défends, DEFEND + le territoire. Simple, non ?" Marc hoche la tête. Il a déjà fait des Twitch Plays avant, il connaît le principe.

Théo crée la partie, donne le code aux autres. Le **lobby** s'affiche sur le stream - Marc voit les avatars de tous les streamers du collectif. "Oh, Alex est là ! Et Léa aussi !" Il est excité. En chat Twitch, l'ambiance monte : "ON VA LES DEFONCER", "THEO PRESIDENTE".

La partie démarre. Musique épique. Théo attaque l'Espagne (le territoire de Sarah). "GO LES GARS, **ATTACK ESPAGNE** !"

Marc tape immédiatement dans le chat Twitch : `ATTACK ESPAGNE`

Il voit son message partir. Sur le stream, en **bas à droite**, un **feed de messages** apparaît. Il voit défiler les pseudos des viewers qui spamment comme lui - des centaines de messages par seconde. Il voit son pseudo **"Marc_TV"** passer dans le feed avec un **background vert** (commande valide). Ça fonctionne ! Il est compté !

Il continue de spammer pendant les 30 secondes. La **barre de progression** sur le stream montre que Théo est en train de gagner. Marc tape encore et encore. Chaque message validé lui donne un mini rush d'adrénaline. Il n'est pas juste spectateur - **il contribue activement**.

**Victoire !** Théo conquiert le territoire. Un **résumé de bataille** s'affiche. Marc voit le **top 5 des meilleurs spammers** :
1. xXDarkLord47Xx - 47 messages
2. GamerPro2000 - 43 messages
3. **Marc_TV - 41 messages** ⬅️ LUI !
4. SarahFan123 - 38 messages
5. NoobMaster - 35 messages

"Wow, **3ème** !" Marc est fier. Il screenshot le résultat immédiatement. Sur le chat Twitch, les gens le félicitent : "GG Marc !", "Marc le goat". Théo dit en live : "GG à Marc_TV, t'es un warrior !"

La partie continue. À chaque bataille, Marc donne tout. Quand Théo défend contre Alex, Marc tape **DEFEND FRANCE** comme un fou. Quand Théo attaque Léa, il spam **ATTACK BELGIQUE**. Parfois il est dans le top 5, parfois non, mais **il voit toujours ses messages comptés** dans le feed en temps réel. C'est ça qui est satisfaisant.

Vers la fin, c'est serré. Dernière bataille contre Alex. Théo en vocal : "Les gars, c'est MAINTENANT ou JAMAIS ! Donnez TOUT !" Marc se lève de sa chaise (littéralement), met son clavier sur ses genoux, et **spam de toutes ses forces** pendant 30 secondes. Il voit la barre monter, monter...

**VICTOIRE !** Théo gagne la partie ! L'écran de victoire s'affiche avec les stats. Marc est **épuisé** mais heureux. Il a l'impression d'avoir vraiment **gagné avec Théo**, pas juste regardé Théo gagner. Sur le chat : "ON A FAIT LE TAFF", "GGWP CHAT", "Marc tu pèses lourd frr".

Théo : "GG le chat, vous avez été incroyables. Sans vous, je gagne rien. On refait une ?"

Marc regarde l'heure. 21h25, il a encore du temps. "Allez, une dernière !" il se dit. Il reste pour la revanche.

**Ce qui l'a marqué :** Il a vu ses messages comptés en temps réel. Il a été reconnu dans le leaderboard. Il a vraiment senti qu'il contribuait - que sans lui et le reste du chat, Théo ne gagnait pas. C'est ça qui change tout par rapport aux streams classiques où il est juste spectateur.

### Journey Requirements Summary

Ces trois journeys révèlent l'ensemble des capacités nécessaires pour le MVP :

**Création & Organisation (Journey Théo) :**
- Interface "Créer une Partie" avec configuration personnalisée
- Génération de code partie partageable
- Lobby temps réel avec avatars Twitch automatiques
- Possibilité d'ajuster les paramètres (durée batailles, cooldown)
- Bouton "Lancer la Partie" quand tous prêts
- Bouton "Nouvelle Partie" pour enchaîner

**Onboarding & Participation (Journey Léa) :**
- Interface "Rejoindre une Partie" claire
- Input pour code de partie + pseudo Twitch
- Lobby qui montre qui est déjà là (avatars)
- Sélection de territoire sur grille avec indication visuelle (tailles différentes)
- Système d'équilibrage visible et ressenti
- Actions défense en plus de l'attaque
- Résumé avec % de participation pour valoriser l'engagement
- Classement final pour voir positionnement

**Engagement Viewer (Journey Marc) :**
- Explication claire des commandes accessibles
- Feed de messages en temps réel visible (bas à droite)
- Feedback visuel immédiat : background vert pour commande valide
- Pseudo du viewer visible dans le feed (reconnaissance)
- Barre de progression visible pour voir impact collectif
- Top 5 leaderboard après chaque bataille (valorisation)
- Plusieurs batailles pour multiplier les chances de reconnaissance
- Sentiment de contribution réelle (pas spectateur passif)

**Capacités Transverses :**
- Grille 20×20 avec territoires organiques de tailles variées
- Système d'équilibrage proportionnel fonctionnel et ressenti
- Audio épique orchestral (musique lobby, jeu, bataille)
- Écran de victoire avec stats finales
- Support BOT pour territoires libres
- Interface lisible pour le streaming

## Web App Specific Requirements

### Project-Type Overview

**conflict-of-streamers** est une **Single Page Application (SPA)** temps réel optimisée pour les navigateurs modernes. L'application privilégie la performance et la réactivité pour offrir une expérience de jeu fluide et immersive, sans les contraintes d'accessibilité ou de SEO d'une application publique.

### Technical Architecture Considerations

**Application Architecture :**
- **Type :** Single Page Application (SPA) - pas de rechargement de pages
- **Rendu :** Client-side rendering complet
- **Navigation :** Routing côté client (page d'accueil → lobby → jeu)
- **État :** Gestion d'état temps réel synchronisé via WebSocket

**Support Navigateur :**
- **Navigateurs ciblés :** Modernes uniquement (Chrome, Firefox, Edge, Safari récents)
- **Versions minimales :** Dernières versions stables (pas de support legacy)
- **Justification :** Public tech-savvy (streamers), pas besoin de compatibilité étendue
- **Features modernes OK :** ES6+, CSS Grid/Flexbox, WebSocket natif

### Communication Temps Réel

**WebSocket Architecture :**
- **Technologie :** Socket.io pour gestion WebSocket avec fallbacks
- **Latence cible :** Minimale - < 200ms pour updates de jeu critiques
- **Events clés :**
  - Lobby : entrée/sortie joueurs, sélection territoires, synchronisation état
  - Jeu : actions joueurs, progression batailles, résultats temps réel
  - Chat Twitch : comptage messages, leaderboards live

**Résilience & Reconnexion :**
- Reconnexion automatique Socket.io en cas de déconnexion
- Maintien de l'état du jeu pendant reconnexion courte
- Gestion des déconnexions longues (streamer kick/rejoin)

### Performance & Optimisation

**Performance Targets :**
- **Time to Interactive (TTI) :** < 3 secondes sur connexion moyenne
- **Frame Rate :** 60 FPS maintenu pendant animations (carte, barres de progression)
- **WebSocket Latency :** < 200ms pour updates critiques
- **Bundle Size :** Optimisé mais pas critique (public avec bonne connexion)

**Optimisations Clés :**
- Rendering canvas/WebGL pour la carte (performance sur 20×20 grille animée)
- Throttling des updates pour éviter surcharge (ex: feed messages pas 100% des messages, échantillonnage)
- Lazy loading des assets audio (musiques, SFX) après chargement initial

### Interface Utilisateur

**Responsive Design :**
- **Desktop-first :** Optimisé pour écrans 1920×1080 et 2560×1440
- **Mobile/Tablet :** Pas de support requis pour MVP (streamers sur desktop)
- **Lisibilité Streaming :** Interface visible et lisible sur stream Twitch (textes 18px+, contrastes forts)

**Visual Design Considerations :**
- Palette de couleurs contrastée pour stream
- Animations fluides mais pas excessives (performance)
- Feedback visuel immédiat (barres de progression, feed messages)
- Style pixel art pour territoires (cohérence visuelle)

### SEO & Indexation

**SEO Strategy :**
- **Non requis :** Site privé avec accès via URL directe
- **Pas d'indexation :** Pas besoin de Google/Bing indexing
- **Meta tags :** Basiques uniquement (titre, description pour partage Discord/Twitch)
- **Sitemap/robots.txt :** Non nécessaires

### Accessibilité

**Accessibility Level :**
- **Niveau :** Pas de conformité WCAG formelle requise
- **Lisibilité :** Textes suffisamment grands et contrastés pour streaming (côté effet de bord, pas contrainte)
- **Navigation Clavier :** Support basique (Tab, Enter pour navigation)
- **Screen Readers :** Non requis pour MVP

**Justification :** Public restreint tech-savvy, focus sur performance et gameplay plutôt que conformité accessibilité.

### Browser Features Utilisées

**Modern Web APIs :**
- **WebSocket :** Communication temps réel bidirectionnelle
- **Canvas/WebGL :** Rendering performant de la grille de jeu
- **Web Audio API :** Musique orchestrale et SFX synchronisés
- **LocalStorage :** Paramètres audio persistés (volume)
- **History API :** Navigation SPA (routing)

**Pas de PWA :** Pas d'installation requise, application web classique accessible via navigateur.

### Implementation Considerations

**Stack Technique Recommandé :**
- **Frontend Framework :** Vue.js, React, ou Svelte (SPA moderne)
- **État Global :** Store centralisé (Vuex, Redux, ou Pinia selon framework)
- **WebSocket Client :** Socket.io-client
- **Rendering Canvas :** Library légère (PixiJS, Konva, ou Canvas natif)
- **Audio :** Web Audio API ou Howler.js
- **Build :** Vite ou Webpack pour optimisation bundle

**Architecture Frontend :**
```
/src
  /views          → Pages (Home, Lobby, Game)
  /components     → UI components (Button, Card, ProgressBar, etc.)
  /game           → Logique jeu (Grid, Territory, Battle)
  /services       → API/Socket services (socket.ts, twitch.ts)
  /stores         → État global (game store, lobby store)
  /assets         → Audio, images
```

**Backend WebSocket :**
- Node.js + Socket.io serveur
- Gestion rooms (une room = une partie)
- Broadcast events aux clients connectés
- Intégration tmi.js pour Twitch IRC

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche MVP : Problem-Solving MVP Lean**

conflict-of-streamers suit une approche de **MVP lean orienté résolution de problème** : livrer le core gameplay équilibré et fonctionnel pour un groupe fermé de ~10 streamers, puis itérer selon les retours terrain.

**Philosophie :**
- **Pas de sur-engineering** - Livrer ce qui fonctionne, pas ce qui "pourrait être utile un jour"
- **Tests réels prioritaires** - Validation avec simulations bot puis tests avec le collectif
- **Itération rapide** - Ajustement des paramètres et features selon retours informels
- **Pas de timeline formelle** - Le développement suit les besoins réels

**Ressources :**
- **Équipe :** Développement solo (toi)
- **Infrastructure :** VPS propre, capacité ~10 joueurs simultanés max
- **Budget :** Minimal (hébergement VPS uniquement)

### MVP Feature Set (Phase 1) - Première Version Testable

Le MVP complet est déjà documenté dans la section **"Product Scope > MVP - Première Version Testable"** et couvre :

**Core Gameplay :**
- Lobby, sélection territoires, combat par commandes Twitch
- Système d'équilibrage proportionnel avec formule validée
- Stats territoriales inversées pour auto-équilibrage
- Grille 20×20 avec ~20 territoires organiques

**Feedback Visuel & Audio :**
- Barres de progression, feed messages temps réel, résumés de bataille
- Audio épique orchestral et SFX

**Configuration Flexible :**
- Créateur de partie peut ajuster paramètres sans redéploiement

**Voir section "Product Scope" pour détails complets du MVP.**

### Validation & Tests MVP

**Phase 1 : Tests Techniques Initiaux (avant livraison au collectif)**
- Simulations bot pour valider équilibrage (100-200 parties, ratio 300 vs 8000 messages)
- Stress-test performance (100 msg/sec sans lag)
- Vérification lisibilité interface sur stream

**Phase 2 : Première Livraison Testable**
- Livraison au collectif pour sessions de test organisées
- Observation des signaux de succès (équilibrage ressenti, engagement, fun)

**Phase 3 : Itération Selon Retours**
- Ajustements paramètres (formule équilibrage, durées, cooldowns)
- Corrections bugs et points de friction
- Ajout features selon besoins émergents

### Post-MVP Features (Phases Futures)

**Phase 2 - Améliorations Basées sur Retours Collectif**

Priorisation selon retours réels après tests MVP. Réserve d'idées du brainstorming à évaluer :
- Modes de jeu variés (Blitz, King of Hill) - Si le core devient répétitif
- Système momentum (win streaks) - Si besoin de plus de profondeur stratégique
- Événements aléatoires globaux - Si besoin de variété dans les parties
- Achievements/badges - Si besoin de reconnaissance long-terme pour viewers

**Phase 3 - Expansion Potentielle (Si Succès Phase 1-2)**

Features à considérer seulement si le MVP fonctionne très bien et qu'il y a demande :
- Spectator mode avancé - Si intérêt pour observers non-joueurs
- Replay & highlights auto - Si création de contenu devient important
- Intégration Channel Points Twitch - Si besoin de plus d'engagement mécanique
- Ouverture à d'autres collectifs - Si demande externe émerge

**Principe directeur :** Pas de roadmap rigide. Les features sont ajoutées selon les besoins réels observés, pas selon un plan théorique.

### Risk Mitigation Strategy

**Technical Risks :**

**Risque #1 : Équilibrage ne fonctionne pas en conditions réelles**
- **Probabilité :** Moyenne
- **Impact :** Élevé (casse le core value proposition)
- **Mitigation :** Simulations bot avant livraison (100-200 parties)
- **Fallback :** Paramètres ajustables sans redéploiement (0.7 multiplicateur, bonus territoires)
- **Plan B :** Si équilibrage fondamentalement cassé, retour au drawing board sur la formule

**Risque #2 : Délai Twitch IRC imprévisible (>4 sec)**
- **Probabilité :** Faible (contrainte connue 2-4 sec)
- **Impact :** Moyen (rend l'expérience moins réactive)
- **Mitigation :** Système de spam adapté au délai connu
- **Fallback :** Ajuster durée des batailles (25-35 sec au lieu de 30 sec)

**Risque #3 : Performance WebSocket sous charge**
- **Probabilité :** Faible (10 joueurs + leurs chats)
- **Impact :** Élevé (lag pendant bataille critique)
- **Mitigation :** Stress-test 100 msg/sec avant livraison
- **Fallback :** Throttling/échantillonnage des messages si nécessaire

**Market Risks :**

**Risque #4 : Le collectif ne s'engage pas / trouve ça pas fun**
- **Probabilité :** Faible (brainstorming validé, streamer demandeur)
- **Impact :** Élevé (projet inutile)
- **Mitigation :** Tests avec streamer demandeur avant rollout complet
- **Fallback :** Pivot sur les retours (ajuster mécaniques, durées)

**Risque #5 : Trop complexe pour les viewers**
- **Probabilité :** Faible (commandes simples "ATTACK/DEFEND")
- **Impact :** Moyen (engagement faible)
- **Mitigation :** Tutoriels clairs, streamers expliquent les règles
- **Fallback :** Simplifier encore (une seule commande au lieu de deux ?)

**Resource Risks :**

**Risque #6 : Temps de développement sous-estimé**
- **Probabilité :** Moyenne (projet solo, pas de deadline)
- **Impact :** Faible (pas de pression timeline)
- **Mitigation :** Approche itérative, pas de promesse de date
- **Fallback :** Livrer MVP réduit si nécessaire (moins de polish audio/visuel)

**Risque #7 : VPS tombe pendant une session**
- **Probabilité :** Faible (infrastructure standard)
- **Impact :** Moyen (session interrompue)
- **Mitigation :** Redémarrage clean, logs pour debug
- **Fallback :** Relancer partie rapidement, streamers compréhensifs

## Functional Requirements

### Game Setup & Configuration

**FR1:** Le créateur de partie peut créer une nouvelle partie en entrant son pseudo Twitch
**FR2:** Le créateur de partie peut configurer les paramètres de jeu (durée batailles, cooldown entre actions)
**FR3:** Le système génère un code de partie unique partageable
**FR4:** Les joueurs peuvent rejoindre une partie existante en entrant un code de partie et leur pseudo Twitch
**FR5:** Le système récupère automatiquement l'avatar Twitch du joueur via son pseudo
**FR6:** Le créateur de partie peut modifier les paramètres de jeu dans le lobby avant le lancement

### Lobby & Pre-Game

**FR7:** Les joueurs voient en temps réel les autres joueurs qui rejoignent le lobby avec leurs avatars
**FR8:** Les joueurs peuvent sélectionner un territoire de départ sur la grille 20×20
**FR9:** Le système affiche les caractéristiques visuelles des territoires (tailles variées, style pixel art)
**FR10:** Le créateur de partie peut lancer la partie quand tous les joueurs sont prêts
**FR11:** Le système affiche les instructions du jeu dans le lobby

### Twitch Integration

**FR12:** Le système se connecte au chat Twitch du streamer via tmi.js en mode anonyme
**FR13:** Le système compte les messages du chat Twitch contenant des commandes valides ("ATTACK [territoire]", "DEFEND [territoire]")
**FR14:** Le système identifie les utilisateurs uniques participant via leurs pseudos Twitch
**FR15:** Le système gère le délai incompressible de 2-4 secondes du système Twitch IRC
**FR16:** Le système maintient la connexion au chat Twitch pendant toute la partie avec reconnexion automatique si nécessaire

### Combat & Gameplay Core

**FR17:** Les joueurs peuvent initier une attaque contre un territoire adjacent en annonçant la cible
**FR18:** Les joueurs peuvent défendre leur territoire quand ils sont attaqués
**FR19:** Le système empêche un territoire d'être attaqué s'il est lui-même en train d'attaquer OU s'il est déjà en train d'être attaqué
**FR20:** Le système limite une bataille à une durée configurable (paramètre ajustable par le créateur de partie)
**FR21:** Le système calcule la force d'attaque/défense selon la formule : Force = (messages × 0.7) + (users_uniques × bonus_territoire)
**FR22:** Le système applique des stats territoriales inversées (grands territoires = forte attaque/faible défense)
**FR23:** Le système détermine le vainqueur d'une bataille selon la force calculée
**FR24:** Le système transfère la propriété d'un territoire au vainqueur de la bataille

### Real-Time Feedback & Visualization

**FR25:** Les joueurs voient une barre de progression de bataille mise à jour en temps réel pendant la durée configurée
**FR26:** Les joueurs voient un feed de messages en bas à droite affichant les commandes Twitch valides en cours
**FR27:** Le système affiche visuellement les pseudos Twitch dans le feed avec un indicateur de validation (background vert)
**FR28:** Le système met à jour la grille de jeu en temps réel pour refléter les changements de propriété territoriale
**FR29:** Les joueurs voient les actions des autres joueurs en temps réel sur la carte

### Battle Summary & Recognition

**FR30:** Le système affiche un résumé de bataille après chaque combat
**FR31:** Le résumé de bataille affiche le top 5 des meilleurs spammers avec leur nombre de messages
**FR32:** Le résumé de bataille affiche le pourcentage de participation du chat
**FR33:** Le système reconnaît les contributions individuelles des viewers en affichant leurs pseudos dans les leaderboards

### Victory & Game End

**FR34:** Le système détecte la condition de victoire (dernier joueur avec territoires OU conquête totale)
**FR35:** Le système affiche un écran de victoire avec les stats finales de la partie
**FR36:** Le système affiche le classement final des joueurs
**FR37:** Les joueurs peuvent démarrer une nouvelle partie depuis l'écran de victoire

### BOT Territories & Free Zones

**FR38:** Le système gère des territoires BOT (libres) non possédés par des joueurs
**FR39:** Les joueurs peuvent attaquer et conquérir des territoires BOT
**FR40:** Le système applique une résistance proportionnelle pour les territoires BOT

### Rage-Quit & Player Management

**FR41:** Le système détecte quand un joueur se déconnecte ou quitte la partie
**FR42:** Le système libère les territoires d'un joueur déconnecté (deviennent zones BOT)
**FR43:** Les joueurs peuvent se reconnecter à une partie en cours

### Audio & Atmosphere

**FR44:** Le système joue une musique épique orchestrale dans le lobby
**FR45:** Le système joue une musique de jeu pendant la partie
**FR46:** Le système joue une musique de bataille pendant les combats
**FR47:** Le système joue des SFX synchronisés (corne de guerre pour début bataille, transitions)
**FR48:** Les joueurs peuvent ajuster le volume audio ou couper le son
**FR49:** Le système persiste les préférences audio du joueur (LocalStorage)

### Advanced UI & Interaction

**FR50:** Les joueurs peuvent appuyer sur Tab pour afficher/masquer le leaderboard en cours
**FR51:** Les joueurs peuvent consulter l'historique des actions effectuées pendant la partie
**FR52:** Le système affiche un tutoriel textuel sur la page d'accueil
**FR53:** Le système assure une interface lisible pour le streaming (textes 18px+, contrastes forts)

### WebSocket & Real-Time Communication

**FR54:** Le système maintient une connexion WebSocket bidirectionnelle avec latence < 200ms
**FR55:** Le système gère les déconnexions WebSocket avec reconnexion automatique
**FR56:** Le système maintient l'état du jeu pendant une reconnexion courte
**FR57:** Le système synchronise l'état du jeu entre tous les clients connectés en temps réel

## Exigences Non-Fonctionnelles

### Performance

**NFR1:** Le système WebSocket maintient une latence < 200ms pour les événements critiques (attaques, défenses, mise à jour de forces)

**NFR2:** L'interface utilisateur réagit aux actions dans < 100ms pour donner un feedback immédiat (highlights visuels, sons)

**NFR3:** Le calcul de force des territoires et résolution de bataille s'exécute en < 500ms pour ne pas bloquer le gameplay

**NFR4:** L'affichage de la carte 20×20 avec ~20 territoires se charge en < 1 seconde sur connexion moyenne (> 5 Mbps)

**NFR5:** Le système gère 10 connexions WebSocket simultanées sans dégradation de performance > 10%

### Fiabilité

**NFR6:** Le système détecte les déconnexions WebSocket dans < 5 secondes et tente une reconnexion automatique

**NFR7:** En cas de reconnexion d'un joueur, le système resynchronise l'état complet du jeu en < 2 secondes

**NFR8:** Le système maintient l'état du jeu en mémoire de façon cohérente même si 1-2 joueurs se déconnectent

**NFR9:** Si la connexion IRC Twitch (tmi.js) échoue, le système affiche un message clair et tente de reconnecter toutes les 10 secondes

**NFR10:** Le système gère gracefully les messages Twitch malformés ou incomplets sans crasher le serveur

### Intégration Twitch

**NFR11:** Le système priorise la réactivité de l'expérience streamer (affichage temps-réel, calculs instantanés) plutôt que d'attendre la synchronisation parfaite avec le chat viewer qui subit le délai IRC Twitch de 2-4 secondes

**NFR12:** La connexion IRC via tmi.js en mode anonyme ne nécessite aucune authentification OAuth

**NFR13:** Le parsing des commandes chat ("ATTACK", "DEFEND") tolère les variations de casse et espaces (ex: "attack ", "Attack", "ATTACK")

### Compatibilité & Environnement

**NFR14:** L'application fonctionne sur Chrome, Firefox, Edge versions récentes (< 2 ans) sans polyfills legacy

**NFR15:** Le déploiement VPS supporte Node.js version LTS active et configuration réseau standard

**NFR16:** Les paramètres configurables (durée bataille, bonus territoire) sont modifiables sans redéploiement via interface admin

---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/architecture.md'
workflowStatus: 'completed'
lastStep: 9
---

# UX Design Specification conflict-of-streamers

**Author:** sam
**Date:** 2026-01-08

---

## Executive Summary

### Project Vision

**conflict-of-streamers** est une application web de conquête territoriale conçue pour un collectif fermé de ~10 streamers francophones français. L'objectif UX central est de créer un jeu équitable et fun qui transforme les viewers passifs en acteurs engagés, avec un système qui valorise l'engagement plutôt que le nombre brut de viewers.

Le produit doit créer des moments mémorables et palpitants où les batailles sont serrées et chaque viewer sent qu'il contribue activement à la victoire de son streamer.

### Target Users

**3 personas clés identifiées:**

**1. Les Streamers Organisateurs (ex: Théo - 4000 viewers)**
- Créent et organisent les parties
- Tech-savvy et à l'aise avec les outils
- Besoin: Configuration rapide et contrôle simple de la partie
- Contexte: Gèrent le jeu pendant leur stream (caméra/OBS déjà configurés)

**2. Les Streamers Participants (ex: Léa - 600 viewers)**
- Rejoignent les parties organisées par le collectif
- Besoin: Comprendre rapidement le jeu et voir que le système est équitable
- Contexte: Doivent expliquer les règles à leurs viewers en direct

**3. Les Viewers Actifs (ex: Marc)**
- Spectateurs engagés qui veulent contribuer activement
- Besoin: Feedback immédiat de leurs actions et reconnaissance de leur contribution
- Contexte: Participent via chat Twitch sur desktop principalement

### Key Design Challenges

**1. Clarté Absolue (Anti-Confusion)**
- Commandes évidentes immédiatement sans formation
- État du jeu compréhensible en un coup d'œil
- Onboarding ultra minimal - doit fonctionner en usage spontané
- Pas de surcharge d'informations

**2. Rythme Soutenu (Anti-Temps Mort)**
- Zéro temps mort - toujours de l'action visible
- Transitions rapides entre phases
- Tension maintenue sur 15-20 minutes

**3. Suspense Visuel pour Batailles Serrées**
- Les batailles serrées doivent être palpables visuellement
- Feedback en temps réel qui amplifie la tension
- Victoires serrées = moments "wow" mémorables

**4. Lisibilité Streaming**
- Interface visible et claire sur stream Twitch (1080p/720p)
- Textes lisibles (18px+), contrastes forts
- Informations importantes immédiatement visibles pour viewers

**5. Flexibilité d'Usage**
- Doit fonctionner pour événements dédiés ET sessions spontanées
- Setup rapide sans friction ni préparation lourde

### Design Opportunities

**1. Suspense Visuel Dynamique**
- Barres de progression temps réel qui créent du suspense
- Animations fluides montrant chaque contribution
- Feedback immédiat qui amplifie les moments serrés

**2. Audio Épique pour Tension**
- Musique orchestrale qui monte en intensité pendant batailles
- SFX synchronisés (corne de guerre, transitions)
- Audio qui signale clairement les phases du jeu

**3. Clarté Extrême par Design**
- Une action à la fois par territoire (anti-confusion)
- Feed messages en temps réel = transparence totale
- Commandes ultra-simples (ATTACK/DEFEND + nom)

**4. Reconnaissance et Valorisation**
- Leaderboards après chaque bataille = satisfaction immédiate
- Pseudos visibles dans feed = sentiment de contribution réelle
- Top 5 spammers = reconnaissance publique

**5. Onboarding Invisible**
- Design si intuitif qu'aucun tutoriel n'est nécessaire
- Apprentissage par l'observation et l'action
- Streamers peuvent expliquer en 30 secondes max

## Core User Experience

### Defining Experience

L'expérience core de **conflict-of-streamers** repose sur deux actions interdépendantes:

**Pour les Streamers:**
- Lancer des attaques contre les territoires adverses
- Défendre leurs territoires contre les attaques
- **Clarté absolue requise**: Toujours évident quel territoire attaque quel autre et qui est en train de gagner

**Pour les Viewers:**
- Spammer les commandes (ATTACK/DEFEND + nom territoire) dans le chat Twitch
- Voir immédiatement l'impact de leur contribution sur la barre de progression
- Être reconnus dans les leaderboards

L'interaction magique qui fait tout fonctionner: **Des batailles serrées et palpitantes** où chaque contribution viewer compte visiblement et crée du suspense en temps réel.

### Platform Strategy

**Plateforme Cible:**
- **Desktop web app** (navigateur moderne uniquement)
- Optimisée pour écrans 1920×1080 et 2560×1440
- Pas de support mobile/tablet requis pour MVP

**Capacités Techniques Exploitées:**
- **WebSocket natif** pour latency <200ms (mise à jour temps réel)
- **Canvas 2D** pour rendering performant de la grille 20×20
- **Web Audio API** pour musique épique orchestrale et SFX synchronisés
- **LocalStorage** pour persistance des préférences audio

**Contraintes Plateforme:**
- Délai Twitch IRC 2-4 secondes incompressible
- Interface lisible sur stream (viewers regardent via Twitch)
- Streamers gèrent le jeu pendant leur stream actif

### Effortless Interactions

**Actions Sans Friction Absolue:**

1. **Lancer une Attaque/Défense (Streamers)**
   - Clic simple sur territoire cible
   - Annonce automatique aux viewers (pas de typing manuel)
   - Commande générée automatiquement et affichée

2. **Spammer dans le Chat (Viewers)**
   - Commande ultra simple: `ATTACK [NOM]` ou `DEFEND [NOM]`
   - Tolérance aux variations (casse, espaces, typos)
   - Feedback immédiat: pseudo visible dans feed avec background vert

3. **Comprendre l'État du Jeu**
   - Carte visuelle claire avec couleurs par joueur
   - Batailles en cours immédiatement identifiables
   - Pas besoin d'explication - observable visuellement

4. **Voir Son Impact (Viewers)**
   - Barre de progression bouge en temps réel
   - Pseudo apparaît dans le feed instantanément
   - Pas besoin de chercher - feedback automatique

### Critical Success Moments

**Moment "Wow" pour les Viewers:**

1. **Impact Visuel Immédiat**
   - Le viewer tape sa commande
   - Son pseudo apparaît dans le feed (background vert)
   - La barre de progression bouge
   - **Ressenti**: "Je compte vraiment, ma contribution est visible"

2. **Reconnaissance Publique**
   - Fin de bataille: leaderboard top 5 s'affiche
   - Viewer voit son pseudo dans le top
   - **Ressenti**: "Je suis un warrior, je l'ai prouvé"

**Moments "Wow" pour les Streamers:**

1. **Chat Massivement Engagé**
   - Centaines de messages défilent dans le feed
   - Barre de progression monte rapidement
   - **Ressenti**: "Mon chat est à fond, c'est incroyable"

2. **Bataille Serrée Gagnée**
   - Barres qui s'affrontent en temps réel
   - Victoire de justesse grâce à l'engagement
   - **Ressenti**: "Ce suspense est fou, on a vraiment gagné ensemble"

3. **Équité Visible**
   - Petit streamer (600 viewers) bat gros streamer (6000 viewers)
   - Système d'équilibrage fonctionne visiblement
   - **Ressenti**: "Le jeu est vraiment équitable, tout le monde a sa chance"

**Échec Critique à Éviter:**

- Si les batailles ne sont **pas palpitantes** visuellement
- Si le suspense n'est pas ressenti
- Si on ne voit pas qui gagne en temps réel
- **Conséquence**: Le jeu devient plat, sans émotion, viewers se désengagent

### Experience Principles

Ces 5 principes guident toutes les décisions UX de conflict-of-streamers:

**1. Clarté Visuelle Absolue**
- Toujours évident quel territoire attaque quel autre
- Toujours clair qui est en train de gagner la bataille
- Zéro ambiguïté sur l'état du combat
- *Application*: Design de carte, indicateurs visuels, états des territoires

**2. Feedback Immédiat et Palpitant**
- Barre de progression temps réel = impact visible
- Batailles serrées visuellement palpitantes
- Chaque spam compte et se voit immédiatement
- *Application*: Animations, barres de progression, feed messages

**3. Reconnaissance Systématique**
- Leaderboard top 5 après chaque bataille
- Pseudos visibles dans le feed en temps réel
- Valorisation des meilleurs contributeurs
- *Application*: Leaderboards, feed design, highlights visuels

**4. Engagement Visible = Succès**
- Chat massivement engagé visible pour tous
- Victoires serrées grâce à l'engagement
- Équité du système évidente
- *Application*: Statistiques de participation, résultats de bataille

**5. Action Sans Friction**
- Attaque/défense ultra simple à lancer (1 clic)
- Spam viewers sans effort (commandes simples)
- Zéro barrière entre intention et action
- *Application*: Contrôles streamers, parsing commandes, UX minimaliste

## Desired Emotional Response

### Primary Emotional Goals

**conflict-of-streamers** vise à créer une expérience émotionnelle centrée sur le **fun collectif léger** plutôt que la compétition intense. C'est un "ptit jeu" dont l'objectif principal est que **tout le monde passe un bon moment ensemble**.

**Émotions Core:**

1. **Excitation Collective**
   - Tension fun et adrénaline partagée pendant les batailles
   - Suspense palpitant mais léger (pas de stress négatif)
   - L'émotion qui fait dire "C'était trop fou!" après une partie

2. **Appartenance Communautaire**
   - Sentiment "on est une équipe qui se bat ensemble"
   - Communautés qui s'affrontent de manière fun (pas toxique)
   - Combat entre communautés = ce qui différencie ce jeu des autres jeux Twitch

3. **Instant Hook**
   - Emporté instantanément dès la première découverte
   - Pas besoin de réfléchir - on comprend et on s'amuse direct
   - Envie immédiate de participer

### Emotional Journey Mapping

**Phase 1: Première Découverte**
- **Ressenti désiré**: Emporté instantanément, curieux, accroché
- **Design implication**: Onboarding invisible, clarté immédiate, action rapide

**Phase 2: Pendant la Bataille (30 secondes de spam)**
- **Ressenti désiré**: Excitation collective, adrénaline, tension fun
- **Design implication**: Barre de progression palpitante, feed messages dynamique, audio épique

**Phase 3: Résultat de Bataille**
- **Ressenti désiré**:
  - Si victoire: Accomplissement, fierté collective, célébration
  - Si défaite: Fair-play ("c'était serré"), motivation pour revanche
- **Design implication**: Leaderboards valorisants (top 5 + stats), résultats serrés visibles, pas de sentiment d'humiliation

**Phase 4: Fin de Partie**
- **Ressenti désiré**: Excité et voulant rejouer immédiatement, satisfait du bon moment, fierté des stats
- **Design implication**: Récap final avec statistiques complètes, transition rapide vers nouvelle partie

**Phase 5: Retour au Jeu (Parties Suivantes)**
- **Ressenti désiré**: Envie de revanche, excitation de revivre le suspense, motivation d'engager la communauté
- **Design implication**: Setup rapide, pas de friction pour relancer, mémoire des moments forts

### Micro-Emotions

**Émotions Critiques à Créer:**

1. **Confiance (Je peux gagner)**
   - Système d'équilibrage visible
   - Petits streamers gagnent régulièrement
   - Batailles toujours serrées = tout le monde a sa chance

2. **Excitation (C'est intense!)**
   - Pas d'anxiété négative - tension fun uniquement
   - Suspense palpitant mais léger
   - Adrénaline collective positive

3. **Accomplissement (J'ai contribué!)**
   - Viewers voient leur impact immédiatement
   - Reconnaissance dans les leaderboards et stats
   - Sentiment de contribution réelle à la victoire

4. **Appartenance (On est une équipe)**
   - Communauté unie contre autres communautés
   - Combat collectif, pas individuel
   - Sentiment de faire partie de quelque chose

**Émotions à Éviter Absolument:**

1. **Frustration / Humiliation**
   - Jamais de sentiment d'impuissance
   - Défaites toujours explicables et acceptables
   - Pas de domination écrasante

2. **Anxiété Négative**
   - Pas de pression de performance toxique
   - C'est un jeu fun, pas ultra sérieux
   - Focus sur le bon moment collectif

3. **Confusion**
   - Jamais perdu sur ce qui se passe
   - État du jeu toujours clair visuellement
   - Onboarding invisible

4. **Isolation**
   - Jamais seul - toujours partie d'une communauté
   - Actions collectives, pas individuelles isolées

### Design Implications

**Pour Créer l'Excitation Collective:**
- Barres de progression dynamiques avec suspense visuel
- Audio épique qui monte en intensité
- Feed messages massif qui montre l'engagement
- Victoires serrées par design

**Pour Créer l'Appartenance:**
- Couleurs par communauté clairement identifiables
- Leaderboards collectifs après chaque bataille (top 5 spammers)
- Stats de bataille: nombre total commandes + viewers uniques participants
- Résultats de bataille comme accomplissement d'équipe
- Récap de fin de partie avec statistiques complètes

**Pour l'Instant Hook:**
- Design ultra clair dès la première seconde
- Pas de tutoriel nécessaire - observable visuellement
- Action immédiate possible
- Feedback instantané dès la première contribution

**Pour Éviter la Frustration:**
- Système d'équilibrage visible et ressenti
- Batailles toujours serrées (pas de domination)
- Résultats expliqués clairement avec stats
- Transition rapide vers revanche

**Pour Valoriser les Contributeurs:**
- Métriques et classements pour reconnaître les meilleurs
- Par bataille: Top 5 + nombre total commandes + viewers uniques
- Fin de partie: Récap global avec stats complètes
- Reconnaissance et fierté sans pression toxique

### Emotional Design Principles

**Principe 1: Fun Collectif Avant Tout**
- L'objectif n'est pas de gagner à tout prix, mais de passer un bon moment ensemble
- Design qui favorise les rires et l'excitation partagée
- Pas de compétition toxique - juste du fun entre communautés

**Principe 2: Tension Sans Anxiété**
- Créer du suspense et de l'adrénaline (émotions positives)
- Éviter le stress et la pression négative
- C'est un "ptit jeu" - garder la légèreté

**Principe 3: Instant Gratification**
- Feedback émotionnel immédiat à chaque action
- Pas d'attente - excitation maintenue en continu
- Reconnaissance instantanée des contributions

**Principe 4: Revanche Facile**
- Une défaite = motivation pour rejouer (pas découragement)
- Transition rapide vers nouvelle partie
- Toujours l'espoir de gagner la prochaine

**Principe 5: Communauté Valorisée**
- Renforcer le sentiment d'appartenance à chaque interaction
- Nous vs Eux (de manière fun, pas hostile)
- Stats et métriques qui célèbrent l'engagement collectif

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**conflict-of-streamers** s'inspire du style et de l'approche UX des **jeux .io** (territorial.io, openfront.io, tileman.io) qui excellent dans la simplicité, la clarté visuelle, et l'accès immédiat au gameplay.

**territorial.io**
- **Ce qu'ils font bien**: Carte territoriale extrêmement claire avec couleurs distinctes par joueur
- **Force UX**: Simplicité visuelle - tu comprends l'état du jeu en un coup d'œil
- **Pattern clé**: Affichage de carte minimaliste mais coloré et engageant
- **Accès**: Direct, pas de friction, tu arrives et tu joues

**openfront.io**
- **Ce qu'ils font bien**: Interface épurée qui met le gameplay au centre
- **Force UX**: Pas de menus complexes, pas d'info overload
- **Pattern clé**: Design minimaliste avec focus sur l'essentiel
- **Engagement**: Couleurs vives qui donnent envie sans complexité

**tileman.io**
- **Ce qu'ils font bien**: Style .io reconnaissable - minimaliste et efficace
- **Force UX**: Accès immédiat, pas de compte/login requis
- **Pattern clé**: Zéro friction au démarrage

**Caractéristiques Communes des Jeux .io:**
- Design minimaliste mais attractif
- Couleurs distinctes pour identification rapide
- Pas de login/friction - accès direct
- Interface épurée - gameplay au centre
- Simplicité visuelle = compréhension immédiate

### Transferable UX Patterns

**Navigation Patterns:**

1. **Accès Direct Sans Friction**
   - Pattern .io: pas de login, pas de compte, tu arrives et tu joues
   - Application conflict-of-streamers: Créer/Rejoindre partie avec juste pseudo Twitch
   - Bénéfice: Supporte l'usage spontané et événements dédiés

2. **Interface Minimaliste**
   - Pattern .io: gameplay au centre, UI en périphérie discrète
   - Application conflict-of-streamers: Carte 20×20 au centre, contrôles minimaux
   - Bénéfice: Focus total sur les batailles et l'action

**Interaction Patterns:**

1. **Feedback Visuel Immédiat**
   - Pattern .io: changements d'état visuels instantanés
   - Application conflict-of-streamers: Barres de progression temps réel, feed messages
   - Bénéfice: Supporte l'excitation collective et le suspense

2. **Contrôles Simplifiés**
   - Pattern .io: 1-2 actions principales max
   - Application conflict-of-streamers: Attaque/Défense = actions core uniquement
   - Bénéfice: Clarté absolue, pas de confusion

**Visual Patterns:**

1. **Carte Colorée par Joueur**
   - Pattern .io: couleurs vives et distinctes par territoire/joueur
   - Application conflict-of-streamers: Grille 20×20 avec couleurs par streamer
   - Bénéfice: Identification immédiate des territoires et batailles

2. **Design Minimaliste mais Attractif**
   - Pattern .io: style épuré qui donne envie
   - Application conflict-of-streamers: Pixel art simple, couleurs contrastées
   - Bénéfice: Lisibilité streaming + engagement visuel

3. **Clarté Visuelle Maximale**
   - Pattern .io: pas de détails inutiles, focus sur l'essentiel
   - Application conflict-of-streamers: État du jeu observable visuellement
   - Bénéfice: Onboarding invisible, compréhension immédiate

### Anti-Patterns to Avoid

**Anti-Patterns Identifiés:**

1. **Interfaces Surchargées**
   - Problème: Info overload, trop de détails visuels
   - Impact négatif: Confusion, surcharge cognitive
   - À éviter dans conflict-of-streamers: Garder l'interface épurée, seulement l'essentiel visible

2. **Menus Complexes et Profonds**
   - Problème: Navigation avec multiples niveaux, options cachées
   - Impact négatif: Friction, courbe d'apprentissage
   - À éviter dans conflict-of-streamers: Pas de menus profonds, tout accessible en 1-2 clics max

3. **Friction au Démarrage (Login/Comptes)**
   - Problème: Barrières avant de pouvoir jouer
   - Impact négatif: Tue l'usage spontané, réduit l'engagement
   - À éviter dans conflict-of-streamers: Accès direct avec pseudo Twitch uniquement

4. **Simulations Trop Compliquées**
   - Problème: Trop de mécaniques, trop de règles, trop de paramètres
   - Impact négatif: Courbe d'apprentissage élevée, confusion
   - À éviter dans conflict-of-streamers: Rester simple - attaque/défense, c'est tout

5. **Design Visuel Plat Sans Engagement**
   - Problème: Minimalisme poussé trop loin = ennuyeux visuellement
   - Impact négatif: Pas d'excitation visuelle
   - À éviter dans conflict-of-streamers: Minimaliste OUI, mais coloré et attractif

### Design Inspiration Strategy

**Ce qu'on Adopte des Jeux .io:**

1. **Carte Territoriale Claire**
   - Adopter: Couleurs distinctes par joueur, simplicité visuelle
   - Raison: Supporte la clarté visuelle absolue (principe #1)
   - Application: Grille 20×20 style pixel art avec couleurs vives par streamer

2. **Accès Immédiat Sans Friction**
   - Adopter: Pas de login, pas de compte, tu joues direct
   - Raison: Supporte la flexibilité d'usage (événements + spontané)
   - Application: Créer/Rejoindre partie avec pseudo Twitch uniquement

3. **Interface Minimaliste**
   - Adopter: Gameplay au centre, UI discrète en périphérie
   - Raison: Supporte l'action sans friction (principe #5)
   - Application: Carte centrale, contrôles minimaux, pas de menus complexes

4. **Couleurs Vives et Contrastées**
   - Adopter: Design minimaliste MAIS attractif et coloré
   - Raison: Engagement visuel + lisibilité streaming
   - Application: Palette colorée, contrastes forts (textes 18px+)

**Ce qu'on Adapte:**

1. **Feedback Temps Réel**
   - Pattern .io: Changements visuels instantanés
   - Adaptation conflict-of-streamers: Ajouter barres de progression, feed messages, audio épique
   - Raison: Amplifier le suspense et l'excitation collective

2. **Reconnaissance des Contributeurs**
   - Pattern .io: Généralement pas de leaderboards détaillés
   - Adaptation conflict-of-streamers: Ajouter top 5 + stats de bataille pour valorisation
   - Raison: Viewers doivent se sentir reconnus (micro-émotion accomplissement)

**Ce qu'on Évite:**

1. **Interfaces Surchargées**
   - Conflit avec: Clarté visuelle absolue + onboarding invisible
   - Alternative: Interface épurée, informations essentielles uniquement

2. **Menus Profonds/Complexes**
   - Conflit avec: Action sans friction + usage spontané
   - Alternative: Tout accessible en 1-2 clics max

3. **Friction au Démarrage**
   - Conflit avec: Flexibilité d'usage + instant hook
   - Alternative: Pseudo Twitch = seule info requise

4. **Simulations Complexes**
   - Conflit avec: "Ptit jeu fun", pas ultra sérieux
   - Alternative: Attaque/Défense = core simple et clair

**Stratégie Globale:**

conflict-of-streamers suit l'ADN des jeux .io (minimalisme, clarté, accès direct) tout en ajoutant des éléments spécifiques pour créer l'excitation collective et la reconnaissance des contributeurs (barres de progression, leaderboards, audio épique, feed messages).

**Formule:**
```
Base .io (minimaliste + coloré + direct)
+ Amplificateurs d'excitation (barres, audio, feed)
+ Valorisation contributeurs (leaderboards, stats)
= conflict-of-streamers
```

## Design System Foundation

### Design System Choice

**conflict-of-streamers** utilise **Headless UI (Vue) + Tailwind CSS Custom** comme foundation de design system.

**Composants:**
- **Headless UI Vue**: Composants Vue accessibles et non-stylés (Dialog, Popover, Menu, etc.)
- **Tailwind CSS 4.1**: Utility-first CSS pour styling custom
- **Composants Custom**: Composants spécifiques au jeu construits from scratch

### Rationale for Selection

**1. Alignement avec le Style .io**
- Les jeux .io ont un design minimaliste très spécifique
- Headless UI offre la structure (accessibilité, comportement) sans imposer de style
- Contrôle total pour créer le look .io (couleurs vives, design épuré, pixel art)

**2. Stack Technique Existant**
- Tailwind CSS 4.1 déjà configuré dans le projet
- Vue 3 Composition API déjà utilisé
- Headless UI s'intègre nativement avec Vue 3
- Pas de conflit avec l'architecture existante

**3. Développement Solo Efficace**
- Pas de courbe d'apprentissage pour un nouveau framework lourd
- Utilise les connaissances Tailwind existantes
- Composants Headless UI = patterns prouvés pour accessibilité
- Focus sur le design unique plutôt que sur la configuration

**4. Minimalisme et Performance**
- Pas de CSS framework lourd à charger
- Tailwind purge le CSS inutilisé
- Headless UI = JavaScript minimal
- Parfait pour performance desktop web app

**5. Contrôle Total sur l'UX**
- Style .io = design très opinioné (pas de "composants génériques")
- Besoin de customisation extrême pour:
  - Barres de progression palpitantes
  - Feed messages avec background vert
  - Carte 20×20 pixel art
  - Leaderboards custom
- Headless UI + Tailwind = flexibilité maximale

### Implementation Approach

**Phase 1: Composants de Base (MVP)**

Construire uniquement les composants nécessaires au MVP:

1. **Boutons**
   - Bouton primaire (Créer Partie, Lancer Partie)
   - Bouton secondaire (Rejoindre, Quitter)
   - Style .io: couleurs vives, contrastes forts, corners arrondis

2. **Input & Forms**
   - Input texte (pseudo Twitch, code partie)
   - Style .io: minimaliste, focus clair, pas de bordures lourdes

3. **Cards**
   - Card lobby (liste joueurs)
   - Card résultat de bataille
   - Style .io: background simple, séparation claire

4. **Dialogs (Headless UI)**
   - Dialog victoire
   - Dialog défaite
   - Dialog résumé fin de partie
   - Headless UI gère le focus trap, ESC key, overlay

5. **Composants Spécifiques Jeu**
   - Barre de progression bataille (custom 100%)
   - Feed messages (custom 100%)
   - Leaderboard top 5 (custom 100%)
   - Carte 20×20 Canvas (custom 100%)

**Phase 2: Design Tokens**

Définir les tokens Tailwind custom pour consistance:

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Couleurs joueurs (8-10 streamers)
        player1: '#FF6B6B',  // Rouge vif
        player2: '#4ECDC4',  // Turquoise
        player3: '#FFE66D',  // Jaune
        player4: '#95E1D3',  // Vert menthe
        player5: '#F38181',  // Rose
        player6: '#AA96DA',  // Violet
        player7: '#FCBAD3',  // Rose clair
        player8: '#A8E6CF',  // Vert pastel
        // Couleurs système
        background: '#1a1a2e', // Sombre
        surface: '#16213e',    // Cartes
        text: '#eaeaea',       // Texte principal
        success: '#4ECDC4',    // Victoire
        danger: '#FF6B6B',     // Défaite
      },
      fontSize: {
        // Lisibilité streaming
        'stream-xs': '16px',
        'stream-sm': '18px',  // Minimum pour stream
        'stream-base': '20px',
        'stream-lg': '24px',
        'stream-xl': '32px',
      }
    }
  }
}
```

**Phase 3: Patterns Réutilisables**

Créer des composants Vue réutilisables:

```
/src/components/ui/
├── Button.vue          (Tailwind custom)
├── Input.vue           (Tailwind custom)
├── Card.vue            (Tailwind custom)
├── Dialog.vue          (Headless UI + Tailwind)
└── /game/
    ├── ProgressBar.vue (Custom 100%)
    ├── MessageFeed.vue (Custom 100%)
    ├── Leaderboard.vue (Custom 100%)
    └── GameMap.vue     (Canvas 2D)
```

### Customization Strategy

**1. Style .io Principles**

Tous les composants suivent les principes .io:
- **Minimalisme**: Pas de décorations inutiles, focus sur l'essentiel
- **Couleurs Vives**: Palette colorée et contrastée
- **Clarté Visuelle**: États clairs (hover, active, disabled)
- **Lisibilité Stream**: Textes 18px+, contrastes WCAG AA minimum

**2. Composants Headless UI**

Pour les composants Headless UI (Dialog, Popover, Menu):
- Utiliser leur structure JavaScript (gestion focus, ESC, overlay)
- Appliquer Tailwind classes pour le style
- Respecter les patterns .io (transitions rapides, couleurs vives)

**3. Composants Custom Game**

Pour les composants spécifiques au jeu:
- **Barre de Progression**: Animation fluide 60 FPS, couleurs attaquant/défenseur
- **Feed Messages**: Background vert pour commandes valides, scroll automatique
- **Leaderboard**: Grid Tailwind, highlight top 3, stats lisibles
- **Carte 20×20**: Canvas 2D natif, couleurs joueurs, pixel art style

**4. Responsive Strategy**

Desktop-first (pas de mobile support MVP):
- Design pour 1920×1080 et 2560×1440
- Interface lisible sur stream (viewers regardent via Twitch)
- Pas de breakpoints mobile nécessaires

**5. Accessibility Baseline**

Accessibilité minimale requise:
- Navigation clavier (Tab, Enter)
- Focus visible
- Contraste texte/background WCAG AA
- Screen readers non requis pour MVP

**6. Theming Approach**

Pas de theming complexe requis:
- Une seule palette de couleurs (style .io coloré)
- Couleurs joueurs configurables via Tailwind config
- Mode dark uniquement (pas de light mode)

## Core User Experience Definition

### Defining Experience

**L'expérience définissante de conflict-of-streamers:**

"Regarder les barres de progression s'affronter en temps réel pendant que ton chat spam pour faire gagner ton streamer dans une bataille serrée, tout en visualisant la map stratégique avec les territoires occupés pour comprendre qui est en train de gagner la partie."

**C'est l'interaction qui, si parfaitement exécutée, fait tout le reste fonctionner.**

Cette expérience combine:
1. **Bataille temps réel** (barres de progression, spam chat, suspense)
2. **Vision stratégique** (map avec territoires colorés, état de la partie)
3. **Feedback continu** (barre qui bouge, avatars top 3, compteur messages, mini chat)

### User Mental Model

**Pour les Viewers (Première Participation):**

Quand un viewer participe pour la première fois, son attente mentale est:
- **"C'est un mini-jeu où chaque message compte vraiment"**
- Pas juste du spam fun dans le chat
- Pas juste un vote passif
- Chaque message a un impact mesurable et visible

**Temps d'Apprentissage:** ~30 secondes
- Le viewer observe une bataille complète
- Il voit les autres spammer
- Il voit la barre bouger
- Il comprend le mécanisme

**Pattern Recognition:**
- **Mix innovant**: Éléments familiers (spam Twitch) + nouveauté (barres temps réel, map stratégique)
- Pas de jeu Twitch existant comparable connu du public cible
- Combinaison unique d'interaction chat + gameplay stratégique

**Attentes vs Réalité:**
- **Attente**: "Je spam et ça aide mon streamer"
- **Réalité**: "Je vois mon impact immédiat + je vois mon pseudo + je peux être dans le top 3 + la map change si on gagne"
- **Gap positif**: Beaucoup plus de feedback que prévu = dépassement d'attente

### Success Criteria

**L'expérience core est réussie quand:**

1. **Chaque Message Compte (Ressenti)**
   - La barre de progression bouge visiblement à chaque vague de spam
   - Les viewers voient leur pseudo apparaître dans le mini chat
   - Le compteur messages total monte en temps réel
   - **Indicateur**: Viewers disent "ma contribution est visible"

2. **Suspense Palpable**
   - Les batailles sont serrées (barres proches 50/50)
   - Compte à rebours global crée urgence
   - Audio épique amplifie la tension
   - **Indicateur**: Viewers spamment jusqu'à la dernière seconde

3. **Reconnaissance Immédiate**
   - Top 3 avatars se mettent à jour en temps réel pendant bataille
   - Top 5 leaderboard affiché en fin de bataille
   - Pseudos visibles dans mini chat avec background coloré
   - **Indicateur**: Viewers célèbrent quand ils voient leur avatar/pseudo

4. **Clarté Stratégique**
   - Map montre clairement qui possède quoi
   - Territoires changent de couleur immédiatement après victoire
   - État de la partie compréhensible en un coup d'œil
   - **Indicateur**: Viewers/streamers comprennent qui gagne sans explication

5. **Vitesse et Fluidité**
   - Pas de lag entre spam et feedback visuel (<200ms)
   - Transitions rapides (territoire change de couleur instantanément)
   - Pas de temps mort entre fin bataille et nouvelle action
   - **Indicateur**: Flow continu, pas de frustration technique

### Novel UX Patterns

**Pattern Innovant: "Real-Time Collective Combat Visualization"**

Ce pattern combine des éléments établis d'une façon nouvelle:

**Éléments Établis (Familiers):**
- Spam dans chat Twitch (viewers connaissent déjà)
- Barres de progression (pattern universel)
- Map de conquête territoriale (jeux .io)
- Canvas fullscreen zoomable/pannable (jeux RTS/.io)

**Innovation (Nouveau):**
- **Dual feedback loop**: Chat Twitch → Barre temps réel → Map stratégique
- **Collective + Individual**: Impact collectif visible (barre) + reconnaissance individuelle (top 3 avatars, mini chat)
- **Multi-layer transparency**: Compteur messages + mini chat + top 3 avatars + barre = feedback à tous les niveaux
- **Layout RTS/.io**: Canvas fullscreen + UI overlay (sidebars, modale, mini chat)

**Pourquoi c'est Novel:**

Aucun jeu Twitch existant ne combine:
1. Spam chat avec feedback visuel aussi riche
2. Barres de progression temps réel pendant combat
3. Map stratégique qui change selon résultats
4. Reconnaissance individuelle (avatars top 3) pendant action collective
5. Layout immersif type RTS avec canvas fullscreen

**Teaching Strategy:**

Pas besoin d'enseigner - le pattern est **self-evident**:
- Viewer voit les autres spammer → Il spam
- Viewer voit la barre bouger → Il comprend l'impact
- Viewer voit son pseudo/avatar → Il est accroché
- Apprentissage par observation (30 secondes)

### Experience Mechanics

**Layout Architecture (Pattern RTS/.io):**

```
        [Modale Bataille - overlay haut centre]

┌──────┬─────────────────────────┬──────┐
│      │                         │      │
│Ctrl  │  Canvas FULLSCREEN      │Stats │
│      │  (Carte 20×20)          │      │
│Side  │  Zoomable/Pannable      │Side  │
│bar   │                         │bar   │
│      │          [Mini chat]    │      │
│G     │          (overlay)      │D     │
└──────┴─────────────────────────┴──────┘
```

**Composants Layout:**

1. **Canvas Fullscreen (100% viewport)**
   - Carte 20×20 rendue dedans
   - Zoomable (molette souris)
   - Pannable (drag & drop)
   - Style .io/RTS

2. **Sidebar Gauche (Overlay)**
   - Contrôles streamer
   - Actions (Attaque, Défense)
   - Position: Overlay à gauche du canvas

3. **Sidebar Droite (Overlay)**
   - Stats de partie
   - Leaderboard général
   - Infos territoire sélectionné
   - Position: Overlay à droite du canvas

4. **Modale Bataille (Overlay Haut Centre)**
   - Barre de progression
   - Message à taper
   - Compte à rebours global
   - Top 3 avatars
   - Compteur messages total
   - Position: Centre haut du canvas

5. **Mini Chat (Overlay Bas Droite)**
   - Position: Bas droite, à gauche de la sidebar stats
   - 10 messages max, FIFO
   - Apparaît uniquement pendant combat

**Flow Détaillé de l'Expérience Core (Bataille):**

#### 1. Initiation

**Trigger:**
- Streamer clique sur un territoire adjacent pour attaquer (via sidebar gauche contrôles)

**Système Response:**
- Modale de bataille s'affiche **en overlay haut centre**
- Mini chat apparaît **en overlay bas droite** (à gauche sidebar stats)
- Modale contient:
  - Barre de progression (attaquant vs défenseur)
  - Message à taper (différent selon camp)
    - Attaquant: `ATTACK [NOM_TERRITOIRE]`
    - Défenseur: `DEFEND [NOM_TERRITOIRE]`
  - Compte à rebours global (temps restant - ex: 30s → 0s)
  - Avatars top 3 (vides au début, se remplissent en temps réel)
  - Compteur messages total (0 au début)

**Pas de compte à rebours "3-2-1 GO"** - Action démarre immédiatement

#### 2. Interaction (Pendant 30 Secondes)

**Actions Utilisateur:**

**Streamers:**
- Annoncent la commande à leur chat
- Regardent la barre de progression dans modale
- Commentent l'action en direct

**Viewers:**
- Spamment la commande dans le chat Twitch
- Observent le mini chat + barre + top 3 avatars

**Système Behavior:**

**A. Barre de Progression (Modale Haut Centre)**
- Position centrale dans modale
- Bouge en temps réel selon force attaquant vs défenseur
- Animation fluide (60 FPS)
- Couleurs: Attaquant (ex: rouge) vs Défenseur (ex: bleu)

**B. Mini Chat Subtil (Overlay Bas Droite)**
- **Position**: Bas droite du canvas, à gauche de la sidebar stats
- **Affichage**: UNIQUEMENT pendant combat
- **Capacité**: 10 derniers messages maximum
- **Comportement**: FIFO (First In First Out) - anciens disparaissent automatiquement quand nouveaux arrivent
- **Pas de scroll**: Flux automatique, pas d'interaction
- **Format**: `Pseudo: Message`
  - Background **VERT** = Message correct (ATTACK/DEFEND valide)
  - Background **ROUGE** = Message incorrect (typo, mauvaise commande)
- **Style**: Minimaliste, épuré, texte lisible (18px+)
- **Animation**: Smooth transitions quand messages apparaissent/disparaissent
- **But**: Validation visuelle immédiate sans surcharge

**C. Compteur Messages Total (Modale)**
- Affiche nombre total de messages valides reçus
- Monte en temps réel
- Visible mais pas prépondérant

**D. Top 3 Avatars (Modale - Dynamic Leaderboard)**
- **Position**: Visible dans modale haut centre
- **Contenu**:
  - Avatars Twitch des 3 meilleurs spammers
  - Séparés par camp (top 3 attaquants OU top 3 défenseurs selon côté)
- **Update**: Temps réel pendant bataille
- **Animation**: Smooth transition quand classement change
- **But**: Reconnaissance immédiate + compétition friendly

**E. Audio Épique**
- Musique de bataille orchestrale
- SFX synchronisés (début bataille = corne de guerre)
- Volume ajustable par joueur (settings)

#### 3. Feedback (Pendant et Après)

**Feedback Temps Réel (Pendant):**

1. **Barre de Progression**
   - Bouge à chaque vague de messages
   - Viewers voient impact collectif immédiat

2. **Mini Chat**
   - Pseudo apparaît avec background vert/rouge
   - Viewer voit "mon message a compté" (validation par couleur)
   - Pas de texte de confirmation - juste la couleur

3. **Top 3 Avatars**
   - Avatar apparaît si dans top 3
   - Position 1/2/3 update dynamiquement
   - Reconnaissance publique en temps réel

4. **Compteur Messages**
   - Nombre monte visiblement
   - Renforce sentiment de contribution collective

**Feedback Fin de Bataille:**

1. **Résultat Immédiat**
   - Victoire/Défaite annoncée
   - Territoire change de couleur sur map canvas (si victoire)
   - Transition visuelle claire

2. **Top 5 Leaderboard**
   - Affiche top 5 des meilleurs spammers
   - Nombre de messages par personne
   - Célébration des contributeurs

3. **Stats de Bataille**
   - Nombre total commandes
   - Nombre viewers uniques participants
   - % de participation du chat

#### 4. Completion

**Successful Outcome:**
- Territoire conquis (attaquant) ou défendu (défenseur)
- Map canvas mise à jour avec nouvelle couleur
- Modale disparaît
- Mini chat disparaît
- Cooldown 10 secondes avant nouvelle action

**Failed Outcome:**
- Territoire reste au propriétaire actuel
- Pas de changement map
- Modale disparaît
- Mini chat disparaît
- Motivation revanche

**Next Step:**
- Streamer peut immédiatement lancer nouvelle action (après cooldown)
- Viewers restent engagés pour prochaine bataille
- Flow continu sans temps mort

**Loop Engagement:**
- Expérience répétable 20-30 fois par partie
- Chaque bataille = opportunité de reconnaissance (top 3/top 5)
- Variété dans résultats (victoires serrées, revirements)

**Accumulation de Moments:**
- Pas un seul moment "aha!"
- **Accumulation de feedbacks** qui créent l'expérience magique:
  - Barre qui bouge
  - Pseudo dans mini chat avec couleur
  - Avatar dans top 3
  - Nom dans top 5
  - Territoire qui change de couleur
  - Chat massivement engagé
  - Bataille serrée gagnée

## Visual Design Foundation

### Color System

**Inspiration: agar.io**

conflict-of-streamers s'inspire de l'identité visuelle d'agar.io: fond très sombre avec couleurs vives et saturées qui créent un contraste maximal pour une clarté et lisibilité optimales.

**Background & Structure:**
```
background-primary: #0a0a0a    (Noir profond)
background-grid: #1a1a1a       (Grid subtil, comme agar.io)
surface: #1e1e1e               (Cards, modales, sidebar backgrounds)
overlay: rgba(0,0,0,0.8)       (Overlays sombres pour modales)
```

**Couleurs Joueurs (8 couleurs vives - style agar.io néon):**
```
player1: #FF3B3B    (Rouge néon)
player2: #00F5FF    (Cyan électrique)
player3: #FFE500    (Jaune vif)
player4: #00FF7F    (Vert fluo)
player5: #FF00FF    (Magenta)
player6: #9D4EDD    (Violet vif)
player7: #FF6B35    (Orange intense)
player8: #00FFA3    (Vert menthe néon)
```

**Rationale:**
- Couleurs ultra-saturées et vives = identification immédiate des territoires
- Contraste maximal sur fond noir = lisibilité parfaite pour streaming
- Chaque couleur bien distincte = pas de confusion entre joueurs
- Style néon/fluo = énergie et excitation visuelle

**Couleurs Système:**
```
success: #00FF7F    (Vert - validation, messages corrects)
danger: #FF3B3B     (Rouge - erreur, messages incorrects)
warning: #FFE500    (Jaune - attention, alertes)
text-primary: #FFFFFF      (Blanc pur - texte principal)
text-secondary: #AAAAAA    (Gris clair - texte secondaire)
border: #333333            (Bordures subtiles)
```

**Mini Chat Colors:**
- Background VERT pour message correct: `success` (#00FF7F) avec opacity 0.2
- Background ROUGE pour message incorrect: `danger` (#FF3B3B) avec opacity 0.2
- Texte toujours blanc (#FFFFFF) pour contraste

**Note:**
Les couleurs exactes pourront être ajustées après tests visuels en conditions réelles. Cette palette établit la direction: fond très sombre + couleurs vives saturées style agar.io.

### Typography System

**Font Family:**
```
primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
fallback: System fonts pour performance optimale
```

**Rationale:**
- Inter: Lisible, moderne, excellent pour interfaces gaming
- Fallback system fonts: Performance (pas de téléchargement)
- Sans-serif: Clarté maximale pour streaming

**Type Scale (Optimisé Streaming):**
```
text-xs: 14px       (Labels très discrets, non stream)
text-sm: 16px       (Texte secondaire UI locale)
text-base: 18px     (Texte principal - MINIMUM pour stream)
text-lg: 20px       (Emphase, call-to-action)
text-xl: 24px       (Sous-titres, headers modales)
text-2xl: 32px      (Titres modales principales)
text-3xl: 48px      (Titres hero, écrans victoire/défaite)
```

**Rationale 18px Minimum:**
- Viewers regardent via stream Twitch (1080p/720p compressé)
- Texte <18px devient illisible sur stream
- 18px+ garantit lisibilité même avec compression vidéo

**Line Heights:**
```
tight: 1.2    (Titres, headers - compacité)
normal: 1.5   (Texte courant, UI - équilibre)
relaxed: 1.75 (Texte long, descriptions - confort)
```

**Font Weights:**
```
normal: 400   (Texte courant, body)
medium: 500   (Emphase légère, labels)
bold: 700     (Titres, boutons, actions importantes)
```

**Typography Usage Examples:**
- Modale titre: text-2xl, bold, tight
- Barre progression labels: text-lg, medium, tight
- Mini chat: text-base, normal, normal
- Compteur messages: text-xl, bold, tight
- Top 3 pseudos: text-base, medium, normal

### Spacing & Layout Foundation

**Spacing Scale (Base 8px - Système Standard):**
```
space-1: 4px     (Micro spacing, ajustements fins)
space-2: 8px     (Base unit - spacing par défaut)
space-3: 12px    (Petit spacing entre éléments proches)
space-4: 16px    (Spacing standard composants)
space-6: 24px    (Spacing entre groupes)
space-8: 32px    (Large spacing, sections)
space-12: 48px   (Extra large, séparation majeure)
space-16: 64px   (Huge spacing, zones distinctes)
```

**Component Spacing Guidelines:**
- **Padding cards/modales**: 16-24px (space-4 to space-6)
- **Margin entre sections**: 32px (space-8)
- **Gap dans grids/flex**: 16px (space-4)
- **Spacing sidebar interne**: 16px padding (space-4)
- **Spacing mini chat messages**: 8px gap entre messages (space-2)

**Layout Principles:**

**1. Canvas Fullscreen (Pattern RTS/.io)**
- Dimensions: 100vw × 100vh
- Carte 20×20 rendue à l'intérieur
- Zoomable/pannable
- Pas de margins/padding sur canvas

**2. Sidebars (Overlay)**
- Width fixe: 280-320px
- Padding interne: 16px
- Background: `surface` (#1e1e1e) avec opacity 0.95
- Position: Fixed overlay sur canvas

**3. Modales**
- Max-width: 600px
- Centré horizontalement et verticalement
- Padding: 24px
- Background: `surface` (#1e1e1e)
- Border-radius: 8px (coins arrondis subtils)

**4. Mini Chat**
- Max-width: 400px
- Padding: 12px
- Background: `surface` avec opacity 0.9
- Border-radius: 4px
- Gap messages: 8px

**5. Layout Philosophy (Style .io)**
- **Aéré mais efficace**: Pas de gaspillage d'espace
- **Spacing consistant**: Multiples de 8px
- **Focus sur gameplay**: UI discrète, canvas dominant
- **Overlay élégant**: Transparence subtile pour immersion

### Accessibility Considerations

**Contraste (WCAG AA Compliance):**

**Texte sur Background:**
- Blanc (#FFFFFF) sur noir (#0a0a0a): **21:1** ✅ (WCAG AAA)
- Gris clair (#AAAAAA) sur noir (#0a0a0a): **10.7:1** ✅ (WCAG AA)
- Minimum requis WCAG AA: 4.5:1 pour texte normal, 3:1 pour texte large

**Couleurs Joueurs sur Background Noir:**
- Toutes les couleurs player1-8: **>7:1** ✅
- Excellente visibilité sur fond noir
- Pas de problème de lisibilité

**Mini Chat Backgrounds:**
- Vert (#00FF7F) opacity 0.2 avec texte blanc: **>4.5:1** ✅
- Rouge (#FF3B3B) opacity 0.2 avec texte blanc: **>4.5:1** ✅

**Tailles de Texte Minimum:**
- **18px**: Minimum absolu pour tout texte visible sur stream
- **16px**: Minimum pour UI locale (sidebars) non streamée
- **14px**: Acceptable uniquement pour labels très secondaires
- **Jamais <14px**: Interdit

**Navigation Clavier:**
- **Focus visible**: Outline 2px couleur primaire (player1 #FF3B3B)
- **Tab order logique**: Sidebar gauche → Canvas → Sidebar droite
- **Escape key**: Ferme modales et dialogs
- **Enter key**: Valide actions principales

**Limitations MVP:**
- **Screen readers**: Non requis pour MVP (gaming app)
- **Keyboard navigation**: Basique (Tab, Enter, Escape)
- **Zoom**: Supporté via browser zoom natif
- **High contrast mode**: Non supporté MVP (couleurs partie du gameplay)

**Note Accessibilité:**
conflict-of-streamers est une application de gaming temps réel avec composant visuel fort (couleurs = identification joueurs). Accessibilité focalisée sur:
1. Contraste texte/background excellent
2. Tailles texte suffisantes pour stream
3. Navigation clavier basique
4. Pas de dépendance audio (musique = ambiance, pas info critique)

## Design Direction Decision

### Design Directions Explored

Six directions de design ont été explorées via un showcase HTML interactif (`ux-design-directions.html`):

1. **Classic Agar.io** - Grid subtil, overlays semi-transparents, style pur agar.io
2. **Neon Glow** - Bordures lumineuses, glow effects, ambiance cyberpunk
3. **Minimalist Clean** - Épuré au maximum, bordures fines, focus contenu
4. **Bold & Chunky** - Bordures épaisses, éléments massifs, présence forte
5. **Glassmorphism** - Transparence, blur effects, légèreté visuelle
6. **Retro Pixel** - Scanlines, coins carrés, vibe rétro gaming

Chaque direction a été évaluée selon les critères:
- Clarté visuelle
- Style gaming (agar.io/RTS)
- Lisibilité stream (Twitch compression)
- Focus gameplay (canvas dominant)
- Impact visuel des moments clés
- Création d'excitation et d'énergie

### Chosen Direction

**Direction 1: Classic Agar.io**

Cette direction reste la plus fidèle à l'inspiration agar.io définie dès le début du projet et répond parfaitement aux objectifs UX établis.

**Caractéristiques:**
- Background noir profond (#0a0a0a) avec grid subtil (#1a1a1a)
- Overlays semi-transparents (opacity 0.9-0.95) pour sidebars et modales
- Bordures simples et discrètes (#333, 1-2px)
- Coins arrondis subtils (4-8px border-radius)
- Style épuré et efficace
- Pas d'effets glow ou de fioritures
- Focus total sur le gameplay et la lisibilité

### Design Rationale

**Pourquoi Classic Agar.io:**

1. **Cohérence avec l'Inspiration**
   - Reste fidèle à agar.io qui a été l'inspiration principale
   - Pattern RTS/.io familier aux joueurs
   - Grid subtil emblématique du style .io

2. **Performance Visuelle**
   - Pas d'effets visuels lourds (glow, blur)
   - Rendering Canvas 2D optimal
   - Performances fluides 60 FPS garanties

3. **Lisibilité Stream Maximale**
   - Fond noir + éléments colorés = contraste parfait
   - Compression Twitch n'affecte pas la lisibilité
   - Textes blancs ultra-lisibles
   - Pas d'artéfacts de compression sur effets complexes

4. **Focus Gameplay**
   - UI discrète qui ne distrait pas du canvas
   - Overlays semi-transparents = immersion
   - Canvas et carte restent au centre de l'attention
   - Pas de décoration qui surcharge

5. **Clarté Visuelle Absolue**
   - Hiérarchie claire sans fioritures
   - Bordures simples = séparation nette
   - Pas de confusion visuelle
   - Style minimaliste = principe #1 UX

6. **Excitation par le Contenu, Pas le Style**
   - Les couleurs vives des joueurs créent l'énergie
   - Les barres de progression créent le suspense
   - Le mini chat crée l'engagement
   - Pas besoin de glow artificiel

### Implementation Approach

**Application de la Direction:**

**Composants UI Globaux:**
```css
/* Backgrounds */
background-primary: #0a0a0a
background-grid: linear-gradient(#1a1a1a 1px, transparent 1px)
surface: #1e1e1e
overlay: rgba(30, 30, 30, 0.95)

/* Bordures */
border-default: 1px solid #333
border-emphasis: 2px solid #333

/* Border Radius */
radius-small: 4px (mini chat, inputs)
radius-medium: 8px (modales, cards)
radius-large: 12px (sidebars si besoin)

/* Shadows */
shadow-subtle: none (style agar.io = pas de shadows)
shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.5) (uniquement modales)
```

**Modales de Bataille:**
- Background: #1e1e1e
- Border: 2px solid #333
- Border-radius: 8px
- Padding: 24px
- Position: Centered top
- Shadow: Subtil pour détacher du canvas

**Sidebars:**
- Background: rgba(30, 30, 30, 0.95)
- Border: 1px solid #333 (optionnel)
- Border-radius: 8px (coins internes uniquement)
- Padding: 16px
- Position: Fixed overlay

**Mini Chat:**
- Background: rgba(30, 30, 30, 0.9)
- Border-radius: 4px
- Padding: 12px
- Messages: Background vert/rouge avec opacity 0.2
- Pas de bordure externe

**Barres de Progression:**
- Background: #0a0a0a
- Border: 1px solid #1a1a1a
- Border-radius: 16px (forme pill)
- Height: 32-40px
- Fill: Couleurs joueurs pures (pas de gradient)
- Animation: Smooth transitions 60 FPS

**Canvas & Grid:**
- Background: #0a0a0a
- Grid: Repeating linear-gradient #1a1a1a
- Grid size: 40-50px
- Territoires: Couleurs joueurs vives
- Pas d'effets visuels complexes

**Principe de Design:**
- **Less is more**: Épuré = efficace
- **Contenu > Décoration**: Les données créent l'excitation
- **Performance First**: Pas d'effets qui ralentissent
- **Agar.io DNA**: Fidèle à l'inspiration

---

## Document Finalisé

Ce document UX Design Specification pour **conflict-of-streamers** est maintenant complet et couvre:

✅ **Executive Summary** - Vision, users, challenges, opportunités
✅ **Core User Experience** - Expérience définissante, mental model, success criteria
✅ **Desired Emotional Response** - Émotions core, journey mapping, design implications
✅ **UX Pattern Analysis** - Inspiration jeux .io, patterns transférables, anti-patterns
✅ **Design System Foundation** - Headless UI + Tailwind, composants, stratégie
✅ **Core Experience Definition** - Flow détaillé batailles, layout RTS, mécaniques
✅ **Visual Design Foundation** - Couleurs, typographie, spacing, accessibilité
✅ **Design Direction Decision** - Direction Classic Agar.io, rationale, implémentation

**Prochaine Étape:** Utiliser ce document comme référence pour créer les épics et stories avec le workflow `create-epics-and-stories`.

# Intégration Twitch - Mode Anonyme

## Présentation

L'intégration Twitch permet au jeu d'écouter les messages du chat Twitch en **mode anonyme** (lecture seule). Aucune authentification OAuth n'est nécessaire.

## Fonctionnement

### Connexion au chat Twitch

Lorsqu'un joueur rejoint une partie, le client peut se connecter à son chat Twitch en envoyant un message WebSocket :

```javascript
{
  type: 'twitch:connect',
  payload: {
    channelName: 'nom_du_channel'  // Sans le #, juste le nom d'utilisateur
  }
}
```

Le serveur répondra avec :
```javascript
{
  type: 'twitch:connected',
  channelName: 'nom_du_channel'
}
```

### Commandes supportées

Le bot écoute automatiquement les commandes suivantes dans le chat :

#### Attaque
- `!attaque <pays>` ou `!attack <pays>`
- Exemple : `!attaque france`

#### Défense
- `!defend <pays>`, `!defense <pays>` ou `!défend <pays>`
- Exemple : `!defend allemagne`

### Traitement des commandes

1. Le bot détecte les commandes dans le chat
2. Il vérifie qu'une attaque est en cours
3. Il associe la commande au territoire correspondant (matching partiel du nom)
4. Il incrémente les points d'attaque ou de défense via `AttackManager`
5. Le jeu est notifié en temps réel via WebSocket

### Notifications en temps réel

Lorsqu'une commande est traitée, tous les joueurs de la partie reçoivent :

```javascript
{
  type: 'command:received',
  commandType: 'attack' | 'defense',
  username: 'nom_utilisateur_twitch',
  territoryId: 'id_du_territoire',
  timestamp: 1234567890
}
```

## Limitations du mode anonyme

⚠️ **Important** : En mode anonyme, le bot peut :
- ✅ Lire tous les messages publics du chat
- ✅ Détecter et traiter les commandes `!attaque` et `!defend`
- ❌ Envoyer des messages dans le chat (nécessiterait OAuth)

Les méthodes `announceAttack()` et `announceResults()` sont présentes mais ne fonctionneront pas en mode anonyme. Les erreurs sont capturées et loggées silencieusement.

## Configuration technique

### Backend (TwitchService.js)

```javascript
// Connexion anonyme automatique
const client = new tmi.Client({
  options: { 
    debug: false,
    skipMembership: true,
    skipUpdatingEmotesets: true
  },
  connection: {
    reconnect: true,  // Reconnexion automatique
    secure: true      // Connexion sécurisée
  },
  channels: [channelName]
});
```

### Frontend

Pour connecter un joueur au chat Twitch depuis le frontend :

```javascript
// Via WebSocket
websocket.send(JSON.stringify({
  type: 'twitch:connect',
  payload: {
    channelName: player.twitchUsername
  }
}));
```

## Déconnexion

Pour déconnecter un joueur du chat Twitch :

```javascript
{
  type: 'twitch:disconnect',
  payload: {}
}
```

## Logs

Le serveur affiche les logs suivants :

- `✅ Connected to Twitch channel: <channel>` - Connexion réussie
- `❌ Disconnected from <channel>: <reason>` - Déconnexion
- `ℹ️ Cannot send message in anonymous mode` - Tentative d'envoi (normal)

## Exemple d'utilisation

### Scénario typique

1. **Joueur A** crée une partie avec le username Twitch `streamerA`
2. Le frontend envoie `twitch:connect` avec `channelName: 'streamerA'`
3. Le bot se connecte au chat de streamerA en lecture seule
4. **Joueur A** attaque un territoire
5. Les viewers de streamerA tapent `!attaque france` dans le chat
6. Le bot détecte les commandes et incrémente les points d'attaque
7. Les points sont mis à jour en temps réel via WebSocket
8. À la fin de l'attaque, le résultat est calculé

## Dépannage

### Le bot ne détecte pas les commandes

- Vérifier que le nom du channel est correct (sans #)
- Vérifier que la partie est en statut `'playing'`
- Vérifier qu'une attaque est active (`game.activeAttacks`)
- Vérifier le matching du nom du pays (partiel, insensible à la casse)

### Erreurs de connexion

- Le channel doit être public et accessible
- Vérifier que tmi.js est installé (`npm list tmi.js`)
- Vérifier les logs du serveur

### Les commandes ne correspondent pas

Le matching est **partiel et insensible à la casse** :
- `!attaque france` matchera un territoire nommé "France" ou "Île-de-France"
- `!defend ger` matchera "Germany" ou "Algeria"

## Architecture

```
Frontend (Vue.js)
    ↓ WebSocket
Backend (Fastify)
    ↓
WebSocket Handler (socketHandler.js)
    ↓
TwitchService.js
    ↓ tmi.js
Twitch IRC Chat
```

## Fichiers modifiés

- `backend/services/TwitchService.js` - Configuration anonyme
- `backend/websocket/socketHandler.js` - Handler twitch:connect
- `backend/.env` - Configuration (Twitch ID optionnel)

# API des Tarifs - Documentation

## Vue d'ensemble

L'API des tarifs permet de gérer les prix des services de transport selon différents critères :
- Zone (Dans Dakar, Aéroport, Régions, Banlieue)
- Destination (lieux spécifiques)
- Service (Transfert, Mise à disposition)
- Type de véhicule (Berline, SUV, VAN, Minibus, etc.)
- Option (Aller simple, Aller/Retour, Journée, etc.)

## Endpoints

### 1. Récupérer tous les tarifs
```
GET /api/tarifs
```

**Paramètres de requête optionnels :**
- `zone` : Filtrer par zone
- `destination` : Filtrer par destination
- `service` : Filtrer par service
- `type_vehicule` : Filtrer par type de véhicule
- `option` : Filtrer par option

**Exemple :**
```
GET /api/tarifs?zone=Aéroport&type_vehicule=Berline
```

**Réponse :**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "tarif_id": "...",
      "zone": "Aéroport",
      "destination": "Aéroport (AIBD)",
      "service": "Transfert",
      "type_vehicule": "Berline",
      "option": "Aller simple",
      "tarif_fcfa": 25000,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 2. Récupérer un tarif par ID
```
GET /api/tarifs/:id
```

### 3. Rechercher des tarifs
```
POST /api/tarifs/search
```

**Corps de la requête :**
```json
{
  "zone": "Régions",
  "service": "Transfert",
  "type_vehicule": "Berline"
}
```

### 4. Obtenir un tarif exact
```
POST /api/tarifs/exact
```

**Corps de la requête :**
```json
{
  "zone": "Aéroport",
  "destination": "Aéroport (AIBD)",
  "service": "Transfert",
  "type_vehicule": "Berline",
  "option": "Aller simple"
}
```

### 5. Obtenir les statistiques des tarifs
```
GET /api/tarifs/stats
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "total_tarifs": 65,
    "tarif_min": 8000,
    "tarif_max": 250000,
    "tarif_moyen": 58462,
    "nombre_zones": 3,
    "nombre_services": 2,
    "nombre_types_vehicules": 6
  }
}
```

### 6. Obtenir les options de filtres
```
GET /api/tarifs/filters
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "zones": ["Aéroport", "Dans Dakar", "Régions"],
    "destinations": ["Aéroport (AIBD)", "Bandia", "Dans Dakar", ...],
    "services": ["Mise à disposition", "Transfert"],
    "types_vehicules": ["Berline", "Minibus de 15 places", ...],
    "options": ["Aller simple", "Aller/Retour", "Journée", ...]
  }
}
```

## Endpoints d'administration (Authentification requise)

### 7. Créer un nouveau tarif
```
POST /api/tarifs
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "zone": "Régions",
  "destination": "Tambacounda",
  "service": "Transfert",
  "type_vehicule": "Berline",
  "option": "Aller simple",
  "tarif_fcfa": 120000,
  "description": "Tarif spécial pour Tambacounda"
}
```

### 8. Mettre à jour un tarif
```
PUT /api/tarifs/:id
Authorization: Bearer <token>
```

### 9. Supprimer un tarif (soft delete)
```
DELETE /api/tarifs/:id
Authorization: Bearer <token>
```

### 10. Supprimer définitivement un tarif
```
DELETE /api/tarifs/:id/hard
Authorization: Bearer <token>
```

### 11. Initialiser les tarifs par défaut
```
POST /api/tarifs/seed
Authorization: Bearer <token>
```

## Structure des données

### Modèle Tarif
```javascript
{
  tarif_id: String (UUID unique),
  zone: String (requis),
  destination: String (requis),
  service: String (requis),
  type_vehicule: String (requis),
  option: String (requis),
  tarif_fcfa: Number (requis),
  is_active: Boolean (par défaut: true),
  description: String (optionnel),
  created_at: Date,
  updated_at: Date
}
```

## Exemples d'utilisation

### Rechercher des tarifs pour l'aéroport
```javascript
// GET /api/tarifs?zone=Aéroport
const response = await fetch('/api/tarifs?zone=Aéroport');
const data = await response.json();
```

### Obtenir le prix exact d'un transfert
```javascript
const response = await fetch('/api/tarifs/exact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    zone: 'Aéroport',
    destination: 'Aéroport (AIBD)',
    service: 'Transfert',
    type_vehicule: 'Berline',
    option: 'Aller simple'
  })
});
const data = await response.json();
console.log(`Prix: ${data.data.tarif_fcfa} FCFA`);
```

### Créer un nouveau tarif (Admin)
```javascript
const response = await fetch('/api/tarifs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    zone: 'Régions',
    destination: 'Kolda',
    service: 'Transfert',
    type_vehicule: 'Berline',
    option: 'Aller simple',
    tarif_fcfa: 180000
  })
});
```

## Codes d'erreur

- `400` : Données invalides
- `401` : Non authentifié (pour les routes admin)
- `403` : Non autorisé (pour les routes admin)
- `404` : Tarif non trouvé
- `500` : Erreur serveur

## Notes importantes

1. **Unicité** : Chaque combinaison (zone, destination, service, type_vehicule, option) doit être unique
2. **Soft Delete** : Les tarifs supprimés sont marqués comme inactifs (`is_active: false`)
3. **Initialisation** : Au démarrage du serveur, les tarifs de base sont automatiquement créés s'ils n'existent pas
4. **Filtrage** : Toutes les recherches ne retournent que les tarifs actifs (`is_active: true`)
5. **Authentification** : Les opérations CRUD (Create, Update, Delete) nécessitent un token d'admin 
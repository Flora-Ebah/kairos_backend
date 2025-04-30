const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehiculeSchema = new Schema({
  marque: {
    type: String,
    required: [true, 'La marque est requise']
  },
  modele: {
    type: String,
    required: [true, 'Le modèle est requis']
  },
  immatriculation: {
    type: String,
    required: [true, 'L\'immatriculation est requise'],
    unique: true
  },
  annee: {
    type: Number,
    required: [true, 'L\'année est requise']
  },
  type: {
    type: String,
    enum: ['berline', 'suv', 'citadine', 'utilitaire', 'autre'],
    required: [true, 'Le type de véhicule est requis']
  },
  carburant: {
    type: String,
    enum: ['essence', 'diesel', 'hybride', 'electrique'],
    required: [true, 'Le type de carburant est requis']
  },
  kilometrage: {
    type: Number,
    default: 0
  },
  tarifJournalier: {
    type: Number,
    required: [true, 'Le tarif journalier est requis']
  },
  etat: {
    type: String,
    enum: ['Disponible', 'En course', 'En maintenance', 'Inactif', 'Réservé'],
    default: 'Disponible'
  },
  dateAcquisition: {
    type: Date,
    default: Date.now
  },
  photos: [String],
  documents: [{
    type: {
      type: String,
      enum: ['Carte grise', 'Assurance', 'Contrôle technique', 'Autre'],
      required: true
    },
    fichier: {
      type: String,
      required: true
    },
    dateExpiration: Date,
    description: String,
    dateCreation: {
      type: Date,
      default: Date.now
    }
  }],
  consommation: {
    moyenne: {
      type: Number,
      default: 0
    },
    historique: [{
      date: {
        type: Date,
        default: Date.now
      },
      quantite: Number,
      prixUnitaire: Number,
      coutTotal: Number,
      station: String
    }]
  },
  maintenance: {
    prochainEntretien: {
      date: { type: Date },
      kilometrage: { type: Number },
      type: { type: String },
      description: { type: String },
      garage: { type: String },
      cout: { type: Number },
      statut: { 
        type: String, 
        enum: ['Planifiée', 'En cours', 'Terminée', 'Annulée'],
        default: 'Planifiée'
      },
      vehiculeId: { type: String },
      immatriculation: { type: String }
    },
    historique: [{
      date: {
        type: Date,
        default: Date.now
      },
      type: {
        type: String,
        required: true
      },
      description: String,
      coutTotal: { type: Number, default: 0 },
      coutPieces: { type: Number, default: 0 },
      coutMainOeuvre: { type: Number, default: 0 },
      technicien: String,
      garage: String,
      duree: String,
      kilometrage: Number,
      priorite: {
        type: String,
        enum: ['basse', 'moyenne', 'haute'],
        default: 'moyenne'
      },
      pieces: [String],
      rapport: String,
      facture: String,
      statut: {
        type: String,
        enum: ['Planifiée', 'En cours', 'Terminée', 'Annulée'],
        default: 'Planifiée'
      }
    }]
  },
  conducteurAssigne: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  localisation: {
    type: String,
    default: 'Non spécifiée'
  },
  nombreCourses: {
    type: Number,
    default: 0
  },
  tauxUtilisation: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'supprimé'],
    default: 'actif'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuel pour tracer le statut des documents
VehiculeSchema.virtual('statutDocuments').get(function() {
  let statutDocuments = {
    valides: 0,
    expirantBientot: 0,
    expires: 0,
    total: 0
  };

  // Vérifier si documents existe et est un tableau
  if (!this.documents || !Array.isArray(this.documents)) {
    return statutDocuments;
  }
  
  statutDocuments.total = this.documents.length;
  
  const dateActuelle = new Date();
  const dateLimit30Jours = new Date();
  dateLimit30Jours.setDate(dateActuelle.getDate() + 30);

  this.documents.forEach(doc => {
    if (!doc || !doc.dateExpiration) return;
    
    if (doc.dateExpiration < dateActuelle) {
      statutDocuments.expires++;
    } else if (doc.dateExpiration < dateLimit30Jours) {
      statutDocuments.expirantBientot++;
    } else {
      statutDocuments.valides++;
    }
  });

  return statutDocuments;
});

// Virtuel pour obtenir la disponibilité en pourcentage
VehiculeSchema.virtual('disponibilite').get(function() {
  // Exemple simple: 100% si disponible, 0% si en maintenance, 50% si en course
  switch(this.etat) {
    case 'Disponible': return 100;
    case 'En course': return 50;
    case 'Réservé': return 50;
    case 'En maintenance': return 0;
    case 'Inactif': return 0;
    default: return 100;
  }
});

module.exports = mongoose.model('Vehicule', VehiculeSchema); 
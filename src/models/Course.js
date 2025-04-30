const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourseSchema = new Schema({
  reference: {
    type: String,
    unique: true
  },
  vehicule: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicule',
    required: [true, 'Le véhicule est obligatoire']
  },
  conducteur: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le conducteur est obligatoire']
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    required: [true, 'La date est obligatoire'],
    default: Date.now
  },
  depart: {
    adresse: String,
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  arrivee: {
    adresse: String,
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  distance: {
    type: Number,
    default: 0
  },
  duree: {
    type: Number, // en minutes
    default: 0
  },
  statut: {
    type: String,
    enum: ['En attente', 'Acceptée', 'En cours', 'Terminée', 'Annulée'],
    default: 'En attente'
  },
  typeCourse: {
    type: String,
    enum: ['standard', 'location', 'livraison'],
    default: 'standard'
  },
  paiement: {
    methode: {
      type: String,
      enum: ['especes', 'carte', 'mobile_money', 'credit'],
      default: 'especes'
    },
    montant: {
      type: Number,
      default: 0
    },
    statut: {
      type: String,
      enum: ['en attente', 'payé', 'remboursé', 'annulé'],
      default: 'en attente'
    },
    reference: String,
    dateTransaction: Date
  },
  note: {
    conducteur: {
      type: Number,
      min: 0,
      max: 5
    },
    client: {
      type: Number,
      min: 0,
      max: 5
    },
    commentaire: String
  },
  detailsLocation: {
    dateDebut: Date,
    dateFin: Date,
    dureeLocation: Number // en heures
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Générer une référence unique avant la sauvegarde
CourseSchema.pre('save', async function(next) {
  if (this.isNew && !this.reference) {
    const date = new Date();
    const prefix = 'CRS';
    const year = date.getFullYear().toString().substr(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.reference = `${prefix}${year}${month}-${random}`;
  }
  next();
});

// Virtuel pour le coût total
CourseSchema.virtual('coutTotal').get(function() {
  return this.paiement.montant;
});

module.exports = mongoose.model('Course', CourseSchema); 
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
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
    default: null
  },
  conducteurSource: {
    type: String,
    enum: ['User', 'UserConducteur'],
    default: 'User'
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le client est obligatoire']
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Le service est obligatoire']
  },
  dateDebut: {
    type: Date,
    required: [true, 'La date de début est obligatoire']
  },
  dateFin: {
    type: Date,
    required: [true, 'La date de fin est obligatoire']
  },
  heureDebut: {
    type: String
  },
  lieuPrise: {
    type: String,
    required: [true, 'Le lieu de prise en charge est obligatoire']
  },
  zone: {
    type: Schema.Types.ObjectId,
    ref: 'Zone'
  },
  destination: {
    type: Schema.Types.ObjectId,
    ref: 'Destination'
  },
  nombrePassagers: {
    type: Number,
    required: [true, 'Le nombre de passagers est obligatoire'],
    min: [1, 'Il doit y avoir au moins un passager']
  },
  nombreBagages: {
    type: Number,
    default: 0
  },
  options: [{
    type: Schema.Types.ObjectId,
    ref: 'Option'
  }],
  prixTotal: {
    type: Number,
    required: [true, 'Le prix total est obligatoire']
  },
  methodePaiement: {
    type: String,
    enum: ['cash', 'credit', 'mobile_money', 'carte', 'virement'],
    default: 'cash'
  },
  paiement: {
    montantPercu: {
      type: Number,
      default: 0
    },
    methodePaiementEffective: {
      type: String,
      enum: ['cash', 'credit', 'mobile_money', 'carte', 'virement'],
      default: 'cash'
    },
    dateTransaction: {
      type: Date
    },
    referencePaiement: {
      type: String
    }
  },
  statut: {
    type: String,
    enum: ['en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee'],
    default: 'en_attente'
  },
  notes: {
    type: String
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pré-middleware pour générer automatiquement une référence unique
ReservationSchema.pre('save', async function(next) {
  if (!this.reference) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.reference = `RES-${year}${month}-${randomNum}`;
  }
  
  // S'assurer que options est toujours un tableau
  if (!this.options) {
    this.options = [];
  } else if (!Array.isArray(this.options)) {
    // Si options existe mais n'est pas un tableau, le convertir en tableau
    this.options = [].concat(this.options).filter(Boolean);
  }
  
  this.dateModification = Date.now();
  next();
});

module.exports = mongoose.model('Reservation', ReservationSchema); 
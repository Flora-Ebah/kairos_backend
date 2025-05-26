const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
  reference: {
    type: String,
    unique: true
  },
  vehicule: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicule'
  },
  conducteur: {
    type: Schema.Types.ObjectId,
    refPath: 'conducteurSource',
    default: null
  },
  conducteurSource: {
    type: String,
    enum: ['User', 'UserConducteur'],
    default: 'User'
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  clientInfo: {
    nom: String,
    prenom: String,
    telephone: String,
    email: String,
    mois_naissance: String
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service'
  },
  dateDebut: {
    type: Date
  },
  dateFin: {
    type: Date
  },
  heureDebut: {
    type: String
  },
  lieuPrise: {
    type: String
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
    default: 1
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
    default: 0
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
  isAdminReservation: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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

ReservationSchema.pre('save', async function(next) {
  if (!this.reference) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefix = this.isAdminReservation ? 'ADMIN' : 'RES';
    this.reference = `${prefix}-${year}${month}-${randomNum}`;
  }
  
  if (!this.options) {
    this.options = [];
  } else if (!Array.isArray(this.options)) {
    this.options = [].concat(this.options).filter(Boolean);
  }
  
  this.dateModification = Date.now();
  next();
});

module.exports = mongoose.model('Reservation', ReservationSchema); 
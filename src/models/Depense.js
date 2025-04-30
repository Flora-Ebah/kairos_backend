const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DepenseSchema = new Schema({
  reference: {
    type: String,
    unique: true
  },
  date: {
    type: Date,
    required: [true, 'La date est obligatoire'],
    default: Date.now
  },
  category: {
    type: String,
    required: [true, 'La catégorie est obligatoire']
  },
  description: {
    type: String,
    required: [true, 'La description est obligatoire']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0, 'Le montant doit être supérieur à 0']
  },
  conducteur: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'ID du conducteur est obligatoire']
    },
    nom: String,
    prenom: String,
    telephone: String
  }
}, {
  timestamps: true
});

// Ajouter un middleware pre-save pour générer automatiquement une référence
DepenseSchema.pre('save', async function(next) {
  // Si aucune référence n'est définie, en générer une
  if (!this.reference) {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.reference = `DEP-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Depense', DepenseSchema); 
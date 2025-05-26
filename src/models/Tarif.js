const mongoose = require('mongoose');

const tarifSchema = mongoose.Schema(
  {
    tarif_id: {
      type: String,
      required: true,
      unique: true,
    },
    zone: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    type_vehicule: {
      type: String,
      required: true,
    },
    option: {
      type: String,
      required: true,
    },
    tarif_fcfa: {
      type: Number,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Index composé pour améliorer les performances de recherche
tarifSchema.index({ zone: 1, destination: 1, service: 1, type_vehicule: 1, option: 1 });

const Tarif = mongoose.model('Tarif', tarifSchema);

module.exports = Tarif; 
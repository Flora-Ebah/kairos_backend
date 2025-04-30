const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema(
  {
    service_id: {
      type: String,
      required: true,
      unique: true,
    },
    nom: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service; 
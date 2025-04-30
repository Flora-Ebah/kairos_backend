const mongoose = require('mongoose');

const zoneSchema = mongoose.Schema(
  {
    zone_id: {
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

const Zone = mongoose.model('Zone', zoneSchema);

module.exports = Zone; 
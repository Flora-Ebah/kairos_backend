const mongoose = require('mongoose');

const destinationSchema = mongoose.Schema(
  {
    destination_id: {
      type: String,
      required: true,
      unique: true,
    },
    zone_id: {
      type: String,
      required: true,
      ref: 'Zone',
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
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Ajouter une propriété virtuelle pour le nom de la zone
destinationSchema.virtual('zone_name').get(function() {
  return this._zone_name;
}).set(function(v) {
  this._zone_name = v;
});

const Destination = mongoose.model('Destination', destinationSchema);

module.exports = Destination; 
const mongoose = require('mongoose');

const optionSchema = mongoose.Schema(
  {
    option_id: {
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

const Option = mongoose.model('Option', optionSchema);

module.exports = Option; 
const mongoose = require('mongoose');

const countrySchema = mongoose.Schema(
  {
    country_code_id: {
      type: String,
      required: true,
      unique: true,
    },
    country_name: {
      type: String,
      required: true,
    },
    country_code: {
      type: String,
      required: true,
    },
    iso_code: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

const Country = mongoose.model('Country', countrySchema);

module.exports = Country; 
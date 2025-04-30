const express = require('express');
const router = express.Router();
const { 
  getCountries, 
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
  seedCountries 
} = require('../controllers/countryController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route pour récupérer tous les pays et en créer un nouveau
router.route('/')
  .get(protect, getCountries)
  .post(protect, admin, createCountry);

// Route pour seeder les pays initiaux
router.route('/seed')
  .post(protect, admin, seedCountries);

// Routes pour les opérations sur un pays spécifique par ID
router.route('/:id')
  .get(protect, getCountryById)
  .put(protect, admin, updateCountry)
  .delete(protect, admin, deleteCountry);

module.exports = router; 
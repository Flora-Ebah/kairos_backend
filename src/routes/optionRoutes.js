const express = require('express');
const router = express.Router();
const { 
  getOptions, 
  getOptionById,
  createOption,
  updateOption,
  deleteOption,
  seedOptions 
} = require('../controllers/optionController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route pour récupérer toutes les options et en créer une nouvelle
router.route('/')
  .get(protect, getOptions)
  .post(protect, admin, createOption);

// Route pour seeder les options initiales
router.route('/seed')
  .post(protect, admin, seedOptions);

// Routes pour les opérations sur une option spécifique par ID
router.route('/:id')
  .get(protect, getOptionById)
  .put(protect, admin, updateOption)
  .delete(protect, admin, deleteOption);

module.exports = router; 
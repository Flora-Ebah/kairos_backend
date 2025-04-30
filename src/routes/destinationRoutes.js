const express = require('express');
const router = express.Router();
const { 
  getDestinations, 
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getDestinationsByZone,
  seedDestinations 
} = require('../controllers/destinationController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route pour récupérer toutes les destinations et en créer une nouvelle
router.route('/')
  .get(protect, getDestinations)
  .post(protect, admin, createDestination);

// Route pour seeder les destinations initiales
router.route('/seed')
  .post(protect, admin, seedDestinations);

// Route pour récupérer les destinations par zone
router.route('/zone/:zoneId')
  .get(protect, getDestinationsByZone);

// Routes pour les opérations sur une destination spécifique par ID
router.route('/:id')
  .get(protect, getDestinationById)
  .put(protect, admin, updateDestination)
  .delete(protect, admin, deleteDestination);

module.exports = router; 
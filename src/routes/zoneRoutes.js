const express = require('express');
const router = express.Router();
const { 
  getZones, 
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  seedZones 
} = require('../controllers/zoneController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route pour récupérer toutes les zones et en créer une nouvelle
router.route('/')
  .get(protect, getZones)
  .post(protect, admin, createZone);

// Route pour seeder les zones initiales
router.route('/seed')
  .post(protect, admin, seedZones);

// Routes pour les opérations sur une zone spécifique par ID
router.route('/:id')
  .get(protect, getZoneById)
  .put(protect, admin, updateZone)
  .delete(protect, admin, deleteZone);

module.exports = router; 
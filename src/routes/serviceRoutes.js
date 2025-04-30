const express = require('express');
const router = express.Router();
const { 
  getServices, 
  getServiceById,
  createService,
  updateService,
  deleteService,
  seedServices 
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route pour récupérer tous les services et en créer un nouveau
router.route('/')
  .get(protect, getServices)
  .post(protect, admin, createService);

// Route pour seeder les services initiaux
router.route('/seed')
  .post(protect, admin, seedServices);

// Routes pour les opérations sur un service spécifique par ID
router.route('/:id')
  .get(protect, getServiceById)
  .put(protect, admin, updateService)
  .delete(protect, admin, deleteService);

module.exports = router; 
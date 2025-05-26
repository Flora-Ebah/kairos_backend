const express = require('express');
const router = express.Router();
const { 
  getTarifs,
  getTarifById,
  searchTarifs,
  getExactTarif,
  createTarif,
  updateTarif,
  deleteTarif,
  hardDeleteTarif,
  getTarifStats,
  getFilterOptions,
  seedTarifs
} = require('../controllers/tarifController');
const { protect, admin } = require('../middleware/authMiddleware');

// Routes publiques
// Route pour récupérer tous les tarifs avec filtres optionnels
router.route('/')
  .get(getTarifs)
  .post(protect, admin, createTarif);

// Route pour rechercher des tarifs
router.route('/search')
  .post(searchTarifs);

// Route pour obtenir un tarif exact
router.route('/exact')
  .post(getExactTarif);

// Route pour obtenir les statistiques des tarifs
router.route('/stats')
  .get(getTarifStats);

// Route pour obtenir les options de filtres
router.route('/filters')
  .get(getFilterOptions);

// Route pour seeder les tarifs initiaux (Admin seulement)
router.route('/seed')
  .post(protect, admin, seedTarifs);

// Routes pour les opérations sur un tarif spécifique par ID
router.route('/:id')
  .get(getTarifById)
  .put(protect, admin, updateTarif)
  .delete(protect, admin, deleteTarif);

// Route pour supprimer définitivement un tarif (Admin seulement)
router.route('/:id/hard')
  .delete(protect, admin, hardDeleteTarif);

module.exports = router; 
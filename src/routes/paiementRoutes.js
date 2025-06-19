const express = require('express');
const {
  getStatutPaiements,
  getDetailsPaiementReservation,
  getHistoriquePaiements
} = require('../controllers/paiementController');
const { protect, client } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes protégées pour les clients
router.use(protect);

// @route   GET /api/paiements/statut
// @desc    Obtenir le statut des paiements du client connecté
// @access  Private (Client)
router.get('/statut', getStatutPaiements);

// @route   GET /api/paiements/reservation/:id
// @desc    Obtenir les détails d'une réservation avec informations de paiement
// @access  Private (Client)
router.get('/reservation/:id', getDetailsPaiementReservation);

// @route   GET /api/paiements/historique
// @desc    Obtenir l'historique des paiements du client
// @access  Private (Client)
router.get('/historique', getHistoriquePaiements);

module.exports = router; 
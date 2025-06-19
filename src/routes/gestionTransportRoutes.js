const express = require('express');
const {
  getDashboardData,
  getConducteursData,
  getStatistiques,
  getReservationsDetails,
  getConducteurDataByPeriode,
  createTransactionJournaliere,
  ajouterTransaction
} = require('../controllers/gestionTransportController');

const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');

// Appliquer la protection et l'autorisation admin à toutes les routes
router.use(protect);
router.use(admin);

// Routes principales
router.route('/dashboard')
  .get(getDashboardData);

router.route('/conducteurs')
  .get(getConducteursData);

router.route('/statistiques')
  .get(getStatistiques);

router.route('/reservations-details')
  .get(getReservationsDetails);

router.route('/conducteur/:conducteurId/periode')
  .get(getConducteurDataByPeriode);

// Routes pour les transactions journalières
router.route('/transaction-journaliere')
  .post(createTransactionJournaliere);

router.route('/transaction-journaliere/:id/transaction')
  .post(ajouterTransaction);

module.exports = router; 
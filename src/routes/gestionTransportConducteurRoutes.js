const express = require('express');
const {
  getDashboardConducteurData,
  getTransactionConducteur,
  createOrGetTodayTransaction,
  ajouterTransactionConducteur
} = require('../controllers/gestionTransportConducteurController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

// Appliquer seulement la protection d'authentification
router.use(protect);

// Routes spécifiques au conducteur
router.route('/dashboard')
  .get(getDashboardConducteurData);

router.route('/transaction')
  .get(getTransactionConducteur);

router.route('/transaction-today')
  .post(createOrGetTodayTransaction);

router.route('/ajouter-transaction')
  .post(ajouterTransactionConducteur);

module.exports = router; 
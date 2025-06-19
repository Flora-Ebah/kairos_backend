const express = require('express');
const {
  getDashboardFinance,
  getTransactionsConsolidees,
  getConducteursSalaires
} = require('../controllers/financeController');

const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Protéger toutes les routes - Admin uniquement
router.use(protect);
router.use(admin);

// @route   GET /api/finance/dashboard
// @desc    Obtenir les statistiques financières globales
router.get('/dashboard', getDashboardFinance);

// @route   GET /api/finance/transactions
// @desc    Obtenir les transactions consolidées
router.get('/transactions', getTransactionsConsolidees);

// @route   GET /api/finance/conducteurs-salaires
// @desc    Obtenir les données des conducteurs pour l'onglet salaires
router.get('/conducteurs-salaires', getConducteursSalaires);

module.exports = router; 
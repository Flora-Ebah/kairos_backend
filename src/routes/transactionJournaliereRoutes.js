const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  validateCreateTransaction,
  validateGetOrCreateToday,
  validateAjouterTransaction,
  validateUpdateTransaction,
  validateCloturerTransaction
} = require('../middleware/transactionJournaliereValidation');

const {
  createTransactionJournaliere,
  getTransactionsJournalieres,
  getTransactionJournaliere,
  getOrCreateToday,
  updateTransactionJournaliere,
  ajouterTransaction,
  cloturerTransactionJournaliere,
  getResumeMensuel,
  deleteTransactionJournaliere,
  getStatistiquesGlobales
} = require('../controllers/transactionJournaliereController');

// Routes protégées par authentification et rôle admin
router.use(protect, admin);

// Routes principales
router.route('/')
  .post(validateCreateTransaction, createTransactionJournaliere)
  .get(getTransactionsJournalieres);

router.route('/:id')
  .get(getTransactionJournaliere)
  .put(validateUpdateTransaction, updateTransactionJournaliere)
  .delete(deleteTransactionJournaliere);

// Route pour obtenir ou créer la transaction du jour
router.route('/conducteur/:conducteurId/today')
  .post(validateGetOrCreateToday, getOrCreateToday);

// Route pour ajouter une transaction
router.route('/:id/transactions')
  .post(validateAjouterTransaction, ajouterTransaction);

// Route pour clôturer une transaction
router.route('/:id/cloturer')
  .put(validateCloturerTransaction, cloturerTransactionJournaliere);

// Route pour le résumé mensuel
router.route('/conducteur/:conducteurId/resume/:mois/:annee')
  .get(getResumeMensuel);

// Route pour les statistiques globales
router.route('/stats/global')
  .get(getStatistiquesGlobales);

module.exports = router; 
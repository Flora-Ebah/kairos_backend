const express = require('express');
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

const {
  validateCreateTransactionJournaliere,
  validateUpdateTransactionJournaliere,
  validateAjouterTransaction,
  validateCloturerTransaction,
  validateGetOrCreateToday
} = require('../middleware/transactionJournaliereValidation');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes pour les statistiques (doivent être avant les routes avec paramètres)
router.get('/stats/global', authorize('admin', 'super-admin'), getStatistiquesGlobales);

// Routes pour les conducteurs spécifiques
router.get('/conducteur/:conducteurId/today', authorize('admin', 'super-admin'), getOrCreateToday);
router.post('/conducteur/:conducteurId/today', authorize('admin', 'super-admin'), validateGetOrCreateToday, getOrCreateToday);
router.get('/conducteur/:conducteurId/resume/:mois/:annee', authorize('admin', 'super-admin'), getResumeMensuel);

// Routes CRUD principales
router.route('/')
  .get(authorize('admin', 'super-admin'), getTransactionsJournalieres)
  .post(authorize('admin', 'super-admin'), validateCreateTransactionJournaliere, createTransactionJournaliere);

router.route('/:id')
  .get(authorize('admin', 'super-admin'), getTransactionJournaliere)
  .put(authorize('admin', 'super-admin'), validateUpdateTransactionJournaliere, updateTransactionJournaliere)
  .delete(authorize('super-admin'), deleteTransactionJournaliere);

// Routes pour les actions sur les transactions
router.post('/:id/transactions', authorize('admin', 'super-admin'), validateAjouterTransaction, ajouterTransaction);
router.put('/:id/cloturer', authorize('admin', 'super-admin'), validateCloturerTransaction, cloturerTransactionJournaliere);

module.exports = router; 
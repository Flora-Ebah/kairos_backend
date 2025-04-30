const express = require('express');
const router = express.Router();
const { 
  getDepenses, 
  getDepenseById, 
  createDepense, 
  updateDepense, 
  deleteDepense, 
  getDepensesStats
} = require('../controllers/depenseController');
const { protect, admin } = require('../middleware/authMiddleware');

// Routes publiques
router.route('/')
  .get(protect, getDepenses)
  .post(protect, createDepense);

router.route('/stats')
  .get(protect, getDepensesStats);

router.route('/:id')
  .get(protect, getDepenseById)
  .put(protect, updateDepense)
  .delete(protect, deleteDepense);

module.exports = router; 
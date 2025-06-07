const { body, validationResult } = require('express-validator');

// Validation pour la création d'une transaction journalière
const validateCreateTransactionJournaliere = [
  body('conducteur')
    .notEmpty()
    .withMessage('Le conducteur est obligatoire')
    .isMongoId()
    .withMessage('ID conducteur invalide'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide'),
  
  body('montantInitial')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant initial doit être un nombre positif'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation pour la mise à jour d'une transaction journalière
const validateUpdateTransactionJournaliere = [
  body('montantInitial')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant initial doit être un nombre positif'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  
  body('statut')
    .optional()
    .isIn(['active', 'cloturee', 'en_attente'])
    .withMessage('Statut invalide'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation pour l'ajout d'une transaction
const validateAjouterTransaction = [
  body('type')
    .notEmpty()
    .withMessage('Le type de transaction est obligatoire')
    .isIn(['recette', 'depense', 'commission', 'remboursement'])
    .withMessage('Type de transaction invalide'),
  
  body('montant')
    .notEmpty()
    .withMessage('Le montant est obligatoire')
    .isFloat({ min: 0.01 })
    .withMessage('Le montant doit être un nombre positif'),
  
  body('description')
    .notEmpty()
    .withMessage('La description est obligatoire')
    .isLength({ min: 3, max: 200 })
    .withMessage('La description doit contenir entre 3 et 200 caractères'),
  
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('ID course invalide'),
  
  body('reservationId')
    .optional()
    .isMongoId()
    .withMessage('ID réservation invalide'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation pour la clôture d'une transaction
const validateCloturerTransaction = [
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation pour obtenir ou créer la transaction du jour
const validateGetOrCreateToday = [
  body('montantInitial')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant initial doit être un nombre positif'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateCreateTransactionJournaliere,
  validateUpdateTransactionJournaliere,
  validateAjouterTransaction,
  validateCloturerTransaction,
  validateGetOrCreateToday
}; 
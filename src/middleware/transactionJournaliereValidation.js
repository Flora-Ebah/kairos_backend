const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

// Middleware pour vérifier les résultats de validation
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Validation pour la création d'une transaction journalière
const validateCreateTransaction = [
  body('conducteur')
    .notEmpty()
    .withMessage('L\'ID du conducteur est requis')
    .isMongoId()
    .withMessage('L\'ID du conducteur n\'est pas valide'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('La date doit être au format ISO8601'),
  
  body('montantInitial')
    .notEmpty()
    .withMessage('Le montant initial est requis')
    .isNumeric()
    .withMessage('Le montant initial doit être un nombre')
    .custom(value => value >= 0)
    .withMessage('Le montant initial ne peut pas être négatif'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Les notes doivent être une chaîne de caractères'),
  
  checkValidationErrors
];

// Validation pour l'obtention ou la création de la transaction du jour
const validateGetOrCreateToday = [
  param('conducteurId')
    .notEmpty()
    .withMessage('L\'ID du conducteur est requis')
    .isMongoId()
    .withMessage('L\'ID du conducteur n\'est pas valide'),
  
  body('montantInitial')
    .optional()
    .isNumeric()
    .withMessage('Le montant initial doit être un nombre')
    .custom(value => value >= 0)
    .withMessage('Le montant initial ne peut pas être négatif'),
  
  checkValidationErrors
];

// Validation pour l'ajout d'une transaction
const validateAjouterTransaction = [
  param('id')
    .notEmpty()
    .withMessage('L\'ID de la transaction journalière est requis')
    .isMongoId()
    .withMessage('L\'ID de la transaction journalière n\'est pas valide'),
  
  body('type')
    .notEmpty()
    .withMessage('Le type de transaction est requis')
    .isIn(['recette', 'depense', 'commission', 'remboursement'])
    .withMessage('Type de transaction invalide'),
  
  body('montant')
    .notEmpty()
    .withMessage('Le montant est requis')
    .isNumeric()
    .withMessage('Le montant doit être un nombre')
    .custom(value => value > 0)
    .withMessage('Le montant doit être supérieur à 0'),
  
  body('description')
    .notEmpty()
    .withMessage('La description est requise')
    .isString()
    .withMessage('La description doit être une chaîne de caractères'),
  
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('L\'ID de la course n\'est pas valide'),
  
  body('reservationId')
    .optional()
    .isMongoId()
    .withMessage('L\'ID de la réservation n\'est pas valide'),
  
  checkValidationErrors
];

// Validation pour la mise à jour d'une transaction
const validateUpdateTransaction = [
  param('id')
    .notEmpty()
    .withMessage('L\'ID de la transaction est requis')
    .isMongoId()
    .withMessage('L\'ID de la transaction n\'est pas valide'),
  
  body('montantInitial')
    .optional()
    .isNumeric()
    .withMessage('Le montant initial doit être un nombre')
    .custom(value => value >= 0)
    .withMessage('Le montant initial ne peut pas être négatif'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Les notes doivent être une chaîne de caractères'),
  
  body('statut')
    .optional()
    .isIn(['active', 'cloturee', 'en_attente'])
    .withMessage('Statut invalide'),
  
  checkValidationErrors
];

// Validation pour la clôture d'une transaction
const validateCloturerTransaction = [
  param('id')
    .notEmpty()
    .withMessage('L\'ID de la transaction est requis')
    .isMongoId()
    .withMessage('L\'ID de la transaction n\'est pas valide'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Les notes doivent être une chaîne de caractères'),
  
  checkValidationErrors
];

module.exports = {
  validateCreateTransaction,
  validateGetOrCreateToday,
  validateAjouterTransaction,
  validateUpdateTransaction,
  validateCloturerTransaction
}; 
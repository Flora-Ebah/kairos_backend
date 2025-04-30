const express = require('express');
const router = express.Router();
const {
  authUser,
  registerUser,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile,
  getProfile,
  forgotPassword,
  resetPassword,
  getConducteursStats,
  getConducteurDetails,
  getAllConducteurs,
  getConducteurDocuments,
  addConducteurDocument,
  validateConducteurDocument,
  deleteConducteurDocument,
  getConducteurProfile
} = require('../controllers/userController');
const { protect, admin, isOwner, checkPermission } = require('../middleware/authMiddleware');

// Routes publiques
router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Routes pour le profil utilisateur
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

// Route pour le profil conducteur (accès pour le conducteur lui-même)
router.get('/conducteur/me', protect, getConducteurProfile);

// Routes spécifiques à certains types d'utilisateurs - placer avant les routes paramétrées
router.get('/clients', protect, admin, getUsers); // avec ?role=client
router.get('/admins', protect, admin, getUsers); // avec ?role=admin

// Routes pour les conducteurs - ATTENTION À L'ORDRE : routes spécifiques d'abord, puis paramétrées
router.get('/conducteurs', protect, admin, getAllConducteurs); // Liste tous les conducteurs
router.get('/conducteurs/stats', protect, admin, getConducteursStats); // Statistiques des conducteurs

// Routes administratives pour gérer les utilisateurs
router.route('/')
  .get(protect, admin, getUsers)
  .post(protect, checkPermission('users_manage'), createUser);

// Routes pour les conducteurs (suite)
router.get('/conducteurs/:id', protect, admin, getConducteurDetails); // Détails d'un conducteur spécifique

// Routes pour les documents des conducteurs
router.get('/conducteurs/:id/documents', protect, admin, getConducteurDocuments);
router.post('/conducteurs/:id/documents', protect, admin, addConducteurDocument);
router.put('/conducteurs/:id/documents/:documentType/validate', protect, admin, validateConducteurDocument);
router.delete('/conducteurs/:id/documents/:documentType', protect, admin, deleteConducteurDocument);

// Route utilisateur par ID - doit être placée à la fin pour éviter les conflits
router.route('/:id')
  .get(protect, isOwner, getUserById)
  .put(protect, isOwner, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router; 
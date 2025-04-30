const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
  getVehicules, 
  getVehiculeById, 
  createVehicule, 
  updateVehicule, 
  deleteVehicule,
  mettreEnMaintenance,
  getStatistiques,
  ajouterMaintenance,
  updateEtatVehicule,
  ajouterDocument,
  supprimerDocument,
  getHistoriqueMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getHistoriqueCourses,
  getVehiculeByConducteur
} = require('../controllers/vehiculeController');

// Routes publiques
router.get('/', getVehicules);
router.get('/stats', getStatistiques);
// Route pour récupérer le véhicule assigné à un conducteur
router.get('/conducteur/:conducteurId', protect, getVehiculeByConducteur);
router.get('/:id', getVehiculeById);

// Routes protégées (admin)
router.post('/', protect, admin, createVehicule);
router.put('/:id', protect, admin, updateVehicule);
router.delete('/:id', protect, admin, deleteVehicule);

// Routes pour la maintenance
router.post('/:id/maintenance', protect, admin, ajouterMaintenance);
router.get('/:id/maintenance', protect, admin, getHistoriqueMaintenance);
router.put('/:id/maintenance/:maintenanceId', protect, admin, updateMaintenance);
router.delete('/:id/maintenance/:maintenanceId', protect, admin, deleteMaintenance);

// Routes pour les courses
router.get('/:id/courses', protect, getHistoriqueCourses);

// Autres routes
router.patch('/:id/etat', protect, admin, updateEtatVehicule);
router.post('/:id/documents', protect, admin, ajouterDocument);
router.delete('/:id/documents/:documentId', protect, admin, supprimerDocument);

module.exports = router; 
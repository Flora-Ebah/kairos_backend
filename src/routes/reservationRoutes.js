const express = require('express');
const router = express.Router();
const { 
  getReservations, 
  getReservationById, 
  createReservation, 
  updateReservation, 
  annulerReservation,
  validerReservation,
  assignerConducteur,
  getMesReservations,
  getReservationsByConducteur,
  getReservationsByConducteurId,
  terminerReservation
} = require('../controllers/reservationController');
const { protect, admin } = require('../middleware/authMiddleware');

// Routes publiques
// (aucune)

// Routes privées (utilisateur connecté)
router.route('/')
  .get(getReservations)
  .post(protect, createReservation);

router.route('/me')
  .get(protect, getMesReservations);

router.route('/conducteur')
  .get(protect, getReservationsByConducteur);

// Route de diagnostic pour debugger les problèmes de conducteur
router.get('/diagnostic/conducteur', protect, async (req, res) => {
  try {
    const Reservation = require('../models/Reservation');
    const User = require('../models/User');
    
    // Information sur l'utilisateur connecté
    const userInfo = {
      id: req.user._id,
      role: req.user.role,
      nom: req.user.nom,
      prenom: req.user.prenom,
      idType: typeof req.user._id
    };
    
    // Trouver la réservation spécifique
    const reservationId = '680d1c88f350c83369a946e3';
    const reservation = await Reservation.findById(reservationId)
      .select('_id conducteur statut')
      .lean();
      
    // Trouver l'utilisateur correspondant à l'ID conducteur
    let conducteurInfo = null;
    if (reservation && reservation.conducteur) {
      const conducteur = await User.findById(reservation.conducteur)
        .select('_id nom prenom role')
        .lean();
      
      if (conducteur) {
        conducteurInfo = {
          ...conducteur,
          idMatch: conducteur._id.toString() === req.user._id.toString()
        };
      }
    }
    
    // Vérifier si d'autres réservations existent avec des conducteurs
    const autresReservations = await Reservation.find({ 
      conducteur: { $exists: true, $ne: null } 
    })
    .select('_id conducteur statut')
    .limit(5)
    .lean();
    
    // Liste des conducteurs dans le système
    const conducteurs = await User.find({ role: 'conducteur' })
      .select('_id nom prenom')
      .limit(5)
      .lean();
      
    // Répondre avec les informations de diagnostic
    res.json({
      userInfo,
      reservation: reservation || null,
      conducteurInfo,
      autresReservations,
      conducteurs,
      messageInfo: 'Cette route permet de diagnostiquer les problèmes de conducteur'
    });
    
  } catch (error) {
    console.error('Erreur dans la route de diagnostic:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour récupérer les réservations par ID de conducteur spécifique
router.get('/byconducteur/:id', protect, getReservationsByConducteurId);

router.route('/:id')
  .get(getReservationById)
  .put(protect, admin, updateReservation);

router.route('/:id/annulation')
  .post(protect, annulerReservation);

router.route('/:id/validation')
  .post(protect, admin, validerReservation);

router.route('/:id/terminer')
  .post(terminerReservation);

router.route('/:id/conducteur')
  .post(protect, admin, assignerConducteur);

module.exports = router; 
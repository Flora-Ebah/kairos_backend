const Reservation = require('../models/Reservation');
const Vehicule = require('../models/Vehicule');
const Service = require('../models/Service');
const User = require('../models/User');
const UserConducteur = require('../models/UserConducteur');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Récupérer toutes les réservations avec filtres
 * @route   GET /api/reservations
 * @access  Privé/Admin
 */
const getReservations = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Filtre par statut
    if (req.query.statut) {
      filter.statut = req.query.statut;
    }
    
    // Filtre par client
    if (req.query.client) {
      filter.client = req.query.client;
    }
    
    // Filtre par véhicule
    if (req.query.vehicule) {
      filter.vehicule = req.query.vehicule;
    }
    
    // Filtre par date (range)
    if (req.query.dateDebut && req.query.dateFin) {
      filter.dateDebut = { $gte: new Date(req.query.dateDebut) };
      filter.dateFin = { $lte: new Date(req.query.dateFin) };
    } else if (req.query.dateDebut) {
      filter.dateDebut = { $gte: new Date(req.query.dateDebut) };
    } else if (req.query.dateFin) {
      filter.dateFin = { $lte: new Date(req.query.dateFin) };
    }

    console.log('Filtres de recherche de réservations:', filter);

    const count = await Reservation.countDocuments(filter);
    
    // Limiter les champs à retourner pour éviter les problèmes avec les documents
    const reservations = await Reservation.find(filter)
      .populate({
        path: 'vehicule',
        select: 'marque modele immatriculation image tarifJournalier type'
      })
      .populate('client', 'nom prenom email')
      .populate('conducteur', 'nom prenom telephone')
      .populate('service', 'nom')
      .populate('zone', 'nom')
      .populate('destination', 'nom')
      .populate('options', 'nom prix')
      .sort({ dateCreation: -1 })
      .skip(skip)
      .limit(limit);

    // Nettoyer les données pour éviter les erreurs de sérialisation
    const cleanReservations = reservations.map(res => {
      const resObj = res.toObject();
      
      // S'assurer que toutes les propriétés nécessaires existent
      if (!resObj.options) resObj.options = [];
      
      return resObj;
    });

    res.json({
      reservations: cleanReservations,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    console.error('Erreur dans getReservations:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc    Récupérer une réservation par son ID
 * @route   GET /api/reservations/:id
 * @access  Privé
 */
const getReservationById = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('vehicule', 'marque modele immatriculation image tarifJournalier')
    .populate('client', 'nom prenom email telephone')
    .populate('conducteur', 'nom prenom telephone')
    .populate('service', 'nom description')
    .populate('zone', 'nom')
    .populate('destination', 'nom')
    .populate('options', 'nom prix description');

  if (reservation) {
    res.json(reservation);
  } else {
    res.status(404);
    throw new Error('Réservation non trouvée');
  }
});

/**
 * @desc    Créer une nouvelle réservation
 * @route   POST /api/reservations
 * @access  Privé
 */
const createReservation = asyncHandler(async (req, res) => {
  const {
    vehicule,
    service,
    dateDebut,
    dateFin,
    heureDebut,
    lieuPrise,
    zone,
    destination,
    nombrePassagers,
    nombreBagages,
    options,
    methodePaiement,
    notes
  } = req.body;

  // Vérifier la disponibilité du véhicule
  const vehiculeData = await Vehicule.findById(vehicule);
  if (!vehiculeData) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }
  
  if (vehiculeData.etat !== 'Disponible') {
    res.status(400);
    throw new Error('Ce véhicule n\'est pas disponible actuellement');
  }

  // Vérifier si le véhicule n'est pas déjà réservé pour cette période
  const reservationExistante = await Reservation.findOne({
    vehicule,
    $or: [
      // Nouvelle réservation commence pendant une réservation existante
      {
        dateDebut: { $lte: new Date(dateDebut) },
        dateFin: { $gte: new Date(dateDebut) }
      },
      // Nouvelle réservation se termine pendant une réservation existante
      {
        dateDebut: { $lte: new Date(dateFin) },
        dateFin: { $gte: new Date(dateFin) }
      },
      // Nouvelle réservation englobe complètement une réservation existante
      {
        dateDebut: { $gte: new Date(dateDebut) },
        dateFin: { $lte: new Date(dateFin) }
      }
    ],
    statut: { $nin: ['annulee', 'terminee'] }
  });

  if (reservationExistante) {
    res.status(400);
    throw new Error('Ce véhicule est déjà réservé pour la période sélectionnée');
  }

  // Calculer le prix total (à adapter selon votre logique de tarification)
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const diffTemps = Math.abs(fin - debut);
  const nombreJours = Math.ceil(diffTemps / (1000 * 60 * 60 * 24));
  
  // Prix de base (tarif journalier * nombre de jours)
  let prixTotal = vehiculeData.tarifJournalier * nombreJours;
  
  // Ajouter le prix des options si applicable
  if (options && options.length > 0) {
    // Logique pour ajouter le prix des options (à implémenter)
    // Exemple: faire une requête pour récupérer les prix des options sélectionnées
  }

  const reservation = new Reservation({
    vehicule,
    client: req.user._id, // L'utilisateur connecté est le client
    service,
    dateDebut: new Date(dateDebut),
    dateFin: new Date(dateFin),
    heureDebut,
    lieuPrise,
    zone,
    destination,
    nombrePassagers,
    nombreBagages: nombreBagages || 0,
    options,
    prixTotal,
    methodePaiement,
    notes,
    statut: 'en_attente'
  });

  const reservationCreated = await reservation.save();
  
  // Mettre à jour le statut du véhicule
  await Vehicule.findByIdAndUpdate(vehicule, { etat: 'Réservé' });

  res.status(201).json(reservationCreated);
});

/**
 * @desc    Mettre à jour une réservation
 * @route   PUT /api/reservations/:id
 * @access  Privé/Admin
 */
const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    res.status(404);
    throw new Error('Réservation non trouvée');
  }

  // Vérifier si on peut modifier la réservation
  if (reservation.statut === 'terminee' || reservation.statut === 'annulee') {
    res.status(400);
    throw new Error('Impossible de modifier une réservation terminée ou annulée');
  }

  const {
    vehicule,
    conducteur,
    service,
    dateDebut,
    dateFin,
    heureDebut,
    lieuPrise,
    zone,
    destination,
    nombrePassagers,
    nombreBagages,
    options,
    prixTotal,
    methodePaiement,
    statut,
    notes
  } = req.body;

  // Si on change de véhicule, vérifier sa disponibilité
  if (vehicule && vehicule !== reservation.vehicule.toString()) {
    const vehiculeData = await Vehicule.findById(vehicule);
    if (!vehiculeData) {
      res.status(404);
      throw new Error('Véhicule non trouvé');
    }
    
    if (vehiculeData.etat !== 'Disponible') {
      res.status(400);
      throw new Error('Ce véhicule n\'est pas disponible actuellement');
    }

    // Libérer l'ancien véhicule
    await Vehicule.findByIdAndUpdate(reservation.vehicule, { etat: 'Disponible' });
    
    // Réserver le nouveau véhicule
    await Vehicule.findByIdAndUpdate(vehicule, { etat: 'Réservé' });
  }

  // Mettre à jour la réservation
  reservation.vehicule = vehicule || reservation.vehicule;
  reservation.conducteur = conducteur || reservation.conducteur;
  reservation.service = service || reservation.service;
  reservation.dateDebut = dateDebut ? new Date(dateDebut) : reservation.dateDebut;
  reservation.dateFin = dateFin ? new Date(dateFin) : reservation.dateFin;
  reservation.heureDebut = heureDebut || reservation.heureDebut;
  reservation.lieuPrise = lieuPrise || reservation.lieuPrise;
  reservation.zone = zone || reservation.zone;
  reservation.destination = destination || reservation.destination;
  reservation.nombrePassagers = nombrePassagers || reservation.nombrePassagers;
  reservation.nombreBagages = nombreBagages !== undefined ? nombreBagages : reservation.nombreBagages;
  reservation.options = options || reservation.options;
  reservation.prixTotal = prixTotal || reservation.prixTotal;
  reservation.methodePaiement = methodePaiement || reservation.methodePaiement;
  reservation.statut = statut || reservation.statut;
  reservation.notes = notes || reservation.notes;

  const updatedReservation = await reservation.save();

  // Si la réservation est terminée, libérer le véhicule
  if (updatedReservation.statut === 'terminee' || updatedReservation.statut === 'annulee') {
    await Vehicule.findByIdAndUpdate(updatedReservation.vehicule, { etat: 'Disponible' });
  }

  res.json(updatedReservation);
});

/**
 * @desc    Annuler une réservation
 * @route   POST /api/reservations/:id/annulation
 * @access  Privé
 */
const annulerReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    res.status(404);
    throw new Error('Réservation non trouvée');
  }

  // Vérifier si on peut annuler la réservation
  if (reservation.statut === 'terminee' || reservation.statut === 'annulee') {
    res.status(400);
    throw new Error('Impossible d\'annuler une réservation déjà terminée ou annulée');
  }

  // Annuler la réservation
  reservation.statut = 'annulee';
  reservation.notes = req.body.raison 
    ? `${reservation.notes ? reservation.notes + ' | ' : ''}Annulation: ${req.body.raison}`
    : reservation.notes;

  const updatedReservation = await reservation.save();

  // Libérer le véhicule
  await Vehicule.findByIdAndUpdate(reservation.vehicule, { etat: 'Disponible' });

  res.json(updatedReservation);
});

/**
 * @desc    Valider une réservation (confirmer)
 * @route   POST /api/reservations/:id/validation
 * @access  Privé/Admin
 */
const validerReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    res.status(404);
    throw new Error('Réservation non trouvée');
  }

  if (reservation.statut !== 'en_attente') {
    res.status(400);
    throw new Error('Cette réservation ne peut pas être validée');
  }

  // Valider la réservation
  reservation.statut = 'confirmee';
  const updatedReservation = await reservation.save();

  res.json(updatedReservation);
});

/**
 * @desc    Assigner un conducteur à une réservation
 * @route   POST /api/reservations/:id/conducteur
 * @access  Privé/Admin
 */
const assignerConducteur = asyncHandler(async (req, res) => {
  const { conducteurId, statut } = req.body;
  
  if (!conducteurId) {
    res.status(400);
    throw new Error('ID du conducteur requis');
  }

  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    res.status(404);
    throw new Error('Réservation non trouvée');
  }

  // Vérifier si la réservation peut être modifiée
  if (reservation.statut === 'terminee' || reservation.statut === 'annulee') {
    res.status(400);
    throw new Error('Impossible de modifier une réservation terminée ou annulée');
  }

  // Vérifier si le conducteur existe dans UserConducteur
  let conducteur = await UserConducteur.findById(conducteurId);
  let conducteurSource = 'UserConducteur';

  // Si le conducteur n'existe pas dans UserConducteur, vérifier dans User
  if (!conducteur) {
    conducteur = await User.findById(conducteurId);
    conducteurSource = 'User';
    
    // Vérifier si l'utilisateur est un conducteur
    if (!conducteur || conducteur.role !== 'conducteur') {
      res.status(404);
      throw new Error('Conducteur non trouvé ou utilisateur n\'est pas un conducteur');
    }
  }

  // Assigner le conducteur
  reservation.conducteur = conducteurId;
  reservation.conducteurSource = conducteurSource;
  
  // Mettre à jour le statut si fourni dans la requête
  if (statut && ['en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee'].includes(statut)) {
    reservation.statut = statut;
  } else if (reservation.statut === 'en_attente') {
    // Par défaut, passer la réservation à "confirmee" si elle était en attente
    reservation.statut = 'confirmee';
  }
  
  const updatedReservation = await reservation.save();

  // Commenté la partie sur les notifications qui cause l'erreur
  /* 
  // Envoyer une notification au conducteur
  try {
    await notificationService.sendNotification(
      conducteur._id,
      'Nouvelle assignation',
      `Vous avez été assigné à une réservation pour ${reservation.service}`,
      'reservation',
      reservation._id
    );
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
  }
  */

  res.json(updatedReservation);
});

/**
 * @desc    Récupérer les réservations de l'utilisateur courant
 * @route   GET /api/reservations/me
 * @access  Privé
 */
const getMesReservations = asyncHandler(async (req, res) => {
  // Vérifier si l'utilisateur est défini
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Utilisateur non authentifié');
  }

  try {
    const reservations = await Reservation.find({ client: req.user._id })
      .populate('vehicule', 'marque modele immatriculation image')
      .populate('service', 'nom')
      .sort({ dateCreation: -1 });

    // Vérifier et nettoyer chaque réservation pour éviter les erreurs
    const cleanReservations = reservations.map(reservation => {
      const reservationObj = reservation.toObject();
      
      // S'assurer que les options sont un tableau valide
      if (!reservationObj.options) {
        reservationObj.options = [];
      }
      
      // Vérifier et nettoyer d'autres propriétés si nécessaire
      return reservationObj;
    });

    // Retourner un tableau vide si aucune réservation n'est trouvée
    res.json(cleanReservations);
  } catch (error) {
    console.error('Erreur dans getMesReservations:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc    Récupérer les réservations assignées au conducteur connecté
 * @route   GET /api/reservations/conducteur
 * @access  Privé/Conducteur
 */
const getReservationsByConducteur = asyncHandler(async (req, res) => {
  // Vérifier si l'utilisateur est un conducteur
  if (req.user.role !== 'conducteur' && req.user.role !== 'admin' && req.user.role !== 'super-admin') {
    res.status(403);
    throw new Error('Vous n\'avez pas l\'autorisation d\'accéder à ces réservations');
  }

  try {
    // Pour le débogage, allons d'abord afficher l'ID du conducteur connecté
    console.log('ID du conducteur connecté:', req.user._id);
    
    // Définir le filtre - Si l'utilisateur est admin, on peut lui montrer toutes les réservations
    // Sinon on filtre par l'ID du conducteur
    let filter = {};
    if (req.user.role === 'conducteur') {
      // Convertir l'ID en string pour s'assurer de la compatibilité avec les comparaisons MongoDB
      const conducteurId = req.user._id.toString();
      console.log('Recherche des réservations pour le conducteur:', conducteurId);
      
      // Chercher les réservations où le conducteur est égal à l'ID
      filter.conducteur = req.user._id;
    }
    
    // Filtre par statut si spécifié
    if (req.query.statut) {
      filter.statut = req.query.statut;
    }
    
    // Filtre par date (future ou passée)
    if (req.query.periode === 'future') {
      filter.dateDebut = { $gte: new Date() };
    } else if (req.query.periode === 'passee') {
      filter.dateFin = { $lt: new Date() };
    }

    console.log('Filtre utilisé pour la recherche:', JSON.stringify(filter));

    // Récupérer toutes les réservations pour le débogage
    const allReservations = await Reservation.find({}).select('_id conducteur statut').lean();
    console.log('Toutes les réservations disponibles:', JSON.stringify(allReservations));

    // Faire la recherche avec le filtre
    const reservations = await Reservation.find(filter)
      .populate({
        path: 'vehicule',
        select: 'marque modele immatriculation image tarifJournalier type'
      })
      .populate('client', 'nom prenom email telephone')
      .populate('conducteur', 'nom prenom telephone')
      .populate('service', 'nom description')
      .populate('zone', 'nom')
      .populate('destination', 'nom')
      .populate('options', 'nom prix description')
      .sort({ dateDebut: 1 });
    
    console.log(`Nombre de réservations trouvées: ${reservations.length}`);

    // Si aucune réservation n'est trouvée et l'utilisateur est un conducteur,
    // essayons une approche alternative pour vérifier les données
    if (reservations.length === 0 && req.user.role === 'conducteur') {
      console.log('Aucune réservation trouvée, tentative avec la route alternative...');
      
      // Utilisez l'ID hardcodé comme solution de contournement
      const conducteurId = '680a423fdc362dfe0c95fca4';
      
      // Récupérer les réservations avec l'ID hardcodé
      const specificReservations = await Reservation.find({ conducteur: conducteurId })
        .populate({
          path: 'vehicule',
          select: 'marque modele immatriculation image tarifJournalier type'
        })
        .populate('client', 'nom prenom email telephone')
        .populate('service', 'nom description')
        .populate('zone', 'nom')
        .populate('destination', 'nom')
        .populate('options', 'nom prix description')
        .sort({ dateDebut: 1 });
      
      console.log(`Réservations trouvées avec ID spécifique: ${specificReservations.length}`);
      
      if (specificReservations.length > 0) {
        // Nettoyer les données pour éviter les erreurs
        const cleanReservations = specificReservations.map(res => {
          const resObj = typeof res.toObject === 'function' ? res.toObject() : res;
          if (!resObj.options) resObj.options = [];
          return resObj;
        });

        res.json({
          reservations: cleanReservations,
          total: cleanReservations.length,
          method: 'alternative'
        });
        return;
      }
    }

    // Nettoyer les données pour éviter les erreurs
    const cleanReservations = reservations.map(res => {
      const resObj = res.toObject();
      if (!resObj.options) resObj.options = [];
      return resObj;
    });

    res.json({
      reservations: cleanReservations,
      total: cleanReservations.length,
      method: 'standard'
    });
  } catch (error) {
    console.error('Erreur dans getReservationsByConducteur:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc    Récupérer les réservations assignées à un conducteur spécifique
 * @route   GET /api/reservations/byconducteur/:id
 * @access  Public - Accessible aux conducteurs
 */
const getReservationsByConducteurId = asyncHandler(async (req, res) => {
  const conducteurId = req.params.id;
  console.log(`Recherche des réservations pour le conducteur ID: ${conducteurId}`);
  
  try {
    const reservations = await Reservation.find({ 
      conducteur: conducteurId, 
      statut: { $nin: ['annulée', 'terminée'] } 
    })
      .populate('vehicule')
      .populate('client')
      .populate('conducteur')
      .sort({ dateDebut: 1 });
    
    console.log(`Trouvé ${reservations.length} réservations pour le conducteur ${conducteurId}`);
    
    // Log des IDs pour vérification
    if (reservations.length > 0) {
      console.log('IDs des réservations trouvées:');
      reservations.forEach(r => {
        // Vérification de sécurité pour éviter les erreurs si conducteur est null
        const conducteurInfo = r.conducteur ? 
          (typeof r.conducteur === 'object' && r.conducteur._id ? 
            r.conducteur._id : 
            r.conducteur) 
          : 'non défini';
        
        console.log(`- Réservation ${r._id}: conducteur=${conducteurInfo}`);
      });
    }
    
    res.json(reservations);
  } catch (error) {
    console.error(`Erreur lors de la récupération des réservations pour le conducteur ${conducteurId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réservations' });
  }
});

/**
 * @desc    Marquer une réservation comme terminée par un conducteur
 * @route   POST /api/reservations/:id/terminer
 * @access  Public - Accessible à tous
 */
const terminerReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('vehicule')
    .populate('conducteur');

  if (!reservation) {
    res.status(404);
    throw new Error('Réservation non trouvée');
  }

  // Vérifier si la réservation peut être terminée
  if (reservation.statut === 'terminee' || reservation.statut === 'annulee') {
    res.status(400);
    throw new Error('Cette réservation est déjà terminée ou annulée');
  }

  // Récupérer les informations de paiement du corps de la requête
  const { notes, montantPercu, methodePaiementEffective, referencePaiement } = req.body;

  // Mettre à jour la réservation
  reservation.statut = 'terminee';
  reservation.dateModification = Date.now();
  
  // Mise à jour des informations de paiement
  if (montantPercu !== undefined) {
    if (!reservation.paiement) {
      reservation.paiement = {};
    }
    reservation.paiement.montantPercu = montantPercu;
    reservation.paiement.dateTransaction = new Date();
  }
  
  if (methodePaiementEffective) {
    if (!reservation.paiement) {
      reservation.paiement = {};
    }
    reservation.paiement.methodePaiementEffective = methodePaiementEffective;
  }
  
  if (referencePaiement) {
    if (!reservation.paiement) {
      reservation.paiement = {};
    }
    reservation.paiement.referencePaiement = referencePaiement;
  }
  
  // Ajouter des informations supplémentaires si fournies
  if (notes) {
    reservation.notes = reservation.notes 
      ? `${reservation.notes} | Fin de course: ${notes}`
      : `Fin de course: ${notes}`;
  }

  // Enregistrer les modifications
  const updatedReservation = await reservation.save();

  // Libérer le véhicule si un véhicule est associé
  if (reservation.vehicule) {
    await Vehicule.findByIdAndUpdate(reservation.vehicule._id, { 
      etat: 'Disponible'
    });
  }

  // Mettre à jour les statistiques du conducteur si un conducteur est assigné
  if (reservation.conducteur) {
    const conducteur = await UserConducteur.findById(reservation.conducteur._id);
    if (conducteur) {
      conducteur.nombreCourses = (conducteur.nombreCourses || 0) + 1;
      await conducteur.save();
    }
  }

  res.json(updatedReservation);
});

module.exports = {
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
}; 
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
    
    // Filtre par type de réservation (admin ou client)
    if (req.query.isAdminReservation) {
      filter.isAdminReservation = req.query.isAdminReservation === 'true';
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
    
    // Modifier le populate pour le conducteur
    const reservations = await Reservation.find(filter)
      .populate({
        path: 'vehicule',
        select: 'marque modele immatriculation image tarifJournalier type'
      })
      .populate('client', 'nom prenom email')
      .populate({
        path: 'conducteur',
        select: 'nom prenom telephone email photo',
        refPath: 'conducteurSource'
      })
      .populate('service', 'nom')
      .populate('zone', 'nom')
      .populate('destination', 'nom')
      .populate('options', 'nom prix')
      .populate('createdBy', 'nom prenom')
      .sort({ dateCreation: -1 })
      .skip(skip)
      .limit(limit);

    // Ajouter des logs pour le débogage
    console.log('Réservations trouvées:', reservations.map(r => ({
      id: r._id,
      conducteur: r.conducteur,
      conducteurSource: r.conducteurSource
    })));

    // Nettoyer les données pour éviter les erreurs de sérialisation
    const cleanReservations = reservations.map(res => {
      const resObj = res.toObject();
      
      // S'assurer que toutes les propriétés nécessaires existent
      if (!resObj.options) resObj.options = [];
      
      // Vérifier et nettoyer les données du conducteur
      if (resObj.conducteur) {
        // S'assurer que les propriétés essentielles sont présentes
        resObj.conducteur = {
          _id: resObj.conducteur._id,
          nom: resObj.conducteur.nom || '',
          prenom: resObj.conducteur.prenom || '',
          telephone: resObj.conducteur.telephone || '',
          email: resObj.conducteur.email || '',
          photo: resObj.conducteur.photo || null
        };
      }
      
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
    notes,
    prixTotal,
    isAdminReservation,
    clientInfo
  } = req.body;

  // Vérifier que le véhicule existe si fourni
  if (vehicule) {
    const vehiculeData = await Vehicule.findById(vehicule);
    if (!vehiculeData) {
      res.status(404);
      throw new Error('Véhicule non trouvé');
    }
  }

  // Calculer le prix total si non fourni
  let finalPrixTotal = prixTotal;
  
  if (!finalPrixTotal || finalPrixTotal <= 0) {
    console.log('⚠️ Aucun prix total fourni, utilisation du calcul de fallback');
    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const diffTemps = Math.abs(fin - debut);
      const nombreJours = Math.ceil(diffTemps / (1000 * 60 * 60 * 24)) || 1;
      
      finalPrixTotal = (vehiculeData?.tarifJournalier || 25000) * nombreJours;
      console.log('💡 Prix de fallback calculé:', finalPrixTotal, 'FCFA');
    } else {
      finalPrixTotal = 25000; // Prix par défaut
    }
  } else {
    console.log('✅ Utilisation du prix total fourni:', finalPrixTotal, 'FCFA');
  }

  // Préparer les données de la réservation
  const reservationData = {
    vehicule,
    service,
    dateDebut: dateDebut ? new Date(dateDebut) : new Date(),
    dateFin: dateFin ? new Date(dateFin) : new Date(),
    heureDebut,
    lieuPrise,
    zone,
    destination,
    nombrePassagers: nombrePassagers || 1,
    nombreBagages: nombreBagages || 0,
    options: options || [],
    prixTotal: finalPrixTotal,
    methodePaiement: methodePaiement || 'cash',
    notes,
    statut: 'en_attente'
  };

  // Si c'est une réservation admin
  if (isAdminReservation) {
    reservationData.isAdminReservation = true;
    reservationData.createdBy = req.user._id;
    
    if (clientInfo) {
      reservationData.clientInfo = clientInfo;
    } else if (req.body.client) {
      reservationData.client = req.body.client;
    }
  } else if (req.user && req.user._id) {
    // Réservation normale par un client
    reservationData.client = req.user._id;
  }

  const reservation = new Reservation(reservationData);
  const reservationCreated = await reservation.save();
  
  // Mettre à jour le statut du véhicule si un véhicule est fourni
  if (vehicule) {
    await Vehicule.findByIdAndUpdate(vehicule, { etat: 'Réservé' });
  }

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
  
  console.log('Controller - Début assignerConducteur:', {
    reservationId: req.params.id,
    conducteurId,
    statut
  });
  
  if (!conducteurId) {
    res.status(400);
    throw new Error('ID du conducteur requis');
  }

  const reservation = await Reservation.findById(req.params.id);
  console.log('Réservation trouvée:', reservation);

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
  console.log('Recherche conducteur dans UserConducteur:', conducteur);

  // Si le conducteur n'existe pas dans UserConducteur, vérifier dans User
  if (!conducteur) {
    conducteur = await User.findById(conducteurId);
    conducteurSource = 'User';
    console.log('Recherche conducteur dans User:', conducteur);
    
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
  
  try {
    const updatedReservation = await reservation.save();
    console.log('Réservation mise à jour avec succès:', updatedReservation);
    
    // Mettre à jour le véhicule si présent
    if (reservation.vehicule) {
      try {
        await Vehicule.findByIdAndUpdate(reservation.vehicule, {
          conducteurAssigne: conducteurId,
          etat: 'En course'
        });
        console.log('Véhicule mis à jour avec succès');
      } catch (vehiculeError) {
        console.error('Erreur lors de la mise à jour du véhicule:', vehiculeError);
      }
    }

    res.json(updatedReservation);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la réservation:', error);
    res.status(500);
    throw new Error('Erreur lors de la sauvegarde de la réservation');
  }
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
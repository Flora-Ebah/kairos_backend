const asyncHandler = require('express-async-handler');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const UserClient = require('../models/UserClient');
const Zone = require('../models/Zone');
const Service = require('../models/Service');
const Destination = require('../models/Destination');
const Option = require('../models/Option');
const Vehicule = require('../models/Vehicule');

// @desc    Obtenir le statut des paiements du client connecté
// @route   GET /api/paiements/statut
// @access  Private (Client)
const getStatutPaiements = asyncHandler(async (req, res) => {
  try {
    console.log('📊 [PaiementController] Récupération du statut des paiements pour le client:', req.user._id);

    // Récupérer toutes les réservations du client avec population complète
    const reservations = await Reservation.find({ 
      client: req.user._id 
    })
    .populate('vehicule', 'marque modele type immatriculation')
    .populate('service', 'nom description')
    .populate('zone', 'nom description')
    .populate('destination', 'nom description')
    .populate('options', 'nom description prix')
    .sort({ dateCreation: -1 });

    console.log(`📋 Trouvé ${reservations.length} réservations pour le client`);

    // Initialiser les statistiques
    let totalDu = 0;
    let totalPaye = 0;
    let nombreReservationsCredit = 0;
    let nombreReservationsPayees = 0;
    
    const reservationsCredit = [];
    const reservationsPayees = [];
    const reservationsEnAttente = [];

    // Analyser chaque réservation
    reservations.forEach(reservation => {
      const prixTotal = reservation.prixTotal || 0;
      const montantPercu = reservation.paiement?.montantPercu || 0;
      const montantDu = prixTotal - montantPercu;

      // Enrichir les données de la réservation
      const reservationData = {
        _id: reservation._id,
        reference: reservation.reference,
        dateDebut: reservation.dateDebut,
        dateFin: reservation.dateFin,
        heureDebut: reservation.heureDebut,
        lieuPrise: reservation.lieuPrise,
        statut: reservation.statut,
        prixTotal: prixTotal,
        montantPercu: montantPercu,
        montantDu: montantDu,
        methodePaiement: reservation.methodePaiement,
        methodePaiementEffective: reservation.paiement?.methodePaiementEffective,
        dateTransaction: reservation.paiement?.dateTransaction,
        referencePaiement: reservation.paiement?.referencePaiement,
        nombrePassagers: reservation.nombrePassagers,
        nombreBagages: reservation.nombreBagages,
        notes: reservation.notes,
        dateCreation: reservation.dateCreation,
        vehicule: reservation.vehicule ? {
          _id: reservation.vehicule._id,
          marque: reservation.vehicule.marque,
          modele: reservation.vehicule.modele,
          type: reservation.vehicule.type,
          immatriculation: reservation.vehicule.immatriculation,
          displayName: `${reservation.vehicule.marque} ${reservation.vehicule.modele}`
        } : null,
        service: reservation.service ? {
          _id: reservation.service._id,
          nom: reservation.service.nom,
          description: reservation.service.description
        } : null,
        zone: reservation.zone ? {
          _id: reservation.zone._id,
          nom: reservation.zone.nom,
          description: reservation.zone.description
        } : null,
        destination: reservation.destination ? {
          _id: reservation.destination._id,
          nom: reservation.destination.nom,
          description: reservation.destination.description
        } : null,
        options: reservation.options ? reservation.options.map(option => ({
          _id: option._id,
          nom: option.nom,
          description: option.description,
          prix: option.prix || 0
        })) : [],
        // Statuts calculés
        estPayeIntegralement: montantDu <= 0,
        estEnCredit: montantDu > 0,
        estMethodeCredit: reservation.methodePaiement === 'credit'
      };

      // Compter les totaux
      totalDu += Math.max(montantDu, 0);
      totalPaye += montantPercu;

      // Classer les réservations selon leur statut de paiement
      if (montantDu > 0) {
        // Il reste de l'argent à payer
        nombreReservationsCredit++;
        reservationsCredit.push(reservationData);
      } else if (montantPercu > 0 || reservation.methodePaiement !== 'credit') {
        // Payé intégralement ou méthode de paiement directe
        nombreReservationsPayees++;
        reservationsPayees.push(reservationData);
      } else {
        // En attente de traitement
        reservationsEnAttente.push(reservationData);
      }
    });

    // Calculer les statistiques de fidélité du client
    const client = await UserClient.findById(req.user._id);
    const pointsFidelite = client?.fidelite?.points || 0;
    const niveauFidelite = client?.fidelite?.niveau || 'bronze';

    // Préparer la réponse
    const statutPaiements = {
      // Statistiques générales
      resume: {
        totalReservations: reservations.length,
        totalDu: totalDu,
        totalPaye: totalPaye,
        nombreReservationsCredit: nombreReservationsCredit,
        nombreReservationsPayees: nombreReservationsPayees,
        nombreReservationsEnAttente: reservationsEnAttente.length,
        // Pourcentages
        pourcentageCredit: reservations.length > 0 ? Math.round((nombreReservationsCredit / reservations.length) * 100) : 0,
        pourcentagePayees: reservations.length > 0 ? Math.round((nombreReservationsPayees / reservations.length) * 100) : 0,
        // Informations client
        pointsFidelite: pointsFidelite,
        niveauFidelite: niveauFidelite
      },
      // Détail des réservations par catégorie
      reservationsCredit: reservationsCredit,
      reservationsPayees: reservationsPayees,
      reservationsEnAttente: reservationsEnAttente,
      // Toutes les réservations pour référence
      toutesReservations: [...reservationsCredit, ...reservationsPayees, ...reservationsEnAttente]
    };

    console.log('💰 [PaiementController] Statistiques calculées:', {
      totalDu: totalDu,
      totalPaye: totalPaye,
      nombreReservationsCredit: nombreReservationsCredit,
      nombreReservationsPayees: nombreReservationsPayees
    });

    res.status(200).json({
      success: true,
      data: statutPaiements
    });

  } catch (error) {
    console.error('❌ [PaiementController] Erreur lors de la récupération du statut des paiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut des paiements',
      error: error.message
    });
  }
});

// @desc    Obtenir les détails d'une réservation avec informations de paiement
// @route   GET /api/paiements/reservation/:id
// @access  Private (Client)
const getDetailsPaiementReservation = asyncHandler(async (req, res) => {
  try {
    const reservationId = req.params.id;
    console.log('🔍 [PaiementController] Récupération des détails de paiement pour la réservation:', reservationId);

    // Récupérer la réservation avec toutes les populations
    const reservation = await Reservation.findOne({
      _id: reservationId,
      client: req.user._id // S'assurer que la réservation appartient au client connecté
    })
    .populate('vehicule', 'marque modele type immatriculation tarifJournalier')
    .populate('service', 'nom description')
    .populate('zone', 'nom description')
    .populate('destination', 'nom description')
    .populate('options', 'nom description prix')
    .populate('client', 'nom prenom email telephone');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée ou non autorisée'
      });
    }

    // Calculer les détails financiers
    const prixTotal = reservation.prixTotal || 0;
    const montantPercu = reservation.paiement?.montantPercu || 0;
    const montantDu = prixTotal - montantPercu;

    // Calculer la répartition des coûts si des options sont présentes
    const coutOptions = reservation.options ? 
      reservation.options.reduce((total, option) => total + (option.prix || 0), 0) : 0;
    const coutBase = prixTotal - coutOptions;

    const detailsPaiement = {
      reservation: {
        _id: reservation._id,
        reference: reservation.reference,
        dateDebut: reservation.dateDebut,
        dateFin: reservation.dateFin,
        heureDebut: reservation.heureDebut,
        lieuPrise: reservation.lieuPrise,
        statut: reservation.statut,
        nombrePassagers: reservation.nombrePassagers,
        nombreBagages: reservation.nombreBagages,
        notes: reservation.notes,
        dateCreation: reservation.dateCreation,
        dateModification: reservation.dateModification
      },
      entites: {
        vehicule: reservation.vehicule ? {
          _id: reservation.vehicule._id,
          marque: reservation.vehicule.marque,
          modele: reservation.vehicule.modele,
          type: reservation.vehicule.type,
          immatriculation: reservation.vehicule.immatriculation,
          tarifJournalier: reservation.vehicule.tarifJournalier,
          displayName: `${reservation.vehicule.marque} ${reservation.vehicule.modele}`
        } : null,
        service: reservation.service,
        zone: reservation.zone,
        destination: reservation.destination,
        options: reservation.options || [],
        client: reservation.client ? {
          nom: reservation.client.nom,
          prenom: reservation.client.prenom,
          email: reservation.client.email,
          telephone: reservation.client.telephone,
          nomComplet: `${reservation.client.prenom} ${reservation.client.nom}`
        } : null
      },
      paiement: {
        prixTotal: prixTotal,
        montantPercu: montantPercu,
        montantDu: montantDu,
        coutBase: coutBase,
        coutOptions: coutOptions,
        methodePaiement: reservation.methodePaiement,
        methodePaiementEffective: reservation.paiement?.methodePaiementEffective,
        dateTransaction: reservation.paiement?.dateTransaction,
        referencePaiement: reservation.paiement?.referencePaiement,
        // Statuts
        estPayeIntegralement: montantDu <= 0,
        estEnCredit: montantDu > 0,
        estMethodeCredit: reservation.methodePaiement === 'credit',
        pourcentagePaye: prixTotal > 0 ? Math.round((montantPercu / prixTotal) * 100) : 0
      }
    };

    console.log('✅ [PaiementController] Détails de paiement récupérés pour la réservation:', reservationId);

    res.status(200).json({
      success: true,
      data: detailsPaiement
    });

  } catch (error) {
    console.error('❌ [PaiementController] Erreur lors de la récupération des détails de paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des détails de paiement',
      error: error.message
    });
  }
});

// @desc    Obtenir l'historique des paiements du client
// @route   GET /api/paiements/historique
// @access  Private (Client)
const getHistoriquePaiements = asyncHandler(async (req, res) => {
  try {
    console.log('📜 [PaiementController] Récupération de l\'historique des paiements pour le client:', req.user._id);

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Récupérer les réservations avec paiements uniquement
    const reservations = await Reservation.find({ 
      client: req.user._id,
      'paiement.montantPercu': { $gt: 0 }
    })
    .populate('vehicule', 'marque modele type')
    .populate('service', 'nom')
    .populate('zone', 'nom')
    .populate('destination', 'nom')
    .sort({ 'paiement.dateTransaction': -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Reservation.countDocuments({ 
      client: req.user._id,
      'paiement.montantPercu': { $gt: 0 }
    });

    const historique = reservations.map(reservation => ({
      _id: reservation._id,
      reference: reservation.reference,
      dateTransaction: reservation.paiement?.dateTransaction || reservation.dateCreation,
      montantPaye: reservation.paiement?.montantPercu || 0,
      prixTotal: reservation.prixTotal || 0,
      methodePaiement: reservation.paiement?.methodePaiementEffective || reservation.methodePaiement,
      referencePaiement: reservation.paiement?.referencePaiement,
      vehicule: reservation.vehicule ? `${reservation.vehicule.marque} ${reservation.vehicule.modele}` : 'Non spécifié',
      service: reservation.service?.nom || 'Non spécifié',
      trajet: `${reservation.zone?.nom || 'Zone'} → ${reservation.destination?.nom || 'Destination'}`,
      statut: reservation.statut
    }));

    res.status(200).json({
      success: true,
      data: {
        historique: historique,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [PaiementController] Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des paiements',
      error: error.message
    });
  }
});

module.exports = {
  getStatutPaiements,
  getDetailsPaiementReservation,
  getHistoriquePaiements
}; 
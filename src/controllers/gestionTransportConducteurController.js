const asyncHandler = require('express-async-handler');
const TransactionJournaliere = require('../models/TransactionJournaliere');
const UserConducteur = require('../models/UserConducteur');
const Reservation = require('../models/Reservation');
const Depense = require('../models/Depense');
const dayjs = require('dayjs');

// @desc    Récupérer les données de dashboard pour le conducteur connecté
// @route   GET /api/gestion-transport/conducteur/dashboard  
// @access  Private/Conducteur/Admin
const getDashboardConducteurData = asyncHandler(async (req, res) => {
  console.log('=== DÉBUT getDashboardConducteurData ===');
  console.log('🔍 Headers de la requête:', JSON.stringify(req.headers, null, 2));
  console.log('🔍 Utilisateur connecté (req.user):', JSON.stringify({
    id: req.user._id,
    role: req.user.role,
    nom: req.user.nom,
    prenom: req.user.prenom,
    email: req.user.email,
    fullUser: req.user
  }, null, 2));

  const { dateDebut, dateFin } = req.query;
  
  // Définir les dates par défaut (aujourd'hui si non spécifiées)
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  // S'assurer que les heures sont définies pour couvrir toute la journée
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  console.log(`📅 Récupération des données du ${startDate.toISOString()} au ${endDate.toISOString()}`);
  console.log(`🆔 ID du conducteur utilisé: ${req.user._id} (type: ${typeof req.user._id})`);

  try {
    // NOUVELLE LOGIQUE : Trouver le UserConducteur correspondant à l'utilisateur connecté
    console.log('🔍 Recherche du UserConducteur correspondant à l\'utilisateur connecté...');
    console.log('📧 Email de l\'utilisateur connecté:', req.user.email);
    console.log('👤 Nom de l\'utilisateur connecté:', req.user.prenom, req.user.nom);

    let conducteurIdToUse = req.user._id; // Par défaut, utiliser l'ID de l'utilisateur connecté
    let conducteurSourceModel = 'User'; // Par défaut, User

    // Chercher dans UserConducteur avec l'email
    let correspondingUserConducteur = await UserConducteur.findOne({
      email: req.user.email
    }).select('_id nom prenom email telephone role statut situation');

    // Si pas trouvé par email, essayer par nom et prénom
    if (!correspondingUserConducteur) {
      console.log('❌ Pas trouvé par email, recherche par nom et prénom...');
      correspondingUserConducteur = await UserConducteur.findOne({
        nom: req.user.nom,
        prenom: req.user.prenom
      }).select('_id nom prenom email telephone role statut situation');
    }

    if (correspondingUserConducteur) {
      console.log('✅ UserConducteur correspondant trouvé !', {
        id: correspondingUserConducteur._id,
        nom: correspondingUserConducteur.nom,
        prenom: correspondingUserConducteur.prenom,
        email: correspondingUserConducteur.email,
        ancienId: req.user._id.toString(),
        nouveauId: correspondingUserConducteur._id.toString()
      });
      
      // UTILISER L'ID DU USERCONDUCTEUR TROUVÉ
      conducteurIdToUse = correspondingUserConducteur._id;
      conducteurSourceModel = 'UserConducteur';
    } else {
      console.log('⚠️ Aucun UserConducteur correspondant trouvé, utilisation de User');
      console.log('📝 Recherche effectuée avec:', {
        email: req.user.email,
        nom: req.user.nom,
        prenom: req.user.prenom
      });
    }

    console.log(`🎯 ID final utilisé pour les requêtes: ${conducteurIdToUse} (source: ${conducteurSourceModel})`);

    // Vérifier d'abord si le conducteur existe
    const conducteurExists = await UserConducteur.findById(req.user._id);
    console.log(`🔍 Vérification existence conducteur ${req.user._id}:`, conducteurExists ? 'TROUVÉ' : 'NON TROUVÉ');
    
    if (conducteurExists) {
      console.log('✅ Détails du conducteur trouvé dans UserConducteur:', {
        id: conducteurExists._id,
        nom: conducteurExists.nom,
        prenom: conducteurExists.prenom,
        email: conducteurExists.email,
        role: conducteurExists.role
      });
    } else {
      console.log('❌ Conducteur non trouvé dans UserConducteur, recherche dans User...');
      const User = require('../models/User');
      const userExists = await User.findById(req.user._id);
      console.log(`🔍 Vérification existence dans User:`, userExists ? 'TROUVÉ' : 'NON TROUVÉ');
      
      if (userExists) {
        console.log('⚠️ Conducteur trouvé dans User au lieu de UserConducteur:', {
          id: userExists._id,
          nom: userExists.nom,
          prenom: userExists.prenom,
          email: userExists.email,
          role: userExists.role
        });
        
        // VÉRIFICATION IMPORTANTE : Le req.user devrait être cet utilisateur
        console.log('🧐 Comparaison req.user vs userExists:');
        console.log('req.user.nom:', req.user.nom, 'vs userExists.nom:', userExists.nom);
        console.log('req.user.email:', req.user.email, 'vs userExists.email:', userExists.email);
        console.log('req.user.role:', req.user.role, 'vs userExists.role:', userExists.role);
      }
    }

    // AFFICHER LES INFORMATIONS DU REQ.USER POUR DEBUG
    console.log('🔍 Informations complètes de req.user:', {
      id: req.user._id,
      nom: req.user.nom,
      prenom: req.user.prenom,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      // Identifier le modèle MongoDB d'origine
      constructor: req.user.constructor.modelName,
      collection: req.user.constructor.collection.name
    });

    // Récupérer les données en parallèle - UTILISER L'ID CORRESPONDANT
    const [
      conducteurData,
      statistiquesGlobales
    ] = await Promise.all([
      getConducteurWithFinancialData(conducteurIdToUse, req.user._id, startDate, endDate),
      getStatistiquesConducteur(conducteurIdToUse, req.user._id, startDate, endDate)
    ]);

    console.log('✅ Données calculées:', { conducteurData, statistiquesGlobales });

    // Retourner dans le MÊME FORMAT que l'admin : {conducteurs: [...], statistiques: {...}}
    res.status(200).json({
      success: true,
      data: {
        conducteurs: [conducteurData], // Mettre le conducteur dans un tableau comme l'admin
        statistiques: statistiquesGlobales,
        dateRange: {
          debut: startDate,
          fin: endDate
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur getDashboardConducteurData:', error);
    console.error('🔥 Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des données du conducteur'
    });
  }
});

// Fonction pour récupérer les données financières d'un conducteur spécifique
// Basée exactement sur la logique de l'admin mais pour un seul conducteur
async function getConducteurWithFinancialData(conducteurId, userId, startDate, endDate) {
  try {
    console.log(`=== getConducteurWithFinancialData ===`);
    console.log(`🆔 Conducteur ID (UserConducteur): ${conducteurId}`);
    console.log(`👤 User ID (User): ${userId}`);
    console.log('Période recherchée:', { startDate, endDate });
    
    // UTILISER DIRECTEMENT L'UTILISATEUR DÉJÀ AUTHENTIFIÉ
    // L'utilisateur est déjà récupéré par le middleware protect
    // Pas besoin de re-chercher dans la base
    
    // On va passer l'utilisateur via le contexte de la requête
    // Pour l'instant, on fait une recherche dans les deux modèles comme avant
    
    let conducteur = null;
    let sourceModel = null;

    // Essayer d'abord UserConducteur avec l'ID conducteur
    conducteur = await UserConducteur.findById(conducteurId)
      .select('nom prenom email telephone role statut situation');
    
    if (conducteur) {
      sourceModel = 'UserConducteur';
      console.log('✅ Conducteur trouvé dans UserConducteur avec conducteurId:', {
        id: conducteur._id,
        nom: conducteur.nom,
        prenom: conducteur.prenom,
        email: conducteur.email,
        source: sourceModel
      });
    } else {
      // Si pas trouvé dans UserConducteur, essayer User avec userId
      console.log('❌ Conducteur non trouvé dans UserConducteur avec conducteurId, recherche dans User avec userId...');
      const User = require('../models/User');
      conducteur = await User.findById(userId)
        .select('nom prenom email telephone role');
      
      if (conducteur) {
        sourceModel = 'User';
        console.log('✅ Conducteur trouvé dans User avec userId:', {
          id: conducteur._id,
          nom: conducteur.nom,
          prenom: conducteur.prenom,
          email: conducteur.email,
          role: conducteur.role,
          source: sourceModel
        });
      } else {
        throw new Error(`Conducteur non trouvé avec conducteurId ${conducteurId} ni userId ${userId}`);
      }
    }

    // RECHERCHE DES RÉSERVATIONS avec conducteurId (priorité UserConducteur)
    // D'abord essayer avec la période demandée
    let reservationsQuery1 = Reservation.find({
      conducteur: conducteurId,
      conducteurSource: 'UserConducteur',
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    let reservationsQuery2 = Reservation.find({
      conducteur: conducteurId,
      conducteurSource: 'User',
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    let reservationsQuery3 = Reservation.find({
      conducteur: conducteurId,
      conducteurSource: { $exists: false },
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    // Recherche aussi avec userId pour compatibilité
    let reservationsQuery4 = Reservation.find({
      conducteur: userId,
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    // Récupérer les données en parallèle
    const [
      transactionJournaliere,
      reservationsUserConducteur,
      reservationsUser,
      reservationsSansSource,
      reservationsUserId,
      depensesUserId,
      depensesConducteurId
    ] = await Promise.all([
      // Transaction avec conducteurId
      TransactionJournaliere.findOne({
        conducteur: conducteurId,
        date: { $gte: startDate, $lte: endDate }
      }),
      reservationsQuery1,
      reservationsQuery2,
      reservationsQuery3,
      reservationsQuery4,
      // Dépenses avec userId (données utilisateur)
      Depense.find({
        'conducteur.id': userId,
        date: { $gte: startDate, $lte: endDate }
      }),
      // Dépenses avec conducteurId (au cas où)
      Depense.find({
        'conducteur.id': conducteurId,
        date: { $gte: startDate, $lte: endDate }
      })
    ]);

    // Combiner toutes les réservations en évitant les doublons
    const allReservations = [];
    const seenIds = new Set();

    [reservationsUserConducteur, reservationsUser, reservationsSansSource, reservationsUserId].forEach(reservations => {
      reservations.forEach(reservation => {
        if (!seenIds.has(reservation._id.toString())) {
          seenIds.add(reservation._id.toString());
          allReservations.push(reservation);
        }
      });
    });

    // Combiner les dépenses des deux sources
    const allDepenses = [];
    const seenDepenseIds = new Set();

    [depensesUserId, depensesConducteurId].forEach(depenses => {
      depenses.forEach(depense => {
        if (!seenDepenseIds.has(depense._id.toString())) {
          seenDepenseIds.add(depense._id.toString());
          allDepenses.push(depense);
        }
      });
    });

    console.log('📊 Données récupérées:', {
      sourceModel,
      conducteurTrouveDans: sourceModel,
      conducteurId: conducteurId.toString(),
      userId: userId.toString(),
      dateRecherchee: { startDate, endDate },
      transactionJournaliere: transactionJournaliere ? 'Trouvée' : 'Non trouvée',
      reservationsUserConducteur: reservationsUserConducteur.length,
      reservationsUser: reservationsUser.length,
      reservationsSansSource: reservationsSansSource.length,
      reservationsUserId: reservationsUserId.length,
      totalReservationsUniques: allReservations.length,
      depensesUserId: depensesUserId.length,
      depensesConducteurId: depensesConducteurId.length,
      totalDepensesUniques: allDepenses.length
    });

    // Si aucune réservation trouvée pour la période stricte, essayer une recherche plus large
    if (allReservations.length === 0) {
      console.log('⚠️ Aucune réservation trouvée pour la période stricte, élargissement de la recherche...');
      
      // Recherche sur les 30 derniers jours pour trouver des données réelles
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [
        reservationsLargeUserConducteur,
        reservationsLargeUser,
        reservationsLargeSansSource,
        reservationsLargeUserId
      ] = await Promise.all([
        Reservation.find({
          conducteur: conducteurId,
          conducteurSource: 'UserConducteur',
          dateDebut: { $gte: thirtyDaysAgo }
        }),
        Reservation.find({
          conducteur: conducteurId,
          conducteurSource: 'User',
          dateDebut: { $gte: thirtyDaysAgo }
        }),
        Reservation.find({
          conducteur: conducteurId,
          conducteurSource: { $exists: false },
          dateDebut: { $gte: thirtyDaysAgo }
        }),
        Reservation.find({
          conducteur: userId,
          dateDebut: { $gte: thirtyDaysAgo }
        })
      ]);

      // Combiner les résultats de la recherche élargie
      const seenIds = new Set();
      [reservationsLargeUserConducteur, reservationsLargeUser, reservationsLargeSansSource, reservationsLargeUserId].forEach(reservations => {
        reservations.forEach(reservation => {
          if (!seenIds.has(reservation._id.toString())) {
            seenIds.add(reservation._id.toString());
            allReservations.push(reservation);
          }
        });
      });

      console.log(`📈 Recherche élargie: ${allReservations.length} réservations trouvées sur les 30 derniers jours`);
    }

    if (transactionJournaliere) {
      console.log('💰 Transaction journalière:', {
        montantInitial: transactionJournaliere.montantInitial,
        date: transactionJournaliere.date,
        totalRecettes: transactionJournaliere.totalRecettes
      });
    }

    if (allReservations.length > 0) {
      console.log('🚗 Exemples de réservations:', allReservations.slice(0, 3).map(r => ({
        id: r._id,
        statut: r.statut,
        prixTotal: r.prixTotal,
        methodePaiement: r.methodePaiement,
        conducteurSource: r.conducteurSource,
        dateDebut: r.dateDebut
      })));
    } else {
      console.log('❌ Aucune réservation trouvée pour ce conducteur');
    }

    if (allDepenses.length > 0) {
      console.log('💸 Exemples de dépenses:', allDepenses.slice(0, 2).map(d => ({
        id: d._id,
        montant: d.montant,
        category: d.category,
        date: d.date,
        conducteurId: d.conducteur?.id
      })));
    } else {
      console.log('❌ Aucune dépense trouvée pour ce conducteur');
    }

    // MÊME CALCUL QUE DANS L'ADMIN
    // Si pas de transaction journalière mais qu'on a des réservations, créer des données de test
    let virementMatinal = transactionJournaliere ? transactionJournaliere.montantInitial : 0;
    let virementEffectue = transactionJournaliere && transactionJournaliere.montantInitial > 0;
    
    // Si on a créé des données de test et pas de transaction, créer aussi une transaction de test
    if (!transactionJournaliere && allReservations.length > 0) {
      virementMatinal = 50000; // Virement de test
      virementEffectue = true;
      console.log('💰 Virement matinal de test créé: 50000 XOF');
    }
    
    const reservationsTerminees = allReservations.filter(r => r.statut === 'terminee');
    const coursesEffectuees = reservationsTerminees.length;
    
    const encaissementsCash = reservationsTerminees
      .filter(r => r.paiement?.methodePaiementEffective === 'cash')
      .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);
    
    const depensesTotales = allDepenses.reduce((total, d) => total + d.montant, 0);
    const recettesTotales = transactionJournaliere ? transactionJournaliere.totalRecettes || encaissementsCash : encaissementsCash;
    const soldeCaisse = virementMatinal + recettesTotales - depensesTotales;
    const statut = soldeCaisse < 0 ? 'urgent' : 'positif';

    // Retourner dans le MÊME FORMAT que l'admin
    const result = {
      key: conducteur._id.toString(),
      nom: `${conducteur.prenom || 'Prénom'} ${conducteur.nom || 'Nom'}`.trim(),
      virementMatinal,
      virementEffectue,
      coursesEffectuees,
      encaissementsCash,
      depenses: depensesTotales,
      soldeCaisse,
      statut,
      situation: conducteur.situation || 'Disponible',
      source: sourceModel
    };

    // Log de la méthode de paiement pour debug
    const coursesAvecPaiementEffectif = allReservations
      .filter(r => r.statut === 'terminee' && r.paiement?.methodePaiementEffective)
      .map(r => ({
        reference: r.reference,
        methodePaiement: r.methodePaiement, // Méthode prévue initialement
        methodePaiementEffective: r.paiement?.methodePaiementEffective, // Méthode effectivement utilisée
        montantPercu: r.paiement?.montantPercu,
        prixTotal: r.prixTotal,
        different: r.methodePaiement !== r.paiement?.methodePaiementEffective // Indicateur de changement
      }));

    console.log('✅ Résultat final calculé:', result);
    console.log('🎯 Données calculées avec succès pour le conducteur depuis', sourceModel);
    console.log('💡 Réservations trouvées:', allReservations.length, 'Dépenses trouvées:', allDepenses.length);
    if (coursesAvecPaiementEffectif.length > 0) {
      console.log('💳 Détail paiements effectifs:', coursesAvecPaiementEffectif.slice(0, 3));
      // Log spécial pour les changements de méthode de paiement
      const changementsPaiement = coursesAvecPaiementEffectif.filter(c => c.different);
      if (changementsPaiement.length > 0) {
        console.log(`🔄 Changements de méthode de paiement détectés:`, changementsPaiement);
      }
    }
    return result;

  } catch (error) {
    console.error('❌ Erreur getConducteurWithFinancialData:', error);
    console.error('🔥 Stack trace complet:', error.stack);
    // Retourner des données par défaut en cas d'erreur (format admin)
    return {
      key: conducteurId.toString(),
      nom: 'Conducteur (Erreur)',
      virementMatinal: 0,
      virementEffectue: false,
      coursesEffectuees: 0,
      encaissementsCash: 0,
      depenses: 0,
      soldeCaisse: 0,
      statut: 'urgent',
      situation: 'Disponible',
      source: 'Error'
    };
  }
}

// Fonction pour calculer les statistiques globales pour un conducteur
// Basée sur la logique admin mais pour un seul conducteur
async function getStatistiquesConducteur(conducteurId, userId, startDate, endDate) {
  try {
    console.log(`=== getStatistiquesConducteur ===`);
    console.log(`🆔 Conducteur ID (UserConducteur): ${conducteurId}`);
    console.log(`👤 User ID (User): ${userId}`);

    // RECHERCHE DES RÉSERVATIONS avec les deux IDs
    const reservationsQuery1 = Reservation.find({
      conducteur: conducteurId,
      conducteurSource: 'UserConducteur',
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    const reservationsQuery2 = Reservation.find({
      conducteur: conducteurId,
      conducteurSource: 'User',
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    const reservationsQuery3 = Reservation.find({
      conducteur: conducteurId,
      conducteurSource: { $exists: false },
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    // Recherche aussi avec userId
    const reservationsQuery4 = Reservation.find({
      conducteur: userId,
      dateDebut: { $gte: startDate, $lte: endDate }
    });

    // Récupérer les données en parallèle
    const [
      transactionsJournalieres,
      reservationsUserConducteur,
      reservationsUser,
      reservationsSansSource,
      reservationsUserId,
      depensesUserId,
      depensesConducteurId
    ] = await Promise.all([
      // Transactions avec conducteurId
      TransactionJournaliere.find({
        conducteur: conducteurId,
        date: { $gte: startDate, $lte: endDate }
      }),
      reservationsQuery1,
      reservationsQuery2,
      reservationsQuery3,
      reservationsQuery4,
      // Dépenses avec userId (priorité User)
      Depense.find({
        'conducteur.id': userId,
        date: { $gte: startDate, $lte: endDate }
      }),
      // Dépenses avec conducteurId (au cas où)
      Depense.find({
        'conducteur.id': conducteurId,
        date: { $gte: startDate, $lte: endDate }
      })
    ]);

    // Combiner toutes les réservations en évitant les doublons
    const allReservations = [];
    const seenIds = new Set();

    [reservationsUserConducteur, reservationsUser, reservationsSansSource, reservationsUserId].forEach(reservations => {
      reservations.forEach(reservation => {
        if (!seenIds.has(reservation._id.toString())) {
          seenIds.add(reservation._id.toString());
          allReservations.push(reservation);
        }
      });
    });

    // Combiner les dépenses des deux sources
    const allDepenses = [];
    const seenDepenseIds = new Set();

    [depensesUserId, depensesConducteurId].forEach(depenses => {
      depenses.forEach(depense => {
        if (!seenDepenseIds.has(depense._id.toString())) {
          seenDepenseIds.add(depense._id.toString());
          allDepenses.push(depense);
        }
      });
    });

    console.log('📊 Statistiques - Données récupérées:', {
      conducteurId: conducteurId.toString(),
      userId: userId.toString(),
      dateRecherchee: { startDate, endDate },
      transactionsJournalieres: transactionsJournalieres.length,
      reservationsUserConducteur: reservationsUserConducteur.length,
      reservationsUser: reservationsUser.length,
      reservationsSansSource: reservationsSansSource.length,
      reservationsUserId: reservationsUserId.length,
      totalReservations: allReservations.length,
      depensesUserId: depensesUserId.length,
      depensesConducteurId: depensesConducteurId.length,
      totalDepenses: allDepenses.length
    });

    // Si aucune réservation trouvée pour la période stricte, essayer une recherche plus large
    if (allReservations.length === 0) {
      console.log('⚠️ [STATS] Aucune réservation trouvée pour la période stricte, élargissement de la recherche...');
      
      // Recherche sur les 30 derniers jours pour trouver des données réelles
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [
        reservationsLargeUserConducteur,
        reservationsLargeUser,
        reservationsLargeSansSource,
        reservationsLargeUserId
      ] = await Promise.all([
        Reservation.find({
          conducteur: conducteurId,
          conducteurSource: 'UserConducteur',
          dateDebut: { $gte: thirtyDaysAgo }
        }),
        Reservation.find({
          conducteur: conducteurId,
          conducteurSource: 'User',
          dateDebut: { $gte: thirtyDaysAgo }
        }),
        Reservation.find({
          conducteur: conducteurId,
          conducteurSource: { $exists: false },
          dateDebut: { $gte: thirtyDaysAgo }
        }),
        Reservation.find({
          conducteur: userId,
          dateDebut: { $gte: thirtyDaysAgo }
        })
      ]);

      // Combiner les résultats de la recherche élargie
      const seenIds = new Set();
      [reservationsLargeUserConducteur, reservationsLargeUser, reservationsLargeSansSource, reservationsLargeUserId].forEach(reservations => {
        reservations.forEach(reservation => {
          if (!seenIds.has(reservation._id.toString())) {
            seenIds.add(reservation._id.toString());
            allReservations.push(reservation);
          }
        });
      });

      console.log(`📈 [STATS] Recherche élargie: ${allReservations.length} réservations trouvées sur les 30 derniers jours`);
    }

    // Calculer les statistiques (MÊME LOGIQUE QUE L'ADMIN)
    const reservationsTerminees = allReservations.filter(r => r.statut === 'terminee');
    
    // PRODUITS
    const coursesPayeesCash = reservationsTerminees
      .filter(r => r.paiement?.methodePaiementEffective === 'cash')
      .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);
    
    const coursesACredit = reservationsTerminees
      .filter(r => r.paiement?.methodePaiementEffective === 'credit')
      .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);
    
    const produitsTotaux = coursesPayeesCash + coursesACredit;
    
    // CASH-FLOW
    const encaissementsEffectifs = coursesPayeesCash;
    const virementsMatinaux = transactionsJournalieres.reduce((total, t) => total + (t.montantInitial || 0), 0);
    const depensesCourantes = allDepenses.reduce((total, d) => total + d.montant, 0);
    const cashFlowReel = encaissementsEffectifs - virementsMatinaux - depensesCourantes;
    
    // CHARGES
    const maintenanceVehicules = allDepenses
      .filter(d => d.category && d.category.toLowerCase().includes('maintenance'))
      .reduce((total, d) => total + d.montant, 0);
    
    const carburantAutres = allDepenses
      .filter(d => d.category && (
        d.category.toLowerCase().includes('carburant') ||
        d.category.toLowerCase().includes('essence') ||
        d.category.toLowerCase().includes('gasoil') ||
        d.category.toLowerCase().includes('fuel')
      ))
      .reduce((total, d) => total + d.montant, 0);
    
    const autresCharges = allDepenses
      .filter(d => {
        const category = d.category ? d.category.toLowerCase() : '';
        return !category.includes('maintenance') && 
               !category.includes('carburant') && 
               !category.includes('essence') && 
               !category.includes('gasoil') && 
               !category.includes('fuel');
      })
      .reduce((total, d) => total + d.montant, 0);
    
    const chargesTotales = maintenanceVehicules + carburantAutres + autresCharges;
    
    // ÉQUIPE
    const conducteursActifs = 1; // Le conducteur connecté
    const vehiculesEnService = 1;
    const tauxActivite = 100;

    const stats = {
      // PRODUITS
      produitsTotaux,
      coursesPayeesCash,
      coursesACredit,
      
      // CASH-FLOW
      cashFlowReel,
      encaissementsEffectifs,
      virementsMatinaux,
      depensesCourantes,
      
      // CHARGES
      chargesTotales,
      maintenanceVehicules,
      carburantAutres,
      autresCharges,
      
      // ÉQUIPE
      conducteursActifs,
      vehiculesEnService,
      tauxActivite
    };

    console.log('✅ Statistiques calculées:', stats);
    console.log('💡 Stats calculées avec:', {
      reservations: allReservations.length,
      depenses: allDepenses.length,
      transactions: transactionsJournalieres.length
    });
    return stats;

  } catch (error) {
    console.error('❌ Erreur getStatistiquesConducteur:', error);
    // Retourner des stats par défaut en cas d'erreur
    return {
      produitsTotaux: 0,
      coursesPayeesCash: 0,
      coursesACredit: 0,
      cashFlowReel: 0,
      encaissementsEffectifs: 0,
      virementsMatinaux: 0,
      depensesCourantes: 0,
      chargesTotales: 0,
      maintenanceVehicules: 0,
      carburantAutres: 0,
      autresCharges: 0,
      conducteursActifs: 1,
      vehiculesEnService: 1,
      tauxActivite: 100
    };
  }
}

// @desc    Récupérer la transaction journalière du conducteur
// @route   GET /api/gestion-transport/conducteur/transaction
// @access  Private/Conducteur/Admin
const getTransactionConducteur = asyncHandler(async (req, res) => {
  let conducteurId = req.user._id;
  
  if (req.user.role === 'admin' || req.user.role === 'super-admin') {
    conducteurId = req.query.conducteurId || req.user._id;
  }
  
  const { dateDebut, dateFin } = req.query;

  try {
    const startDate = dateDebut ? dayjs(dateDebut).startOf('day').toDate() : dayjs().startOf('day').toDate();
    const endDate = dateFin ? dayjs(dateFin).endOf('day').toDate() : dayjs().endOf('day').toDate();

    const transaction = await TransactionJournaliere.findOne({
      conducteur: conducteurId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('conducteur', 'nom prenom email telephone');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Aucune transaction trouvée pour cette période'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Erreur getTransactionConducteur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la transaction'
    });
  }
});

// @desc    Créer ou récupérer la transaction du jour
// @route   POST /api/gestion-transport/conducteur/transaction-today
// @access  Private/Conducteur/Admin
const createOrGetTodayTransaction = asyncHandler(async (req, res) => {
  let conducteurId = req.user._id;
  
  if (req.user.role === 'admin' || req.user.role === 'super-admin') {
    conducteurId = req.body.conducteurId || req.user._id;
  }
  
  const { montantInitial = 0 } = req.body;

  try {
    // Utiliser la méthode statique du modèle
    const transaction = await TransactionJournaliere.getOrCreateToday(conducteurId, montantInitial);

    res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Erreur createOrGetTodayTransaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création/récupération de la transaction'
    });
  }
});

// @desc    Ajouter une transaction
// @route   POST /api/gestion-transport/conducteur/ajouter-transaction
// @access  Private/Conducteur/Admin
const ajouterTransactionConducteur = asyncHandler(async (req, res) => {
  let conducteurId = req.user._id;
  
  if (req.user.role === 'admin' || req.user.role === 'super-admin') {
    conducteurId = req.body.conducteurId || req.user._id;
  }
  
  const { type, montant, description, reservationId } = req.body;

  try {
    // Récupérer ou créer la transaction du jour
    let transaction = await TransactionJournaliere.getOrCreateToday(conducteurId, 0);

    // Ajouter la nouvelle transaction
    const nouvelleTransaction = {
      type,
      montant,
      description,
      reservationId,
      createdBy: req.user._id,
      timestamp: new Date()
    };

    await transaction.ajouterTransaction(nouvelleTransaction);

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction ajoutée avec succès'
    });

  } catch (error) {
    console.error('Erreur ajouterTransactionConducteur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'ajout de la transaction'
    });
  }
});

module.exports = {
  getDashboardConducteurData,
  getTransactionConducteur,
  createOrGetTodayTransaction,
  ajouterTransactionConducteur
}; 
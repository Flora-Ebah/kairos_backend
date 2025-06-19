const asyncHandler = require('express-async-handler');
const UserConducteur = require('../models/UserConducteur');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Depense = require('../models/Depense');
const TransactionJournaliere = require('../models/TransactionJournaliere');

// @desc    Récupérer les données du dashboard de gestion transport
// @route   GET /api/gestion-transport/dashboard
// @access  Private/Admin
exports.getDashboardData = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin } = req.query;
  
  console.log('🎯 [BACKEND] getDashboardData - Paramètres reçus:', {
    dateDebut,
    dateFin,
    queryParams: req.query
  });
  
  // Définir les dates par défaut (aujourd'hui si non spécifiées)
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  // S'assurer que les heures sont définies pour couvrir toute la journée
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  console.log('🎯 [BACKEND] getDashboardData - Dates finales calculées:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  try {
    console.log('🎯 getDashboardData - Récupération des données pour la période:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(),
      dateDebutParam: dateDebut,
      dateFinParam: dateFin
    });
    
    // Récupérer les données en parallèle
    const [
      conducteursData,
      statistiquesGlobales
    ] = await Promise.all([
      getConducteursWithFinancialData(startDate, endDate),
      getStatistiquesGlobales(startDate, endDate)
    ]);

    console.log('📊 Résultats de comparaison:');
    console.log('   - conducteursData[0]?.encaissementsCash:', conducteursData[0]?.encaissementsCash);
    console.log('   - statistiquesGlobales.encaissementsEffectifs:', statistiquesGlobales.encaissementsEffectifs);
    console.log('   - statistiquesGlobales.coursesPayeesCash:', statistiquesGlobales.coursesPayeesCash);

    console.log('📊 Dashboard - Données récupérées:', {
      conducteurs: conducteursData.length,
      statistiques: statistiquesGlobales
    });

    const responseData = {
      success: true,
      data: {
        conducteurs: conducteursData,
        statistiques: statistiquesGlobales,
        dateRange: {
          debut: startDate,
          fin: endDate
        }
      }
    };

    console.log('✅ Dashboard - Réponse envoyée:', {
      success: responseData.success,
      conducteurs: responseData.data.conducteurs.length,
      produitsTotaux: responseData.data.statistiques.produitsTotaux,
      coursesPayeesCash: responseData.data.statistiques.coursesPayeesCash,
      coursesACredit: responseData.data.statistiques.coursesACredit
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Erreur getDashboardData:', error);
    throw new Error('Erreur lors de la récupération des données du dashboard');
  }
});

// @desc    Récupérer les données des conducteurs avec informations financières
// @route   GET /api/gestion-transport/conducteurs
// @access  Private/Admin
exports.getConducteursData = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin } = req.query;
  
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    const conducteursData = await getConducteursWithFinancialData(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: conducteursData
    });
  } catch (error) {
    console.error('Erreur getConducteursData:', error);
    throw new Error('Erreur lors de la récupération des données des conducteurs');
  }
});

// @desc    Récupérer les statistiques globales
// @route   GET /api/gestion-transport/statistiques
// @access  Private/Admin
exports.getStatistiques = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin } = req.query;
  
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    const statistiques = await getStatistiquesGlobales(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: statistiques
    });
  } catch (error) {
    console.error('Erreur getStatistiques:', error);
    throw new Error('Erreur lors de la récupération des statistiques');
  }
});

// @desc    Récupérer les détails des réservations avec méthodes de paiement
// @route   GET /api/gestion-transport/reservations-details
// @access  Private/Admin
exports.getReservationsDetails = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin } = req.query;
  
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    console.log('🔍 Récupération des détails des réservations pour la période:', { startDate, endDate });

    // D'abord, compter toutes les réservations dans la DB
    const totalReservations = await Reservation.countDocuments();
    console.log(`📊 Total réservations dans la DB: ${totalReservations}`);

    // Récupérer toutes les réservations de la période
    let reservations = await Reservation.find({
      dateDebut: { $gte: startDate, $lte: endDate }
    })
    .populate('conducteur', 'nom prenom email')
    .populate('client', 'nom prenom email telephone')
    .populate('vehicule', 'marque modele immatriculation')
    .populate('service', 'nom')
    .populate('zone', 'nom')
    .populate('destination', 'nom')
    .sort({ dateDebut: -1 });

    console.log(`📅 Réservations trouvées pour la période demandée: ${reservations.length}`);

    // Si aucune réservation trouvée, élargir la recherche
    if (reservations.length === 0 && totalReservations > 0) {
      console.log('⚠️ Aucune réservation trouvée pour la période, élargissement de la recherche...');
      
      // Chercher les 30 derniers jours
      const extendedStartDate = new Date();
      extendedStartDate.setDate(extendedStartDate.getDate() - 30);
      extendedStartDate.setHours(0, 0, 0, 0);
      
      console.log(`📅 Recherche élargie sur les 30 derniers jours: ${extendedStartDate.toISOString()}`);
      
      reservations = await Reservation.find({
        dateDebut: { $gte: extendedStartDate }
      })
      .populate('conducteur', 'nom prenom email')
      .populate('client', 'nom prenom email telephone')
      .populate('vehicule', 'marque modele immatriculation')
      .populate('service', 'nom')
      .populate('zone', 'nom')
      .populate('destination', 'nom')
      .sort({ dateDebut: -1 })
      .limit(50); // Limiter à 50 réservations

      console.log(`📅 Réservations trouvées avec recherche élargie: ${reservations.length}`);
    }

    // Si toujours aucune réservation, prendre les plus récentes
    if (reservations.length === 0 && totalReservations > 0) {
      console.log('⚠️ Toujours aucune réservation, récupération des plus récentes...');
      
      reservations = await Reservation.find()
        .populate('conducteur', 'nom prenom email')
        .populate('client', 'nom prenom email telephone')
        .populate('vehicule', 'marque modele immatriculation')
        .populate('service', 'nom')
        .populate('zone', 'nom')
        .populate('destination', 'nom')
        .sort({ dateCreation: -1 })
        .limit(20);

      console.log(`📅 Réservations les plus récentes: ${reservations.length}`);
    }

    // Formater les données avec focus sur les paiements
    console.log(`🔧 Formatage de ${reservations.length} réservations...`);
    
    const reservationsFormatees = reservations.map((reservation, index) => {
      if (index < 3) { // Log des 3 premières pour debug
        console.log(`📝 Réservation ${index + 1}:`, {
          _id: reservation._id,
          reference: reservation.reference,
          dateDebut: reservation.dateDebut,
          statut: reservation.statut,
          prixTotal: reservation.prixTotal,
          methodePaiement: reservation.methodePaiement,
          methodePaiementEffective: reservation.paiement?.methodePaiementEffective,
          montantPercu: reservation.paiement?.montantPercu
        });
      }
      
      const changementPaiement = reservation.methodePaiement !== reservation.paiement?.methodePaiementEffective;
      
      return {
        _id: reservation._id,
        reference: reservation.reference,
        dateDebut: reservation.dateDebut,
        dateFin: reservation.dateFin,
        statut: reservation.statut,
        prixTotal: reservation.prixTotal,
        
        // Informations de paiement détaillées
        methodePaiement: reservation.methodePaiement, // Méthode prévue
        methodePaiementEffective: reservation.paiement?.methodePaiementEffective, // Méthode effective
        montantPercu: reservation.paiement?.montantPercu || 0,
        dateTransaction: reservation.paiement?.dateTransaction,
        referencePaiement: reservation.paiement?.referencePaiement,
        changementPaiement, // Indicateur de changement
        
        // Informations contextuelles
        conducteur: reservation.conducteur ? {
          nom: `${reservation.conducteur.prenom || ''} ${reservation.conducteur.nom || ''}`.trim(),
          email: reservation.conducteur.email
        } : null,
        
        client: reservation.client ? {
          nom: `${reservation.client.prenom || ''} ${reservation.client.nom || ''}`.trim(),
          telephone: reservation.client.telephone
        } : (reservation.clientInfo ? {
          nom: `${reservation.clientInfo.prenom || ''} ${reservation.clientInfo.nom || ''}`.trim(),
          telephone: reservation.clientInfo.telephone
        } : null),
        
        vehicule: reservation.vehicule ? {
          nom: `${reservation.vehicule.marque || ''} ${reservation.vehicule.modele || ''}`.trim(),
          immatriculation: reservation.vehicule.immatriculation
        } : null,
        
        service: reservation.service?.nom || 'Non spécifié',
        trajet: {
          zone: reservation.zone?.nom || 'Zone non spécifiée',
          destination: reservation.destination?.nom || 'Destination non spécifiée'
        }
      };
    });

    // FILTRER LES RÉSERVATIONS POUR LE MODAL : Seules celles avec dateTransaction dans la période
    const reservationsModalPeriode = reservationsFormatees.filter(r => {
      // Si pas de dateTransaction, on ne peut pas vérifier la période de paiement
      if (!r.dateTransaction) {
        return false;
      }
      const dateTransaction = new Date(r.dateTransaction);
      return dateTransaction >= startDate && dateTransaction <= endDate;
    });

    // Calculer des statistiques basées sur les DATES DE TRANSACTION pour les paiements
    // Filtrer les réservations de la période demandée pour les stats générales
    const reservationsPeriodeDemandee = reservationsFormatees.filter(r => {
      const dateRes = new Date(r.dateDebut);
      return dateRes >= startDate && dateRes <= endDate;
    });

    // Pour les paiements cash, utiliser la dateTransaction
    const paiementsCashPeriode = reservationsModalPeriode.filter(r => {
      return r.statut === 'terminee' && r.methodePaiementEffective === 'cash';
    });

    // Pour les paiements crédit, utiliser aussi la dateTransaction
    const paiementsCreditPeriode = reservationsModalPeriode.filter(r => {
      return r.statut === 'terminee' && r.methodePaiementEffective === 'credit';
    });

    console.log(`📊 Statistiques calculées:`);
    console.log(`   - Réservations avec paiement dans la période: ${reservationsModalPeriode.length} (basé sur dateTransaction)`);
    console.log(`   - Paiements cash de la période: ${paiementsCashPeriode.length}`);
    console.log(`   - Paiements crédit de la période: ${paiementsCreditPeriode.length}`);

    const statsReservations = {
      // Réservations basées sur dateTransaction (pour le modal)
      total: reservationsModalPeriode.length,
      terminées: reservationsModalPeriode.filter(r => r.statut === 'terminee').length,
      
      // Paiements basés sur dateTransaction
      payéesCash: paiementsCashPeriode.length,
      payéesCredit: paiementsCreditPeriode.length,
      
      changementsPaiement: reservationsModalPeriode.filter(r => r.changementPaiement).length,
      
      // Montants basés sur dateTransaction
      montantTotalCash: paiementsCashPeriode
        .reduce((total, r) => total + (r.montantPercu || r.prixTotal), 0),
      montantTotalCredit: paiementsCreditPeriode
        .reduce((total, r) => total + (r.montantPercu || r.prixTotal), 0),
      
      // Info debug pour comprendre la différence
      _debug: {
        periodeDemandee: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        reservationsAvecPaiementPeriode: reservationsModalPeriode.length,
        paiementsCashPeriode: paiementsCashPeriode.length,
        paiementsCreditPeriode: paiementsCreditPeriode.length,
        reservationsTotalesRecuperees: reservationsFormatees.length,
        filtrage_par_dateTransaction: true
      }
    };

    console.log('✅ Détails des réservations récupérées (filtrées par dateTransaction):', {
      nombreReservations: reservationsModalPeriode.length,
      stats: statsReservations
    });

    res.status(200).json({
      success: true,
      data: {
        reservations: reservationsModalPeriode, // ⭐ Retourner seulement les réservations avec paiement dans la période
        statistiques: statsReservations
      }
    });

  } catch (error) {
    console.error('❌ Erreur getReservationsDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des détails des réservations'
    });
  }
});

// Fonction helper pour récupérer les conducteurs avec leurs données financières
async function getConducteursWithFinancialData(startDate, endDate) {
  try {
    console.log('🔍 GestionTransport - Recherche des conducteurs avec données financières');
    console.log('📅 Période:', { startDate, endDate });

    // Récupérer tous les conducteurs (User et UserConducteur)
    const [conducteurs, userConducteurs] = await Promise.all([
      User.find({ role: 'conducteur', isActive: true })
        .select('nom prenom email telephone role'),
      UserConducteur.find({ isActive: true })
        .select('nom prenom email telephone role statut situation')
    ]);

    console.log(`👥 Conducteurs trouvés: ${conducteurs.length} User + ${userConducteurs.length} UserConducteur`);

    // Créer un Map pour éviter les doublons basés sur l'email
    const conducteursMap = new Map();
    
    // Ajouter d'abord les User (priorité plus faible)
    conducteurs.forEach(c => {
      const conducteurObj = { ...c.toObject(), source: 'User' };
      conducteursMap.set(c.email, conducteurObj);
    });
    
    // Ajouter ensuite les UserConducteur (priorité plus élevée - écrase les doublons)
    userConducteurs.forEach(c => {
      const conducteurObj = { ...c.toObject(), source: 'UserConducteur' };
      conducteursMap.set(c.email, conducteurObj);
    });
    
    // Convertir la Map en tableau
    const tousLesConducteurs = Array.from(conducteursMap.values());
    console.log(`🎯 Conducteurs uniques après dédoublonnage: ${tousLesConducteurs.length}`);

    // Pour chaque conducteur, récupérer ses données financières
    const conducteursAvecDonnees = await Promise.all(
      tousLesConducteurs.map(async (conducteur) => {
        try {
          console.log(`\n📊 Traitement conducteur: ${conducteur.prenom} ${conducteur.nom} (${conducteur.source})`);
          console.log(`🆔 ID principal: ${conducteur._id}`);
          console.log(`📧 Email: ${conducteur.email}`);

          // STRATÉGIE DOUBLE ID: Trouver les correspondances
          let conducteurId = null; // Pour réservations/transactions (UserConducteur)
          let userId = conducteur._id; // Pour dépenses (User)

          if (conducteur.source === 'UserConducteur') {
            // C'est déjà un UserConducteur
            conducteurId = conducteur._id;
            // Chercher le User correspondant pour les dépenses
            const userCorrespondant = await User.findOne({
              $or: [
                { email: conducteur.email },
                { $and: [{ nom: conducteur.nom }, { prenom: conducteur.prenom }] }
              ],
              role: 'conducteur'
            });
            if (userCorrespondant) {
              userId = userCorrespondant._id;
              console.log(`🔗 User correspondant trouvé: ${userId}`);
            }
          } else {
            // C'est un User, chercher le UserConducteur correspondant
            const userConducteurCorrespondant = await UserConducteur.findOne({
              $or: [
                { email: conducteur.email },
                { $and: [{ nom: conducteur.nom }, { prenom: conducteur.prenom }] }
              ]
            });
            if (userConducteurCorrespondant) {
              conducteurId = userConducteurCorrespondant._id;
              console.log(`🔗 UserConducteur correspondant trouvé: ${conducteurId}`);
            }
          }

          // Recherche des données financières avec les deux IDs
          const searchPromises = [];

          // 1. Transaction journalière (priorité UserConducteur si disponible)
          if (conducteurId) {
            searchPromises.push(
              TransactionJournaliere.findOne({
                conducteur: conducteurId,
                date: { $gte: startDate, $lte: endDate }
              })
            );
          } else {
            searchPromises.push(
              TransactionJournaliere.findOne({
                conducteur: userId,
                date: { $gte: startDate, $lte: endDate }
              })
            );
          }

          // 2. Réservations (recherche avec les deux sources possibles)
          const reservationQuery = {
            dateDebut: { $gte: startDate, $lte: endDate },
            statut: { $in: ['confirmee', 'en_cours', 'terminee'] }
          };

          if (conducteurId) {
            // Recherche avec UserConducteur en priorité
            searchPromises.push(
              Reservation.find({
                ...reservationQuery,
                $or: [
                  { conducteur: conducteurId, conducteurSource: 'UserConducteur' },
                  { conducteur: userId, conducteurSource: 'User' }
                ]
              })
            );
          } else {
            // Recherche avec User seulement
            searchPromises.push(
              Reservation.find({
                ...reservationQuery,
                conducteur: userId,
                conducteurSource: 'User'
              })
            );
          }

          // 3. Dépenses (recherche avec les deux IDs pour éviter les doublons)
          const depenseIds = [userId];
          if (conducteurId && conducteurId.toString() !== userId.toString()) {
            depenseIds.push(conducteurId);
          }

          searchPromises.push(
            Depense.find({
              'conducteur.id': { $in: depenseIds },
              date: { $gte: startDate, $lte: endDate }
            })
          );

          let [transactionJournaliere, reservationsPeriode, depenses] = await Promise.all(searchPromises);

          console.log(`📈 ${conducteur.prenom} ${conducteur.nom} - Données trouvées pour la période:`);
          console.log(`   - Période recherchée: ${startDate.toISOString().split('T')[0]} à ${endDate.toISOString().split('T')[0]}`);
          console.log(`   - Transaction journalière: ${transactionJournaliere ? 'OUI' : 'NON'}`);
          console.log(`   - Réservations période: ${reservationsPeriode.length}`);
          console.log(`   - Dépenses: ${depenses.length}`);

          // Log détaillé des réservations trouvées
          if (reservationsPeriode.length > 0) {
            console.log(`🔍 Détail des réservations trouvées pour ${conducteur.prenom} ${conducteur.nom}:`, 
              reservationsPeriode.map(r => ({
                reference: r.reference,
                dateDebut: r.dateDebut,
                statut: r.statut,
                prixTotal: r.prixTotal,
                methodePaiementEffective: r.paiement?.methodePaiementEffective,
                dateTransaction: r.paiement?.dateTransaction
              }))
            );
          }

          // IMPORTANT : Garder les réservations de la période pour les calculs financiers
          // Ne PAS faire de recherche élargie qui interfère avec les calculs de dateTransaction

          // Calculer les données financières STRICTEMENT sur la période demandée
          const virementMatinal = transactionJournaliere ? transactionJournaliere.montantInitial : 0;
          const virementEffectue = transactionJournaliere ? true : false;
          
          // Courses effectuées : réservations terminées ET dont le paiement est dans la période
          const coursesEffectuees = reservationsPeriode.filter(r => {
            if (r.statut !== 'terminee') return false;
            
            // Si pas de paiement, utiliser dateDebut de la réservation
            const dateAPrendreEnCompte = r.paiement?.dateTransaction ? 
              new Date(r.paiement.dateTransaction) : 
              new Date(r.dateDebut);
            return dateAPrendreEnCompte >= startDate && dateAPrendreEnCompte <= endDate;
          }).length;
          
          // CALCULS FINANCIERS STRICTS : Utiliser SEULEMENT les réservations de la période
          // Pas de recherche élargie pour les calculs financiers !
          const paiementsCashConducteur = reservationsPeriode.filter(r => {
            if (r.statut !== 'terminee' || r.paiement?.methodePaiementEffective !== 'cash') {
              return false;
            }
            // Si pas de dateTransaction, utiliser dateDebut de la réservation
            const dateAPrendreEnCompte = r.paiement?.dateTransaction ? 
              new Date(r.paiement.dateTransaction) : 
              new Date(r.dateDebut);
            return dateAPrendreEnCompte >= startDate && dateAPrendreEnCompte <= endDate;
          });

          const encaissementsCash = paiementsCashConducteur
            .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);

          console.log(`💰 Conducteur ${conducteur.prenom} ${conducteur.nom} - CALCULS STRICTS:`);
          console.log(`   - Période: ${startDate.toISOString().split('T')[0]} à ${endDate.toISOString().split('T')[0]}`);
          console.log(`   - Réservations de la période: ${reservationsPeriode.length}`);
          console.log(`   - Réservations terminées (période): ${coursesEffectuees}`);
          console.log(`   - Paiements cash de la période: ${paiementsCashConducteur.length}`);
          console.log(`   - Encaissements cash de la période: ${encaissementsCash} FCFA`);
          
          // Log détaillé des paiements trouvés
          if (paiementsCashConducteur.length > 0) {
            console.log(`🧾 Détail paiements cash de la période:`, paiementsCashConducteur.map(p => ({
              reference: p.reference,
              dateDebut: p.dateDebut,
              dateTransaction: p.paiement?.dateTransaction,
              montant: p.paiement?.montantPercu || p.prixTotal,
              methodeEffective: p.paiement?.methodePaiementEffective
            })));
          } else {
            console.log(`❌ Aucun paiement cash trouvé pour cette période`);
          }
          
          // Supprimer les doublons de dépenses par référence
          const depensesUniques = depenses.reduce((acc, depense) => {
            const existe = acc.find(d => d.reference === depense.reference);
            if (!existe) {
              acc.push(depense);
            }
            return acc;
          }, []);
          
          const depensesTotales = depensesUniques.reduce((total, d) => total + d.montant, 0);
          const recettesTotales = transactionJournaliere ? transactionJournaliere.totalRecettes : encaissementsCash;
          
          const soldeCaisse = virementMatinal + encaissementsCash - depensesTotales;
          const statut = soldeCaisse < 0 ? 'urgent' : 'positif';

          console.log(`📊 Calcul du solde de caisse:`);
          console.log(`   - Virement matinal: ${virementMatinal} FCFA`);
          console.log(`   - Encaissements cash (période): ${encaissementsCash} FCFA`);
          console.log(`   - Dépenses totales: ${depensesTotales} FCFA`);
          console.log(`   - Solde de caisse: ${soldeCaisse} FCFA (${statut})`);

                               // Log de la méthode de paiement pour debug
          const coursesAvecPaiementEffectif = reservationsPeriode
            .filter(r => r.statut === 'terminee' && r.paiement?.methodePaiementEffective)
            .map(r => ({
              reference: r.reference,
              methodePaiement: r.methodePaiement, // Méthode prévue initialement
              methodePaiementEffective: r.paiement?.methodePaiementEffective, // Méthode effectivement utilisée
              montantPercu: r.paiement?.montantPercu,
              prixTotal: r.prixTotal,
              different: r.methodePaiement !== r.paiement?.methodePaiementEffective // Indicateur de changement
            }));

           console.log(`💰 Résumé financier:`);
           console.log(`   - Virement matinal: ${virementMatinal} FCFA`);
           console.log(`   - Courses effectuées: ${coursesEffectuees}`);
           console.log(`   - Encaissements cash: ${encaissementsCash} FCFA`);
           console.log(`   - Dépenses totales: ${depensesTotales} FCFA (${depensesUniques.length} dépenses uniques)`);
           console.log(`   - Solde de caisse: ${soldeCaisse} FCFA`);
           console.log(`   - Statut: ${statut}`);
           if (coursesAvecPaiementEffectif.length > 0) {
             console.log(`💳 Détail paiements effectifs:`, coursesAvecPaiementEffectif.slice(0, 3));
             // Log spécial pour les changements de méthode de paiement
             const changementsPaiement = coursesAvecPaiementEffectif.filter(c => c.different);
             if (changementsPaiement.length > 0) {
               console.log(`🔄 Changements de méthode de paiement détectés:`, changementsPaiement);
             }
           }

          return {
            key: conducteur._id.toString(),
            nom: `${conducteur.prenom} ${conducteur.nom}`,
            virementMatinal,
            virementEffectue,
            coursesEffectuees,
            encaissementsCash,
            depenses: depensesTotales,
            soldeCaisse,
            statut,
            situation: conducteur.situation || 'Disponible',
            source: conducteur.source
          };
        } catch (error) {
          console.error(`❌ Erreur pour conducteur ${conducteur._id}:`, error);
          return {
            key: conducteur._id.toString(),
            nom: `${conducteur.prenom} ${conducteur.nom}`,
            virementMatinal: 0,
            virementEffectue: false,
            coursesEffectuees: 0,
            encaissementsCash: 0,
            depenses: 0,
            soldeCaisse: 0,
            statut: 'urgent',
            situation: conducteur.situation || 'Disponible',
            source: conducteur.source,
            error: error.message
          };
        }
      })
    );

    console.log(`✅ GestionTransport - Traitement terminé: ${conducteursAvecDonnees.length} conducteurs traités`);
    return conducteursAvecDonnees;
  } catch (error) {
    console.error('❌ Erreur getConducteursWithFinancialData:', error);
    throw error;
  }
}

// @desc    Récupérer les données d'un conducteur spécifique sur une période
// @route   GET /api/gestion-transport/conducteur/:conducteurId/periode
// @access  Private/Admin
exports.getConducteurDataByPeriode = asyncHandler(async (req, res) => {
  const { conducteurId } = req.params;
  const { dateDebut, dateFin } = req.query;
  
  console.log('🎯 [getConducteurDataByPeriode] Paramètres reçus:', {
    conducteurId,
    dateDebut,
    dateFin,
    queryParams: req.query
  });
  
  // Définir les dates par défaut (aujourd'hui si non spécifiées)
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  // S'assurer que les heures sont définies pour couvrir toute la journée
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  console.log('🎯 [getConducteurDataByPeriode] Dates finales calculées:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  try {
    // Vérifier que le conducteur existe (User ou UserConducteur)
    let conducteur = await User.findById(conducteurId).select('nom prenom email telephone role');
    let isUserConducteur = false;
    
    if (!conducteur) {
      // Chercher dans UserConducteur
      conducteur = await UserConducteur.findById(conducteurId).select('nom prenom email telephone role statut situation');
      isUserConducteur = true;
    }
    
    if (!conducteur) {
      return res.status(404).json({
        success: false,
        message: 'Conducteur non trouvé'
      });
    }

    console.log(`📊 Calcul des données pour conducteur: ${conducteur.prenom} ${conducteur.nom} (Source: ${isUserConducteur ? 'UserConducteur' : 'User'})`);

    // 1. Transaction journalière
    const transactionJournaliere = await TransactionJournaliere.findOne({
      conducteur: conducteurId,
      date: { $gte: startDate, $lte: endDate }
    });

    // 2. TOUTES les réservations du conducteur (pas de filtre par dateDebut)
    // Nous filtrerons par dateTransaction après
    const reservationQuery = isUserConducteur ? {
      conducteur: conducteurId,
      conducteurSource: 'UserConducteur'
    } : {
      conducteur: conducteurId,
      conducteurSource: 'User'
    };
    
    const toutesLesReservations = await Reservation.find(reservationQuery);

    console.log(`📋 TOUTES les réservations du conducteur ${conducteur.prenom} ${conducteur.nom}:`, {
      nombre: toutesLesReservations.length,
      reservationsDetails: toutesLesReservations.map(r => ({
        reference: r.reference,
        dateDebut: r.dateDebut,
        statut: r.statut,
        methodePaiementEffective: r.paiement?.methodePaiementEffective,
        dateTransaction: r.paiement?.dateTransaction,
        prixTotal: r.prixTotal
      }))
    });

    // 3. Dépenses de la période pour ce conducteur
    let depenseIds = [conducteurId];
    
    // Si c'est un UserConducteur, chercher aussi le User correspondant pour les dépenses
    if (isUserConducteur) {
      const userCorrespondant = await User.findOne({
        $or: [
          { email: conducteur.email },
          { $and: [{ nom: conducteur.nom }, { prenom: conducteur.prenom }] }
        ],
        role: 'conducteur'
      });
      if (userCorrespondant) {
        depenseIds.push(userCorrespondant._id);
        console.log(`🔗 User correspondant trouvé pour dépenses: ${userCorrespondant._id}`);
      }
    }
    
    const depenses = await Depense.find({
      'conducteur.id': { $in: depenseIds },
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculs basés STRICTEMENT sur la période
    const virementMatinal = transactionJournaliere ? transactionJournaliere.montantInitial : 0;
    const virementEffectue = transactionJournaliere ? true : false;

    // Courses effectuées: réservations terminées dont le paiement (dateTransaction) est dans la période
    const coursesEffectueesFiltered = toutesLesReservations.filter(r => {
      if (r.statut !== 'terminee') return false;
      
      // OBLIGATOIRE : dateTransaction doit exister et être dans la période
      if (!r.paiement?.dateTransaction) return false;
      
      const dateTransaction = new Date(r.paiement.dateTransaction);
      return dateTransaction >= startDate && dateTransaction <= endDate;
    });

    const coursesEffectuees = coursesEffectueesFiltered.length;

    // Encaissements cash: réservations payées en cash dont la dateTransaction est dans la période
    const paiementsCash = toutesLesReservations.filter(r => {
      if (r.statut !== 'terminee' || r.paiement?.methodePaiementEffective !== 'cash') {
        return false;
      }
      
      // OBLIGATOIRE : dateTransaction doit exister et être dans la période
      if (!r.paiement?.dateTransaction) return false;
      
      const dateTransaction = new Date(r.paiement.dateTransaction);
      return dateTransaction >= startDate && dateTransaction <= endDate;
    });

    const encaissementsCash = paiementsCash
      .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);

    // Dépenses totales
    const depensesTotales = depenses.reduce((total, d) => total + d.montant, 0);

    // Solde de caisse
    const soldeCaisse = virementMatinal + encaissementsCash - depensesTotales;
    const statut = soldeCaisse < 0 ? 'urgent' : 'positif';

    console.log(`💰 Résultats pour ${conducteur.prenom} ${conducteur.nom}:`);
    console.log(`   - Période recherchée: ${startDate.toISOString().split('T')[0]} à ${endDate.toISOString().split('T')[0]}`);
    console.log(`   - Total réservations du conducteur: ${toutesLesReservations.length}`);
    console.log(`   - Réservations terminées avec dateTransaction dans période: ${coursesEffectueesFiltered.length}`);
    console.log(`   - Paiements cash dans période: ${paiementsCash.length}`);
    console.log(`   - Virement matinal: ${virementMatinal} FCFA`);
    console.log(`   - Courses effectuées: ${coursesEffectuees}`);
    console.log(`   - Encaissements cash: ${encaissementsCash} FCFA`);
    console.log(`   - Dépenses totales: ${depensesTotales} FCFA`);
    console.log(`   - Solde de caisse: ${soldeCaisse} FCFA`);

    // Log détaillé des paiements cash trouvés
    if (paiementsCash.length > 0) {
      console.log(`🧾 Détail paiements cash trouvés:`, paiementsCash.map(p => ({
        reference: p.reference,
        dateTransaction: p.paiement?.dateTransaction,
        montant: p.paiement?.montantPercu || p.prixTotal,
        methodePaiementEffective: p.paiement?.methodePaiementEffective
      })));
    }

    const result = {
      conducteur: {
        _id: conducteur._id,
        nom: `${conducteur.prenom} ${conducteur.nom}`,
        email: conducteur.email
      },
      periode: {
        debut: startDate,
        fin: endDate
      },
      donnees: {
        virementMatinal,
        virementEffectue,
        coursesEffectuees,
        encaissementsCash,
        depenses: depensesTotales,
        soldeCaisse,
        statut
      },
      details: {
        reservationsTotal: toutesLesReservations.length,
        reservationsTerminees: toutesLesReservations.filter(r => r.statut === 'terminee').length,
        reservationsTermineesPeriode: coursesEffectueesFiltered.length,
        paiementsCash: paiementsCash.length,
        depensesNombre: depenses.length
      }
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur getConducteurDataByPeriode:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données du conducteur'
    });
  }
});

// Fonction helper pour calculer les statistiques globales
async function getStatistiquesGlobales(startDate, endDate) {
  try {
    console.log('🔍 getStatistiquesGlobales - Période:', { startDate, endDate });

    const [
      reservations,
      depenses,
      transactions,
      conducteursUser,
      userConducteurs
    ] = await Promise.all([
      // Toutes les réservations de la période
      Reservation.find({
        dateDebut: { $gte: startDate, $lte: endDate }
      }),
      // Toutes les dépenses de la période
      Depense.find({
        date: { $gte: startDate, $lte: endDate }
      }),
      // Toutes les transactions journalières de la période
      TransactionJournaliere.find({
        date: { $gte: startDate, $lte: endDate }
      }),
      // Conducteurs actifs User
      User.find({ role: 'conducteur', isActive: true }).select('email'),
      // Conducteurs actifs UserConducteur
      UserConducteur.find({ isActive: true }).select('email')
    ]);

    console.log(`📊 Données récupérées:`, {
      reservations: reservations.length,
      depenses: depenses.length,
      transactions: transactions.length,
      conducteursUser: conducteursUser.length,
      userConducteurs: userConducteurs.length
    });

    // Si aucune réservation pour la période, élargir la recherche
    let reservationsActives = reservations;
    if (reservations.length === 0) {
      console.log('⚠️ Aucune réservation pour la période, recherche élargie...');
      const totalReservations = await Reservation.countDocuments();
      console.log(`📊 Total réservations dans la DB: ${totalReservations}`);
      
      if (totalReservations > 0) {
        // Chercher toutes les réservations récentes
        reservationsActives = await Reservation.find()
          .sort({ dateCreation: -1 })
          .limit(50);
        console.log(`📅 Réservations récentes récupérées: ${reservationsActives.length}`);
      }
    }

    // Log des quelques réservations pour debug
    if (reservationsActives.length > 0) {
      console.log('🔍 Échantillon de réservations:');
      reservationsActives.slice(0, 3).forEach((r, index) => {
        console.log(`  ${index + 1}. ID: ${r._id}, Statut: ${r.statut}, Prix: ${r.prixTotal}, Méthode: ${r.methodePaiement}, Effective: ${r.paiement?.methodePaiementEffective}, Montant perçu: ${r.paiement?.montantPercu}`);
      });
    }

    // Calculer le nombre unique de conducteurs en évitant les doublons basés sur l'email
    const emailsUniques = new Set();
    conducteursUser.forEach(c => emailsUniques.add(c.email));
    userConducteurs.forEach(c => emailsUniques.add(c.email));
    const conducteursActifs = emailsUniques.size;

    // Calculer les produits (ventes totales) - UTILISER dateTransaction pour les paiements
    // Filtrer les paiements cash de la période basés sur dateTransaction
    const paiementsCashPeriode = reservationsActives.filter(r => {
      if (r.statut !== 'terminee' || r.paiement?.methodePaiementEffective !== 'cash' || !r.paiement?.dateTransaction) {
        return false;
      }
      const dateTransaction = new Date(r.paiement.dateTransaction);
      return dateTransaction >= startDate && dateTransaction <= endDate;
    });

    const paiementsCreditPeriode = reservationsActives.filter(r => {
      if (r.statut !== 'terminee' || r.paiement?.methodePaiementEffective !== 'credit' || !r.paiement?.dateTransaction) {
        return false;
      }
      const dateTransaction = new Date(r.paiement.dateTransaction);
      return dateTransaction >= startDate && dateTransaction <= endDate;
    });

    const coursesPayeesCash = paiementsCashPeriode
      .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);
    
    const coursesACredit = paiementsCreditPeriode
      .reduce((total, r) => total + (r.paiement?.montantPercu || r.prixTotal || 0), 0);
    
    const produitsTotaux = coursesPayeesCash + coursesACredit;

    console.log(`💰 Calculs des produits (basés sur dateTransaction):`, {
      'Réservations terminées': reservationsActives.filter(r => r.statut === 'terminee').length,
      'Paiements cash de la période': paiementsCashPeriode.length,
      'Paiements crédit de la période': paiementsCreditPeriode.length,
      coursesPayeesCash,
      coursesACredit,
      produitsTotaux,
      'Période': { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
    });

    // Calculer le cash-flow
    const encaissementsEffectifs = coursesPayeesCash; // Seulement les paiements cash effectifs
    const virementsMatinaux = transactions.reduce((total, t) => total + t.montantInitial, 0);
    const depensesCourantes = depenses.reduce((total, d) => total + d.montant, 0);
    
    const cashFlowReel = encaissementsEffectifs - virementsMatinaux - depensesCourantes;

    console.log(`💸 Calculs du cash-flow:`, {
      encaissementsEffectifs,
      virementsMatinaux,
      depensesCourantes,
      cashFlowReel
    });

    // Calculer les charges par catégorie à partir des vraies dépenses
    const maintenanceVehicules = depenses
      .filter(d => d.category && d.category.toLowerCase().includes('maintenance'))
      .reduce((total, d) => total + d.montant, 0);
    
    const carburantAutres = depenses
      .filter(d => d.category && (
        d.category.toLowerCase().includes('carburant') ||
        d.category.toLowerCase().includes('essence') ||
        d.category.toLowerCase().includes('gasoil') ||
        d.category.toLowerCase().includes('fuel')
      ))
      .reduce((total, d) => total + d.montant, 0);
    
    // Autres charges (toutes les dépenses qui ne sont ni maintenance ni carburant)
    const autresCharges = depenses
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

    // Équipe - conducteursActifs est maintenant calculé plus haut
    const vehiculesEnService = 4; // Valeur fixe pour demo
    const tauxActivite = Math.round((conducteursActifs / vehiculesEnService) * 100);

    const statistiques = {
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
      tauxActivite,

      // DEBUG INFO
      _debug: {
        reservationsTotal: reservationsActives.length,
        reservationsTerminees: reservationsActives.filter(r => r.statut === 'terminee').length,
        periode: { startDate, endDate },
        recherche_elargie: reservations.length === 0 && reservationsActives.length > 0
      }
    };

    console.log('✅ Statistiques finales calculées:', statistiques);
    return statistiques;
  } catch (error) {
    console.error('❌ Erreur getStatistiquesGlobales:', error);
    throw error;
  }
}

// @desc    Créer une nouvelle transaction journalière pour un conducteur
// @route   POST /api/gestion-transport/transaction-journaliere
// @access  Private/Admin
exports.createTransactionJournaliere = asyncHandler(async (req, res, next) => {
  const { conducteurId, montantInitial } = req.body;

  if (!conducteurId || montantInitial === undefined) {
    res.status(400);
    throw new Error('Conducteur ID et montant initial requis');
  }

  try {
    const transaction = await TransactionJournaliere.getOrCreateToday(conducteurId, montantInitial);
    
    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Erreur createTransactionJournaliere:', error);
    throw new Error('Erreur lors de la création de la transaction');
  }
});

// @desc    Ajouter une transaction à une journée
// @route   POST /api/gestion-transport/transaction-journaliere/:id/transaction
// @access  Private/Admin
exports.ajouterTransaction = asyncHandler(async (req, res, next) => {
  const transactionJournaliere = await TransactionJournaliere.findById(req.params.id);

  if (!transactionJournaliere) {
    res.status(404);
    throw new Error('Transaction journalière non trouvée');
  }

  try {
    await transactionJournaliere.ajouterTransaction(req.body);
    
    res.status(200).json({
      success: true,
      data: transactionJournaliere
    });
  } catch (error) {
    console.error('Erreur ajouterTransaction:', error);
    throw new Error('Erreur lors de l\'ajout de la transaction');
  }
}); 
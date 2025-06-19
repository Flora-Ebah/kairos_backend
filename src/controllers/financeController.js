const asyncHandler = require('express-async-handler');
const Reservation = require('../models/Reservation');
const Depense = require('../models/Depense');
const TransactionJournaliere = require('../models/TransactionJournaliere');
const User = require('../models/User');
const UserConducteur = require('../models/UserConducteur');

// @desc    Obtenir les statistiques financières globales
// @route   GET /api/finance/dashboard
// @access  Private/Admin
exports.getDashboardFinance = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin } = req.query;
  
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    console.log('🔍 Calcul des statistiques financières pour la période:', { startDate, endDate });

    // 1. CALCUL DES REVENUS (basé sur dateTransaction des réservations)
    const reservationsTerminees = await Reservation.find({
      statut: 'terminee',
      'paiement.dateTransaction': { $gte: startDate, $lte: endDate }
    }).populate('conducteur', 'nom prenom').populate('service', 'nom');

    const totalRevenus = reservationsTerminees.reduce((sum, res) => {
      return sum + (res.paiement?.montantPercu || res.prixTotal || 0);
    }, 0);

    // Revenus par méthode de paiement
    const revenusCash = reservationsTerminees
      .filter(res => res.paiement?.methodePaiementEffective === 'cash')
      .reduce((sum, res) => sum + (res.paiement?.montantPercu || res.prixTotal || 0), 0);

    const revenusCredit = reservationsTerminees
      .filter(res => res.paiement?.methodePaiementEffective === 'credit')
      .reduce((sum, res) => sum + (res.paiement?.montantPercu || res.prixTotal || 0), 0);

    // 2. CALCUL DES DÉPENSES (basé sur date de la dépense)
    const depensesPeriode = await Depense.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('conducteur.id', 'nom prenom');

    const totalDepenses = depensesPeriode.reduce((sum, dep) => {
      return sum + (dep.montant || 0);
    }, 0);

    // Dépenses par catégorie
    const depensesParCategorie = depensesPeriode.reduce((acc, dep) => {
      const category = dep.category || 'Autres';
      acc[category] = (acc[category] || 0) + dep.montant;
      return acc;
    }, {});

    // 3. CALCUL DES TRANSACTIONS JOURNALIÈRES
    const transactionsJournalieres = await TransactionJournaliere.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('conducteur', 'nom prenom email');

    const statsTransactions = transactionsJournalieres.reduce((acc, tj) => {
      acc.totalMontantInitial += tj.montantInitial || 0;
      acc.totalSoldeActuel += tj.soldeActuel || 0;
      acc.nombreJours += 1;
      
      // Calculer les totaux par type de transaction
      tj.transactions.forEach(transaction => {
        switch(transaction.type) {
          case 'recette':
            acc.totalRecettes += transaction.montant;
            break;
          case 'depense':
            acc.totalDepensesTransactions += transaction.montant;
            break;
          case 'commission':
            acc.totalCommissions += transaction.montant;
            break;
          case 'remboursement':
            acc.totalRemboursements += transaction.montant;
            break;
        }
      });
      
      return acc;
    }, {
      totalMontantInitial: 0,
      totalSoldeActuel: 0,
      nombreJours: 0,
      totalRecettes: 0,
      totalDepensesTransactions: 0,
      totalCommissions: 0,
      totalRemboursements: 0
    });

    // 4. CALCUL DU BÉNÉFICE NET
    const beneficeNet = totalRevenus - totalDepenses;

    // 5. CALCUL DES POURCENTAGES POUR LES GRAPHIQUES
    const revenusTotaux = totalRevenus;
    const revenusParSource = [
      {
        source: 'Paiements Cash',
        montant: revenusCash,
        percent: revenusTotaux > 0 ? Math.round((revenusCash / revenusTotaux) * 100) : 0
      },
      {
        source: 'Paiements Crédit',
        montant: revenusCredit,
        percent: revenusTotaux > 0 ? Math.round((revenusCredit / revenusTotaux) * 100) : 0
      }
    ];

    const depensesParCategorieArray = Object.entries(depensesParCategorie).map(([category, amount]) => ({
      category,
      amount,
      percent: totalDepenses > 0 ? Math.round((amount / totalDepenses) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    // 6. PRÉPARATION DES DONNÉES DE RÉPONSE
    const statistiques = {
      periode: {
        debut: startDate.toISOString(),
        fin: endDate.toISOString()
      },
      revenus: {
        total: totalRevenus,
        cash: revenusCash,
        credit: revenusCredit,
        parSource: revenusParSource,
        nombreReservations: reservationsTerminees.length
      },
      depenses: {
        total: totalDepenses,
        parCategorie: depensesParCategorieArray,
        nombreDepenses: depensesPeriode.length
      },
      benefice: {
        net: beneficeNet,
        marge: totalRevenus > 0 ? Math.round((beneficeNet / totalRevenus) * 100) : 0
      },
      transactions: statsTransactions,
      resume: {
        chiffreAffaires: totalRevenus,
        chargesOperationnelles: totalDepenses,
        resultatOperationnel: beneficeNet,
        tresorerieActive: statsTransactions.totalSoldeActuel
      }
    };

    console.log('✅ Statistiques financières calculées:', {
      revenus: totalRevenus,
      depenses: totalDepenses,
      benefice: beneficeNet,
      reservations: reservationsTerminees.length,
      depensesCount: depensesPeriode.length
    });

    res.status(200).json({
      success: true,
      data: {
        statistiques,
        details: {
          reservations: reservationsTerminees.slice(0, 10), // Dernières 10 pour aperçu
          depenses: depensesPeriode.slice(0, 10), // Dernières 10 pour aperçu
          transactionsJournalieres: transactionsJournalieres.slice(0, 5) // Dernières 5 pour aperçu
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du calcul des statistiques financières:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques financières'
    });
  }
});

// @desc    Obtenir les transactions consolidées pour tableau
// @route   GET /api/finance/transactions
// @access  Private/Admin
exports.getTransactionsConsolidees = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin, type, categorie } = req.query;
  
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    const transactions = [];

    // 1. AJOUTER LES REVENUS (réservations)
    if (!type || type === 'all' || type === 'revenue') {
      const reservationsTerminees = await Reservation.find({
        statut: 'terminee',
        'paiement.dateTransaction': { $gte: startDate, $lte: endDate }
      }).populate('conducteur', 'nom prenom').populate('service', 'nom').sort({ 'paiement.dateTransaction': -1 });

      reservationsTerminees.forEach(res => {
        transactions.push({
          _id: res._id,
          reference: res.reference || `RES-${res._id.slice(-6)}`,
          date: res.paiement?.dateTransaction || res.dateDebut,
          type: 'Revenu',
          categorie: 'Course',
          description: `Paiement course ${res.reference || res._id.slice(-6)}`,
          montant: res.paiement?.montantPercu || res.prixTotal || 0,
          statut: 'Validé',
          conducteur: res.conducteur ? `${res.conducteur.prenom || ''} ${res.conducteur.nom || ''}`.trim() : null,
          methodePaiement: res.paiement?.methodePaiementEffective || res.methodePaiement
        });
      });
    }

    // 2. AJOUTER LES DÉPENSES
    if (!type || type === 'all' || type === 'expense') {
      const depensesPeriode = await Depense.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('conducteur.id', 'nom prenom').sort({ date: -1 });

      depensesPeriode.forEach(dep => {
        // Filtrer par catégorie si spécifiée
        if (categorie && categorie !== 'all' && dep.category !== categorie) {
          return;
        }

        transactions.push({
          _id: dep._id,
          reference: dep.reference || `DEP-${dep._id.slice(-6)}`,
          date: dep.date,
          type: 'Dépense',
          categorie: dep.category || 'Autres',
          description: dep.description || 'Dépense non spécifiée',
          montant: dep.montant || 0,
          statut: 'Validé',
          conducteur: dep.conducteur?.nom && dep.conducteur?.prenom ? 
            `${dep.conducteur.prenom} ${dep.conducteur.nom}` : null,
          methodePaiement: 'cash' // Par défaut pour les dépenses
        });
      });
    }

    // 3. TRIER PAR DATE DÉCROISSANTE
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`✅ ${transactions.length} transactions consolidées récupérées`);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        total: transactions.length,
        periode: { debut: startDate, fin: endDate }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des transactions'
    });
  }
});

// @desc    Obtenir les données des conducteurs pour l'onglet salaires
// @route   GET /api/finance/conducteurs-salaires
// @access  Private/Admin
exports.getConducteursSalaires = asyncHandler(async (req, res, next) => {
  const { dateDebut, dateFin } = req.query;
  
  const startDate = dateDebut ? new Date(dateDebut) : new Date();
  const endDate = dateFin ? new Date(dateFin) : new Date();
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    // 1. RÉCUPÉRER TOUS LES CONDUCTEURS
    const conducteurs = await User.find({ role: 'conducteur' }).select('nom prenom email telephone isActive');
    
    // 2. RÉCUPÉRER LES DÉPENSES DE SALAIRES DE LA PÉRIODE
    const depensesSalaires = await Depense.find({
      date: { $gte: startDate, $lte: endDate },
      category: { $in: ['Salaire', 'Bonus', 'Avance', 'Indemnité'] }
    }).populate('conducteur.id', 'nom prenom');

    // 3. CALCULER LES STATISTIQUES PAR CONDUCTEUR
    const conducteursSalaires = conducteurs.map(conducteur => {
      const depensesConducteur = depensesSalaires.filter(dep => 
        dep.conducteur?.id?.toString() === conducteur._id.toString()
      );

      const salairePaye = depensesConducteur
        .filter(dep => dep.category === 'Salaire')
        .reduce((sum, dep) => sum + dep.montant, 0);

      const bonusPaye = depensesConducteur
        .filter(dep => dep.category === 'Bonus')
        .reduce((sum, dep) => sum + dep.montant, 0);

      const avancesPaye = depensesConducteur
        .filter(dep => dep.category === 'Avance')
        .reduce((sum, dep) => sum + dep.montant, 0);

      const totalPaye = salairePaye + bonusPaye + avancesPaye;

      return {
        _id: conducteur._id,
        nom: `${conducteur.prenom || ''} ${conducteur.nom || ''}`.trim(),
        email: conducteur.email,
        telephone: conducteur.telephone,
        salairePaye,
        bonusPaye,
        avancesPaye,
        totalPaye,
        statut: totalPaye > 0 ? 'Payé' : 'En attente',
        derniereDepense: depensesConducteur.length > 0 ? 
          depensesConducteur.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null,
        nombrePaiements: depensesConducteur.length
      };
    });

    // 4. CALCULER LES STATISTIQUES GLOBALES
    const statsGlobales = {
      totalConducteurs: conducteurs.length,
      conducteursPayes: conducteursSalaires.filter(c => c.statut === 'Payé').length,
      conducteursEnAttente: conducteursSalaires.filter(c => c.statut === 'En attente').length,
      montantTotalSalaires: conducteursSalaires.reduce((sum, c) => sum + c.salairePaye, 0),
      montantTotalBonus: conducteursSalaires.reduce((sum, c) => sum + c.bonusPaye, 0),
      montantTotalAvances: conducteursSalaires.reduce((sum, c) => sum + c.avancesPaye, 0),
      montantTotalPaye: conducteursSalaires.reduce((sum, c) => sum + c.totalPaye, 0)
    };

    console.log('✅ Données des salaires calculées:', {
      conducteurs: conducteurs.length,
      payes: statsGlobales.conducteursPayes,
      totalPaye: statsGlobales.montantTotalPaye
    });

    res.status(200).json({
      success: true,
      data: {
        conducteurs: conducteursSalaires,
        statistiques: statsGlobales,
        periode: { debut: startDate, fin: endDate }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données des salaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données des salaires'
    });
  }
}); 
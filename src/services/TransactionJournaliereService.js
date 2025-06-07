const TransactionJournaliere = require('../models/TransactionJournaliere');
const User = require('../models/User');
const Course = require('../models/Course');
const Reservation = require('../models/Reservation');

class TransactionJournaliereService {
  
  /**
   * Créer une nouvelle transaction journalière pour un conducteur
   */
  static async createTransactionJournaliere(data) {
    const { conducteur, date, montantInitial, notes, createdBy } = data;
    
    // Vérifier que le conducteur existe et a le bon rôle
    const conducteurUser = await User.findById(conducteur);
    if (!conducteurUser || conducteurUser.role !== 'conducteur') {
      throw new Error('Conducteur invalide');
    }
    
    // Normaliser la date
    const dateJour = new Date(date || new Date());
    dateJour.setHours(0, 0, 0, 0);
    
    // Vérifier qu'il n'existe pas déjà une transaction pour ce jour
    const existingTransaction = await TransactionJournaliere.findOne({
      conducteur,
      date: dateJour
    });
    
    if (existingTransaction) {
      throw new Error('Une transaction existe déjà pour ce conducteur à cette date');
    }
    
    // Créer la transaction
    const transaction = await TransactionJournaliere.create({
      conducteur,
      date: dateJour,
      montantInitial: montantInitial || 0,
      soldeActuel: montantInitial || 0,
      notes,
      createdBy
    });
    
    return await transaction.populate('conducteur', 'nom prenom email telephone');
  }
  
  /**
   * Obtenir ou créer la transaction du jour pour un conducteur
   */
  static async getOrCreateToday(conducteurId, montantInitial = 0) {
    // Vérifier que le conducteur existe
    const conducteur = await User.findById(conducteurId);
    if (!conducteur || conducteur.role !== 'conducteur') {
      throw new Error('Conducteur invalide');
    }
    
    const transaction = await TransactionJournaliere.getOrCreateToday(conducteurId, montantInitial);
    return transaction;
  }
  
  /**
   * Ajouter une transaction liée à une course
   */
  static async ajouterTransactionCourse(transactionJournaliereId, courseId, type, montant, description, createdBy) {
    const transactionJournaliere = await TransactionJournaliere.findById(transactionJournaliereId);
    if (!transactionJournaliere) {
      throw new Error('Transaction journalière non trouvée');
    }
    
    if (transactionJournaliere.statut === 'cloturee') {
      throw new Error('Impossible d\'ajouter une transaction à une journée clôturée');
    }
    
    // Vérifier que la course existe
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course non trouvée');
    }
    
    const nouvelleTransaction = {
      type,
      montant,
      description,
      courseId,
      createdBy,
      timestamp: new Date()
    };
    
    await transactionJournaliere.ajouterTransaction(nouvelleTransaction);
    return transactionJournaliere;
  }
  
  /**
   * Ajouter une transaction liée à une réservation
   */
  static async ajouterTransactionReservation(transactionJournaliereId, reservationId, type, montant, description, createdBy) {
    const transactionJournaliere = await TransactionJournaliere.findById(transactionJournaliereId);
    if (!transactionJournaliere) {
      throw new Error('Transaction journalière non trouvée');
    }
    
    if (transactionJournaliere.statut === 'cloturee') {
      throw new Error('Impossible d\'ajouter une transaction à une journée clôturée');
    }
    
    // Vérifier que la réservation existe
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Réservation non trouvée');
    }
    
    const nouvelleTransaction = {
      type,
      montant,
      description,
      reservationId,
      createdBy,
      timestamp: new Date()
    };
    
    await transactionJournaliere.ajouterTransaction(nouvelleTransaction);
    return transactionJournaliere;
  }
  
  /**
   * Clôturer automatiquement les transactions en fin de journée
   */
  static async cloturerTransactionsAutomatiquement(date = null) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    // Si aucune date n'est fournie, clôturer les transactions d'hier
    if (!date) {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    const transactions = await TransactionJournaliere.find({
      date: { $gte: targetDate, $lte: endDate },
      statut: 'active'
    });
    
    const resultats = [];
    for (const transaction of transactions) {
      try {
        await transaction.cloturer('Clôture automatique en fin de journée');
        resultats.push({
          success: true,
          transactionId: transaction._id,
          conducteurId: transaction.conducteur,
          message: 'Clôturé avec succès'
        });
      } catch (error) {
        resultats.push({
          success: false,
          transactionId: transaction._id,
          conducteurId: transaction.conducteur,
          error: error.message
        });
      }
    }
    
    return {
      totalTraitees: transactions.length,
      successes: resultats.filter(r => r.success).length,
      errors: resultats.filter(r => !r.success).length,
      details: resultats
    };
  }
  
  /**
   * Calculer les statistiques de performance d'un conducteur
   */
  static async getStatistiquesConducteur(conducteurId, dateDebut, dateFin) {
    const filter = {
      conducteur: conducteurId
    };
    
    if (dateDebut || dateFin) {
      filter.date = {};
      if (dateDebut) {
        const debut = new Date(dateDebut);
        debut.setHours(0, 0, 0, 0);
        filter.date.$gte = debut;
      }
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        filter.date.$lte = fin;
      }
    }
    
    const transactions = await TransactionJournaliere.find(filter).sort({ date: 1 });
    
    if (transactions.length === 0) {
      return {
        periodeDebut: dateDebut,
        periodeFin: dateFin,
        nombreJours: 0,
        totalMontantInitial: 0,
        totalSoldeActuel: 0,
        totalRecettes: 0,
        totalDepenses: 0,
        totalCommissions: 0,
        moyenneJournaliere: {
          montantInitial: 0,
          recettes: 0,
          depenses: 0,
          soldeActuel: 0
        },
        evolution: []
      };
    }
    
    const stats = {
      periodeDebut: transactions[0].date,
      periodeFin: transactions[transactions.length - 1].date,
      nombreJours: transactions.length,
      totalMontantInitial: 0,
      totalSoldeActuel: 0,
      totalRecettes: 0,
      totalDepenses: 0,
      totalCommissions: 0,
      evolution: []
    };
    
    // Calculer les totaux et l'évolution
    transactions.forEach(transaction => {
      stats.totalMontantInitial += transaction.montantInitial;
      stats.totalSoldeActuel += transaction.soldeActuel;
      stats.totalRecettes += transaction.totalRecettes;
      stats.totalDepenses += transaction.totalDepenses;
      stats.totalCommissions += transaction.totalCommissions;
      
      stats.evolution.push({
        date: transaction.date,
        montantInitial: transaction.montantInitial,
        soldeActuel: transaction.soldeActuel,
        recettes: transaction.totalRecettes,
        depenses: transaction.totalDepenses,
        commissions: transaction.totalCommissions,
        nombreTransactions: transaction.transactions.length
      });
    });
    
    // Calculer les moyennes
    stats.moyenneJournaliere = {
      montantInitial: stats.totalMontantInitial / stats.nombreJours,
      recettes: stats.totalRecettes / stats.nombreJours,
      depenses: stats.totalDepenses / stats.nombreJours,
      soldeActuel: stats.totalSoldeActuel / stats.nombreJours
    };
    
    return stats;
  }
  
  /**
   * Réconcilier le solde d'une transaction avec les transactions réelles
   */
  static async reconcilierSolde(transactionJournaliereId) {
    const transaction = await TransactionJournaliere.findById(transactionJournaliereId);
    if (!transaction) {
      throw new Error('Transaction journalière non trouvée');
    }
    
    const soldeCalcule = transaction.soldeCalcule;
    const soldeActuel = transaction.soldeActuel;
    
    if (Math.abs(soldeCalcule - soldeActuel) > 0.01) { // Tolérance de 1 centime
      transaction.soldeActuel = soldeCalcule;
      await transaction.save();
      
      return {
        reconciliee: true,
        ancienSolde: soldeActuel,
        nouveauSolde: soldeCalcule,
        difference: soldeCalcule - soldeActuel
      };
    }
    
    return {
      reconciliee: false,
      solde: soldeActuel,
      message: 'Le solde est déjà correct'
    };
  }
}

module.exports = TransactionJournaliereService; 
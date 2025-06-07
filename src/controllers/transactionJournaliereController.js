const asyncHandler = require('express-async-handler');
const TransactionJournaliere = require('../models/TransactionJournaliere');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Créer une nouvelle transaction journalière
// @route   POST /api/transactions-journalieres
// @access  Private/Admin
const createTransactionJournaliere = asyncHandler(async (req, res) => {
  const { conducteur, date, montantInitial, notes } = req.body;

  // Vérifier que le conducteur existe et a le bon rôle
  const conducteurUser = await User.findById(conducteur);
  if (!conducteurUser) {
    res.status(404);
    throw new Error('Conducteur non trouvé');
  }

  if (conducteurUser.role !== 'conducteur') {
    res.status(400);
    throw new Error('L\'utilisateur sélectionné n\'est pas un conducteur');
  }

  // Normaliser la date (début de journée)
  const dateJour = new Date(date);
  dateJour.setHours(0, 0, 0, 0);

  // Vérifier s'il existe déjà une transaction pour ce conducteur à cette date
  const existingTransaction = await TransactionJournaliere.findOne({
    conducteur,
    date: dateJour
  });

  if (existingTransaction) {
    res.status(400);
    throw new Error('Une transaction journalière existe déjà pour ce conducteur à cette date');
  }

  const transaction = await TransactionJournaliere.create({
    conducteur,
    date: dateJour,
    montantInitial: montantInitial || 0,
    soldeActuel: montantInitial || 0,
    notes,
    createdBy: req.user.id
  });

  // Populer les données du conducteur
  await transaction.populate('conducteur', 'nom prenom email telephone');
  await transaction.populate('createdBy', 'nom prenom');

  res.status(201).json({
    success: true,
    data: transaction
  });
});

// @desc    Obtenir toutes les transactions journalières
// @route   GET /api/transactions-journalieres
// @access  Private/Admin
const getTransactionsJournalieres = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    conducteur,
    date,
    statut,
    dateDebut,
    dateFin,
    sortBy = 'date',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre
  const filter = {};

  if (conducteur) {
    filter.conducteur = conducteur;
  }

  if (date) {
    const dateJour = new Date(date);
    dateJour.setHours(0, 0, 0, 0);
    const dateFin = new Date(dateJour);
    dateFin.setHours(23, 59, 59, 999);
    
    filter.date = {
      $gte: dateJour,
      $lte: dateFin
    };
  } else if (dateDebut || dateFin) {
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

  if (statut) {
    filter.statut = statut;
  }

  // Options de tri
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Exécution de la requête
  const transactions = await TransactionJournaliere.find(filter)
    .populate('conducteur', 'nom prenom email telephone')
    .populate('createdBy', 'nom prenom')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Compter le total
  const total = await TransactionJournaliere.countDocuments(filter);

  // Calculs de statistiques
  const stats = await TransactionJournaliere.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalMontantInitial: { $sum: '$montantInitial' },
        totalSoldeActuel: { $sum: '$soldeActuel' },
        moyenneMontantInitial: { $avg: '$montantInitial' },
        moyenneSoldeActuel: { $avg: '$soldeActuel' }
      }
    }
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats: stats[0] || {
      totalMontantInitial: 0,
      totalSoldeActuel: 0,
      moyenneMontantInitial: 0,
      moyenneSoldeActuel: 0
    }
  });
});

// @desc    Obtenir une transaction journalière par ID
// @route   GET /api/transactions-journalieres/:id
// @access  Private/Admin
const getTransactionJournaliere = asyncHandler(async (req, res) => {
  const transaction = await TransactionJournaliere.findById(req.params.id)
    .populate('conducteur', 'nom prenom email telephone')
    .populate('createdBy', 'nom prenom')
    .populate('transactions.createdBy', 'nom prenom');

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction journalière non trouvée');
  }

  res.json({
    success: true,
    data: transaction
  });
});

// @desc    Obtenir ou créer la transaction du jour pour un conducteur
// @route   GET /api/transactions-journalieres/conducteur/:conducteurId/today
// @access  Private/Admin
const getOrCreateToday = asyncHandler(async (req, res) => {
  const { conducteurId } = req.params;
  const { montantInitial = 0 } = req.body;

  // Vérifier que le conducteur existe
  const conducteur = await User.findById(conducteurId);
  if (!conducteur) {
    res.status(404);
    throw new Error('Conducteur non trouvé');
  }

  if (conducteur.role !== 'conducteur') {
    res.status(400);
    throw new Error('L\'utilisateur sélectionné n\'est pas un conducteur');
  }

  const transaction = await TransactionJournaliere.getOrCreateToday(conducteurId, montantInitial);

  res.json({
    success: true,
    data: transaction
  });
});

// @desc    Mettre à jour une transaction journalière
// @route   PUT /api/transactions-journalieres/:id
// @access  Private/Admin
const updateTransactionJournaliere = asyncHandler(async (req, res) => {
  const { montantInitial, notes, statut } = req.body;

  let transaction = await TransactionJournaliere.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction journalière non trouvée');
  }

  // Vérifier si la transaction est clôturée
  if (transaction.statut === 'cloturee' && req.user.role !== 'super-admin') {
    res.status(400);
    throw new Error('Impossible de modifier une transaction clôturée');
  }

  // Mettre à jour les champs autorisés
  if (montantInitial !== undefined) {
    const difference = montantInitial - transaction.montantInitial;
    transaction.montantInitial = montantInitial;
    transaction.soldeActuel += difference;
  }

  if (notes !== undefined) {
    transaction.notes = notes;
  }

  if (statut !== undefined) {
    transaction.statut = statut;
  }

  await transaction.save();

  // Populer les données
  await transaction.populate('conducteur', 'nom prenom email telephone');
  await transaction.populate('createdBy', 'nom prenom');

  res.json({
    success: true,
    data: transaction
  });
});

// @desc    Ajouter une transaction à la journée
// @route   POST /api/transactions-journalieres/:id/transactions
// @access  Private/Admin
const ajouterTransaction = asyncHandler(async (req, res) => {
  const { type, montant, description, courseId, reservationId } = req.body;

  const transactionJournaliere = await TransactionJournaliere.findById(req.params.id);

  if (!transactionJournaliere) {
    res.status(404);
    throw new Error('Transaction journalière non trouvée');
  }

  if (transactionJournaliere.statut === 'cloturee') {
    res.status(400);
    throw new Error('Impossible d\'ajouter une transaction à une journée clôturée');
  }

  const nouvelleTransaction = {
    type,
    montant,
    description,
    courseId,
    reservationId,
    createdBy: req.user.id,
    timestamp: new Date()
  };

  await transactionJournaliere.ajouterTransaction(nouvelleTransaction);

  // Populer les données
  await transactionJournaliere.populate('conducteur', 'nom prenom email telephone');
  await transactionJournaliere.populate('transactions.createdBy', 'nom prenom');

  res.json({
    success: true,
    data: transactionJournaliere
  });
});

// @desc    Clôturer une transaction journalière
// @route   PUT /api/transactions-journalieres/:id/cloturer
// @access  Private/Admin
const cloturerTransactionJournaliere = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const transaction = await TransactionJournaliere.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction journalière non trouvée');
  }

  if (transaction.statut === 'cloturee') {
    res.status(400);
    throw new Error('Cette transaction est déjà clôturée');
  }

  await transaction.cloturer(notes);

  // Populer les données
  await transaction.populate('conducteur', 'nom prenom email telephone');
  await transaction.populate('createdBy', 'nom prenom');

  res.json({
    success: true,
    message: 'Transaction journalière clôturée avec succès',
    data: transaction
  });
});

// @desc    Obtenir le résumé mensuel d'un conducteur
// @route   GET /api/transactions-journalieres/conducteur/:conducteurId/resume/:mois/:annee
// @access  Private/Admin
const getResumeMensuel = asyncHandler(async (req, res) => {
  const { conducteurId, mois, annee } = req.params;

  // Vérifier que le conducteur existe
  const conducteur = await User.findById(conducteurId);
  if (!conducteur) {
    res.status(404);
    throw new Error('Conducteur non trouvé');
  }

  const resume = await TransactionJournaliere.getResumeMensuel(conducteurId, parseInt(mois), parseInt(annee));

  // Obtenir les détails jour par jour
  const startDate = new Date(parseInt(annee), parseInt(mois) - 1, 1);
  const endDate = new Date(parseInt(annee), parseInt(mois), 0, 23, 59, 59);

  const transactionsDetaillees = await TransactionJournaliere.find({
    conducteur: conducteurId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  res.json({
    success: true,
    data: {
      conducteur: {
        id: conducteur._id,
        nom: conducteur.nom,
        prenom: conducteur.prenom,
        email: conducteur.email
      },
      periode: {
        mois: parseInt(mois),
        annee: parseInt(annee)
      },
      resume,
      transactions: transactionsDetaillees
    }
  });
});

// @desc    Supprimer une transaction journalière
// @route   DELETE /api/transactions-journalieres/:id
// @access  Private/Super-Admin
const deleteTransactionJournaliere = asyncHandler(async (req, res) => {
  const transaction = await TransactionJournaliere.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction journalière non trouvée');
  }

  // Seuls les super-admins peuvent supprimer
  if (req.user.role !== 'super-admin') {
    res.status(403);
    throw new Error('Accès refusé - Autorisation super-admin requise');
  }

  await TransactionJournaliere.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Transaction journalière supprimée avec succès'
  });
});

// @desc    Obtenir les statistiques globales
// @route   GET /api/transactions-journalieres/stats/global
// @access  Private/Admin
const getStatistiquesGlobales = asyncHandler(async (req, res) => {
  const { dateDebut, dateFin, conducteur } = req.query;

  // Construction du filtre
  const matchFilter = {};

  if (dateDebut || dateFin) {
    matchFilter.date = {};
    if (dateDebut) {
      const debut = new Date(dateDebut);
      debut.setHours(0, 0, 0, 0);
      matchFilter.date.$gte = debut;
    }
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      matchFilter.date.$lte = fin;
    }
  }

  if (conducteur) {
    matchFilter.conducteur = mongoose.Types.ObjectId(conducteur);
  }

  const pipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        nombreTransactions: { $sum: 1 },
        totalMontantInitial: { $sum: '$montantInitial' },
        totalSoldeActuel: { $sum: '$soldeActuel' },
        moyenneMontantInitial: { $avg: '$montantInitial' },
        moyenneSoldeActuel: { $avg: '$soldeActuel' },
        nombreConducteursUniques: { $addToSet: '$conducteur' }
      }
    },
    {
      $addFields: {
        nombreConducteursUniques: { $size: '$nombreConducteursUniques' }
      }
    }
  ];

  // Statistiques par statut
  const statsByStatut = await TransactionJournaliere.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
        totalMontant: { $sum: '$montantInitial' },
        totalSolde: { $sum: '$soldeActuel' }
      }
    }
  ]);

  const statsGlobales = await TransactionJournaliere.aggregate(pipeline);

  res.json({
    success: true,
    data: {
      global: statsGlobales[0] || {
        nombreTransactions: 0,
        totalMontantInitial: 0,
        totalSoldeActuel: 0,
        moyenneMontantInitial: 0,
        moyenneSoldeActuel: 0,
        nombreConducteursUniques: 0
      },
      parStatut: statsByStatut
    }
  });
});

module.exports = {
  createTransactionJournaliere,
  getTransactionsJournalieres,
  getTransactionJournaliere,
  getOrCreateToday,
  updateTransactionJournaliere,
  ajouterTransaction,
  cloturerTransactionJournaliere,
  getResumeMensuel,
  deleteTransactionJournaliere,
  getStatistiquesGlobales
}; 
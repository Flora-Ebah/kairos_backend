const asyncHandler = require('express-async-handler');
const Depense = require('../models/Depense');
const Vehicule = require('../models/Vehicule');
const mongoose = require('mongoose');

/**
 * @desc    Obtenir toutes les dépenses avec filtres
 * @route   GET /api/depenses
 * @access  Private
 */
const getDepenses = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  
  const keyword = req.query.keyword 
    ? {
        $or: [
          { description: { $regex: req.query.keyword, $options: 'i' } },
          { category: { $regex: req.query.keyword, $options: 'i' } }
        ],
      } 
    : {};

  const categoryFilter = req.query.category ? { category: req.query.category } : {};
  
  // Filtre par date
  const dateFilter = {};
  if (req.query.dateDebut && req.query.dateFin) {
    dateFilter.date = {
      $gte: new Date(req.query.dateDebut),
      $lte: new Date(req.query.dateFin)
    };
  }
  
  // Filtre par conducteur
  const conducteurFilter = req.query.conducteurId ? { 'conducteur.id': req.query.conducteurId } : {};
  
  const count = await Depense.countDocuments({
    ...keyword,
    ...categoryFilter,
    ...dateFilter,
    ...conducteurFilter
  });
  
  const depenses = await Depense.find({
    ...keyword,
    ...categoryFilter,
    ...dateFilter,
    ...conducteurFilter
  })
    .sort({ date: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    depenses,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

/**
 * @desc    Obtenir une dépense par ID
 * @route   GET /api/depenses/:id
 * @access  Private
 */
const getDepenseById = asyncHandler(async (req, res) => {
  const depense = await Depense.findById(req.params.id);

  if (depense) {
    res.json(depense);
  } else {
    res.status(404);
    throw new Error('Dépense non trouvée');
  }
});

/**
 * @desc    Créer une nouvelle dépense
 * @route   POST /api/depenses
 * @access  Private
 */
const createDepense = asyncHandler(async (req, res) => {
  const {
    date,
    category,
    description,
    montant,
    conducteur
  } = req.body;

  // Validation des champs obligatoires
  if (!description || !montant || !category) {
    res.status(400);
    throw new Error('Veuillez fournir une description, une catégorie et un montant pour la dépense');
  }

  // Créer la dépense avec les informations simplifiées
  const depense = await Depense.create({
    date: date || new Date(),
    category,
    description,
    montant,
    conducteur: {
      id: conducteur?.id || req.user._id,
      nom: conducteur?.nom || req.user.nom || '',
      prenom: conducteur?.prenom || req.user.prenom || '',
      telephone: conducteur?.telephone || req.user.telephone || ''
    }
  });

  res.status(201).json(depense);
});

/**
 * @desc    Mettre à jour une dépense
 * @route   PUT /api/depenses/:id
 * @access  Private
 */
const updateDepense = asyncHandler(async (req, res) => {
  const depense = await Depense.findById(req.params.id);

  if (!depense) {
    res.status(404);
    throw new Error('Dépense non trouvée');
  }

  const {
    date,
    category,
    description,
    montant,
    conducteur
  } = req.body;

  // Mettre à jour les champs
  depense.date = date || depense.date;
  depense.category = category || depense.category;
  depense.description = description || depense.description;
  depense.montant = montant || depense.montant;
  
  // Mettre à jour les informations du conducteur si fournies
  if (conducteur) {
    depense.conducteur = {
      id: conducteur.id || depense.conducteur.id,
      nom: conducteur.nom || depense.conducteur.nom,
      prenom: conducteur.prenom || depense.conducteur.prenom,
      telephone: conducteur.telephone || depense.conducteur.telephone
    };
  }

  const updatedDepense = await depense.save();
  res.json(updatedDepense);
});

/**
 * @desc    Supprimer une dépense
 * @route   DELETE /api/depenses/:id
 * @access  Private
 */
const deleteDepense = asyncHandler(async (req, res) => {
  const depense = await Depense.findById(req.params.id);

  if (!depense) {
    res.status(404);
    throw new Error('Dépense non trouvée');
  }

  await depense.deleteOne();
  res.json({ message: 'Dépense supprimée' });
});

/**
 * @desc    Obtenir les statistiques des dépenses
 * @route   GET /api/depenses/stats
 * @access  Private
 */
const getDepensesStats = asyncHandler(async (req, res) => {
  const conducteurId = req.query.conducteurId;
  
  // Filtre par conducteur
  const conducteurFilter = conducteurId ? { 'conducteur.id': conducteurId } : {};
  
  // Période: ce mois, les 3 derniers mois, ou les 6 derniers mois
  const periode = req.query.periode || 'mois';
  let dateDebut = new Date();
  
  if (periode === 'mois') {
    dateDebut.setMonth(dateDebut.getMonth() - 1);
  } else if (periode === 'trimestre') {
    dateDebut.setMonth(dateDebut.getMonth() - 3);
  } else if (periode === 'semestre') {
    dateDebut.setMonth(dateDebut.getMonth() - 6);
  } else if (periode === 'annee') {
    dateDebut.setFullYear(dateDebut.getFullYear() - 1);
  }
  
  // Statistiques par catégorie de dépense
  const statsByCategory = await Depense.aggregate([
    { 
      $match: { 
        ...conducteurFilter,
        date: { $gte: dateDebut }
      } 
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$montant' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  // Total des dépenses
  const totalDepenses = await Depense.aggregate([
    { 
      $match: { 
        ...conducteurFilter,
        date: { $gte: dateDebut }
      } 
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$montant' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Statistiques mensuelles (pour les graphiques)
  const statsParMois = await Depense.aggregate([
    { 
      $match: { 
        ...conducteurFilter,
        date: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
      } 
    },
    {
      $group: {
        _id: { 
          month: { $month: '$date' }, 
          year: { $year: '$date' } 
        },
        total: { $sum: '$montant' },
        count: { $sum: 1 }
      }
    },
    { 
      $sort: { 
        '_id.year': 1, 
        '_id.month': 1 
      } 
    }
  ]);
  
  // Reformater les statistiques mensuelles pour le frontend
  const monthsData = statsParMois.map(item => ({
    mois: `${item._id.month}/${item._id.year}`,
    total: item.total,
    count: item.count
  }));
  
  res.json({
    statsByCategory,
    total: totalDepenses.length > 0 ? totalDepenses[0].total : 0,
    count: totalDepenses.length > 0 ? totalDepenses[0].count : 0,
    monthsData
  });
});

module.exports = {
  getDepenses,
  getDepenseById,
  createDepense,
  updateDepense,
  deleteDepense,
  getDepensesStats
}; 
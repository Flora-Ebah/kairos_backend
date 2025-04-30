const asyncHandler = require('express-async-handler');
const Option = require('../models/Option');

// @desc    Récupérer toutes les options
// @route   GET /api/options
// @access  Private/Admin
const getOptions = asyncHandler(async (req, res) => {
  const options = await Option.find({});
  res.json(options);
});

// @desc    Récupérer une option par ID
// @route   GET /api/options/:id
// @access  Private/Admin
const getOptionById = asyncHandler(async (req, res) => {
  const option = await Option.findById(req.params.id);

  if (option) {
    res.json(option);
  } else {
    res.status(404);
    throw new Error('Option non trouvée');
  }
});

// @desc    Créer une nouvelle option
// @route   POST /api/options
// @access  Private/Admin
const createOption = asyncHandler(async (req, res) => {
  const { option_id, nom, description } = req.body;

  const optionExists = await Option.findOne({ option_id });

  if (optionExists) {
    res.status(400);
    throw new Error('Une option avec cet ID existe déjà');
  }

  const option = await Option.create({
    option_id,
    nom,
    description,
  });

  if (option) {
    res.status(201).json(option);
  } else {
    res.status(400);
    throw new Error('Données d\'option invalides');
  }
});

// @desc    Mettre à jour une option
// @route   PUT /api/options/:id
// @access  Private/Admin
const updateOption = asyncHandler(async (req, res) => {
  const { nom, description } = req.body;

  const option = await Option.findById(req.params.id);

  if (option) {
    option.nom = nom || option.nom;
    option.description = description !== undefined ? description : option.description;

    const updatedOption = await option.save();
    res.json(updatedOption);
  } else {
    res.status(404);
    throw new Error('Option non trouvée');
  }
});

// @desc    Supprimer une option
// @route   DELETE /api/options/:id
// @access  Private/Admin
const deleteOption = asyncHandler(async (req, res) => {
  const option = await Option.findById(req.params.id);

  if (option) {
    await Option.deleteOne({ _id: option._id });
    res.json({ message: 'Option supprimée' });
  } else {
    res.status(404);
    throw new Error('Option non trouvée');
  }
});

// @desc    Seeder les options initiales
// @route   POST /api/options/seed
// @access  Private/Admin
const seedOptions = asyncHandler(async (req, res) => {
  // Supprimer toutes les options existantes
  await Option.deleteMany({});

  // Données à insérer
  const optionsToSeed = [
    {
      option_id: '113c36f3-bdb4-4687-8b59-bd0d67e6675f',
      nom: 'Au-delà de 3 heures (par heure)',
      description: '',
    },
    {
      option_id: '29a83f50-eceb-42d8-95ec-5410672abf27',
      nom: 'Aller simple',
      description: '',
    },
    {
      option_id: '3b493b68-f0eb-4b29-98d7-f9a7bebf1d1e',
      nom: 'Journée',
      description: '',
    },
    {
      option_id: '52a1a733-20c7-4cb3-8454-6609e011e251',
      nom: 'Demi-journée',
      description: '',
    },
    {
      option_id: '7b254ece-ac49-4713-9e5d-4fcf8a5d9d03',
      nom: 'Aller/Retour',
      description: '',
    },
    {
      option_id: '9c99a37e-4c18-4b29-abe8-cb33b306803f',
      nom: 'Une heure',
      description: '',
    },
  ];

  // Insérer les données
  const options = await Option.insertMany(optionsToSeed);

  res.status(201).json({
    message: `${options.length} options ont été ajoutées avec succès`,
    options,
  });
});

module.exports = {
  getOptions,
  getOptionById,
  createOption,
  updateOption,
  deleteOption,
  seedOptions,
}; 
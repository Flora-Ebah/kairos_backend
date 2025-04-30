const asyncHandler = require('express-async-handler');
const Zone = require('../models/Zone');

// @desc    Récupérer toutes les zones
// @route   GET /api/zones
// @access  Private/Admin
const getZones = asyncHandler(async (req, res) => {
  const zones = await Zone.find({});
  res.json(zones);
});

// @desc    Récupérer une zone par ID
// @route   GET /api/zones/:id
// @access  Private/Admin
const getZoneById = asyncHandler(async (req, res) => {
  const zone = await Zone.findById(req.params.id);

  if (zone) {
    res.json(zone);
  } else {
    res.status(404);
    throw new Error('Zone non trouvée');
  }
});

// @desc    Créer une nouvelle zone
// @route   POST /api/zones
// @access  Private/Admin
const createZone = asyncHandler(async (req, res) => {
  const { zone_id, nom, description } = req.body;

  const zoneExists = await Zone.findOne({ zone_id });

  if (zoneExists) {
    res.status(400);
    throw new Error('Une zone avec cet ID existe déjà');
  }

  const zone = await Zone.create({
    zone_id,
    nom,
    description,
  });

  if (zone) {
    res.status(201).json(zone);
  } else {
    res.status(400);
    throw new Error('Données de zone invalides');
  }
});

// @desc    Mettre à jour une zone
// @route   PUT /api/zones/:id
// @access  Private/Admin
const updateZone = asyncHandler(async (req, res) => {
  const { nom, description } = req.body;

  const zone = await Zone.findById(req.params.id);

  if (zone) {
    zone.nom = nom || zone.nom;
    zone.description = description !== undefined ? description : zone.description;

    const updatedZone = await zone.save();
    res.json(updatedZone);
  } else {
    res.status(404);
    throw new Error('Zone non trouvée');
  }
});

// @desc    Supprimer une zone
// @route   DELETE /api/zones/:id
// @access  Private/Admin
const deleteZone = asyncHandler(async (req, res) => {
  const zone = await Zone.findById(req.params.id);

  if (zone) {
    await Zone.deleteOne({ _id: zone._id });
    res.json({ message: 'Zone supprimée' });
  } else {
    res.status(404);
    throw new Error('Zone non trouvée');
  }
});

// @desc    Seeder les zones initiales
// @route   POST /api/zones/seed
// @access  Private/Admin
const seedZones = asyncHandler(async (req, res) => {
  // Supprimer toutes les zones existantes
  await Zone.deleteMany({});

  // Données à insérer
  const zonesToSeed = [
    {
      zone_id: '036f3963-99e4-40d2-9a14-c4b13a6f2080',
      nom: 'Dans Dakar',
      description: '',
    },
    {
      zone_id: '55b0cd27-3a50-4ddf-9cb2-178f06eb8e8d',
      nom: 'Banlieue',
      description: '',
    },
    {
      zone_id: '74bc9c29-4ac3-493c-9bbe-aa978a7fd37e',
      nom: 'Regions',
      description: '',
    },
    {
      zone_id: 'dcfc10f0-dce1-4c25-84de-07ba3e413c01',
      nom: 'Aéroport',
      description: '',
    },
  ];

  // Insérer les données
  const zones = await Zone.insertMany(zonesToSeed);

  res.status(201).json({
    message: `${zones.length} zones ont été ajoutées avec succès`,
    zones,
  });
});

module.exports = {
  getZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  seedZones,
}; 
const asyncHandler = require('express-async-handler');
const Service = require('../models/Service');

// @desc    Récupérer tous les services
// @route   GET /api/services
// @access  Private/Admin
const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({});
  res.json(services);
});

// @desc    Récupérer un service par ID
// @route   GET /api/services/:id
// @access  Private/Admin
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (service) {
    res.json(service);
  } else {
    res.status(404);
    throw new Error('Service non trouvé');
  }
});

// @desc    Créer un nouveau service
// @route   POST /api/services
// @access  Private/Admin
const createService = asyncHandler(async (req, res) => {
  const { service_id, nom, description } = req.body;

  const serviceExists = await Service.findOne({ service_id });

  if (serviceExists) {
    res.status(400);
    throw new Error('Un service avec cet ID existe déjà');
  }

  const service = await Service.create({
    service_id,
    nom,
    description,
  });

  if (service) {
    res.status(201).json(service);
  } else {
    res.status(400);
    throw new Error('Données de service invalides');
  }
});

// @desc    Mettre à jour un service
// @route   PUT /api/services/:id
// @access  Private/Admin
const updateService = asyncHandler(async (req, res) => {
  const { nom, description } = req.body;

  const service = await Service.findById(req.params.id);

  if (service) {
    service.nom = nom || service.nom;
    service.description = description !== undefined ? description : service.description;

    const updatedService = await service.save();
    res.json(updatedService);
  } else {
    res.status(404);
    throw new Error('Service non trouvé');
  }
});

// @desc    Supprimer un service
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (service) {
    await Service.deleteOne({ _id: service._id });
    res.json({ message: 'Service supprimé' });
  } else {
    res.status(404);
    throw new Error('Service non trouvé');
  }
});

// @desc    Seeder les services initiaux
// @route   POST /api/services/seed
// @access  Private/Admin
const seedServices = asyncHandler(async (req, res) => {
  // Supprimer tous les services existants
  await Service.deleteMany({});

  // Données à insérer
  const servicesToSeed = [
    {
      service_id: '20b1d67f-bdd9-4a0b-87d6-5ecb0ae6d30d',
      nom: 'Transfert',
      description: '',
    },
    {
      service_id: 'a1421ab1-1316-4d74-9a9d-5dd5da96abaf',
      nom: 'Mise À disposition',
      description: '',
    },
  ];

  // Insérer les données
  const services = await Service.insertMany(servicesToSeed);

  res.status(201).json({
    message: `${services.length} services ont été ajoutés avec succès`,
    services,
  });
});

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  seedServices,
}; 
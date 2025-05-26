const asyncHandler = require('express-async-handler');
const tarifService = require('../services/tarifService');
const Tarif = require('../models/Tarif');
const { v4: uuidv4 } = require('uuid');

// @desc    Récupérer tous les tarifs
// @route   GET /api/tarifs
// @access  Public
const getTarifs = asyncHandler(async (req, res) => {
  try {
    const filters = {
      zone: req.query.zone,
      destination: req.query.destination,
      service: req.query.service,
      type_vehicule: req.query.type_vehicule,
      option: req.query.option
    };

    // Nettoyer les filtres (supprimer les valeurs undefined)
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    const tarifs = await tarifService.getAllTarifs(filters);
    
    res.json({
      success: true,
      count: tarifs.length,
      data: tarifs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Récupérer un tarif par ID
// @route   GET /api/tarifs/:id
// @access  Public
const getTarifById = asyncHandler(async (req, res) => {
  try {
    const tarif = await tarifService.getTarifById(req.params.id);

    if (!tarif) {
      return res.status(404).json({
        success: false,
        message: 'Tarif non trouvé'
      });
    }

    res.json({
      success: true,
      data: tarif
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Rechercher des tarifs
// @route   POST /api/tarifs/search
// @access  Public
const searchTarifs = asyncHandler(async (req, res) => {
  try {
    const tarifs = await tarifService.searchTarifs(req.body);
    
    res.json({
      success: true,
      count: tarifs.length,
      data: tarifs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Obtenir un tarif exact
// @route   POST /api/tarifs/exact
// @access  Public
const getExactTarif = asyncHandler(async (req, res) => {
  try {
    const { zone, destination, service, type_vehicule, option } = req.body;
    
    if (!zone || !destination || !service || !type_vehicule || !option) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (zone, destination, service, type_vehicule, option)'
      });
    }

    const tarif = await tarifService.getExactTarif(zone, destination, service, type_vehicule, option);
    
    if (!tarif) {
      return res.status(404).json({
        success: false,
        message: 'Aucun tarif trouvé pour cette combinaison'
      });
    }

    res.json({
      success: true,
      data: tarif
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Créer un nouveau tarif
// @route   POST /api/tarifs
// @access  Private/Admin
const createTarif = asyncHandler(async (req, res) => {
  try {
    const { zone, destination, service, type_vehicule, option, tarif_fcfa, description } = req.body;

    if (!zone || !destination || !service || !type_vehicule || !option || !tarif_fcfa) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être fournis'
      });
    }

    const tarifData = {
      zone,
      destination,
      service,
      type_vehicule,
      option,
      tarif_fcfa: parseFloat(tarif_fcfa),
      description: description || ''
    };

    const tarif = await tarifService.createTarif(tarifData);

    res.status(201).json({
      success: true,
      message: 'Tarif créé avec succès',
      data: tarif
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Mettre à jour un tarif
// @route   PUT /api/tarifs/:id
// @access  Private/Admin
const updateTarif = asyncHandler(async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Convertir le tarif_fcfa en nombre si fourni
    if (updateData.tarif_fcfa) {
      updateData.tarif_fcfa = parseFloat(updateData.tarif_fcfa);
    }

    const tarif = await tarifService.updateTarif(req.params.id, updateData);

    res.json({
      success: true,
      message: 'Tarif mis à jour avec succès',
      data: tarif
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Supprimer un tarif (soft delete)
// @route   DELETE /api/tarifs/:id
// @access  Private/Admin
const deleteTarif = asyncHandler(async (req, res) => {
  try {
    await tarifService.deleteTarif(req.params.id);

    res.json({
      success: true,
      message: 'Tarif supprimé avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Supprimer définitivement un tarif
// @route   DELETE /api/tarifs/:id/hard
// @access  Private/Admin
const hardDeleteTarif = asyncHandler(async (req, res) => {
  try {
    await tarifService.hardDeleteTarif(req.params.id);

    res.json({
      success: true,
      message: 'Tarif supprimé définitivement'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Obtenir les statistiques des tarifs
// @route   GET /api/tarifs/stats
// @access  Public
const getTarifStats = asyncHandler(async (req, res) => {
  try {
    const stats = await tarifService.getTarifStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Obtenir les options de filtres
// @route   GET /api/tarifs/filters
// @access  Public
const getFilterOptions = asyncHandler(async (req, res) => {
  try {
    const options = await tarifService.getFilterOptions();
    
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Seeder les tarifs initiaux
// @route   POST /api/tarifs/seed
// @access  Private/Admin
const seedTarifs = asyncHandler(async (req, res) => {
  try {
    // Supprimer tous les tarifs existants
    await Tarif.deleteMany({});

    // Données des tarifs à insérer basées sur le tableau fourni
    const tarifsToSeed = [
      // Dans Dakar
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Une heure', tarif_fcfa: 10000 },
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Au-delà de 3 heures (par heure)', tarif_fcfa: 8000 },
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Demi-journée', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Journée', tarif_fcfa: 55000 },
      
      // Aéroport
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 25000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'utilitaire', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'utilitaire', option: 'Aller/Retour', tarif_fcfa: 60000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'suv', option: 'Aller simple', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'suv', option: 'Aller/Retour', tarif_fcfa: 70000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'van', option: 'Aller simple', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'van', option: 'Aller/Retour', tarif_fcfa: 100000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'minibus', option: 'Aller simple', tarif_fcfa: 80000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'minibus', option: 'Aller/Retour', tarif_fcfa: 140000 },
      
      // Régions - utiliser les vraies destinations de la BD
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Diamniadio', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 25000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Diamniadio', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Diamniadio', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Journée', tarif_fcfa: 55000 },
      
      // Ajouter les destinations qui existent réellement dans la BD
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Toubab Dialaw', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 30000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Toubab Dialaw', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 45000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Toubab Dialaw', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Journée', tarif_fcfa: 55000 },
      
      // Ajouter la destination Gambie avant frontière qui est dans les logs
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Gambie avant frontière', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 85000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Gambie avant frontière', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 150000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Gambie avant frontière', service: 'Mise à disposition', type_vehicule: 'berline', option: 'Journée', tarif_fcfa: 65000 },
      
      // Autres destinations importantes avec les bons noms
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Lac Rose', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 30000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Lac Rose', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 45000 },
      
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Popenguine', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Popenguine', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Saint-Louis', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 110000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Saint-Louis', service: 'Transfert', type_vehicule: 'berline', option: 'Aller/Retour', tarif_fcfa: 150000 },
      
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Fatick', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 65000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Kaolack', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 75000 },
      { tarif_id: uuidv4(), zone: 'Regions', destination: 'Ziguinchor', service: 'Transfert', type_vehicule: 'berline', option: 'Aller simple', tarif_fcfa: 250000 }
    ];

    // Insérer les données
    const tarifs = await Tarif.insertMany(tarifsToSeed);

    res.status(201).json({
      success: true,
      message: `${tarifs.length} tarifs ont été ajoutés avec succès`,
      count: tarifs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = {
  getTarifs,
  getTarifById,
  searchTarifs,
  getExactTarif,
  createTarif,
  updateTarif,
  deleteTarif,
  hardDeleteTarif,
  getTarifStats,
  getFilterOptions,
  seedTarifs,
}; 
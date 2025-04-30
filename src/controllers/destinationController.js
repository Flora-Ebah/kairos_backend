const asyncHandler = require('express-async-handler');
const Destination = require('../models/Destination');
const Zone = require('../models/Zone');

// Fonction utilitaire pour récupérer le nom de la zone
const addZoneNameToDestination = async (destination) => {
  if (destination && destination.zone_id) {
    const zone = await Zone.findOne({ zone_id: destination.zone_id });
    if (zone) {
      destination.zone_name = zone.nom;
    }
  }
  return destination;
};

// @desc    Récupérer toutes les destinations
// @route   GET /api/destinations
// @access  Private/Admin
const getDestinations = asyncHandler(async (req, res) => {
  const destinations = await Destination.find({});
  
  // Ajouter le nom de la zone à chaque destination
  const destinationsWithZones = await Promise.all(
    destinations.map(async (destination) => {
      const destinationObj = destination.toObject();
      const zone = await Zone.findOne({ zone_id: destinationObj.zone_id });
      if (zone) {
        destinationObj.zone_name = zone.nom;
      }
      return destinationObj;
    })
  );
  
  res.json(destinationsWithZones);
});

// @desc    Récupérer une destination par ID
// @route   GET /api/destinations/:id
// @access  Private/Admin
const getDestinationById = asyncHandler(async (req, res) => {
  const destination = await Destination.findById(req.params.id);

  if (destination) {
    const enrichedDestination = await addZoneNameToDestination(destination);
    res.json(enrichedDestination);
  } else {
    res.status(404);
    throw new Error('Destination non trouvée');
  }
});

// @desc    Créer une nouvelle destination
// @route   POST /api/destinations
// @access  Private/Admin
const createDestination = asyncHandler(async (req, res) => {
  const { destination_id, zone_id, nom, description } = req.body;

  // Vérifier si la zone existe
  const zoneExists = await Zone.findOne({ zone_id });
  if (!zoneExists) {
    res.status(400);
    throw new Error(`La zone avec l'ID ${zone_id} n'existe pas`);
  }

  const destinationExists = await Destination.findOne({ destination_id });

  if (destinationExists) {
    res.status(400);
    throw new Error('Une destination avec cet ID existe déjà');
  }

  const destination = await Destination.create({
    destination_id,
    zone_id,
    nom,
    description,
  });

  if (destination) {
    destination.zone_name = zoneExists.nom;
    res.status(201).json(destination);
  } else {
    res.status(400);
    throw new Error('Données de destination invalides');
  }
});

// @desc    Mettre à jour une destination
// @route   PUT /api/destinations/:id
// @access  Private/Admin
const updateDestination = asyncHandler(async (req, res) => {
  const { zone_id, nom, description } = req.body;

  const destination = await Destination.findById(req.params.id);

  if (destination) {
    // Si une nouvelle zone est fournie, vérifier qu'elle existe
    if (zone_id && zone_id !== destination.zone_id) {
      const zoneExists = await Zone.findOne({ zone_id });
      if (!zoneExists) {
        res.status(400);
        throw new Error(`La zone avec l'ID ${zone_id} n'existe pas`);
      }
      destination.zone_id = zone_id;
    }
    
    destination.nom = nom || destination.nom;
    destination.description = description !== undefined ? description : destination.description;

    const updatedDestination = await destination.save();
    
    // Récupérer le nom de la zone pour la réponse
    const zone = await Zone.findOne({ zone_id: updatedDestination.zone_id });
    if (zone) {
      updatedDestination.zone_name = zone.nom;
    }
    
    res.json(updatedDestination);
  } else {
    res.status(404);
    throw new Error('Destination non trouvée');
  }
});

// @desc    Supprimer une destination
// @route   DELETE /api/destinations/:id
// @access  Private/Admin
const deleteDestination = asyncHandler(async (req, res) => {
  const destination = await Destination.findById(req.params.id);

  if (destination) {
    await Destination.deleteOne({ _id: destination._id });
    res.json({ message: 'Destination supprimée' });
  } else {
    res.status(404);
    throw new Error('Destination non trouvée');
  }
});

// @desc    Récupérer les destinations par zone
// @route   GET /api/destinations/zone/:zoneId
// @access  Private
const getDestinationsByZone = asyncHandler(async (req, res) => {
  const zoneId = req.params.zoneId;
  
  // Vérifier si la zone existe
  const zoneExists = await Zone.findOne({ zone_id: zoneId });
  if (!zoneExists) {
    res.status(400);
    throw new Error(`La zone avec l'ID ${zoneId} n'existe pas`);
  }
  
  const destinations = await Destination.find({ zone_id: zoneId });
  
  // Ajouter le nom de la zone à chaque destination
  destinations.forEach(destination => {
    destination.zone_name = zoneExists.nom;
  });
  
  res.json(destinations);
});

// @desc    Seeder les destinations initiales
// @route   POST /api/destinations/seed
// @access  Private/Admin
const seedDestinations = asyncHandler(async (req, res) => {
  // Supprimer toutes les destinations existantes
  await Destination.deleteMany({});

  // Récupérer les zones pour pouvoir associer les IDs
  const zones = await Zone.find({});
  if (zones.length === 0) {
    res.status(400);
    throw new Error('Aucune zone trouvée. Veuillez d\'abord créer des zones.');
  }

  // Créer un dictionnaire pour les zones
  const zoneMap = {};
  zones.forEach(zone => {
    zoneMap[zone.nom] = zone.zone_id;
  });

  // Récupérer les IDs de zone
  const regionsZoneId = zoneMap['Regions'] || '74bc9c29-4ac3-493c-9bbe-aa978a7fd37e';
  const dakarZoneId = zoneMap['Dans Dakar'] || '036f3963-99e4-40d2-9a14-c4b13a6f2080';
  const banlieueZoneId = zoneMap['Banlieue'] || '55b0cd27-3a50-4ddf-9cb2-178f06eb8e8d';
  const aeroportZoneId = zoneMap['Aéroport'] || 'dcfc10f0-dce1-4c25-84de-07ba3e413c01';

  // Données à insérer
  const destinationsToSeed = [
    {
      destination_id: '0cda929d-0725-4ddb-91ed-d561c9e5a374',
      zone_id: regionsZoneId,
      nom: 'Kaolack',
      description: '',
    },
    {
      destination_id: '1da4dc08-3d62-406c-a5de-9a2f5903e260',
      zone_id: regionsZoneId,
      nom: 'Popenguine',
      description: '',
    },
    {
      destination_id: '288db514-67a3-4ccf-a12d-6ef10f31c873',
      zone_id: regionsZoneId,
      nom: 'Toubab Dialaw',
      description: '',
    },
    {
      destination_id: '3f6db23a-a54c-4c99-a248-d41698b3d41c',
      zone_id: regionsZoneId,
      nom: 'Somone',
      description: '',
    },
    {
      destination_id: '434cdee4-e752-49a3-7b181a5a9c91',
      zone_id: regionsZoneId,
      nom: 'Mbour',
      description: '',
    },
    {
      destination_id: '45eb9dce-5287-414c-b8c0-48190ad9e1f6',
      zone_id: regionsZoneId,
      nom: 'Nianing',
      description: '',
    },
    {
      destination_id: '4c381591-db98-4b98-a644-dd0ebb57fdbc',
      zone_id: regionsZoneId,
      nom: 'Lompoul',
      description: '',
    },
    {
      destination_id: '56a133fc-9d81-4a60-a4df-66f5bdae4ab2',
      zone_id: regionsZoneId,
      nom: 'Louga',
      description: '',
    },
    {
      destination_id: '789763ec-abc0-48eb-a0ec-e97805e6b5dc',
      zone_id: regionsZoneId,
      nom: 'Warang',
      description: '',
    },
    {
      destination_id: '80cb11d4-90dc-4b91-8859-69cedd7d36f',
      zone_id: regionsZoneId,
      nom: 'Fatala',
      description: '',
    },
    {
      destination_id: '83fad0cf-c4f2-4f7c-a0ff-1727e28a2f18',
      zone_id: regionsZoneId,
      nom: 'Lac Rose',
      description: '',
    },
    {
      destination_id: '85556730-3ff2-4f14-be83-3b509c22ecf1',
      zone_id: dakarZoneId,
      nom: 'Dans Dakar',
      description: '',
    },
    {
      destination_id: '86907d88-4e7f-4c19-bd50-9496e220e6af',
      zone_id: regionsZoneId,
      nom: 'Gambie avant frontière',
      description: '',
    },
    {
      destination_id: '93a4f983-53c9-4afd-9332-e1cd28e5364',
      zone_id: banlieueZoneId,
      nom: 'Rufisque',
      description: '',
    },
    {
      destination_id: '94f856fd-422e-426f-a66e-c8d1d6841c65',
      zone_id: banlieueZoneId,
      nom: 'Mbao',
      description: '',
    },
    {
      destination_id: '9b2b690b-3f13-410f-8691-407a647f9cc5',
      zone_id: regionsZoneId,
      nom: 'Saint-Louis',
      description: '',
    },
    {
      destination_id: 'b668d535-1062-4c57-b804-826a33c29240',
      zone_id: regionsZoneId,
      nom: 'Diamniadio',
      description: '',
    },
    {
      destination_id: 'bcfdc09f-8ef7-4bd9-b7ec-698acae5bc78',
      zone_id: aeroportZoneId,
      nom: 'Aéroport (AIBD)',
      description: '',
    },
    {
      destination_id: 'cd6f60-44d0-4cc6-9eaf-95eff737997a',
      zone_id: banlieueZoneId,
      nom: 'Thiaroye',
      description: '',
    },
    {
      destination_id: 'd73e6070-3862-4fd4-ade5-7e98966d6aae',
      zone_id: banlieueZoneId,
      nom: 'Pikine',
      description: '',
    },
    {
      destination_id: 'd80fa700-e564-404e-a39a-ab269b9fc35c',
      zone_id: regionsZoneId,
      nom: 'Ngerigne',
      description: '',
    },
    {
      destination_id: 'db5ad145-98c1-4e63-bb8a-90df98d8b563',
      zone_id: regionsZoneId,
      nom: 'Thiès',
      description: '',
    },
    {
      destination_id: 'de845fd2-2386-4dd0-8918-d42634d2c590',
      zone_id: regionsZoneId,
      nom: 'Ziguinchor',
      description: '',
    },
    {
      destination_id: 'e00fa605-d46d-4589-81d2-239cede78075',
      zone_id: regionsZoneId,
      nom: 'GuéOrAo',
      description: '',
    },
    {
      destination_id: 'e1f820c5-6cae-4fcc-a27b-43ad821459cd',
      zone_id: regionsZoneId,
      nom: 'Gambie',
      description: '',
    },
    {
      destination_id: 'e1ffb845-246a-97eb-9e493baddab2',
      zone_id: regionsZoneId,
      nom: 'Saly',
      description: '',
    },
    {
      destination_id: 'e485cab3-7b01-42bf-812c-c084b1655ade',
      zone_id: regionsZoneId,
      nom: 'Joal',
      description: '',
    },
    {
      destination_id: 'ef4e4030-f4b1-467a-b181-008e777150d7',
      zone_id: regionsZoneId,
      nom: 'Bandia',
      description: '',
    },
    {
      destination_id: 'fb024a7b-5808-460b-a6df-a7d0b36eda9b',
      zone_id: regionsZoneId,
      nom: 'Fatick',
      description: '',
    },
  ];

  // Insérer les données
  const destinations = await Destination.insertMany(destinationsToSeed);

  // Ajouter le nom de la zone à chaque destination pour la réponse
  const destinationsWithZones = await Promise.all(
    destinations.map(async (destination) => {
      const destinationObj = destination.toObject();
      const zone = await Zone.findOne({ zone_id: destinationObj.zone_id });
      if (zone) {
        destinationObj.zone_name = zone.nom;
      }
      return destinationObj;
    })
  );

  res.status(201).json({
    message: `${destinations.length} destinations ont été ajoutées avec succès`,
    destinations: destinationsWithZones,
  });
});

module.exports = {
  getDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getDestinationsByZone,
  seedDestinations,
}; 
const Vehicule = require('../models/Vehicule');
const Depense = require('../models/Depense');
const Course = require('../models/Course');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Obtenir tous les véhicules
 * @route   GET /api/vehicules
 * @access  Privé
 */
const getVehicules = asyncHandler(async (req, res) => {
  const { query } = req;
  
  // Construction du filtre
  const filter = { statut: { $ne: 'supprimé' } };
  
  // Filtrer par état si spécifié
  if (query.etat) {
    filter.etat = query.etat;
  }
  
  // Filtrer par type de véhicule
  if (query.type) {
    filter.type = query.type;
  }
  
  // Filtrer par conducteur assigné
  if (query.conducteur) {
    filter.conducteurAssigne = query.conducteur;
  }

  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const vehicules = await Vehicule.find(filter)
    .populate('conducteurAssigne', 'nom prenom telephone email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Compter le nombre total pour la pagination
  const total = await Vehicule.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: vehicules.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: vehicules
  });
});

/**
 * @desc    Obtenir un véhicule par ID
 * @route   GET /api/vehicules/:id
 * @access  Privé
 */
const getVehiculeById = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id)
    .populate('conducteurAssigne', 'nom prenom telephone email photo');
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  res.status(200).json({
    success: true,
    data: vehicule
  });
});

/**
 * @desc    Créer un nouveau véhicule
 * @route   POST /api/vehicules
 * @access  Privé/Admin
 */
const createVehicule = asyncHandler(async (req, res) => {
  const { 
    marque, 
    modele, 
    immatriculation,
    annee,
    type,
    carburant,
    kilometrage,
    tarifJournalier 
  } = req.body;

  // Vérifier si l'immatriculation existe déjà
  const vehiculeExists = await Vehicule.findOne({ immatriculation });
  if (vehiculeExists) {
    res.status(400);
    throw new Error('Un véhicule avec cette immatriculation existe déjà');
  }

  const vehicule = await Vehicule.create({
    marque, 
    modele, 
    immatriculation,
    annee,
    type,
    carburant,
    kilometrage: kilometrage || 0,
    tarifJournalier,
    dateAcquisition: req.body.dateAcquisition || Date.now(),
    etat: req.body.etat || 'Disponible',
    photos: req.body.photos || [],
    documents: req.body.documents || []
  });

  if (vehicule) {
    res.status(201).json(vehicule);
  } else {
    res.status(400);
    throw new Error('Données de véhicule invalides');
  }
});

/**
 * @desc    Mettre à jour un véhicule
 * @route   PUT /api/vehicules/:id
 * @access  Privé/Admin
 */
const updateVehicule = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Vérifier que l'immatriculation n'est pas déjà utilisée par un autre véhicule
  if (req.body.immatriculation && req.body.immatriculation !== vehicule.immatriculation) {
    const existingVehicule = await Vehicule.findOne({ immatriculation: req.body.immatriculation });
    if (existingVehicule) {
      res.status(400);
      throw new Error('Cette immatriculation est déjà utilisée');
    }
  }

  // Mettre à jour
  Object.keys(req.body).forEach(key => {
    vehicule[key] = req.body[key];
  });

  const updatedVehicule = await vehicule.save();
  res.json(updatedVehicule);
});

/**
 * @desc    Supprimer un véhicule
 * @route   DELETE /api/vehicules/:id
 * @access  Privé/Admin
 */
const deleteVehicule = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Marquer comme supprimé plutôt que de supprimer physiquement
  vehicule.statut = 'supprimé';
  await vehicule.save();
  
  res.json({ message: 'Véhicule supprimé avec succès' });
});

/**
 * @desc    Mettre à jour l'état d'un véhicule
 * @route   PATCH /api/vehicules/:id/etat
 * @access  Privé
 */
const updateEtatVehicule = asyncHandler(async (req, res) => {
  const { etat } = req.body;
  
  if (!etat) {
    res.status(400);
    throw new Error('Veuillez fournir un état');
  }

  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  vehicule.etat = etat;
  await vehicule.save();

  res.status(200).json({
    success: true,
    data: vehicule
  });
});

/**
 * @desc    Assigner un conducteur à un véhicule
 * @route   POST /api/vehicules/:id/assignerConducteur
 * @access  Privé/Admin
 */
const assignerConducteur = asyncHandler(async (req, res) => {
  const { conducteurId } = req.body;
  
  if (!conducteurId) {
    res.status(400);
    throw new Error('Veuillez fournir un ID de conducteur');
  }

  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  vehicule.conducteurAssigne = conducteurId;
  await vehicule.save();

  // Récupérer les détails du conducteur pour la réponse
  const vehiculeMisAJour = await Vehicule.findById(req.params.id)
    .populate('conducteurAssigne', 'nom prenom telephone email');

  res.status(200).json({
    success: true,
    data: vehiculeMisAJour
  });
});

/**
 * @desc    Désassigner un conducteur d'un véhicule
 * @route   DELETE /api/vehicules/:id/designerConducteur
 * @access  Privé/Admin
 */
const desassignerConducteur = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  vehicule.conducteurAssigne = null;
  await vehicule.save();

  res.status(200).json({
    success: true,
    data: vehicule
  });
});

/**
 * @desc    Ajouter un document au véhicule
 * @route   POST /api/vehicules/:id/documents
 * @access  Privé/Admin
 */
const ajouterDocument = asyncHandler(async (req, res) => {
  const { type, fichier, dateExpiration, description } = req.body;
  
  if (!type || !fichier) {
    res.status(400);
    throw new Error('Veuillez fournir le type et le fichier du document');
  }

  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  vehicule.documents.push({
    type,
    fichier,
    dateExpiration: dateExpiration || null,
    description: description || '',
    dateCreation: new Date()
  });

  await vehicule.save();

  res.status(201).json({
    success: true,
    data: vehicule.documents[vehicule.documents.length - 1]
  });
});

/**
 * @desc    Supprimer un document du véhicule
 * @route   DELETE /api/vehicules/:id/documents/:documentId
 * @access  Privé/Admin
 */
const supprimerDocument = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Trouver l'index du document
  const documentIndex = vehicule.documents.findIndex(
    doc => doc._id.toString() === req.params.documentId
  );

  if (documentIndex === -1) {
    res.status(404);
    throw new Error('Document non trouvé');
  }

  // Supprimer le document
  vehicule.documents.splice(documentIndex, 1);
  await vehicule.save();

  res.status(200).json({
    success: true,
    message: 'Document supprimé avec succès'
  });
});

/**
 * @desc    Enregistrer une transaction de carburant
 * @route   POST /api/vehicules/:id/carburant
 * @access  Privé
 */
const ajouterConsommationCarburant = asyncHandler(async (req, res) => {
  const { date, quantite, prixUnitaire, station } = req.body;
  
  if (!quantite || !prixUnitaire) {
    res.status(400);
    throw new Error('Veuillez fournir la quantité et le prix unitaire');
  }

  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  const coutTotal = quantite * prixUnitaire;

  // Ajouter à l'historique de consommation
  vehicule.consommation.historique.push({
    date: date || new Date(),
    quantite,
    prixUnitaire,
    coutTotal,
    station: station || 'Non spécifiée'
  });

  // Mettre à jour la moyenne de consommation (exemple simplifié)
  // Dans un cas réel, on calculerait en fonction de la distance parcourue
  const totalQuantite = vehicule.consommation.historique.reduce((sum, item) => sum + item.quantite, 0);
  vehicule.consommation.moyenne = parseFloat((totalQuantite / vehicule.consommation.historique.length).toFixed(2));

  await vehicule.save();

  // Créer une dépense liée à ce plein de carburant
  await Depense.create({
    vehicule: vehicule._id,
    date: date || new Date(),
    type: 'Carburant',
    category: 'Carburant',
    description: `Plein de carburant - ${quantite}L - ${station || 'Non spécifiée'}`,
    montant: coutTotal,
    status: 'Validé',
    createdBy: req.user ? req.user._id : null
  });

  res.status(201).json({
    success: true,
    data: vehicule.consommation.historique[vehicule.consommation.historique.length - 1]
  });
});

/**
 * @desc    Ajouter une maintenance au véhicule
 * @route   POST /api/vehicules/:id/maintenance
 * @access  Privé/Admin
 */
const ajouterMaintenance = asyncHandler(async (req, res) => {
  const { 
    date, 
    type, 
    description, 
    coutTotal, 
    coutPieces,
    coutMainOeuvre,
    technicien, 
    garage,
    duree,
    kilometrage, 
    statut,
    priorite,
    pieces,
    rapport,
    facture
  } = req.body;
  
  if (!type) {
    res.status(400);
    throw new Error('Veuillez fournir le type de maintenance');
  }

  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Ajouter à l'historique de maintenance
  const nouvelleIntervention = {
    date: date || new Date(),
    type,
    description: description || '',
    coutTotal: coutTotal || 0,
    coutPieces: coutPieces || 0,
    coutMainOeuvre: coutMainOeuvre || 0,
    technicien: technicien || '',
    garage: garage || '',
    duree: duree || '',
    kilometrage: kilometrage || vehicule.kilometrage,
    statut: statut || 'Planifiée',
    priorite: priorite || 'moyenne',
    pieces: pieces || [],
    rapport: rapport || null,
    facture: facture || null
  };

  vehicule.maintenance.historique.push(nouvelleIntervention);

  // Si c'est une maintenance terminée et qu'il y a un coût
  if (statut === 'Terminée' && coutTotal > 0) {
    // Créer une dépense liée à cette maintenance
    await Depense.create({
      vehicule: vehicule._id,
      date: date || new Date(),
      type: 'Maintenance',
      category: type,
      description: description || `Maintenance - ${type}`,
      montant: coutTotal,
      status: 'Validé',
      createdBy: req.user ? req.user._id : null
    });
  }

  await vehicule.save();

  res.status(201).json({
    success: true,
    data: vehicule.maintenance.historique[vehicule.maintenance.historique.length - 1]
  });
});

/**
 * @desc    Planifier un entretien futur
 * @route   POST /api/vehicules/:id/planifierEntretien
 * @access  Privé/Admin
 */
const planifierEntretien = asyncHandler(async (req, res) => {
  const { date, kilometrage, type } = req.body;
  
  if (!type || (!date && !kilometrage)) {
    res.status(400);
    throw new Error('Veuillez fournir le type et soit la date soit le kilométrage');
  }

  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  vehicule.maintenance.prochainEntretien = {
    date: date || null,
    kilometrage: kilometrage || null,
    type
  };

  await vehicule.save();

  res.status(200).json({
    success: true,
    data: vehicule.maintenance.prochainEntretien
  });
});

/**
 * @desc    Obtenir des statistiques sur le véhicule
 * @route   GET /api/vehicules/:id/stats
 * @access  Privé
 */
const getVehiculeStats = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Calculer le total des dépenses pour ce véhicule
  const depenses = await Depense.find({ 
    vehicule: vehicule._id,
    status: 'Validé'
  });

  const totalDepenses = depenses.reduce((sum, dep) => sum + dep.montant, 0);

  // Statistiques par type de dépense
  const depensesParType = {};
  depenses.forEach(dep => {
    if (!depensesParType[dep.type]) {
      depensesParType[dep.type] = 0;
    }
    depensesParType[dep.type] += dep.montant;
  });

  // Statistiques pour les 30 derniers jours
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 30);
  
  const depenses30Jours = depenses.filter(dep => dep.date >= dateLimit);
  const totalDepenses30Jours = depenses30Jours.reduce((sum, dep) => sum + dep.montant, 0);

  res.status(200).json({
    success: true,
    data: {
      totalKilometres: vehicule.kilometrage || 0,
      nombreCourses: vehicule.nombreCourses || 0,
      tauxUtilisation: vehicule.tauxUtilisation || 0,
      disponibilite: vehicule.disponibilite || 0,
      consommationMoyenne: vehicule.consommation.moyenne || 0,
      totalDepenses,
      depensesParType,
      totalDepenses30Jours,
      statutDocuments: vehicule.statutDocuments || {
        valides: 0,
        expirantBientot: 0,
        expires: 0,
        total: vehicule.documents.length
      }
    }
  });
});

/**
 * @desc    Récupérer la liste des véhicules
 * @route   GET /api/vehicules
 * @access  Private/Admin
 */
const getVehiculesAdmin = asyncHandler(async (req, res) => {
  // Implémenter des filtres ici si nécessaire
  const vehicules = await Vehicule.find({ statut: { $ne: 'supprimé' } });
  res.json(vehicules);
});

/**
 * @desc    Récupérer un véhicule par son ID
 * @route   GET /api/vehicules/:id
 * @access  Private
 */
const getVehiculeByIdAdmin = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (vehicule) {
    res.json(vehicule);
  } else {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }
});

/**
 * @desc    Mettre un véhicule en maintenance
 * @route   POST /api/vehicules/:id/maintenance
 * @access  Private/Admin
 */
const mettreEnMaintenance = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  const { type, description, dateDebut, dateFinPrevue, cout } = req.body;

  // Mise à jour de l'état du véhicule
  vehicule.etat = 'En maintenance';
  
  // Ajout de l'intervention dans l'historique de maintenance
  vehicule.maintenance.historique.push({
    date: dateDebut || Date.now(),
    type: type || 'Maintenance',
    description: description || 'Intervention technique',
    coutTotal: cout || 0,
    technicien: req.body.technicien || '',
    kilometrage: vehicule.kilometrage,
    statut: 'En cours'
  });

  // Mise à jour du prochain entretien si spécifié
  if (req.body.prochainEntretien) {
    vehicule.maintenance.prochainEntretien = req.body.prochainEntretien;
  }

  const updatedVehicule = await vehicule.save();
  res.json(updatedVehicule);
});

/**
 * @desc    Obtenir les statistiques des véhicules
 * @route   GET /api/vehicules/stats
 * @access  Private/Admin
 */
const getStatistiques = asyncHandler(async (req, res) => {
  // Compter les véhicules par état
  const vehicules = await Vehicule.find({ statut: { $ne: 'supprimé' } });
  
  const total = vehicules.length;
  const disponibles = vehicules.filter(v => v.etat === 'Disponible').length;
  const enCourse = vehicules.filter(v => v.etat === 'En course').length;
  const enMaintenance = vehicules.filter(v => v.etat === 'En maintenance').length;
  const inactifs = vehicules.filter(v => v.etat === 'Inactif').length;
  
  // Calcul des taux
  const tauxDisponibilite = total > 0 ? Math.round((disponibles / total) * 100) : 0;
  const tauxUtilisation = total > 0 ? Math.round((enCourse / total) * 100) : 0;
  const tauxMaintenance = total > 0 ? Math.round(((total - enMaintenance) / total) * 100) : 0;
  
  // Calcul de l'état général de la flotte (basé sur les documents valides, l'état des véhicules, etc.)
  const etatGeneral = Math.round((tauxDisponibilite + tauxMaintenance) / 2);
  
  // Vérifier les documents prochainement expirés
  const aujourdhui = new Date();
  const documentsExpires = [];
  
  vehicules.forEach(vehicule => {
    vehicule.documents.forEach(doc => {
      if (doc.dateExpiration && new Date(doc.dateExpiration) < aujourdhui) {
        documentsExpires.push({
          vehiculeId: vehicule._id,
          vehicule: `${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})`,
          document: doc.type,
          dateExpiration: doc.dateExpiration
        });
      }
    });
  });
  
  // Calculer le kilométrage moyen
  const kilometrageMoyen = total > 0 
    ? Math.round(vehicules.reduce((sum, v) => sum + (v.kilometrage || 0), 0) / total)
    : 0;
  
  res.json({
    total,
    disponibles,
    enCourse,
    enMaintenance,
    inactifs,
    tauxDisponibilite,
    tauxUtilisation,
    tauxMaintenance,
    etatGeneral,
    documentsExpires,
    kilometrageMoyen
  });
});

/**
 * @desc    Récupérer l'historique de maintenance d'un véhicule
 * @route   GET /api/vehicules/:id/maintenance
 * @access  Privé/Admin
 */
const getHistoriqueMaintenance = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  res.status(200).json({
    success: true,
    data: vehicule.maintenance?.historique || []
  });
});

/**
 * @desc    Mettre à jour une maintenance
 * @route   PUT /api/vehicules/:id/maintenance/:maintenanceId
 * @access  Privé/Admin
 */
const updateMaintenance = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Trouver l'index de la maintenance
  const maintenanceIndex = vehicule.maintenance.historique.findIndex(
    m => m._id.toString() === req.params.maintenanceId
  );

  if (maintenanceIndex === -1) {
    res.status(404);
    throw new Error('Maintenance non trouvée');
  }

  // Mettre à jour les champs de la maintenance
  Object.keys(req.body).forEach(key => {
    vehicule.maintenance.historique[maintenanceIndex][key] = req.body[key];
  });

  await vehicule.save();

  res.status(200).json({
    success: true,
    data: vehicule.maintenance.historique[maintenanceIndex]
  });
});

/**
 * @desc    Supprimer une maintenance
 * @route   DELETE /api/vehicules/:id/maintenance/:maintenanceId
 * @access  Privé/Admin
 */
const deleteMaintenance = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Trouver l'index de la maintenance
  const maintenanceIndex = vehicule.maintenance.historique.findIndex(
    m => m._id.toString() === req.params.maintenanceId
  );

  if (maintenanceIndex === -1) {
    res.status(404);
    throw new Error('Maintenance non trouvée');
  }

  // Supprimer la maintenance
  vehicule.maintenance.historique.splice(maintenanceIndex, 1);
  await vehicule.save();

  res.status(200).json({
    success: true,
    message: 'Maintenance supprimée avec succès'
  });
});

/**
 * @desc    Récupérer l'historique des courses d'un véhicule
 * @route   GET /api/vehicules/:id/courses
 * @access  Privé
 */
const getHistoriqueCourses = asyncHandler(async (req, res) => {
  const vehicule = await Vehicule.findById(req.params.id);
  
  if (!vehicule) {
    res.status(404);
    throw new Error('Véhicule non trouvé');
  }

  // Construire les filtres
  const filter = { vehicule: vehicule._id };
  
  // Filtrer par date de début et fin si spécifiées
  if (req.query.dateDebut && req.query.dateFin) {
    filter.date = {
      $gte: new Date(req.query.dateDebut),
      $lte: new Date(req.query.dateFin)
    };
  }
  
  // Filtrer par statut
  if (req.query.statut) {
    filter.statut = req.query.statut;
  }
  
  // Pagination optionnelle
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const courses = await Course.find(filter)
    .populate('conducteur', 'nom prenom telephone photo')
    .populate('client', 'nom prenom telephone')
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 });

  // Compter le nombre total pour la pagination
  const total = await Course.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: courses.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: courses
  });
});

/**
 * @desc    Récupérer le véhicule assigné à un conducteur
 * @route   GET /api/vehicules/conducteur/:conducteurId
 * @access  Privé
 */
const getVehiculeByConducteur = asyncHandler(async (req, res) => {
  const conducteurId = req.params.conducteurId;
  
  if (!conducteurId) {
    res.status(400);
    throw new Error('ID du conducteur requis');
  }

  const vehicule = await Vehicule.findOne({ 
    conducteurAssigne: conducteurId,
    statut: { $ne: 'supprimé' }
  });
  
  if (!vehicule) {
    return res.status(200).json({
      success: true,
      message: 'Aucun véhicule assigné à ce conducteur',
      data: null
    });
  }

  res.status(200).json({
    success: true,
    data: vehicule
  });
});

module.exports = {
  getVehicules,
  getVehiculeById,
  createVehicule,
  updateVehicule,
  deleteVehicule,
  updateEtatVehicule,
  assignerConducteur,
  desassignerConducteur,
  ajouterDocument,
  supprimerDocument,
  ajouterConsommationCarburant,
  ajouterMaintenance,
  planifierEntretien,
  getVehiculeStats,
  getVehiculesAdmin,
  getVehiculeByIdAdmin,
  mettreEnMaintenance,
  getStatistiques,
  getHistoriqueMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getHistoriqueCourses,
  getVehiculeByConducteur
}; 
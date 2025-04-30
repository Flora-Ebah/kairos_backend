const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const UserAdmin = require('../models/UserAdmin');
const UserConducteur = require('../models/UserConducteur');
const UserClient = require('../models/UserClient');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Reservation = require('../models/Reservation');
const mongoose = require('mongoose');

/**
 * @desc    Authentifier un utilisateur
 * @route   POST /api/users/login
 * @access  Public
 */
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Vérifier si l'email et le mot de passe sont fournis
  if (!email || !password) {
    res.status(400);
    throw new Error('Veuillez fournir un email et un mot de passe');
  }

  // Essayer de trouver l'utilisateur dans les différents modèles
  let user = null;
  
  // Vérifier d'abord dans User (pour compatibilité)
  user = await User.findOne({ email }).select('+password');
  
  // Si non trouvé, vérifier dans les modèles spécifiques
  if (!user) {
    const adminUser = await UserAdmin.findOne({ email }).select('+password');
    if (adminUser) user = adminUser;
  }
  
  if (!user) {
    const conducteurUser = await UserConducteur.findOne({ email }).select('+password');
    if (conducteurUser) user = conducteurUser;
  }
  
  if (!user) {
    const clientUser = await UserClient.findOne({ email }).select('+password');
    if (clientUser) user = clientUser;
  }

  // Vérifier si l'utilisateur existe et si le mot de passe correspond
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }

  // Vérifier si l'utilisateur est actif
  if (!user.isActive) {
    res.status(401);
    throw new Error('Votre compte est inactif. Veuillez contacter un administrateur.');
  }

  // Mettre à jour la dernière connexion
  user.lastLogin = Date.now();
  await user.save();

  // Générer un token JWT
  const token = user.getSignedJwtToken();

  // Envoyer la réponse
  res.json({
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    photo: user.photo,
    token
  });
});

/**
 * @desc    Enregistrer un nouvel utilisateur client
 * @route   POST /api/users/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { nom, prenom, email, telephone, password } = req.body;

  // Vérifier si tous les champs requis sont fournis
  if (!nom || !prenom || !email || !telephone || !password) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs obligatoires');
  }

  // Vérifier si l'utilisateur existe déjà (dans n'importe quel modèle)
  const userExists = await User.findOne({ $or: [{ email }, { telephone }] });
  const clientExists = await UserClient.findOne({ $or: [{ email }, { telephone }] });
  
  if (userExists || clientExists) {
    res.status(400);
    throw new Error('Un utilisateur avec cet email ou ce numéro de téléphone existe déjà');
  }

  // Créer l'utilisateur de base pour compatibilité
  const baseUser = await User.create({
    nom,
    prenom,
    email,
    telephone,
    password,
    role: 'client',
    userType: 'UserClient'
  });

  // Créer l'utilisateur client
  const user = await UserClient.create({
    nom,
    prenom,
    email,
    telephone,
    password,
    parrainage: {
      code: '',
      nombreParrainages: 0
    }
  });

  // Générer un code de parrainage basé sur l'ID
  if (user) {
    user.parrainage.code = user._id.toString().substring(0, 6).toUpperCase();
    await user.save();
  }

  // Vérifier si le code de parrainage est fourni
  if (req.body.codeParrainage) {
    const parrain = await UserClient.findOne({ 'parrainage.code': req.body.codeParrainage });
    if (parrain) {
      user.parrainage.parrainPar = parrain._id;
      await user.save();

      // Incrémenter le nombre de parrainages du parrain
      parrain.parrainage.nombreParrainages += 1;
      await parrain.save();
    }
  }

  // Si l'utilisateur a été créé avec succès, générer un token
  if (user) {
    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    await user.save();

    // Envoyer un email de vérification (à implémenter)
    // sendVerificationEmail(user.email, verificationToken);

    // Générer un token JWT
    const token = user.getSignedJwtToken();

    res.status(201).json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      token
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

/**
 * @desc    Créer un nouvel utilisateur (admin ou conducteur)
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { nom, prenom, email, telephone, password, role, ...additionalData } = req.body;

  // Vérifier si tous les champs requis sont fournis
  if (!nom || !prenom || !email || !telephone || !password || !role) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs obligatoires');
  }

  // Vérifier si l'utilisateur existe déjà
  const userExists = await User.findOne({ $or: [{ email }, { telephone }] });
  const adminExists = await UserAdmin.findOne({ $or: [{ email }, { telephone }] });
  const conducteurExists = await UserConducteur.findOne({ $or: [{ email }, { telephone }] });
  
  if (userExists || adminExists || conducteurExists) {
    res.status(400);
    throw new Error('Un utilisateur avec cet email ou ce numéro de téléphone existe déjà');
  }

  // Créer l'utilisateur de base (pour compatibilité)
  let baseUser;
  let user;

  // Créer l'utilisateur en fonction du rôle
  if (role === 'admin' || role === 'super-admin') {
    // Vérifier que l'utilisateur courant est un super-admin
    if (req.user.role !== 'super-admin' && role === 'super-admin') {
      res.status(403);
      throw new Error('Seul un super-admin peut créer un autre super-admin');
    }

    // Créer dans User pour compatibilité
    baseUser = await User.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      role,
      userType: 'UserAdmin'
    });

    const { departement, poste, permissions, niveau } = additionalData;
    user = await UserAdmin.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      departement,
      poste,
      permissions,
      niveau: role === 'super-admin' ? 'super-admin' : 'admin',
      createdBy: req.user._id
    });
  } else if (role === 'conducteur') {
    const {
      numeroPermis,
      typePermis,
      dateDelivrancePermis,
      dateExpirationPermis,
      cin,
      dateNaissance,
      lieuNaissance,
      experience
    } = additionalData;

    // Vérifier si les champs spécifiques au conducteur sont fournis
    if (!numeroPermis || !typePermis || !dateDelivrancePermis || !dateExpirationPermis || !cin || !dateNaissance) {
      res.status(400);
      throw new Error('Veuillez fournir toutes les informations requises pour le conducteur');
    }

    // Créer dans User pour compatibilité
    baseUser = await User.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      role,
      userType: 'UserConducteur'
    });

    user = await UserConducteur.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      numeroPermis,
      typePermis,
      dateDelivrancePermis,
      dateExpirationPermis,
      cin,
      dateNaissance,
      lieuNaissance,
      experience: experience || 0,
      createdBy: req.user._id
    });
  } else {
    res.status(400);
    throw new Error('Rôle non valide. Utilisez la route de register pour créer un client.');
  }

  if (user) {
    res.status(201).json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } else {
    // Si échec dans la création du modèle spécifique, supprimer l'utilisateur de base
    if (baseUser) {
      await User.findByIdAndDelete(baseUser._id);
    }
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

/**
 * @desc    Obtenir tous les utilisateurs
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  // Filtres
  let query = {};

  // Filtrer par rôle si spécifié
  if (req.query.role) {
    query.role = req.query.role;
  }

  // Filtrer par statut si spécifié
  if (req.query.isActive) {
    query.isActive = req.query.isActive === 'true';
  }

  // Recherche par nom, prénom ou email
  if (req.query.search) {
    query.$or = [
      { nom: { $regex: req.query.search, $options: 'i' } },
      { prenom: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { telephone: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Exécuter la requête
  const users = await User.find(query)
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Compter le nombre total d'utilisateurs
  const total = await User.countDocuments(query);

  res.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
});

/**
 * @desc    Obtenir les détails d'un utilisateur
 * @route   GET /api/users/:id
 * @access  Private (admin ou l'utilisateur lui-même)
 */
const getUserById = asyncHandler(async (req, res) => {
  // Trouver l'utilisateur par ID
  const user = await User.findById(req.params.id);

  if (user) {
    // Si l'utilisateur n'est pas admin et n'est pas l'utilisateur demandé
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user._id.toString() !== req.params.id) {
      res.status(403);
      throw new Error('Vous n\'avez pas l\'autorisation de consulter ce profil');
    }

    res.json(user);
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

/**
 * @desc    Mettre à jour un utilisateur
 * @route   PUT /api/users/:id
 * @access  Private (admin ou l'utilisateur lui-même)
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // Si l'utilisateur n'est pas admin et n'est pas l'utilisateur à mettre à jour
  if (req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user._id.toString() !== req.params.id) {
    res.status(403);
    throw new Error('Vous n\'avez pas l\'autorisation de modifier ce profil');
  }

  // Vérifier si l'email ou le téléphone a changé, et si oui, vérifier qu'il n'existe pas déjà
  if ((req.body.email && req.body.email !== user.email) || (req.body.telephone && req.body.telephone !== user.telephone)) {
    const userExistsQuery = { $or: [] };
    
    if (req.body.email && req.body.email !== user.email) {
      userExistsQuery.$or.push({ email: req.body.email });
    }
    
    if (req.body.telephone && req.body.telephone !== user.telephone) {
      userExistsQuery.$or.push({ telephone: req.body.telephone });
    }
    
    const userExists = await User.findOne({
      ...userExistsQuery,
      _id: { $ne: user._id }
    });
    
    if (userExists) {
      res.status(400);
      throw new Error('Un utilisateur avec cet email ou ce numéro de téléphone existe déjà');
    }
  }

  // Mettre à jour les champs de base
  user.nom = req.body.nom || user.nom;
  user.prenom = req.body.prenom || user.prenom;
  user.email = req.body.email || user.email;
  user.telephone = req.body.telephone || user.telephone;
  
  // Mettre à jour l'adresse
  if (req.body.adresse) {
    user.adresse = { ...user.adresse, ...req.body.adresse };
  }
  
  // Mettre à jour la photo
  if (req.body.photo) {
    user.photo = req.body.photo;
  }

  // Si l'utilisateur est un admin et qu'il tente de changer son rôle
  if (req.body.role && req.user.role !== 'super-admin') {
    res.status(403);
    throw new Error('Seul un super-admin peut changer le rôle d\'un utilisateur');
  }

  // Mettre à jour le rôle (uniquement pour les super-admins)
  if (req.body.role && req.user.role === 'super-admin') {
    user.role = req.body.role;
  }

  // Mettre à jour les champs spécifiques au type d'utilisateur
  if (user.userType === 'UserAdmin' && req.body.userTypeData) {
    const admin = await UserAdmin.findById(user._id);
    admin.departement = req.body.userTypeData.departement || admin.departement;
    admin.poste = req.body.userTypeData.poste || admin.poste;
    
    // Seul un super-admin peut modifier les permissions
    if (req.body.userTypeData.permissions && req.user.role === 'super-admin') {
      admin.permissions = req.body.userTypeData.permissions;
    }
    
    await admin.save();
  } else if (user.userType === 'UserConducteur' && req.body.userTypeData) {
    const conducteur = await UserConducteur.findById(user._id);
    
    // Mettre à jour les champs spécifiques au conducteur
    Object.keys(req.body.userTypeData).forEach(key => {
      if (key in conducteur) {
        conducteur[key] = req.body.userTypeData[key];
      }
    });
    
    await conducteur.save();
  } else if (user.userType === 'UserClient' && req.body.userTypeData) {
    const client = await UserClient.findById(user._id);
    
    // Mettre à jour les champs spécifiques au client
    if (req.body.userTypeData.entreprise) {
      client.entreprise = { ...client.entreprise, ...req.body.userTypeData.entreprise };
    }
    
    if (req.body.userTypeData.preferences) {
      client.preferences = { ...client.preferences, ...req.body.userTypeData.preferences };
    }
    
    await client.save();
  }

  // Mettre à jour le mot de passe si fourni
  if (req.body.password) {
    user.password = req.body.password;
  }

  // Sauvegarder les changements
  await user.save();

  // Envoyer la réponse sans le mot de passe
  res.json({
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    role: user.role,
    adresse: user.adresse,
    photo: user.photo,
    isActive: user.isActive,
    updatedAt: user.updatedAt
  });
});

/**
 * @desc    Supprimer un utilisateur
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // Empêcher la suppression des super-admins par les admins
  if (user.role === 'super-admin' && req.user.role !== 'super-admin') {
    res.status(403);
    throw new Error('Seul un super-admin peut supprimer un autre super-admin');
  }

  // Pour les clients et conducteurs, ne pas supprimer physiquement mais désactiver
  if (user.role === 'client' || user.role === 'conducteur') {
    user.isActive = false;
    await user.save();

    res.json({ message: 'Utilisateur désactivé avec succès' });
  } else {
    // Pour les admins, on peut les supprimer complètement
    await user.deleteOne();

    res.json({ message: 'Utilisateur supprimé avec succès' });
  }
});

/**
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // Mettre à jour les champs de base
  user.nom = req.body.nom || user.nom;
  user.prenom = req.body.prenom || user.prenom;
  
  // Vérifier si l'email ou le téléphone a changé, et si oui, vérifier qu'il n'existe pas déjà
  if (req.body.email && req.body.email !== user.email) {
    const userExists = await User.findOne({ email: req.body.email, _id: { $ne: user._id } });
    if (userExists) {
      res.status(400);
      throw new Error('Un utilisateur avec cet email existe déjà');
    }
    user.email = req.body.email;
  }
  
  if (req.body.telephone && req.body.telephone !== user.telephone) {
    const userExists = await User.findOne({ telephone: req.body.telephone, _id: { $ne: user._id } });
    if (userExists) {
      res.status(400);
      throw new Error('Un utilisateur avec ce numéro de téléphone existe déjà');
    }
    user.telephone = req.body.telephone;
  }
  
  // Mettre à jour l'adresse
  if (req.body.adresse) {
    user.adresse = { ...user.adresse, ...req.body.adresse };
  }
  
  // Mettre à jour la photo
  if (req.body.photo) {
    user.photo = req.body.photo;
  }

  // Mettre à jour le mot de passe si fourni
  if (req.body.password) {
    user.password = req.body.password;
  }

  // Sauvegarder les changements
  await user.save();

  // Si l'utilisateur est un client, mettre à jour les préférences
  if (user.userType === 'UserClient' && req.body.preferences) {
    const client = await UserClient.findById(user._id);
    client.preferences = { ...client.preferences, ...req.body.preferences };
    
    if (req.body.adressesFavorites) {
      // Ajouter ou mettre à jour des adresses favorites
      req.body.adressesFavorites.forEach(adresse => {
        const existingIndex = client.adressesFavorites.findIndex(a => a._id.toString() === adresse._id);
        
        if (existingIndex >= 0) {
          client.adressesFavorites[existingIndex] = { 
            ...client.adressesFavorites[existingIndex], 
            ...adresse 
          };
        } else {
          client.adressesFavorites.push(adresse);
        }
      });
    }
    
    await client.save();
  }

  // Générer un nouveau token
  const token = user.getSignedJwtToken();

  res.json({
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    role: user.role,
    adresse: user.adresse,
    photo: user.photo,
    token
  });
});

/**
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  let userDetails = {
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    role: user.role,
    adresse: user.adresse,
    photo: user.photo,
    createdAt: user.createdAt
  };

  // Ajouter des informations spécifiques selon le type d'utilisateur
  if (user.userType === 'UserClient') {
    const client = await UserClient.findById(user._id);
    userDetails = {
      ...userDetails,
      preferences: client.preferences,
      adressesFavorites: client.adressesFavorites,
      parrainage: client.parrainage,
      fidelite: client.fidelite,
      entreprise: client.entreprise,
      nombreReservations: client.nombreReservations
    };
  } else if (user.userType === 'UserConducteur') {
    const conducteur = await UserConducteur.findById(user._id);
    userDetails = {
      ...userDetails,
      numeroPermis: conducteur.numeroPermis,
      typePermis: conducteur.typePermis,
      situation: conducteur.situation,
      vehiculeAssigne: conducteur.vehiculeAssigne,
      nombreCourses: conducteur.nombreCourses,
      noteGlobale: conducteur.noteGlobale
    };
  } else if (user.userType === 'UserAdmin') {
    const admin = await UserAdmin.findById(user._id);
    userDetails = {
      ...userDetails,
      departement: admin.departement,
      poste: admin.poste,
      permissions: admin.permissions,
      niveau: admin.niveau
    };
  }

  res.json(userDetails);
});

/**
 * @desc    Demander une réinitialisation de mot de passe
 * @route   POST /api/users/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Veuillez fournir un email');
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('Aucun utilisateur trouvé avec cet email');
  }

  // Générer un token de réinitialisation
  const resetToken = user.getResetPasswordToken();
  await user.save();

  // Créer l'URL de réinitialisation
  const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;

  // Envoyer un email (à implémenter)
  // await sendEmail({
  //   email: user.email,
  //   subject: 'Réinitialisation de mot de passe',
  //   message: `Vous recevez cet email car vous avez demandé une réinitialisation de mot de passe. Veuillez cliquer sur le lien suivant: \n\n ${resetUrl}`
  // });

  res.json({ message: 'Email envoyé' });
});

/**
 * @desc    Réinitialiser le mot de passe
 * @route   PUT /api/users/reset-password/:resetToken
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  // Obtenir le token depuis l'URL et le hasher
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  // Trouver l'utilisateur par le token
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Token invalide ou expiré');
  }

  // Définir le nouveau mot de passe
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Générer un token JWT
  const token = user.getSignedJwtToken();

  res.json({
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    token
  });
});

/**
 * @desc    Récupérer la liste des conducteurs
 * @route   GET /api/users/conducteurs
 * @access  Private/Admin
 */
const getAllConducteurs = asyncHandler(async (req, res) => {
  const { query } = req;
  
  // Construction du filtre
  const filter = { isActive: true };
  
  // Filtrer par statut si spécifié
  if (query.statut) {
    filter.statut = query.statut;
  }
  
  // Filtrer par recherche si spécifié
  if (query.search) {
    filter.$or = [
      { nom: { $regex: query.search, $options: 'i' } },
      { prenom: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { telephone: { $regex: query.search, $options: 'i' } }
    ];
  }
  
  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;
  const skip = (page - 1) * limit;

  // Récupérer les conducteurs
  const conducteurs = await UserConducteur.find(filter)
    .populate('vehiculeAssigne', 'marque modele immatriculation')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Compter le nombre total pour la pagination
  const total = await UserConducteur.countDocuments(filter);

  // Transformer les conducteurs pour avoir une structure cohérente
  const conducteursList = conducteurs.map(conducteur => ({
    _id: conducteur._id,
    nom: conducteur.nom,
    prenom: conducteur.prenom,
    email: conducteur.email,
    telephone: conducteur.telephone,
    photo: conducteur.photo,
    statut: conducteur.statut,
    noteGlobale: conducteur.noteGlobale || 0,
    nombreCourses: conducteur.nombreCourses || 0,
    vehiculeAssigne: conducteur.vehiculeAssigne,
    createdAt: conducteur.createdAt
  }));

  res.status(200).json({
    success: true,
    count: conducteurs.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: conducteursList
  });
});

/**
 * @desc    Obtenir les statistiques des conducteurs
 * @route   GET /api/users/conducteurs/stats
 * @access  Private/Admin
 */
const getConducteursStats = asyncHandler(async (req, res) => {
  // Récupérer tous les conducteurs
  const conducteurs = await UserConducteur.find({ isActive: true })
    .populate('vehiculeAssigne', 'marque modele immatriculation');
  
  // Calculer les statistiques
  const total = conducteurs.length;
  const actifs = conducteurs.filter(c => c.statut === 'actif').length;
  const vehiculesAssignes = conducteurs.filter(c => c.vehiculeAssigne).length;
  
  // Calculer la note moyenne
  let notesMoyenne = 0;
  if (total > 0) {
    const sommeNotes = conducteurs.reduce((sum, c) => sum + (c.noteGlobale || 0), 0);
    notesMoyenne = parseFloat((sommeNotes / total).toFixed(1));
  }
  
  // Calculer le nombre total de courses
  const coursesTotal = conducteurs.reduce((sum, c) => sum + (c.nombreCourses || 0), 0);
  
  // Obtenir les conducteurs les mieux notés
  const meilleursConducteurs = [...conducteurs]
    .filter(c => c.noteGlobale > 0)
    .sort((a, b) => b.noteGlobale - a.noteGlobale)
    .slice(0, 5)
    .map(c => ({
      _id: c._id,
      nom: c.prenom + ' ' + c.nom,
      note: c.noteGlobale,
      nombreCourses: c.nombreCourses,
      vehicule: c.vehiculeAssigne ? 
        `${c.vehiculeAssigne.marque} ${c.vehiculeAssigne.modele}` : 
        'Non assigné'
    }));
  
  // Obtenir les conducteurs les plus actifs
  const conducteursActifs = [...conducteurs]
    .sort((a, b) => b.nombreCourses - a.nombreCourses)
    .slice(0, 5)
    .map(c => ({
      _id: c._id,
      nom: c.prenom + ' ' + c.nom,
      nombreCourses: c.nombreCourses,
      vehicule: c.vehiculeAssigne ? 
        `${c.vehiculeAssigne.marque} ${c.vehiculeAssigne.modele}` : 
        'Non assigné'
    }));
  
  // Obtenir les alertes (permis expirant bientôt, etc.)
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  const alertes = conducteurs
    .filter(c => {
      // Vérifier si le permis expire dans le mois à venir
      return c.dateExpirationPermis && c.dateExpirationPermis > today && c.dateExpirationPermis < nextMonth;
    })
    .map(c => ({
      _id: c._id,
      nom: c.prenom + ' ' + c.nom,
      type: 'Permis',
      message: `Le permis expire le ${new Date(c.dateExpirationPermis).toLocaleDateString()}`,
      date: c.dateExpirationPermis
    }));
  
  res.status(200).json({
    success: true,
    data: {
      total,
      actifs,
      notesMoyenne,
      vehiculesAssignes,
      coursesTotal,
      meilleursConducteurs,
      conducteursActifs,
      alertes
    }
  });
});

/**
 * @desc    Obtenir les détails complets d'un conducteur
 * @route   GET /api/users/conducteurs/:id
 * @access  Private/Admin
 */
const getConducteurDetails = asyncHandler(async (req, res) => {
  const conducteur = await UserConducteur.findById(req.params.id)
    .populate('vehiculeAssigne', 'marque modele immatriculation etat kilometrage');
  
  if (!conducteur) {
    res.status(404);
    throw new Error('Conducteur non trouvé');
  }
  
  // Récupérer les dernières courses du conducteur
  const Course = require('../models/Course');
  const dernieresCourses = await Course.find({ conducteur: conducteur._id })
    .sort({ date: -1 })
    .limit(5)
    .populate('vehicule', 'marque modele immatriculation')
    .populate('client', 'nom prenom telephone');
  
  // Calculer les statistiques du conducteur
  const statsPerformance = {
    coursesTerminees: conducteur.nombreCourses || 0,
    noteGlobale: conducteur.noteGlobale || 0,
    experience: conducteur.experience || 0,
    situationActuelle: conducteur.situation || 'Disponible',
    statut: conducteur.statut || 'actif',
    dateDerniereCourse: dernieresCourses.length > 0 ? dernieresCourses[0].date : null
  };
  
  // Construire le profil complet
  const profilComplet = {
    _id: conducteur._id,
    nom: conducteur.nom,
    prenom: conducteur.prenom,
    nomComplet: conducteur.prenom + ' ' + conducteur.nom,
    email: conducteur.email,
    telephone: conducteur.telephone,
    photo: conducteur.photo,
    adresse: conducteur.adresse,
    dateNaissance: conducteur.dateNaissance,
    age: conducteur.age,
    numeroPermis: conducteur.numeroPermis,
    typePermis: conducteur.typePermis,
    dateDelivrancePermis: conducteur.dateDelivrancePermis,
    dateExpirationPermis: conducteur.dateExpirationPermis,
    permisExpire: conducteur.permisExpire,
    cin: conducteur.cin,
    experience: conducteur.experience,
    languesParlees: conducteur.languesParlees,
    createdAt: conducteur.createdAt,
    vehiculeAssigne: conducteur.vehiculeAssigne,
    performance: statsPerformance,
    dernieresCourses: dernieresCourses.map(course => ({
      _id: course._id,
      reference: course.reference,
      date: course.date,
      depart: course.depart?.adresse || 'Non spécifié',
      arrivee: course.arrivee?.adresse || 'Non spécifié',
      distance: course.distance || 0,
      duree: course.duree || 0,
      statut: course.statut,
      montant: course.paiement?.montant || 0,
      client: course.client ? `${course.client.prenom} ${course.client.nom}` : 'Client non spécifié'
    })),
    alertes: conducteur.alertes || []
  };
  
  res.status(200).json({
    success: true,
    data: profilComplet
  });
});

/**
 * @desc    Ajouter un document à un conducteur
 * @route   POST /api/users/conducteurs/:id/documents
 * @access  Private/Admin
 */
const addConducteurDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentType, expirationDate } = req.body;
  const file = req.file;

  // Vérifier si le conducteur existe
  const conducteur = await User.findOne({ _id: id, role: 'conducteur' });
  
  if (!conducteur) {
    return res.status(404).json({
      success: false,
      message: 'Conducteur non trouvé'
    });
  }

  // Vérifier le type de document
  const documentTypes = ['permis', 'carte_identite', 'assurance', 'certificat_medical', 'casier_judiciaire'];
  if (!documentTypes.includes(documentType)) {
    return res.status(400).json({
      success: false,
      message: 'Type de document invalide'
    });
  }

  // Vérifier si le fichier a été téléchargé
  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'Aucun fichier téléchargé'
    });
  }

  // Générer un nom de fichier unique
  const fileName = `${documentType}_${conducteur._id}_${Date.now()}${path.extname(file.originalname)}`;
  const filePath = `uploads/documents/${fileName}`;

  try {
    // Enregistrer le fichier
    await fs.promises.writeFile(filePath, file.buffer);

    // Mettre à jour le document du conducteur
    const documentIndex = conducteur.documents.findIndex(doc => doc.type === documentType);
    
    if (documentIndex !== -1) {
      // Supprimer l'ancien fichier si existant
      if (conducteur.documents[documentIndex].filePath) {
        try {
          await fs.promises.unlink(conducteur.documents[documentIndex].filePath);
        } catch (error) {
          console.error(`Erreur lors de la suppression du fichier précédent: ${error.message}`);
        }
      }
      
      // Mettre à jour le document existant
      conducteur.documents[documentIndex].filePath = filePath;
      conducteur.documents[documentIndex].fileName = fileName;
      conducteur.documents[documentIndex].expirationDate = expirationDate;
      conducteur.documents[documentIndex].isValid = expirationDate ? new Date(expirationDate) > new Date() : true;
      conducteur.documents[documentIndex].isValidated = false;
    } else {
      // Ajouter un nouveau document
      conducteur.documents.push({
        type: documentType,
        filePath,
        fileName,
        expirationDate,
        isValid: expirationDate ? new Date(expirationDate) > new Date() : true,
        isValidated: false
      });
    }

    // Ajouter à l'historique
    conducteur.documentsHistory.push({
      action: 'add',
      documentType,
      date: new Date(),
      user: req.user._id
    });

    await conducteur.save();

    res.status(201).json({
      success: true,
      message: 'Document ajouté avec succès',
      document: conducteur.documents.find(doc => doc.type === documentType)
    });
  } catch (error) {
    console.error(`Erreur lors de l'ajout du document: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'ajout du document: ${error.message}`
    });
  }
});

/**
 * @desc    Valider un document de conducteur
 * @route   PUT /api/users/conducteurs/:id/documents/:documentType/validate
 * @access  Private/Admin
 */
const validateConducteurDocument = asyncHandler(async (req, res) => {
  const { id, documentType } = req.params;

  // Vérifier si le conducteur existe
  const conducteur = await User.findOne({ _id: id, role: 'conducteur' });
  
  if (!conducteur) {
    return res.status(404).json({
      success: false,
      message: 'Conducteur non trouvé'
    });
  }

  // Vérifier si le document existe
  const documentIndex = conducteur.documents.findIndex(doc => doc.type === documentType);
  
  if (documentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Document non trouvé'
    });
  }

  // Mettre à jour le statut de validation
  conducteur.documents[documentIndex].isValidated = true;
  
  // Ajouter à l'historique
  conducteur.documentsHistory.push({
    action: 'validate',
    documentType,
    date: new Date(),
    user: req.user._id
  });

  await conducteur.save();

  res.status(200).json({
    success: true,
    message: 'Document validé avec succès',
    document: conducteur.documents[documentIndex]
  });
});

/**
 * @desc    Supprimer un document de conducteur
 * @route   DELETE /api/users/conducteurs/:id/documents/:documentType
 * @access  Private/Admin
 */
const deleteConducteurDocument = asyncHandler(async (req, res) => {
  const { id, documentType } = req.params;

  // Vérifier si le conducteur existe
  const conducteur = await User.findOne({ _id: id, role: 'conducteur' });
  
  if (!conducteur) {
    return res.status(404).json({
      success: false,
      message: 'Conducteur non trouvé'
    });
  }

  // Vérifier si le document existe
  const documentIndex = conducteur.documents.findIndex(doc => doc.type === documentType);
  
  if (documentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Document non trouvé'
    });
  }

  const filePath = conducteur.documents[documentIndex].filePath;

  // Supprimer le document de la liste
  conducteur.documents.splice(documentIndex, 1);
  
  // Ajouter à l'historique
  conducteur.documentsHistory.push({
    action: 'delete',
    documentType,
    date: new Date(),
    user: req.user._id
  });

  await conducteur.save();

  // Essayer de supprimer le fichier physique
  if (filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier: ${error.message}`);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Document supprimé avec succès'
  });
});

/**
 * @desc    Récupérer tous les documents d'un conducteur
 * @route   GET /api/users/conducteurs/:id/documents
 * @access  Private/Admin
 */
const getConducteurDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Vérifier si le conducteur existe
  const conducteur = await User.findOne({ _id: id, role: 'conducteur' })
    .populate({
      path: 'documentsHistory.user',
      select: 'firstName lastName'
    });
  
  if (!conducteur) {
    return res.status(404).json({
      success: false,
      message: 'Conducteur non trouvé'
    });
  }

  // Calculer les statistiques des documents
  const totalDocuments = conducteur.documents.length;
  const validDocuments = conducteur.documents.filter(doc => doc.isValid && doc.isValidated).length;
  const pendingDocuments = conducteur.documents.filter(doc => !doc.isValidated).length;
  const expiredDocuments = conducteur.documents.filter(doc => !doc.isValid && doc.isValidated).length;
  
  // Liste des documents requis
  const requiredDocuments = ['permis', 'carte_identite', 'assurance', 'certificat_medical', 'casier_judiciaire'];
  const missingDocuments = requiredDocuments.filter(type => 
    !conducteur.documents.some(doc => doc.type === type)
  ).length;

  res.status(200).json({
    success: true,
    documents: conducteur.documents,
    history: conducteur.documentsHistory,
    stats: {
      total: totalDocuments,
      valid: validDocuments,
      pending: pendingDocuments,
      expired: expiredDocuments,
      missing: missingDocuments
    }
  });
});

/**
 * @desc    Récupérer le profil du conducteur connecté
 * @route   GET /api/users/conducteur/me
 * @access  Private (conducteur)
 */
const getConducteurProfile = asyncHandler(async (req, res) => {
  try {
    // Vérifier que l'utilisateur est bien un conducteur
    if (req.user.role !== 'conducteur') {
      res.status(403);
      throw new Error('Accès non autorisé. Cette ressource est réservée aux conducteurs.');
    }

    console.log(`Recherche du conducteur avec ID: ${req.user.id}`);
    
    // Essayer de trouver l'utilisateur dans le modèle conducteur
    let conducteur = await UserConducteur.findById(req.user.id)
      .populate({
        path: 'vehiculeAssigne',
        select: 'marque modele immatriculation type image statut'
      });

    // Si le conducteur n'est pas trouvé directement avec l'ID, chercher par email
    if (!conducteur) {
      console.log(`Conducteur non trouvé directement avec ID ${req.user.id}, tentative avec email: ${req.user.email}`);
      conducteur = await UserConducteur.findOne({ email: req.user.email })
        .populate({
          path: 'vehiculeAssigne',
          select: 'marque modele immatriculation type image statut'
        });
    }

    // Fallback: Utiliser le modèle User standard si toujours pas trouvé
    if (!conducteur) {
      console.log(`Toujours pas de conducteur trouvé, tentative de création d'un objet conducteur à partir des informations de base`);
      
      // Utiliser les informations de l'utilisateur de base comme fallback
      conducteur = {
        _id: req.user.id,
        nom: req.user.nom || 'Utilisateur',
        prenom: req.user.prenom || 'Conducteur',
        email: req.user.email,
        telephone: req.user.telephone || '',
        photo: req.user.photo || 'default.jpg',
        vehiculeAssigne: null,
        documents: [],
        role: 'conducteur'
      };
    } else {
      console.log(`Conducteur trouvé: ${conducteur.nom} ${conducteur.prenom}`);
    }

    // Initialiser les tableaux pour gérer les cas où ils n'existent pas
    const reservationsRecentes = [];
    const reservationsTerminees = [];
    const reservationsEnCours = [];
    const reservationsConfirmees = [];

    try {
      // Récupérer les réservations récentes si la collection Reservation existe
      if (mongoose.connection.collections['reservations']) {
        const recentesQuery = { 
          conducteur: conducteur._id, 
          statut: { $in: ['confirmee', 'en_cours', 'terminee'] } 
        };
        
        const reservationsRecentesData = await Reservation.find(recentesQuery)
          .sort({ dateDebut: -1 })
          .limit(5)
          .populate('client', 'nom prenom email telephone')
          .populate('vehicule', 'marque modele immatriculation type');
          
        if (reservationsRecentesData && reservationsRecentesData.length > 0) {
          reservationsRecentes.push(...reservationsRecentesData);
        }

        // Récupérer les statistiques du conducteur
        const termineesQuery = { conducteur: conducteur._id, statut: 'terminee' };
        const termineesData = await Reservation.find(termineesQuery);
        if (termineesData && termineesData.length > 0) {
          reservationsTerminees.push(...termineesData);
        }

        const enCoursQuery = { conducteur: conducteur._id, statut: 'en_cours' };
        const enCoursData = await Reservation.find(enCoursQuery);
        if (enCoursData && enCoursData.length > 0) {
          reservationsEnCours.push(...enCoursData);
        }

        const confirmeesQuery = { conducteur: conducteur._id, statut: 'confirmee' };
        const confirmeesData = await Reservation.find(confirmeesQuery);
        if (confirmeesData && confirmeesData.length > 0) {
          reservationsConfirmees.push(...confirmeesData);
        }
      }
    } catch (reservationError) {
      console.error(`Erreur lors de la récupération des réservations: ${reservationError.message}`);
      // Continuer malgré l'erreur
    }

    // Calculer les statistiques
    const nbTrajetsTotaux = reservationsTerminees.length;
    const revenuTotal = reservationsTerminees.reduce((sum, res) => sum + (res.prixTotal || 0), 0);
    const nbTrajetsMoisCourant = reservationsTerminees.filter(
      res => res.dateFin && 
            new Date(res.dateFin).getMonth() === new Date().getMonth() &&
            new Date(res.dateFin).getFullYear() === new Date().getFullYear()
    ).length;

    // Vérifier si les documents sont à jour
    const documentsAJour = Array.isArray(conducteur.documents) && 
                           conducteur.documents.length > 0 ? 
                           conducteur.documents.every(doc => doc.estValide) : 
                           false;
    
    // Construire la réponse
    const profileData = {
      _id: conducteur._id,
      nom: conducteur.nom || 'Non spécifié',
      prenom: conducteur.prenom || 'Non spécifié',
      email: conducteur.email,
      telephone: conducteur.telephone || 'Non spécifié',
      adresse: conducteur.adresse || { rue: '', ville: '', pays: 'Sénégal' },
      dateNaissance: conducteur.dateNaissance,
      photoUrl: conducteur.photo || 'default.jpg',
      note: conducteur.noteGlobale || 0,
      vehiculeAssigne: conducteur.vehiculeAssigne,
      documents: conducteur.documents || [],
      documentsAJour,
      statistiques: {
        nbTrajetsTotaux,
        nbTrajetsMoisCourant,
        revenuTotal,
        reservationsEnCours: reservationsEnCours.length,
        reservationsConfirmees: reservationsConfirmees.length
      },
      trajetsRecents: reservationsRecentes.map(res => ({
        _id: res._id,
        client: {
          nom: res.client?.nom || 'Client',
          prenom: res.client?.prenom || '',
          telephone: res.client?.telephone || ''
        },
        vehicule: {
          marque: res.vehicule?.marque || 'Véhicule',
          modele: res.vehicule?.modele || '',
          immatriculation: res.vehicule?.immatriculation || ''
        },
        dateDebut: res.dateDebut,
        dateFin: res.dateFin,
        lieuPrise: res.lieuPrise,
        lieuRetour: res.lieuRetour,
        statut: res.statut,
        prixTotal: res.prixTotal
      })),
      alertes: []
    };

    // Ajouter des alertes si nécessaire
    if (!documentsAJour) {
      profileData.alertes.push({
        type: 'warning',
        message: 'Certains de vos documents ne sont pas valides ou ont expiré. Veuillez les mettre à jour.'
      });
    }

    if (!conducteur.vehiculeAssigne) {
      profileData.alertes.push({
        type: 'info',
        message: 'Vous n\'avez pas de véhicule assigné actuellement.'
      });
    }

    console.log(`Envoi du profil conducteur: ${conducteur._id}`);
    res.json(profileData);
  } catch (error) {
    console.error(`Erreur dans getConducteurProfile: ${error.message}`);
    if (error.message === 'Conducteur non trouvé') {
      res.status(404);
    } else {
      res.status(error.statusCode || 500);
    }
    throw error;
  }
});

// Fonction utilitaire pour obtenir le libellé du type de document
const getDocumentLabel = (type) => {
  const labels = {
    'permis': 'Permis de conduire',
    'carte_identite': 'Carte d\'identité',
    'assurance': 'Assurance',
    'certificat_medical': 'Certificat médical',
    'casier_judiciaire': 'Casier judiciaire'
  };
  
  return labels[type] || type;
};

module.exports = {
  authUser,
  registerUser,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile,
  getProfile,
  forgotPassword,
  resetPassword,
  getAllConducteurs,
  getConducteurDetails,
  getConducteursStats,
  getConducteurDocuments,
  addConducteurDocument,
  validateConducteurDocument,
  deleteConducteurDocument,
  getConducteurProfile
}; 
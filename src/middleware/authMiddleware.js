const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Middleware pour protéger les routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Vérifier si le token est présent dans les headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Récupérer le token
      token = req.headers.authorization.split(' ')[1];

      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupérer l'utilisateur
      req.user = await User.findById(decoded.id).select('-password');

      // Vérifier si l'utilisateur existe
      if (!req.user) {
        res.status(401);
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier si l'utilisateur est actif
      if (!req.user.isActive) {
        res.status(401);
        throw new Error('Compte inactif. Veuillez contacter un administrateur.');
      }

      // Mettre à jour la dernière connexion
      await User.findByIdAndUpdate(req.user._id, { lastLogin: Date.now() });

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Non autorisé, token invalide');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }
});

// Middleware pour vérifier les rôles d'admin
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super-admin')) {
    next();
  } else {
    res.status(403);
    throw new Error('Non autorisé, accès réservé aux administrateurs');
  }
});

// Middleware pour vérifier les rôles de conducteur
const conducteur = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'conducteur') {
    next();
  } else {
    res.status(403);
    throw new Error('Non autorisé, accès réservé aux conducteurs');
  }
});

// Middleware pour vérifier les rôles de client
const client = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'client') {
    next();
  } else {
    res.status(403);
    throw new Error('Non autorisé, accès réservé aux clients');
  }
});

// Middleware pour vérifier les permissions spécifiques des admins
const checkPermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    // Vérifier si l'utilisateur est admin et a la permission requise
    if (
      req.user && 
      (req.user.role === 'admin' || req.user.role === 'super-admin') &&
      (req.user.role === 'super-admin' || (req.user.permissions && req.user.permissions.includes(permission)))
    ) {
      next();
    } else {
      res.status(403);
      throw new Error(`Non autorisé, permission ${permission} requise`);
    }
  });
};

// Middleware pour vérifier si l'utilisateur est propriétaire de la ressource
const isOwner = asyncHandler(async (req, res, next) => {
  // L'ID de la ressource est supposé être dans les paramètres de la requête
  const resourceId = req.params.id;
  
  // Si l'utilisateur est admin, il peut accéder à tout
  if (req.user.role === 'admin' || req.user.role === 'super-admin') {
    return next();
  }
  
  // Vérifier le modèle concerné en fonction de la route
  const path = req.path;
  
  if (path.includes('/users/')) {
    // Vérifier que l'utilisateur accède à son propre compte
    if (req.user._id.toString() === resourceId) {
      return next();
    }
  } else if (path.includes('/reservations/')) {
    // Vérifier que l'utilisateur est le créateur de la réservation ou le conducteur assigné
    const Reservation = require('../models/Reservation');
    const reservation = await Reservation.findById(resourceId);
    
    if (!reservation) {
      res.status(404);
      throw new Error('Réservation non trouvée');
    }
    
    if (
      reservation.client.toString() === req.user._id.toString() ||
      (reservation.conducteur && reservation.conducteur.toString() === req.user._id.toString())
    ) {
      return next();
    }
  }
  
  // Si aucune condition n'est remplie, refuser l'accès
  res.status(403);
  throw new Error('Non autorisé, vous n\'êtes pas le propriétaire de cette ressource');
});

module.exports = { protect, admin, conducteur, client, checkPermission, isOwner }; 
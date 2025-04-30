const mongoose = require('mongoose');

const UserConducteurSchema = new mongoose.Schema({
  // Champs de base de User
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez fournir un email valide'
    ]
  },
  telephone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['conducteur'],
    default: 'conducteur'
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  adresse: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: {
      type: String,
      default: 'Sénégal'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Champs spécifiques à UserConducteur
  numeroPermis: {
    type: String,
    required: [true, 'Le numéro de permis est requis'],
    unique: true
  },
  typePermis: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E'],
    required: [true, 'Le type de permis est requis']
  },
  dateDelivrancePermis: {
    type: Date,
    required: [true, 'La date de délivrance du permis est requise']
  },
  dateExpirationPermis: {
    type: Date,
    required: [true, 'La date d\'expiration du permis est requise']
  },
  cin: {
    type: String,
    required: [true, 'Le numéro de CIN est requis'],
    unique: true
  },
  dateNaissance: {
    type: Date,
    required: [true, 'La date de naissance est requise']
  },
  lieuNaissance: String,
  photoPermis: {
    type: String,
    default: 'default-license.jpg'
  },
  photoCIN: {
    type: String,
    default: 'default-cin.jpg'
  },
  certificatMedical: {
    date: Date,
    fichier: String,
    estValide: {
      type: Boolean,
      default: false
    }
  },
  situation: {
    type: String,
    enum: ['Disponible', 'En service', 'En repos', 'En congé', 'Inactif'],
    default: 'Disponible'
  },
  vehiculeAssigne: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicule'
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'suspendu'],
    default: 'actif'
  },
  noteGlobale: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  nombreCourses: {
    type: Number,
    default: 0
  },
  experience: {
    type: Number, // En années
    default: 0
  },
  languesParlees: {
    type: [String],
    default: ['Français']
  },
  alertes: [{
    type: {
      type: String,
      enum: ['Permis', 'Certificat', 'Performance', 'Autre']
    },
    message: String,
    date: {
      type: Date,
      default: Date.now
    },
    estResolu: {
      type: Boolean,
      default: false
    }
  }],
  infractionsRoutieres: [{
    date: Date,
    description: String,
    lieu: String,
    sanction: String
  }]
}, { 
  timestamps: true,
  collection: 'user_conducteurs'  // Spécifie le nom de la collection
});

// Avant de sauvegarder, s'assurer que le rôle est conducteur
UserConducteurSchema.pre('save', function(next) {
  if (this.isNew) {
    this.role = 'conducteur';
  }
  next();
});

// Ajouter les méthodes nécessaires pour la compatibilité avec User
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Crypter le mot de passe avant la sauvegarde
UserConducteurSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Signer le JWT et retourner
UserConducteurSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Vérifier si le mot de passe correspond
UserConducteurSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Générer et hasher un token de réinitialisation de mot de passe
UserConducteurSchema.methods.getResetPasswordToken = function() {
  // Générer un token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hasher le token et l'affecter au champ resetPasswordToken
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Définir la date d'expiration (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Virtuel pour le nom complet
UserConducteurSchema.virtual('nomComplet').get(function() {
  return `${this.prenom} ${this.nom}`;
});

// Vérifier si le permis est expiré
UserConducteurSchema.virtual('permisExpire').get(function() {
  return this.dateExpirationPermis < new Date();
});

// Calculer l'âge du conducteur
UserConducteurSchema.virtual('age').get(function() {
  if (!this.dateNaissance) return null;
  
  const aujourdhui = new Date();
  const dateNaissance = new Date(this.dateNaissance);
  
  let age = aujourdhui.getFullYear() - dateNaissance.getFullYear();
  const mois = aujourdhui.getMonth() - dateNaissance.getMonth();
  
  if (mois < 0 || (mois === 0 && aujourdhui.getDate() < dateNaissance.getDate())) {
    age--;
  }
  
  return age;
});

module.exports = mongoose.model('UserConducteur', UserConducteurSchema); 
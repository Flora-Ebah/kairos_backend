const mongoose = require('mongoose');

const UserAdminSchema = new mongoose.Schema({
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
    enum: ['admin', 'super-admin'],
    default: 'admin'
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
  // Champs spécifiques à UserAdmin
  permissions: {
    type: [String],
    enum: [
      'users_manage',
      'vehicules_manage',
      'reservations_manage',
      'finances_manage',
      'rapports_view',
      'settings_manage'
    ],
    default: ['rapports_view']
  },
  niveau: {
    type: String,
    enum: ['admin', 'super-admin'],
    default: 'admin'
  },
  departement: {
    type: String,
    enum: ['Opérations', 'Finance', 'Marketing', 'Ressources Humaines', 'Direction', 'Technique', 'Service Client', 'Autre'],
    default: 'Autre'
  },
  poste: {
    type: String,
    default: 'Administrateur'
  },
  estVerifie: {
    type: Boolean,
    default: false
  },
  derniereActivite: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  collection: 'user_admins'  // Spécifie le nom de la collection
});

// Avant de sauvegarder, s'assurer que le rôle est admin ou super-admin
UserAdminSchema.pre('save', function(next) {
  if (this.isNew) {
    this.role = this.niveau === 'super-admin' ? 'super-admin' : 'admin';
  }
  next();
});

// Ajouter les méthodes nécessaires pour la compatibilité avec User
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Crypter le mot de passe avant la sauvegarde
UserAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Signer le JWT et retourner
UserAdminSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Vérifier si le mot de passe correspond
UserAdminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Générer et hasher un token de réinitialisation de mot de passe
UserAdminSchema.methods.getResetPasswordToken = function() {
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
UserAdminSchema.virtual('nomComplet').get(function() {
  return `${this.prenom} ${this.nom}`;
});

module.exports = mongoose.model('UserAdmin', UserAdminSchema); 
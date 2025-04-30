const mongoose = require('mongoose');

const UserClientSchema = new mongoose.Schema({
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
    enum: ['client'],
    default: 'client'
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
  // Champs spécifiques à UserClient
  entreprise: {
    nom: String,
    adresse: String,
    telephone: String,
    email: String,
    secteur: String,
    numeroRegistreCommerce: String,
    logo: String,
    typeClient: {
      type: String,
      enum: ['particulier', 'entreprise'],
      default: 'particulier'
    }
  },
  preferences: {
    typeVehicule: {
      type: String,
      enum: ['berline', 'suv', 'citadine', 'utilitaire', 'tous'],
      default: 'tous'
    },
    modesPaiement: {
      type: [String],
      enum: ['carte', 'especes', 'mobile_money', 'virement'],
      default: ['especes', 'mobile_money']
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  historiquePaiements: [{
    date: {
      type: Date,
      default: Date.now
    },
    montant: Number,
    methode: {
      type: String,
      enum: ['carte', 'especes', 'mobile_money', 'virement']
    },
    reference: String,
    statut: {
      type: String,
      enum: ['en attente', 'validé', 'échoué', 'remboursé'],
      default: 'en attente'
    }
  }],
  cartesBancaires: [{
    nom: String,
    numero: String, // Dernier 4 chiffres seulement
    expirationMois: Number,
    expirationAnnee: Number,
    tokenPaiement: String,
    estPrincipale: {
      type: Boolean,
      default: false
    }
  }],
  adressesFavorites: [{
    nom: String,
    adresse: String,
    latitude: Number,
    longitude: Number,
    instructions: String,
    estDomicile: {
      type: Boolean,
      default: false
    },
    estTravail: {
      type: Boolean,
      default: false
    }
  }],
  parrainage: {
    code: String,
    nombreParrainages: {
      type: Number,
      default: 0
    },
    parrainPar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'suspendu'],
    default: 'actif'
  },
  nombreReservations: {
    type: Number,
    default: 0
  },
  derniereReservation: {
    type: Date
  },
  codePromo: {
    code: String,
    dateExpiration: Date,
    reduction: Number,
    estUtilise: {
      type: Boolean,
      default: false
    }
  },
  fidelite: {
    points: {
      type: Number,
      default: 0
    },
    niveau: {
      type: String,
      enum: ['bronze', 'argent', 'or', 'platine'],
      default: 'bronze'
    },
    historiquePoints: [{
      date: {
        type: Date,
        default: Date.now
      },
      points: Number,
      description: String,
      type: {
        type: String,
        enum: ['gain', 'utilisation'],
        default: 'gain'
      }
    }]
  }
}, { 
  timestamps: true,
  collection: 'user_clients' // Spécifie le nom de la collection
});

// Avant de sauvegarder, s'assurer que le rôle est client
UserClientSchema.pre('save', function(next) {
  if (this.isNew) {
    this.role = 'client';
    
    // Générer un code de parrainage unique
    this.parrainage.code = this._id.toString().substring(0, 6).toUpperCase();
  }
  next();
});

// Ajouter les méthodes nécessaires pour la compatibilité avec User
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Crypter le mot de passe avant la sauvegarde
UserClientSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Signer le JWT et retourner
UserClientSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Vérifier si le mot de passe correspond
UserClientSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Générer et hasher un token de réinitialisation de mot de passe
UserClientSchema.methods.getResetPasswordToken = function() {
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
UserClientSchema.virtual('nomComplet').get(function() {
  return `${this.prenom} ${this.nom}`;
});

// Vérifier si le client est professionnel
UserClientSchema.virtual('estProfessionnel').get(function() {
  return this.entreprise && this.entreprise.typeClient === 'entreprise';
});

// Calculer le total dépensé
UserClientSchema.virtual('totalDepense').get(function() {
  if (!this.historiquePaiements || this.historiquePaiements.length === 0) return 0;
  
  return this.historiquePaiements
    .filter(paiement => paiement.statut === 'validé')
    .reduce((total, paiement) => total + paiement.montant, 0);
});

// Méthode pour ajouter des points de fidélité
UserClientSchema.methods.ajouterPointsFidelite = async function(points, description) {
  this.fidelite.points += points;
  
  // Mettre à jour le niveau de fidélité
  if (this.fidelite.points >= 500) {
    this.fidelite.niveau = 'platine';
  } else if (this.fidelite.points >= 200) {
    this.fidelite.niveau = 'or';
  } else if (this.fidelite.points >= 100) {
    this.fidelite.niveau = 'argent';
  }
  
  // Ajouter à l'historique
  this.fidelite.historiquePoints.push({
    points,
    description,
    type: 'gain',
    date: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('UserClient', UserClientSchema); 
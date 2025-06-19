const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionJournaliereSchema = new Schema({
  conducteur: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le conducteur est obligatoire']
  },
  date: {
    type: Date,
    required: [true, 'La date est obligatoire'],
    default: function() {
      // Retourner la date du jour à minuit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  montantInitial: {
    type: Number,
    required: [true, 'Le montant initial est obligatoire'],
    min: [0, 'Le montant initial ne peut pas être négatif'],
    default: 0
  },
  soldeActuel: {
    type: Number,
    required: [true, 'Le solde actuel est obligatoire'],
    default: function() {
      return this.montantInitial || 0;
    }
  },
  transactions: [{
    type: {
      type: String,
      enum: ['recette', 'depense', 'commission', 'remboursement'],
      required: true
    },
    montant: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  statut: {
    type: String,
    enum: ['active', 'cloturee', 'en_attente'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composé pour éviter les doublons conducteur/date
TransactionJournaliereSchema.index({ conducteur: 1, date: 1 }, { unique: true });

// Index pour les requêtes par date
TransactionJournaliereSchema.index({ date: -1 });

// Index pour les requêtes par conducteur
TransactionJournaliereSchema.index({ conducteur: 1 });

// Virtuel pour calculer le total des recettes
TransactionJournaliereSchema.virtual('totalRecettes').get(function() {
  return this.transactions
    .filter(t => t.type === 'recette')
    .reduce((total, t) => total + t.montant, 0);
});

// Virtuel pour calculer le total des dépenses
TransactionJournaliereSchema.virtual('totalDepenses').get(function() {
  return this.transactions
    .filter(t => t.type === 'depense')
    .reduce((total, t) => total + t.montant, 0);
});

// Virtuel pour calculer le total des commissions
TransactionJournaliereSchema.virtual('totalCommissions').get(function() {
  return this.transactions
    .filter(t => t.type === 'commission')
    .reduce((total, t) => total + t.montant, 0);
});

// Virtuel pour le solde calculé
TransactionJournaliereSchema.virtual('soldeCalcule').get(function() {
  const recettes = this.totalRecettes;
  const depenses = this.totalDepenses;
  const commissions = this.totalCommissions;
  const remboursements = this.transactions
    .filter(t => t.type === 'remboursement')
    .reduce((total, t) => total + t.montant, 0);
  
  return this.montantInitial + recettes + remboursements - depenses - commissions;
});

// Méthode pour ajouter une transaction
TransactionJournaliereSchema.methods.ajouterTransaction = function(transaction) {
  this.transactions.push(transaction);
  
  // Mettre à jour le solde actuel
  if (transaction.type === 'recette' || transaction.type === 'remboursement') {
    this.soldeActuel += transaction.montant;
  } else if (transaction.type === 'depense' || transaction.type === 'commission') {
    this.soldeActuel -= transaction.montant;
  }
  
  return this.save();
};

// Méthode pour clôturer la journée
TransactionJournaliereSchema.methods.cloturer = function(notes = '') {
  this.statut = 'cloturee';
  this.notes = notes;
  return this.save();
};

// Méthode statique pour créer ou récupérer la transaction du jour
TransactionJournaliereSchema.statics.getOrCreateToday = async function(conducteurId, montantInitial = 0) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Déterminer le modèle du conducteur
    let conducteurModel = 'User';
    const user = await mongoose.model('User').findById(conducteurId);
    if (!user) {
      const userConducteur = await mongoose.model('UserConducteur').findById(conducteurId);
      if (userConducteur) {
        conducteurModel = 'UserConducteur';
      }
    }
    
    let transaction = await this.findOne({
      conducteur: conducteurId,
      date: today
    }).populate({
      path: 'conducteur',
      select: 'nom prenom email telephone role statut',
      model: conducteurModel
    });
    
    if (!transaction) {
      transaction = await this.create({
        conducteur: conducteurId,
        date: today,
        montantInitial: montantInitial,
        soldeActuel: montantInitial,
        statut: 'active'
      });
      
      // Populer après création
      transaction = await this.findById(transaction._id)
        .populate({
          path: 'conducteur',
          select: 'nom prenom email telephone role statut',
          model: conducteurModel
        });
    }
    
    return transaction;
  } catch (error) {
    console.error('Erreur dans getOrCreateToday:', error);
    throw new Error(`Erreur lors de la création/récupération de la transaction: ${error.message}`);
  }
};

// Méthode statique pour obtenir le résumé mensuel
TransactionJournaliereSchema.statics.getResumeMensuel = async function(conducteurId, mois, annee) {
  const startDate = new Date(annee, mois - 1, 1);
  const endDate = new Date(annee, mois, 0, 23, 59, 59);
  
  const pipeline = [
    {
      $match: {
        conducteur: mongoose.Types.ObjectId(conducteurId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalMontantInitial: { $sum: '$montantInitial' },
        totalSoldeActuel: { $sum: '$soldeActuel' },
        nombreJours: { $sum: 1 },
        totalRecettes: {
          $sum: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'recette'] },
                  { $add: ['$$value', '$$this.montant'] },
                  '$$value'
                ]
              }
            }
          }
        },
        totalDepenses: {
          $sum: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'depense'] },
                  { $add: ['$$value', '$$this.montant'] },
                  '$$value'
                ]
              }
            }
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalMontantInitial: 0,
    totalSoldeActuel: 0,
    nombreJours: 0,
    totalRecettes: 0,
    totalDepenses: 0
  };
};

module.exports = mongoose.model('TransactionJournaliere', TransactionJournaliereSchema); 
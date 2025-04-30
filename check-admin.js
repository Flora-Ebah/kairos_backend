const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const UserAdmin = require('./src/models/UserAdmin');
const UserConducteur = require('./src/models/UserConducteur');
const UserClient = require('./src/models/UserClient');

// Charger les variables d'environnement
dotenv.config();

// Fonction pour vérifier les données des utilisateurs
const checkUsers = async () => {
  try {
    // Connexion à MongoDB
    console.log('Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecté à MongoDB');

    // Vérifier les collections existantes
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections dans la base de données:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Recherche dans le modèle User
    console.log('\nRecherche dans le modèle User:');
    const users = await User.find({});
    console.log(`Total d'utilisateurs dans User: ${users.length}`);
    
    if (users.length > 0) {
      console.log('Types d\'utilisateurs:');
      const userTypes = {};
      users.forEach(user => {
        userTypes[user.userType] = (userTypes[user.userType] || 0) + 1;
      });
      
      Object.keys(userTypes).forEach(type => {
        console.log(`- ${type}: ${userTypes[type]}`);
      });
      
      // Afficher l'admin
      const userAdmin = await User.findOne({ email: 'admin@kairos.com' });
      if (userAdmin) {
        console.log('\nDétails de l\'admin dans User:');
        console.log({
          _id: userAdmin._id,
          userType: userAdmin.userType,
          nom: userAdmin.nom,
          email: userAdmin.email,
          role: userAdmin.role
        });
      }
    }

    // Recherche dans le modèle UserAdmin
    console.log('\nRecherche dans UserAdmin:');
    const admins = await UserAdmin.find({});
    console.log(`Total d'admins dans UserAdmin: ${admins.length}`);
    
    if (admins.length > 0) {
      // Afficher l'admin
      const adminFromAdminModel = await UserAdmin.findOne({ email: 'admin@kairos.com' });
      if (adminFromAdminModel) {
        console.log('\nDétails de l\'admin dans UserAdmin:');
        console.log({
          _id: adminFromAdminModel._id,
          nom: adminFromAdminModel.nom,
          email: adminFromAdminModel.email,
          role: adminFromAdminModel.role,
          niveau: adminFromAdminModel.niveau,
          permissions: adminFromAdminModel.permissions
        });
      }
    }

    // Recherche dans les autres modèles
    console.log('\nRecherche dans UserConducteur:');
    const conducteurs = await UserConducteur.find({});
    console.log(`Total de conducteurs: ${conducteurs.length}`);
    
    console.log('\nRecherche dans UserClient:');
    const clients = await UserClient.find({});
    console.log(`Total de clients: ${clients.length}`);

    // Déconnexion
    await mongoose.disconnect();
    console.log('\nDéconnecté de MongoDB');
    
  } catch (error) {
    console.error(`Erreur: ${error.message}`);
    process.exit(1);
  }
};

// Exécuter la fonction
checkUsers(); 
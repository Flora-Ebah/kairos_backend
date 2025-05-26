const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const UserAdmin = require('../models/UserAdmin');
const Zone = require('../models/Zone');
const Service = require('../models/Service');
const Option = require('../models/Option');
const Destination = require('../models/Destination');
const Country = require('../models/Country');
const Tarif = require('../models/Tarif');
const { v4: uuidv4 } = require('uuid');

// Charger les variables d'environnement
dotenv.config();

// Connecter à la base de données
const connectDB = require('./db');

// Fonction pour créer un admin par défaut
const createDefaultAdmin = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence d\'un admin...');
    
    // Vérifier si un super-admin existe déjà dans User ou UserAdmin
    const adminInUser = await User.findOne({ role: 'super-admin' });
    const adminInUserAdmin = await UserAdmin.findOne({ niveau: 'super-admin' });
    
    if (adminInUser || adminInUserAdmin) {
      console.log('Un super-admin existe déjà dans la base de données.');
      return;
    }
    
    // Données de l'administrateur par défaut
    const adminData = {
      nom: 'Admin',
      prenom: 'Super',
      email: 'admin@kairos.com',
      telephone: '+221000000000',
      password: 'Password123!',
      niveau: 'super-admin',
      departement: 'Direction',
      poste: 'Administrateur Système',
      permissions: [
        'users_manage',
        'vehicules_manage',
        'reservations_manage',
        'finances_manage',
        'rapports_view',
        'settings_manage'
      ],
      estVerifie: true
    };
    
    // Créer l'admin dans la collection User pour compatibilité
    const userAdmin = await User.create({
      nom: adminData.nom,
      prenom: adminData.prenom,
      email: adminData.email,
      telephone: adminData.telephone,
      password: adminData.password,
      role: 'super-admin',
      userType: 'UserAdmin'
    });
    
    // Créer l'admin dans la collection UserAdmin
    const admin = await UserAdmin.create(adminData);
    
    if (userAdmin && admin) {
      console.log('Super-admin créé avec succès dans les deux collections:');
      console.log(`Email: ${admin.email}`);
      console.log(`Mot de passe: Password123!`);
      console.log('IMPORTANT: Changez ce mot de passe après la première connexion!');
    } else {
      console.log('Erreur lors de la création du super-admin');
      // Nettoyage en cas d'échec partiel
      if (userAdmin && !admin) {
        await User.findByIdAndDelete(userAdmin._id);
      } else if (!userAdmin && admin) {
        await UserAdmin.findByIdAndDelete(admin._id);
      }
    }
    
  } catch (error) {
    console.error(`Erreur lors de la création de l'admin par défaut: ${error.message}`);
  }
};

// Fonction pour initialiser les zones
const initializeZones = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence des zones...');
    
    // Vérifier si des zones existent déjà
    const zonesCount = await Zone.countDocuments();
    
    if (zonesCount > 0) {
      console.log(`${zonesCount} zones existent déjà dans la base de données.`);
      return;
    }
    
    // Données des zones à créer
    const zonesToCreate = [
      {
        zone_id: '036f3963-99e4-40d2-9a14-c4b13a6f2080',
        nom: 'Dans Dakar',
        description: '',
      },
      {
        zone_id: '55b0cd27-3a50-4ddf-9cb2-178f06eb8e8d',
        nom: 'Banlieue',
        description: '',
      },
      {
        zone_id: '74bc9c29-4ac3-493c-9bbe-aa978a7fd37e',
        nom: 'Regions',
        description: '',
      },
      {
        zone_id: 'dcfc10f0-dce1-4c25-84de-07ba3e413c01',
        nom: 'Aéroport',
        description: '',
      },
    ];
    
    // Créer les zones
    const zones = await Zone.insertMany(zonesToCreate);
    
    if (zones && zones.length === zonesToCreate.length) {
      console.log(`${zones.length} zones ont été créées avec succès:`);
      zones.forEach(zone => {
        console.log(`- ${zone.nom} (${zone.zone_id})`);
      });
    } else {
      console.log('Erreur lors de la création des zones');
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'initialisation des zones: ${error.message}`);
  }
};

// Fonction pour initialiser les services
const initializeServices = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence des services...');
    
    // Vérifier si des services existent déjà
    const servicesCount = await Service.countDocuments();
    
    if (servicesCount > 0) {
      console.log(`${servicesCount} services existent déjà dans la base de données.`);
      return;
    }
    
    // Données des services à créer
    const servicesToCreate = [
      {
        service_id: '20b1d67f-bdd9-4a0b-87d6-5ecb0ae6d30d',
        nom: 'Transfert',
        description: '',
      },
      {
        service_id: 'a1421ab1-1316-4d74-9a9d-5dd5da96abaf',
        nom: 'Mise à disposition',
        description: '',
      },
    ];
    
    // Créer les services
    const services = await Service.insertMany(servicesToCreate);
    
    if (services && services.length === servicesToCreate.length) {
      console.log(`${services.length} services ont été créés avec succès:`);
      services.forEach(service => {
        console.log(`- ${service.nom} (${service.service_id})`);
      });
    } else {
      console.log('Erreur lors de la création des services');
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'initialisation des services: ${error.message}`);
  }
};

// Fonction pour initialiser les options
const initializeOptions = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence des options...');
    
    // Vérifier si des options existent déjà
    const optionsCount = await Option.countDocuments();
    
    if (optionsCount > 0) {
      console.log(`${optionsCount} options existent déjà dans la base de données.`);
      return;
    }
    
    // Données des options à créer
    const optionsToCreate = [
      {
        option_id: '113c36f3-bdb4-4687-8b59-bd0d67e6675f',
        nom: 'Au-delà de 3 heures (par heure)',
        description: '',
      },
      {
        option_id: '29a83f50-eceb-42d8-95ec-5410672abf27',
        nom: 'Aller simple',
        description: '',
      },
      {
        option_id: '3b493b68-f0eb-4b29-98d7-f9a7bebf1d1e',
        nom: 'Journée',
        description: '',
      },
      {
        option_id: '52a1a733-20c7-4cb3-8454-6609e011e251',
        nom: 'Demi-journée',
        description: '',
      },
      {
        option_id: '7b254ece-ac49-4713-9e5d-4fcf8a5d9d03',
        nom: 'Aller/Retour',
        description: '',
      },
      {
        option_id: '9c99a37e-4c18-4b29-abe8-cb33b306803f',
        nom: 'Une heure',
        description: '',
      },
    ];
    
    // Créer les options
    const options = await Option.insertMany(optionsToCreate);
    
    if (options && options.length === optionsToCreate.length) {
      console.log(`${options.length} options ont été créées avec succès:`);
      options.forEach(option => {
        console.log(`- ${option.nom} (${option.option_id})`);
      });
    } else {
      console.log('Erreur lors de la création des options');
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'initialisation des options: ${error.message}`);
  }
};

// Fonction pour initialiser les destinations
const initializeDestinations = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence des destinations...');
    
    // Vérifier si des destinations existent déjà
    const destinationsCount = await Destination.countDocuments();
    
    if (destinationsCount > 0) {
      console.log(`${destinationsCount} destinations existent déjà dans la base de données.`);
      return;
    }
    
    // Vérifier que les zones existent
    const zones = await Zone.find({});
    if (zones.length === 0) {
      console.log('Aucune zone trouvée. Veuillez d\'abord créer des zones.');
      return;
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
    
    // Données des destinations à créer
    const destinationsToCreate = [
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
        nom: 'Guéréo',
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
    
    // Créer les destinations
    const destinations = await Destination.insertMany(destinationsToCreate);
    
    if (destinations && destinations.length === destinationsToCreate.length) {
      console.log(`${destinations.length} destinations ont été créées avec succès`);
    } else {
      console.log('Erreur lors de la création des destinations');
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'initialisation des destinations: ${error.message}`);
  }
};

// Fonction pour initialiser les pays
const initializeCountries = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence des pays...');
    
    // Vérifier si des pays existent déjà
    const countriesCount = await Country.countDocuments();
    
    if (countriesCount > 0) {
      console.log(`${countriesCount} pays existent déjà dans la base de données.`);
      return;
    }
    
    // Données des pays à créer (premiers pays comme exemple, compléter selon les besoins)
    const countriesToCreate = [
      { country_code_id: '023e5e3d-9a48-4cd4-b91a-84c2c8f91ece', country_name: 'Maroc', country_code: '+212', iso_code: 'MA' },
      { country_code_id: '027b7f17-3d7a-4b38-bd1c-ec0ab80cae4', country_name: 'Cote d\'Ivoire', country_code: '+225', iso_code: 'CI' },
      { country_code_id: '80c554cd-d4c-4227-b061-dc051d6f0e4f', country_name: 'France', country_code: '+33', iso_code: 'FR' },
      { country_code_id: '9c0612f24-b4e6-425e-847b-d109a4c36ab2', country_name: 'Sénégal', country_code: '+221', iso_code: 'SN' },
    ];
    
    // Créer les pays
    const countries = await Country.insertMany(countriesToCreate);
    
    if (countries && countries.length === countriesToCreate.length) {
      console.log(`${countries.length} pays ont été créés avec succès`);
    } else {
      console.log('Erreur lors de la création des pays');
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'initialisation des pays: ${error.message}`);
  }
};

// Fonction pour initialiser les tarifs
const initializeTarifs = async () => {
  try {
    await connectDB();
    
    console.log('Vérification de l\'existence des tarifs...');
    
    // Vérifier si des tarifs existent déjà
    const tarifsCount = await Tarif.countDocuments();
    
    if (tarifsCount > 0) {
      console.log(`${tarifsCount} tarifs existent déjà dans la base de données.`);
      return;
    }
    
    // Données des tarifs à créer basées sur le tableau fourni
    const tarifsToCreate = [
      // Dans Dakar
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Une heure', tarif_fcfa: 10000 },
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Au-delà de 3 heures (par heure)', tarif_fcfa: 8000 },
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Demi-journée', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Dans Dakar', destination: 'Dans Dakar', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      // Aéroport
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 25000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Utilitaire', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Utilitaire', option: 'Aller/Retour', tarif_fcfa: 60000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'SUV', option: 'Aller simple', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'SUV', option: 'Aller/Retour', tarif_fcfa: 70000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'VAN (7 personnes)', option: 'Aller simple', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'VAN (7 personnes)', option: 'Aller/Retour', tarif_fcfa: 100000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Minibus de 15 places', option: 'Aller simple', tarif_fcfa: 80000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Minibus de 15 places', option: 'Aller/Retour', tarif_fcfa: 140000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Minibus de 28 places', option: 'Aller simple', tarif_fcfa: 100000 },
      { tarif_id: uuidv4(), zone: 'Aéroport', destination: 'Aéroport (AIBD)', service: 'Transfert', type_vehicule: 'Minibus de 28 places', option: 'Aller/Retour', tarif_fcfa: 180000 },
      
      // Régions - principales destinations
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Diamniadio', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 25000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Diamniadio', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 40000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Diamniadio', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Lac Rose', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 30000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Lac Rose', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 45000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Lac Rose', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Toubab Dialaw', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 30000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Toubab Dialaw', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 45000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Toubab Dialaw', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Popenguine', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Popenguine', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Popenguine', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Guéréo', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Guéréo', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Guéréo', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Somone', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Somone', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Somone', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Bandia', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Bandia', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Bandia', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Ngerigne', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Ngerigne', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Ngerigne', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Saly', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Saly', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Saly', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Mbour', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Mbour', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Mbour', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Nianing', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 45000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Nianing', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Warang', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 45000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Warang', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Joal', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Joal', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Fatick', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 65000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Fatick', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Kaolack', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 75000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Kaolack', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Fatala', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 90000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Fatala', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Thiès', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 35000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Thiès', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 55000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Thiès', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 55000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Lompoul', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 90000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Lompoul', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 120000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Lompoul', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Saint-Louis', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 110000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Saint-Louis', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 150000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Saint-Louis', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Louga', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 90000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Louga', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller/Retour', tarif_fcfa: 120000 },
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Louga', service: 'Mise à disposition', type_vehicule: 'Berline', option: 'Journée', tarif_fcfa: 65000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Gambie avant frontière', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 100000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Gambie', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 150000 },
      
      { tarif_id: uuidv4(), zone: 'Régions', destination: 'Ziguinchor', service: 'Transfert', type_vehicule: 'Berline', option: 'Aller simple', tarif_fcfa: 250000 }
    ];
    
    // Créer les tarifs
    const tarifs = await Tarif.insertMany(tarifsToCreate);
    
    if (tarifs && tarifs.length === tarifsToCreate.length) {
      console.log(`${tarifs.length} tarifs ont été créés avec succès`);
    } else {
      console.log('Erreur lors de la création des tarifs');
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'initialisation des tarifs: ${error.message}`);
  }
};

// Exporter les fonctions pour les utiliser dans d'autres fichiers
module.exports = { 
  createDefaultAdmin, 
  initializeZones, 
  initializeServices, 
  initializeOptions,
  initializeDestinations,
  initializeCountries,
  initializeTarifs
};
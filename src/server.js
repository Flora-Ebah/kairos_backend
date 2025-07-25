const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Charger les variables d'environnement
dotenv.config();

// Connexion à la base de données
connectDB();

// Initialiser l'application Express
const app = express();

// Middleware pour parser le JSON et les données de formulaire
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuration CORS totalement permissive pour le débogage
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://kairos-bay.vercel.app',  // URL du frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Logger pour le développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes import
const userRoutes = require('./routes/userRoutes');
const depenseRoutes = require('./routes/depenseRoutes');
const vehiculeRoutes = require('./routes/vehiculeRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const optionRoutes = require('./routes/optionRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const countryRoutes = require('./routes/countryRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const tarifRoutes = require('./routes/tarifRoutes');
const transactionJournaliereRoutes = require('./routes/transactionJournaliereRoutes');
const gestionTransportRoutes = require('./routes/gestionTransportRoutes');
const financeRoutes = require('./routes/financeRoutes');
const paiementRoutes = require('./routes/paiementRoutes');

// Vérifier si un administrateur par défaut doit être créé au démarrage
if (process.env.CREATE_DEFAULT_ADMIN === 'true') {
  const { createDefaultAdmin } = require('./config/seeder');
  createDefaultAdmin().catch(err => console.error('Erreur lors de la création de l\'admin par défaut:', err));
}

// Initialiser les données au démarrage
const { initializeZones, initializeServices, initializeOptions, initializeDestinations, initializeCountries, initializeTarifs } = require('./config/seeder');

// Fonction asynchrone pour exécuter les initialisations séquentiellement
const initializeData = async () => {
  try {
    // Attendre un peu après la connexion à la base de données
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log("Début de l'initialisation des données...");
    
    try {
      await initializeZones();
    } catch (error) {
      console.error("Erreur lors de l'initialisation des zones:", error.message);
    }
    
    // Attendre entre chaque initialisation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await initializeServices();
    } catch (error) {
      console.error("Erreur lors de l'initialisation des services:", error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await initializeOptions();
    } catch (error) {
      console.error("Erreur lors de l'initialisation des options:", error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await initializeDestinations();
    } catch (error) {
      console.error("Erreur lors de l'initialisation des destinations:", error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await initializeCountries();
    } catch (error) {
      console.error("Erreur lors de l'initialisation des pays:", error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await initializeTarifs();
    } catch (error) {
      console.error("Erreur lors de l'initialisation des tarifs:", error.message);
    }
    
    console.log('Initialisation des données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données:', error);
  }
};

// Exécuter l'initialisation des données
initializeData();

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/depenses', depenseRoutes);
app.use('/api/vehicules', vehiculeRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/options', optionRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tarifs', tarifRoutes);
app.use('/api/transactions-journalieres', transactionJournaliereRoutes);

// Routes finance
app.use('/api/finance', financeRoutes);

// Routes paiements (clients)
app.use('/api/paiements', paiementRoutes);

// Routes pour la gestion de transport (conducteur) - DOIT ÊTRE AVANT la route générale
const gestionTransportConducteurRoutes = require('./routes/gestionTransportConducteurRoutes');
app.use('/api/gestion-transport/conducteur', gestionTransportConducteurRoutes);

// Route générale gestion transport (admin) - DOIT ÊTRE APRÈS les routes spécifiques
app.use('/api/gestion-transport', gestionTransportRoutes);

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// Middleware pour gérer les erreurs
app.use(notFound);
app.use(errorHandler);

// Définir le port: j'ai définis le port 5000 pour le développement
const PORT = process.env.PORT || 5000;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
}); 
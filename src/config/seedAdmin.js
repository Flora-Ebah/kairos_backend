const { createDefaultAdmin } = require('./seeder');

// Exécuter la fonction de création d'admin
(async () => {
  console.log('Démarrage du processus de création d\'un super-admin par défaut...');
  await createDefaultAdmin();
  console.log('Processus terminé.');
})(); 
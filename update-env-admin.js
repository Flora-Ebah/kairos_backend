const fs = require('fs');
const path = require('path');

// Lire le contenu actuel du fichier .env
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Remplacer la valeur de CREATE_DEFAULT_ADMIN
envContent = envContent.replace(
  /CREATE_DEFAULT_ADMIN=false/,
  'CREATE_DEFAULT_ADMIN=true'
);

// Si la variable n'existe pas, l'ajouter
if (!envContent.includes('CREATE_DEFAULT_ADMIN')) {
  envContent += '\nCREATE_DEFAULT_ADMIN=true\n';
}

// Écrire le contenu mis à jour
fs.writeFileSync(envPath, envContent);

console.log('Fichier .env mis à jour avec CREATE_DEFAULT_ADMIN=true');
console.log('Au prochain démarrage du serveur, un admin sera créé automatiquement s\'il n\'existe pas déjà.'); 
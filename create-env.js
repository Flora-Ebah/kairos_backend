const fs = require('fs');
const path = require('path');

// Contenu du fichier .env
const envContent = `NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/kairos
JWT_SECRET=kairossecrettoken123456
JWT_EXPIRE=30d
FILE_UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=1000000
CREATE_DEFAULT_ADMIN=false
`;

// Chemin du fichier .env
const envPath = path.join(__dirname, '.env');

// Vérifier si le fichier existe déjà
if (fs.existsSync(envPath)) {
  console.log('Le fichier .env existe déjà. Utilisez-le ou supprimez-le avant de le recréer.');
} else {
  // Créer le fichier .env
  fs.writeFileSync(envPath, envContent);
  console.log('Fichier .env créé avec succès!');
  console.log('Contenu du fichier .env:');
  console.log(envContent);
} 
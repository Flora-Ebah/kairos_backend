const fs = require('fs');
const path = require('path');

// Nouveau contenu du fichier .env
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

// Mettre à jour le fichier .env
fs.writeFileSync(envPath, envContent);
console.log('Fichier .env mis à jour avec succès!');
console.log('Nouveau contenu du fichier .env:');
console.log(envContent); 
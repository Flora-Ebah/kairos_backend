const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      keepAlive: true,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("🟢 MongoDB Atlas connecté !");
  } catch (error) {
    console.error("🔴 Erreur de connexion MongoDB Atlas:", error);
    process.exit(1);
  }
};

module.exports = connectDB;

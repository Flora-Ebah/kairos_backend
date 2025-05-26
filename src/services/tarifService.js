const Tarif = require('../models/Tarif');
const { v4: uuidv4 } = require('uuid');

class TarifService {
  // Récupérer tous les tarifs avec filtres optionnels
  async getAllTarifs(filters = {}) {
    const query = { is_active: true };
    
    // Ajouter les filtres si fournis
    if (filters.zone) query.zone = filters.zone;
    if (filters.destination) query.destination = filters.destination;
    if (filters.service) query.service = filters.service;
    if (filters.type_vehicule) query.type_vehicule = filters.type_vehicule;
    if (filters.option) query.option = filters.option;
    
    return await Tarif.find(query).sort({ zone: 1, destination: 1, service: 1 });
  }

  // Récupérer un tarif par ID
  async getTarifById(id) {
    return await Tarif.findById(id);
  }

  // Rechercher des tarifs selon des critères spécifiques
  async searchTarifs(searchCriteria) {
    const { zone, destination, service, type_vehicule, option } = searchCriteria;
    
    const query = { is_active: true };
    
    if (zone) query.zone = zone;
    if (destination) query.destination = destination;
    if (service) query.service = service;
    if (type_vehicule) query.type_vehicule = type_vehicule;
    if (option) query.option = option;
    
    return await Tarif.find(query).sort({ tarif_fcfa: 1 });
  }

  // Obtenir le tarif exact pour une combinaison donnée
  async getExactTarif(zone, destination, service, type_vehicule, option) {
    return await Tarif.findOne({
      zone,
      destination,
      service,
      type_vehicule,
      option,
      is_active: true
    });
  }

  // Créer un nouveau tarif
  async createTarif(tarifData) {
    // Vérifier si un tarif existe déjà pour cette combinaison
    const existingTarif = await Tarif.findOne({
      zone: tarifData.zone,
      destination: tarifData.destination,
      service: tarifData.service,
      type_vehicule: tarifData.type_vehicule,
      option: tarifData.option
    });

    if (existingTarif) {
      throw new Error('Un tarif existe déjà pour cette combinaison');
    }

    const tarif = new Tarif({
      ...tarifData,
      tarif_id: uuidv4()
    });

    return await tarif.save();
  }

  // Mettre à jour un tarif
  async updateTarif(id, updateData) {
    const tarif = await Tarif.findById(id);
    
    if (!tarif) {
      throw new Error('Tarif non trouvé');
    }

    // Si on modifie les champs de base, vérifier qu'il n'y a pas de conflit
    if (updateData.zone || updateData.destination || updateData.service || 
        updateData.type_vehicule || updateData.option) {
      
      const conflictTarif = await Tarif.findOne({
        _id: { $ne: id },
        zone: updateData.zone || tarif.zone,
        destination: updateData.destination || tarif.destination,
        service: updateData.service || tarif.service,
        type_vehicule: updateData.type_vehicule || tarif.type_vehicule,
        option: updateData.option || tarif.option
      });

      if (conflictTarif) {
        throw new Error('Un tarif existe déjà pour cette combinaison');
      }
    }

    Object.assign(tarif, updateData);
    return await tarif.save();
  }

  // Supprimer un tarif (soft delete)
  async deleteTarif(id) {
    const tarif = await Tarif.findById(id);
    
    if (!tarif) {
      throw new Error('Tarif non trouvé');
    }

    tarif.is_active = false;
    return await tarif.save();
  }

  // Supprimer définitivement un tarif
  async hardDeleteTarif(id) {
    const result = await Tarif.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      throw new Error('Tarif non trouvé');
    }
    
    return result;
  }

  // Obtenir des statistiques sur les tarifs
  async getTarifStats() {
    const stats = await Tarif.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: null,
          total_tarifs: { $sum: 1 },
          tarif_min: { $min: '$tarif_fcfa' },
          tarif_max: { $max: '$tarif_fcfa' },
          tarif_moyen: { $avg: '$tarif_fcfa' },
          zones_count: { $addToSet: '$zone' },
          services_count: { $addToSet: '$service' },
          types_vehicules_count: { $addToSet: '$type_vehicule' }
        }
      },
      {
        $project: {
          _id: 0,
          total_tarifs: 1,
          tarif_min: 1,
          tarif_max: 1,
          tarif_moyen: { $round: ['$tarif_moyen', 0] },
          nombre_zones: { $size: '$zones_count' },
          nombre_services: { $size: '$services_count' },
          nombre_types_vehicules: { $size: '$types_vehicules_count' }
        }
      }
    ]);

    return stats[0] || {};
  }

  // Obtenir les valeurs uniques pour les filtres
  async getFilterOptions() {
    const [zones, destinations, services, types_vehicules, options] = await Promise.all([
      Tarif.distinct('zone', { is_active: true }),
      Tarif.distinct('destination', { is_active: true }),
      Tarif.distinct('service', { is_active: true }),
      Tarif.distinct('type_vehicule', { is_active: true }),
      Tarif.distinct('option', { is_active: true })
    ]);

    return {
      zones: zones.sort(),
      destinations: destinations.sort(),
      services: services.sort(),
      types_vehicules: types_vehicules.sort(),
      options: options.sort()
    };
  }
}

module.exports = new TarifService(); 
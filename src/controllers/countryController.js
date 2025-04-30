const asyncHandler = require('express-async-handler');
const Country = require('../models/Country');

// @desc    Récupérer tous les pays
// @route   GET /api/countries
// @access  Private/Admin
const getCountries = asyncHandler(async (req, res) => {
  const countries = await Country.find({}).sort({ country_name: 1 });
  res.json(countries);
});

// @desc    Récupérer un pays par ID
// @route   GET /api/countries/:id
// @access  Private/Admin
const getCountryById = asyncHandler(async (req, res) => {
  const country = await Country.findById(req.params.id);

  if (country) {
    res.json(country);
  } else {
    res.status(404);
    throw new Error('Pays non trouvé');
  }
});

// @desc    Créer un nouveau pays
// @route   POST /api/countries
// @access  Private/Admin
const createCountry = asyncHandler(async (req, res) => {
  const { country_code_id, country_name, country_code, iso_code } = req.body;

  const countryExists = await Country.findOne({ country_code_id });

  if (countryExists) {
    res.status(400);
    throw new Error('Un pays avec cet ID existe déjà');
  }

  const country = await Country.create({
    country_code_id,
    country_name,
    country_code,
    iso_code,
  });

  if (country) {
    res.status(201).json(country);
  } else {
    res.status(400);
    throw new Error('Données de pays invalides');
  }
});

// @desc    Mettre à jour un pays
// @route   PUT /api/countries/:id
// @access  Private/Admin
const updateCountry = asyncHandler(async (req, res) => {
  const { country_name, country_code, iso_code } = req.body;

  const country = await Country.findById(req.params.id);

  if (country) {
    country.country_name = country_name || country.country_name;
    country.country_code = country_code || country.country_code;
    country.iso_code = iso_code || country.iso_code;

    const updatedCountry = await country.save();
    res.json(updatedCountry);
  } else {
    res.status(404);
    throw new Error('Pays non trouvé');
  }
});

// @desc    Supprimer un pays
// @route   DELETE /api/countries/:id
// @access  Private/Admin
const deleteCountry = asyncHandler(async (req, res) => {
  const country = await Country.findById(req.params.id);

  if (country) {
    await Country.deleteOne({ _id: country._id });
    res.json({ message: 'Pays supprimé' });
  } else {
    res.status(404);
    throw new Error('Pays non trouvé');
  }
});

// @desc    Seeder les pays initiaux
// @route   POST /api/countries/seed
// @access  Private/Admin
const seedCountries = asyncHandler(async (req, res) => {
  // Supprimer tous les pays existants
  await Country.deleteMany({});

  // Données à insérer (extraites de l'image)
  const countriesToSeed = [
    { country_code_id: '023e5e3d-9a48-4cd4-b91a-84c2c8f91ece', country_name: 'Maroc', country_code: '+212', iso_code: 'MA' },
    { country_code_id: '027b7f17-3d7a-4b38-bd1c-ec0ab80cae4', country_name: 'Cote d\'Ivoire', country_code: '+225', iso_code: 'CI' },
    { country_code_id: '0415dea-f13a-48bb-8020-043ff121abb7', country_name: 'Syrie', country_code: '+963', iso_code: 'SY' },
    { country_code_id: '050c1a83-4112-4241-9f67-71701beea4', country_name: 'Djibouti', country_code: '+253', iso_code: 'DJ' },
    { country_code_id: '05291a7-9c50-42e9-b8a2-356fda64e7b9', country_name: 'Ghana', country_code: '+233', iso_code: 'GH' },
    { country_code_id: '0654c393-56d2-4f62-ba57-0a2bed8bab8c', country_name: 'Namibie', country_code: '+264', iso_code: 'NA' },
    { country_code_id: '082d96bc-af5b-41e3-8a1-274a1ed5ce5a', country_name: 'Bolivie', country_code: '+591', iso_code: 'BO' },
    { country_code_id: '08c461a1-3919-4dd3-bd1c-0f4aba1d9c3', country_name: 'Estonie', country_code: '+372', iso_code: 'EE' },
    { country_code_id: '09d2f087-4221-4b38-b53e-50fd7750dbff', country_name: 'Liechtenstein', country_code: '+423', iso_code: 'LI' },
    { country_code_id: '0a3d41e-7b7f-4491-b146-528884825469', country_name: 'République Démocratique du Congo', country_code: '+243', iso_code: 'CD' },
    { country_code_id: '0b426eae-3a2c-4bc7-bd1c-c97c6207266', country_name: 'Luxembourg', country_code: '+352', iso_code: 'LU' },
    { country_code_id: '0ba7f8da-b756-495d-b6a3-39b1f49bac4e', country_name: 'Macao', country_code: '+853', iso_code: 'MO' },
    { country_code_id: '0e843bb3-701c-42b0-9d09-d8e16d7701', country_name: 'Cameroun', country_code: '+237', iso_code: 'CM' },
    { country_code_id: '10926343-858c-466f-81ec-23c15002b3f2', country_name: 'Koweït', country_code: '+965', iso_code: 'KW' },
    { country_code_id: '139bc7a-bf8c-490e-921e-0753d435a8b', country_name: 'Liban', country_code: '+971', iso_code: 'LB' },
    { country_code_id: '1390ea7e-9f63-413d-bab5-1f47054691', country_name: 'Croatie', country_code: '+385', iso_code: 'HR' },
    { country_code_id: '13b2a33-b1fec-4f88-84bb-974df60e9b8', country_name: 'Yémen', country_code: '+967', iso_code: 'YE' },
    { country_code_id: '14e1435a-d83c-4a09-b72b-878f6eb4479c', country_name: 'Pakistan', country_code: '+92', iso_code: 'PK' },
    { country_code_id: '156c4f1e-68ae-44a5-81d9-50d18a72030c', country_name: 'Libye', country_code: '+218', iso_code: 'LY' },
    { country_code_id: '1620505c-b4b6-4e90-b623-ab5d0a7cbe1', country_name: 'Zimbabwe', country_code: '+263', iso_code: 'ZW' },
    { country_code_id: '182ede65-3940-4b85-8824-aa1a74866070', country_name: 'Soudan du Sud', country_code: '+211', iso_code: 'SS' },
    { country_code_id: '19c95c3b-0e19-b931-14c27ad53807', country_name: 'Érythrée', country_code: '+291', iso_code: 'ER' },
    { country_code_id: '1bedfff25-af37-4d41-b43d-687175a279dd', country_name: 'Grèce', country_code: '+30', iso_code: 'GR' },
    { country_code_id: '1fa84bc8-e702-4eab-b259-f631771971a', country_name: 'Jordanie', country_code: '+962', iso_code: 'JO' },
    { country_code_id: '2011ec9c-26d9-42d0-919a-75be20b7fce1', country_name: 'Finlande', country_code: '+358', iso_code: 'FI' },
    { country_code_id: '243c6b10-0173-4984-854e-b2e8845ad0c7', country_name: 'Kirghizistan', country_code: '+996', iso_code: 'KG' },
    { country_code_id: '2304339a-29d5-44ad-9b4f-d5f75592657', country_name: 'Madagascar', country_code: '+261', iso_code: 'MG' },
    { country_code_id: '2261419c-98f4-4c36-8eca-7c5bb45d24', country_name: 'Venezuela', country_code: '+58', iso_code: 'VE' },
    { country_code_id: '27d97e32-61d0-4721-be2c-5145991d4ff', country_name: 'Inde', country_code: '+91', iso_code: 'IN' },
    { country_code_id: '2822a2b0-3130-42d9-a58c-7c7c85012edd', country_name: 'Pays-Bas', country_code: '+31', iso_code: 'NL' },
    { country_code_id: '2b337c6-8171-48d0-8c1c-dab007125a', country_name: 'Espagne', country_code: '+34', iso_code: 'ES' },
    { country_code_id: '291d5b28-0694-4034-b943-8ae4efee3d1', country_name: 'Slovaquie', country_code: '+421', iso_code: 'SK' },
    { country_code_id: '2e60a73-1d10-42d4-ab85-074b9a73910', country_name: 'Niger', country_code: '+227', iso_code: 'NE' },
    { country_code_id: '2bac0642-720a-4d85-9a27-7bc0bf1f53a4', country_name: 'Gambie', country_code: '+220', iso_code: 'GM' },
    { country_code_id: '2c1aaa4-4b27-4ffc-81a1-ce950db14', country_name: 'Panama', country_code: '+507', iso_code: 'PA' },
    { country_code_id: '31ade50-51d8-42de-882d-9daf808943f6', country_name: 'Malaisie', country_code: '+60', iso_code: 'MY' },
    { country_code_id: '32388541-63a-4db0-8222-f67002c59c26', country_name: 'Moldavie', country_code: '+373', iso_code: 'MD' },
    { country_code_id: '355c05d6-223e-4cde-a6b3-f3e8b5cb67e', country_name: 'Rwanda', country_code: '+250', iso_code: 'RW' },
    { country_code_id: '370fb72d-3c73-42f5-b174-ea532fd9a9de', country_name: 'Indonésie', country_code: '+62', iso_code: 'ID' },
    { country_code_id: '3a2391e-e314-46b8-ae1f-0ea7242ac719', country_name: 'Mauritanie', country_code: '+222', iso_code: 'MR' },
    { country_code_id: '3945756d-029f-4c36-9a0-6f9342ceabe', country_name: 'Australie', country_code: '+61', iso_code: 'AU' },
    { country_code_id: '3a162007-22dc-4911-4f7-0f5b38ec67da', country_name: 'Cambodge', country_code: '+855', iso_code: 'KH' },
    { country_code_id: '3d93d02c-ac07-46c5-93f6-2313e70ffeba', country_name: 'États-Unis', country_code: '+1', iso_code: 'US' },
    { country_code_id: '3fd39278-4f72-423a-b2e7-13a84e9e7ea3', country_name: 'République Tcheque', country_code: '+420', iso_code: 'CZ' },
    { country_code_id: '3e233c24-2584-48ec-9a9c-3f1c67d17168', country_name: 'Vietnam', country_code: '+84', iso_code: 'VN' },
    { country_code_id: '3f64d0ca-8c34-4378-a03f-1245d6d28fe', country_name: 'Ethiopie', country_code: '+251', iso_code: 'ET' },
    { country_code_id: '40fe3803-3f00-4b44-925c-3fe5877602bc', country_name: 'Pérou', country_code: '+51', iso_code: 'PE' },
    { country_code_id: '4418a9af-e559-43c1-b78fc-fcaf0726b8', country_name: 'Allemagne', country_code: '+49', iso_code: 'DE' },
    { country_code_id: '45c039c-1edd-4f37-ab95-19f0b0cdf8e', country_name: 'Singapour', country_code: '+65', iso_code: 'SG' },
    { country_code_id: '45dcbb2d-79ff-4c90-95ca-b0148031003', country_name: 'Ouganda', country_code: '+256', iso_code: 'UG' },
    { country_code_id: '478a627a-c312-7ff0-bbb7-1a03e7551e09', country_name: 'Belgique', country_code: '+32', iso_code: 'BE' },
    { country_code_id: '493eeaee-16ec-4513-9978-c028df733d65', country_name: 'Nigeria', country_code: '+234', iso_code: 'NG' },
    { country_code_id: '4ae38d87-4fca-4c21-bfea-9ad397994fc', country_name: 'Guinée', country_code: '+224', iso_code: 'GN' },
    { country_code_id: '4b39122e-7a05-4e6d-d77a-24fa56a5f52', country_name: 'République Dominicaine', country_code: '+1', iso_code: 'DO' },
    { country_code_id: '4d2fd36-3778-4b1b-a88c-22b0b29646', country_name: 'Hongrie', country_code: '+36', iso_code: 'HU' },
    { country_code_id: '4d33a839-fc1a-4453-a415-86be8855d6a', country_name: 'Mexique', country_code: '+52', iso_code: 'MX' },
    { country_code_id: '4fbb3cae-4ab1-42bb-9ea-feb0214cf31', country_name: 'Italie', country_code: '+39', iso_code: 'IT' },
    { country_code_id: '5251b780-81ab-40bb-b841-7d6ed331096', country_name: 'Cap-Vert', country_code: '+238', iso_code: 'CV' },
    { country_code_id: '5707c829-c40a-415a-be91-af6957eab3fa', country_name: 'Irlande', country_code: '+353', iso_code: 'IE' },
    { country_code_id: '5710764-b3a-af1-a0d6c-2a49dc0d72e8', country_name: 'Zambie', country_code: '+260', iso_code: 'ZM' },
    { country_code_id: '56b0e7e6-6578-402a-a1a7-1e968c34c2a2', country_name: 'Serbie', country_code: '+381', iso_code: 'RS' },
    { country_code_id: '5dc0d93-471b-43ab-a193-a7a7ce4f34e', country_name: 'Pologne', country_code: '+48', iso_code: 'PL' },
    { country_code_id: '5e4a14bc-30e9-4bdb-8dea-a82e8519b1', country_name: 'Afrique du Sud', country_code: '+27', iso_code: 'ZA' },
    { country_code_id: '5eaa2ab3-2e5f-45b-88ea-70eb86eca9de', country_name: 'Algérie', country_code: '+213', iso_code: 'DZ' },
    { country_code_id: '6194b4c1-4388-49bd-8ec5-e3d8c90b247', country_name: 'Chine', country_code: '+86', iso_code: 'CN' },
    { country_code_id: '626a936d-1798-4c5c-ae7f-a03ae7e6d0a', country_name: 'Argentine', country_code: '+54', iso_code: 'AR' },
    { country_code_id: '63258a2c-d4dc-4bad-8c90-0b660f5b3df', country_name: 'Russie', country_code: '+7', iso_code: 'RU' },
    { country_code_id: '6370b055-31ed-4560-ad3a-2cb4d5c63ae', country_name: 'Soudan', country_code: '+249', iso_code: 'SD' },
    { country_code_id: '65d90d76-29dd-4de4-870-ba20eb3d831', country_name: 'Mozambique', country_code: '+258', iso_code: 'MZ' },
    { country_code_id: '686e37d0-c634-48e1-b804-60fa7f81f1a8', country_name: 'Égypte', country_code: '+20', iso_code: 'EG' },
    { country_code_id: '67273fb0-ced4-48d9-bb0b-05525317c66', country_name: 'Brésil', country_code: '+55', iso_code: 'BR' },
    { country_code_id: '6dfe91e1-9bc6-4a2b-b36e-e2a3414200', country_name: 'Algérie', country_code: '+213', iso_code: 'DZ' },
    { country_code_id: '6f8c509f-bedc-4db-8023-23a2a431841', country_name: 'Malte', country_code: '+356', iso_code: 'MT' },
    { country_code_id: '6fdaf4fc-a922-455a-b4ca-ffb5354a69ca', country_name: 'Jamaïque', country_code: '+1', iso_code: 'JM' },
    { country_code_id: '7182c3bc-c55d-4ace-aca7-b343704e5cf', country_name: 'Émirats arabes unis', country_code: '+971', iso_code: 'AE' },
    { country_code_id: '71d5bc00-0ba4-4182-af38-50c8ee000c5', country_name: 'Lanka', country_code: '+94', iso_code: 'LK' },
    { country_code_id: '7309204a-e013-4034-beec-9a375cf8711a', country_name: 'Mali', country_code: '+223', iso_code: 'ML' },
    { country_code_id: '737ab08-b49d-4ad-84f4-a9bd418c0dca', country_name: 'Guinée équatoriale', country_code: '+240', iso_code: 'GQ' },
    { country_code_id: '73c6e205-4798-4970-81b9-61a8847071', country_name: 'Autriche', country_code: '+43', iso_code: 'AT' },
    { country_code_id: '75bf072e-8dc4-c0e-9c8b0bb03e5', country_name: 'Kenya', country_code: '+254', iso_code: 'KE' },
    { country_code_id: '79b990a2-5ca4-42ee-b26c-7fce25ed17a9', country_name: 'Ouzbékistan', country_code: '+998', iso_code: 'UZ' },
    { country_code_id: '7a60331-3890-4ae2-8112-ed85a570a', country_name: 'Islande', country_code: '+354', iso_code: 'IS' },
    { country_code_id: '80c554cd-d4c-4227-b061-dc051d6f0e4f', country_name: 'France', country_code: '+33', iso_code: 'FR' },
    { country_code_id: '83ffcb52-a6a0-44ce-a3aa-3caa24a0749', country_name: 'Danemark', country_code: '+45', iso_code: 'DK' },
    { country_code_id: '83500a3-e16b-4fe6-976f-faffd89e8f6', country_name: 'Andorre', country_code: '+376', iso_code: 'AD' },
    { country_code_id: '84b633be-77a4-41e6-9b31-756d869c719d', country_name: 'Japon', country_code: '+81', iso_code: 'JP' },
    { country_code_id: '8595c7e-127-4213-8c10-69cba5080b15', country_name: 'Népal', country_code: '+977', iso_code: 'NP' },
    { country_code_id: '88b1b790-87bf-4476-865d-5f0df762e8e8', country_name: 'Sierra Leone', country_code: '+232', iso_code: 'SL' },
    { country_code_id: '8af5f0a3-c0fd-4f53-4adf-9701b0ed7921', country_name: 'Arabie Saoudite', country_code: '+966', iso_code: 'SA' },
    { country_code_id: '8f921698-42df-d5ca-89a5-0f3f03cf0250', country_name: 'Tchad', country_code: '+235', iso_code: 'TD' },
    { country_code_id: '900c928e-c5ff-4883-ad5c-c05186c5120a', country_name: 'Iran', country_code: '+98', iso_code: 'IR' },
    { country_code_id: '93abb15-fa7b-432e-95d2-d95c263c0521', country_name: 'Ukraine', country_code: '+380', iso_code: 'UA' },
    { country_code_id: '95a5523c-28f1-4c9a-b6c2-c20aab704a60', country_name: 'Bissau', country_code: '+245', iso_code: 'GW' },
    { country_code_id: '9635f6a-84e9-42a2-b4c5-7fafba0f6688', country_name: 'Turquie', country_code: '+90', iso_code: 'TR' },
    { country_code_id: '9853665f-0e5c-4dba-a149-920e62d4c0a7', country_name: 'Portugal', country_code: '+351', iso_code: 'PT' },
    { country_code_id: '99c5aa5-c72-4f07-a98c-a0cfaf5c8b2a', country_name: 'Suisse', country_code: '+41', iso_code: 'CH' },
    { country_code_id: '9a75ff2f-e7cc-4506-83a9-c4080b0e4b72', country_name: 'Corée du Sud', country_code: '+82', iso_code: 'KR' },
    { country_code_id: '9a7f686c-ea8e-4e66-b8d0-779961a631', country_name: 'Burundi', country_code: '+257', iso_code: 'BI' },
    { country_code_id: '9c0612f24-b4e6-425e-847b-d109a4c36ab2', country_name: 'Sénégal', country_code: '+221', iso_code: 'SN' },
  ];

  // Insérer les données
  const countries = await Country.insertMany(countriesToSeed);

  res.status(201).json({
    message: `${countries.length} pays ont été ajoutés avec succès`,
    countries,
  });
});

module.exports = {
  getCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
  seedCountries,
}; 
// db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sequelize instance'ı oluşturuyoruz
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql', // Kullanılan veritabanı türü
  pool: {
    max: 5,        // Maksimum bağlantı sayısı
    min: 0,        // Minimum bağlantı sayısı
    acquire: 30000, // Bağlantı elde etme süresi
    idle: 10000     // Boşta kalma süresi
  },
  logging: false // Konsolda SQL sorgularını görmemek için logging'i kapattık
});

// Veritabanı bağlantısının doğrulanması
sequelize.authenticate()
  .then(() => {
    console.log('Veritabanı bağlantısı başarılı!');
  })
  .catch(err => {
    console.error('Veritabanı bağlantısı başarısız:', err);
  });

module.exports = sequelize;

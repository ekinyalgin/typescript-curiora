const jwt = require('jsonwebtoken');
const { User, Role } = require('../models'); 

// Kullanıcı kimlik doğrulaması (hem normal hem admin için)
const authorize = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ message: 'Authentication token is missing' });
    }

    const token = authorizationHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Sequelize modeli üzerinden kullanıcıyı alıyoruz
    const user = await User.findOne({
      where: { id: decodedToken.id },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Kullanıcı bilgilerini req.user'a ekliyoruz
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role ? user.role.name : null,
      email: user.email,
    };

    console.log('Kimlik doğrulandı. Kullanıcı:', req.user);
    next(); // İşleme devam et
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin kontrolü
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    console.log('Kullanıcı admin');
    return next(); // Adminse devam et
  } else {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Opsiyonel kimlik doğrulama (Giriş yapılmamışsa devam eder)
const optionalAuth = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return next(); // Token yoksa doğrulama yapmadan devam et
    }

    const token = authorizationHeader.split(' ')[1];

    // Token doğrulaması başarısız olursa işleme devam et
    if (!token || token === "null" || token === "undefined") {
      return next(); // Token yoksa veya hatalıysa doğrulama olmadan devam et
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Sequelize modeli üzerinden kullanıcıyı alıyoruz
    const user = await User.findOne({
      where: { id: decodedToken.id },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role ? user.role.name : null,
      email: user.email,
    };

    next(); // İşleme devam et
  } catch (error) {
    console.error('Optional Authorization error:', error.message);
    return next(); // Hata olsa bile doğrulama olmadan devam et
  }
};

module.exports = { authorize, isAdmin, optionalAuth };

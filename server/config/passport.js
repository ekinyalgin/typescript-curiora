const GoogleStrategy = require("passport-google-oauth20").Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require("passport");
const jwt = require('jsonwebtoken');
const { User, Role, Language } = require('../models'); 

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      passReqToCallback: true
    },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        const ip_address = req.ip; // IP address obtained from request
        let user = await User.findOne({ where: { google_id: profile.id } });

        if (!user) {
          // Yeni kullanıcı oluşturuluyor
          const username = profile.emails[0].value.split('@')[0];
          user = await User.create({
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            username: username,
            email: profile.emails[0].value,
            google_id: profile.id,
            image: profile.photos[0].value,
            role_id: 2, // Varsayılan rol ID'si (örneğin, 'user' rolü)
            language_id: 1, // Varsayılan dil ID'si (örneğin, 'en' için)
            ip_address: ip_address, // IP adresi kaydediliyor
            last_login: new Date()
          });
        } else {
          // Varolan kullanıcı güncelleniyor
          user.last_login = new Date();
          user.ip_address = ip_address;
          await user.save(); // Güncellemeleri kaydet
        }

        // İlgili role ve language bilgilerini alıyoruz
        const role = await Role.findByPk(user.role_id);
        const language = await Language.findByPk(user.language_id);

        user = user.toJSON(); // Sequelize instance'ı düz bir JS objesine dönüştürüyoruz
        user.role = role ? role.name : null;
        user.language = language ? language.name : null;

        console.log('User role and language before token:', user.role, user.language); // Debugging

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, language: user.language }, // Role ve dil burada ekleniyor
          JWT_SECRET,
          { expiresIn: '1d' }
        );
        const newRefreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

        done(null, { user, token, refreshToken: newRefreshToken });
      } catch (error) {
        console.error("Error during Google authentication:", error);
        done(error, null);
      }
    }
  )
);

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async function (jwt_payload, done) {
    try {
      // Kullanıcıyı users tablosundan alırken ilişkili role ve language bilgilerini de çekiyoruz
      let user = await User.findByPk(jwt_payload.id, {
        include: [
          { model: Role, as: 'role', attributes: ['name'] },
          { model: Language, as: 'language', attributes: ['name'] }
        ]
      });

      if (user) {
        user = user.toJSON(); // Sequelize instance'ı düz bir JS objesine dönüştürüyoruz
        user.role = user.role ? user.role.name : null;
        user.language = user.language ? user.language.name : null;

        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      console.error("Error in JWT strategy:", error);
      return done(error, false);
    }
  })
);

// We still need these for the Google strategy to work correctly
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

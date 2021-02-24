const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;

module.exports = function (myDataBase) {

  passport.use(new LocalStrategy((username, password, done) => {
    console.log(username +' attempted to log in');
    myDataBase.findOne({ username: username }, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false, {message: 'Incorrect username.'});
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) return done(err);
        if (!result) return done(null, false, {message: 'Incorrect password.'});
        return done(null, user);
      })
      
    })
  }));

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne(ObjectID(id), (err, user) => {
      if (err) return done(err);
      done(null, user);
    })
  });

  

}
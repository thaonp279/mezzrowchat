require('dotenv').config(process.cwd + '/sample.env');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { createAlias } = require('./public/js/jazzhero.js');

module.exports = function (app, myDataBase) {
  const saltRounds = process.env.SALT;

  app.route('/').get((req, res) => {
    res.render('pug/index.pug');
  });

  app.route('/signup').get((req, res) => {
    res.render('pug/signup.pug');
  })

  app.route('/jazzhero').get(ensureAuthenticated, (req, res) => {
    res.render('pug/jazzhero.pug', {
      first: req.user.first,
      last: req.user.last === null? req.user.first: req.user.last
    });
  })

  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.sendFile(__dirname +'/views/html/chat.html')
  })

  app
    .post('/chosehero', (req, res, next) => {
      let alias = createAlias(req.body.hero, req.user.first, req.user.last);
      myDataBase
        .findOneAndUpdate(
          {username: req.user.username}, 
          {$set: {
              hero: req.body.hero,
              alias
            }}, 
          {returnOriginal: false},
          (err, doc) => {
            if (err) return next(err);
            next(null, doc.value)
          })
    }, (req, res) => {
      res.redirect('/chat')
    })

  app.post('/login', passport.authenticate('local', { failureRedirect: '/',
  successRedirect: '/jazzhero'}));

  app
    .route('/register')
    .post((req, res, next) => {
      console.log('User '+ req.body.username + ' attemped to register');
      bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        if (err) return next(err);
        myDataBase
          .findOne({username: req.body.username}, (err, user) => {
            if (err) {
              return next(err);
            } else if (user) {
              next(null, user);
            } else {
              var nameArr = req.body.name.split(' ');
              myDataBase.insertOne({
                first: nameArr[0].toLowerCase(),
                last: nameArr.length==1? null: nameArr[nameArr.length-1].toLowerCase(),
                username: req.body.username,
                password: hash
              }, (err, doc) => {
                if (err) return next(err);
                next(null, doc.ops[0])
              })
            }
          }
        )
      })
    }, passport.authenticate('local', {
          failureRedirect: '/',
          successRedirect: '/jazzhero'
      }))


  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.redirect('/')
  }
}
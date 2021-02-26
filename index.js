require('dotenv').config({ path: process.cwd()+'/sample.env' });
const express = require('express');
const session = require('express-session');
const app = express();
const pug = require('pug');

//database
const myDB = require('./database.js');
const { MongoClient } = require('mongodb');

//authentication
const auth = require('./auth.js');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;

//routing
const routes = require('./routes.js');

//socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);

//socket passport connect
const passportSocketIo = require('passport.socketio');

//session store
const MongoStore = require('connect-mongo').default;
const store = MongoStore.create({ mongoUrl: process.env.MONGO_URI});
const cookieParser = require('cookie-parser');

//set up pug, css
app.set('view engine', 'pug');
app.set('view engine', 'html');
app.locals.basedir = process.cwd();
app.use('/public', express.static(process.cwd()+'/public'));

//set up body parser
app.use(express.json());
app.use(express.urlencoded());

//set up store, session
app.use(session({
  secret: process.env.SESSION_SECRET,
  key: 'mezz.sid',
  resave: true,
  saveUninitialized: true,
  cookie: {secure: false},
  store
}));
app.use(passport.initialize());
app.use(passport.session());

//set up socket passport connection
io.use(passportSocketIo.authorize({
  cookieParser,
  key: 'mezz.sid',
  secret: process.env.SESSION_SECRET,
  store,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}))

function onAuthorizeSuccess(data, accept) {
  accept();
}

function onAuthorizeFail(data, accept) {
  accept(new Error('failed connection to socket.io'))
}

//connect database
myDB( async client => {
  const myDataBase = await client.db('mezzrow').collection('users');
  routes(app, myDataBase);
  auth(myDataBase);
  var users = [];
  console.log(users);
  io.on('connection', (socket) => {
    let username = socket.request.user.username;
    let alias = socket.request.user.alias;
    let hero = socket.request.user.hero;

    //if new users (excluding same user but different sockets)
    if (!users.filter(user => user.username===username)[0]){
      
      users.push({username, alias, hero});

      socket.broadcast.emit('user joined', {username, alias, hero});
    }

    socket.join('public');
    socket.join(username);

    socket.emit('welcome', {
      myData: {username, alias, hero},
      currentUsers: users
    });
    
    socket.on('disconnect', async () => {
      try {
        var remainingSockets = await io.in(username).allSockets();
        var isDisconnected = remainingSockets.size === 0;
        if (isDisconnected) {
          users = users.filter(user => user.username!==username);
          io.emit('user left', username);
          console.log('current users after updated: ', users);
        }
      } catch (e) {
        console.log('disconnection error: ', e)
      }
    })

    socket.on('chat message', (data) => {
      io.to(data.to).emit('chat message', {
        content: data.content,
        'from': username,
        'to': data.to
      })
    })

    socket.on('typing', (data) => {
      socket.to(data.to).emit('typing', {
        'to': data.to,
        'from': username
      })
    })

    socket.on('stop typing', (data) => {
      socket.to(data.to).emit('stop typing', {
        'to': data.to,
        'from': username
      })
    });

  })
}).catch(err => {
  app.route('/').get((req, res) => {
    res.send('Something is wrong')
  })
})

http.listen(process.env.PORT, () => {
  console.log('Listening on port '+ process.env.PORT)
})


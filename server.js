const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');

const apiRoutes = express.Router();

const jwt = require('jsonwebtoken');
const config = require('./config');
const User = require('./app/models/user');

const port = process.env.PORT || 8080;
mongoose.connect(config.database);
app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(morgan('dev'));

//route middleware to verify a token
apiRoutes.use((req, res, next) => {
  let token = req.body.token || req.query.token || req.headers['x-access-token'];
  if (token) {
    jwt.verify(token, app.get('superSecret'), (err, decoded) => {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        req.decoded = decoded;
        console.log(req.decoded);
        next();
      }
    });
  } else {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }
});


app.use('/api', apiRoutes);

//Route
app.get('/setup', (req, res) => {
  const nick = new User({
    name: 'guest',
    password: 'guest',
    admin: false
  });

  //save user
  nick.save((err) => {
    if (err) throw err;

    console.log('User saved successfully');
    res.json({ success: true });
  });
});

apiRoutes.get('/', (req, res) => {
  res.json({message: 'Hello new API'});
});

//route to return all users
apiRoutes.get('/users', (req, res) => {
  User.find({}, (err, users) => {
    res.json(users);
  });
});

app.get('/', (req, res) => {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

//auth and token
apiRoutes.post('/authenticate', (req, res) => {
  User.findOne({
    name: req.body.name
  }, (err, user) => {
    if (err) throw err;

    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found'});
    } else if (user) {
      if (user.password !=req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password'});
      } else {
        const payload = {
          admin: user.admin
        };
        const token = jwt.sign(payload, app.get('superSecret'), {
          expiresIn : 60*60*24
        });
        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }
    }
  });
});

app.listen(port);
console.log('Magic happens at http://localhost:' + port);

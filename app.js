// New Relic Monitor
require('./utils/newrelic');

// Set up DB, Express and SocketIO
var express = require('express');
var app     = express();
var server  = require('http').Server(app);
var io      = require('socket.io')(server);

// IRC and Request
var bodyParser   = require('body-parser');
var session      = require('express-session')
var cors         = require('cors');

// Sequalize & Models
var Sequelize = require('sequelize');
var models    = require('./models');

// Slack IRC logic
var slack = require('./slack');

// App settings
app.set('port', process.env.PORT     || Number(8888));
app.set('env',  process.env.NODE_ENV || 'development');

// Constants
app.set('slack_channel_prefix', 'sp-');
app.set('slack_api_url',        'https://slack.com/api');


// Development only
if ('development' === app.get('env')) {
  var errorhandler = require('errorhandler');
  app.use(errorhandler());

  /*
  var sequelize = new Sequelize('oghma', 'root', null, {
    dialect:  'mysql',
    host:     '127.0.0.1',
    logging:  true, //false
  });

  sequelize
    .authenticate()
    .complete(function(err) {
      if (!!err) {
        console.log('Is DB on? Unable to connect to the database: ', err)
      } else {
        console.log('Connection has been established successfully.')
        //require('./migrations/seed')(models); // SEED data
      }
    });
  */
  
}

models.sequelize.sync().success(function () {
  var listening = server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + listening.address().port);
    if(process.env.DYNO)
      console.log('I\'m running at ' + process.env.DYNO);
  });
});

app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cors());

// app.use(cookieParser());
// app.use(evercookie.backend());

// allow access to /build directories and notification
app.use('/',                 express.static(__dirname + '/build'));
app.use('/notification.mp3', express.static(__dirname + '/src/sound/notification.mp3'));
app.use('/notification.ogg', express.static(__dirname + '/src/sound/notification.ogg'));
app.use('/favicon.ico',      express.static(__dirname + '/src/img/favicon.ico'));
app.use('/font',             express.static(__dirname + '/src/font'));

if ('development' === app.get('env')) {
  // HTML client
  app.use('/client-html',  express.static(__dirname + '/client-html'));
}


// linking
require('./socket')(app, io, slack, models); // socketIO logic
require('./client')(app, io, slack, models); // sets up endpoints
require('./utils/bot')(app, slack, models); // Sets bots up


// Catch errors
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Term app
process.on('SIGTERM', function() {
  console.log('Got a SIGTERM');
  slack.disconnectAll();
  server.close.bind(server);
  process.exit(0);
});
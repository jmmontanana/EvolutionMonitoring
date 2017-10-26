var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var os = require("os");
var elasticsearch = require('elasticsearch');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var requestIp = require('request-ip');

var elastic = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
});

function isLoggedIn(req, res, next){
    var ip = req.clientIp;
    console.log(ip);
    if(req.isAuthenticated() || ip.indexOf("127.0.0.1") > -1 || ip.indexOf("192.168.0") > -1 ){
        return next();
    }
    res.redirect('/login');
}

/* root */
var routes = require('./routes/v2/index');

/* excess */
var users = require('./routes/v2/users');
var runtime = require('./routes/v2/runtime');
var statistics = require('./routes/v2/statistics');

/* dreamcloud */
var workflows = require('./routes/v2/dreamcloud/workflows');
var runtime_dreamcloud = require('./routes/v2/dreamcloud/runtime');
var progress = require('./routes/v2/dreamcloud/progress');
var energy = require('./routes/v2/dreamcloud/energy');
var deployments = require('./routes/v2/dreamcloud/deployments');
var statistics_dreamcloud = require('./routes/v2/dreamcloud/statistics');
var resources = require('./routes/v2/dreamcloud/resources');
var status = require('./routes/v2/dreamcloud/status');
var report = require('./routes/v2/dreamcloud/report');
var summary = require('./routes/v2/dreamcloud/summary');

/* excess and dreamcloud */
var experiments = require('./routes/v2/experiments');
var profiles = require('./routes/v2/profiles');
var profiles_dreamcloud = require('./routes/v2/dreamcloud/profiles');
var metrics = require('./routes/v2/metrics');
var metrics_dreamcloud = require('./routes/v2/dreamcloud/metrics');
var units = require('./routes/v2/units');

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('elastic', elastic);
app.set('version', '16.8');
var port = '3030',
  hostname = os.hostname();
// redirect backend hostname to front-end
hostname = hostname.replace('be.excess-project.eu', 'mf.excess-project.eu');
app.set('mf_server', 'http://' + hostname + ':' + port + '/v2');
app.set('pwm_idx', 'power_dreamcloud');

//app.use(logger('combined'));
app.use(logger('combined', {
  skip: function (req, res) { return res.statusCode < 400; }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(requestIp.mw());

/* root */
app.use('/', routes);
app.use('/v2/mf', routes);
app.use('/v2/dreamcloud/mf', routes);

/* excess */
app.use('/v2/mf/users', users.unprotected);
app.use('/v2/mf/users', isLoggedIn, users.protected);
app.use('/v2/mf/runtime', runtime);
app.use('/v2/mf/statistics', statistics);

/* dreamcloud */
app.use('/v2/dreamcloud/mf/workflows', workflows.unprotected);
app.use('/v2/dreamcloud/mf/workflows', isLoggedIn, workflows.protected);
app.use('/v2/dreamcloud/mf/runtime', runtime_dreamcloud);
app.use('/v2/dreamcloud/mf/progress', progress);
app.use('/v2/dreamcloud/mf/energy', energy);
app.use('/v2/dreamcloud/mf/deployments', deployments.unprotected);
app.use('/v2/dreamcloud/mf/deployments', isLoggedIn, deployments.protected);
app.use('/v2/dreamcloud/mf/statistics', statistics_dreamcloud);
app.use('/v2/dreamcloud/mf/resources', resources.unprotected);
app.use('/v2/dreamcloud/mf/resources', isLoggedIn, resources.protected);
app.use('/v2/dreamcloud/mf/status', status.unprotected);
app.use('/v2/dreamcloud/mf/status', isLoggedIn, status.protected);
app.use('/v2/dreamcloud/mf/report', report);
app.use('/v2/dreamcloud/mf/summary', summary);

/* both */
app.use('/v2/mf/experiments', experiments.unprotected);
app.use('/v2/mf/experiments', isLoggedIn, experiments.protected);
app.use('/v2/mf/profiles', profiles);
app.use('/v2/mf/metrics', isLoggedIn, metrics);
app.use('/v2/mf/units', units.unprotected);
app.use('/v2/mf/units', isLoggedIn, units.protected);
app.use('/v2/dreamcloud/mf/experiments', experiments.unprotected);
app.use('/v2/dreamcloud/mf/experiments', isLoggedIn, experiments.protected);
app.use('/v2/dreamcloud/mf/profiles', profiles_dreamcloud);
app.use('/v2/dreamcloud/mf/metrics', isLoggedIn, metrics_dreamcloud);

/* catch 404 and forward to error handler */
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  next(err);
});

// error handlers

// development error handler
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    //res.status(err.status || 500);
    var error = {};
    error.error = err;
    res.json(error);
  });
}

// production error handler
app.use(function(err, req, res, next) {
  //res.status(err.status || 500);
  var error = {};
  error.error = err;
  res.json(error);
});

passport.use(new Strategy(
  function(username, password, cb) {
    var bodyString = '{'+
      '"query": {' +
        '"match": {' +
          '"username":' + '"' + username + '"' +
        '}'+
      '}' +
    '}';

    elastic.search({
      index: 'credentials',
      type: 'user',
      body: bodyString
    },function(error, response){
      if (error || response.hits.total === 0) {
        return cb('Invalid username or password.');
      } else {
        if(password === response.hits.hits[0]._source.password) {
          return cb(null, response.hits.hits[0]._source);
        }
        else {
          return cb('Invalid username or password.', false);
        }
      }
    });
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

module.exports = app;

var express = require('express');
var passport = require('passport');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    var json = {};
    json.message = 'ATOM API server is up and running.';
    json.release = req.app.get('version');
    json.versions = [ 'v1, v2' ];
    res.json(json);
});

//curl -c cookie.txt -d "username=XXXXX&password=YYYYYY" -XPOST localhost:3030/v2/mf/login
router.post('/login',
  passport.authenticate('local', { failureRedirect: '/login',
                                   failureFlash: true}),
  function(req, res) {
    res.json('logged in successfully!');
  });

//curl -b cookie.txt -XPOST localhost:3030/v2/mf/logout
router.post('/logout',
  function(req, res){
    req.logout();
    res.json('logged out!');
  });

//curl -b cookie.txt -XGET localhost:3030/v2/mf/testing
router.get('/testing',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.json('You have logged in.');
  });

module.exports = router;

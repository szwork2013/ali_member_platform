'use strict';

//dependencies
var config = require('./config'),
    express = require('express'),
    mongoStore = require('connect-mongo')(express),
    http = require('http'),
    path = require('path'),
    passport = require('passport'),
    passport_ali_discuz = require('passport-ali_discuz'),
	mongoose = require('mongoose'),
    helmet = require('helmet'),
    oauthserver = require('node-oauth2-server');
var MemStore = express.session.MemoryStore;
var fs = require('fs');

var oauth = oauthserver({
    model: require('./models/appkey'),
    allow: ['/', '/login', '/logout', '/token', '/apply', '/approve', '/stylesheets/*'],
    grants: ['password', 'refresh_token'],
    accessTokenLifetime: 31536000,
    debug: true
});
var app = express();

//keep reference to config
app.config = config;


//setup the web server
app.server = http.createServer(app);


//setup mongoose
app.db = mongoose.createConnection(config.mongodb.uri);
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function () {
  //and... we have a data store
});

//config data models
require('./models')(app, mongoose);

//setup the session store
app.sessionStore = new mongoStore({ url: config.mongodb.uri });

//config express in all environments
app.configure(function(){
  //settings
  app.disable('x-powered-by');
  app.set('port', config.port);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('strict routing', true);
  app.set('project-name', config.projectName);
  app.set('company-name', config.companyName);
  app.set('system-email', config.systemEmail);
  app.set('crypto-key', config.cryptoKey);
  app.set('require-account-verification', config.requireAccountVerification);

  //smtp settings
  app.set('smtp-from-name', config.smtp.from.name);
  app.set('smtp-from-address', config.smtp.from.address);
  app.set('smtp-credentials', config.smtp.credentials);

  //twitter settings
  app.set('twitter-oauth-key', config.oauth.twitter.key);
  app.set('twitter-oauth-secret', config.oauth.twitter.secret);

  //github settings
  app.set('github-oauth-key', config.oauth.github.key);
  app.set('github-oauth-secret', config.oauth.github.secret);

  //facebook settings
  app.set('facebook-oauth-key', config.oauth.facebook.key);
  app.set('facebook-oauth-secret', config.oauth.facebook.secret);

  //weibo settings
  app.set('weibo-oauth-key', config.oauth.weibo.key);
  app.set('weibo-oauth-secret', config.oauth.weibo.secret);

  //qq settings
  app.set('qq-oauth-key', config.oauth.qq.key);
  app.set('qq-oauth-secret', config.oauth.qq.secret);
  
  //discuz
  app.set('ali_discuz-oauth-key', config.oauth.ali_discuz.key);
  app.set('ali_discuz-oauth-secret', config.oauth.ali_discuz.secret);
  
  //oauth
  app.set('oauth', oauth);

  //middleware
  app.use(express.bodyParser()); // REQUIRED
  app.use(express.logger('dev'));
  app.use(express.compress());
  app.use(express.favicon(__dirname + '/public/favicon.ico'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded());
  app.use(express.json());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.cryptoKey,
    store: app.sessionStore
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  helmet.defaults(app);
  
  //setting ali_discuz_passport
  app.use(passport_ali_discuz.init(config.oauth.ali_discuz.host));
  
  
  //response locals
  app.use(function(req, res, next) {
    res.locals.user = {};
    res.locals.user.defaultReturnUrl = req.user && req.user.defaultReturnUrl();
    res.locals.user.username = req.user && req.user.username;
    next();
  });

  //mount the routes
  app.use(app.router);

  //error handler
  app.use(require('./views/http/index').http500);
  
  //oauth
  app.use(oauth.handler());
  app.use(oauth.errorHandler());

  //global locals
  app.locals.projectName = app.get('project-name');
  app.locals.copyrightYear = new Date().getFullYear();
  app.locals.copyrightName = app.get('company-name');
  app.locals.cacheBreaker = 'br34k-01';
});

//config express in dev environment
app.configure('development', function(){
  app.use(express.errorHandler());
});
//setup passport
require('./passport')(app, passport);

//route requests
require('./routes')(app, passport);

//setup utilities
app.utility = {};
app.utility.sendmail = require('drywall-sendmail');
app.utility.slugify = require('drywall-slugify');
app.utility.workflow = require('drywall-workflow');


//初始化MySql数据库连接
//var config = require('./config.json');
//var db = require('mapper');
//db.connect(config.db_config, {verbose: true});

//接收请求并进行操作
//var controller = require('./controllers/router');
//controller(app, db);

//listen up
app.server.listen(app.get('port'), function(){
  //and... we're live
});

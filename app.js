/* jshint -W079 */
/* jshint -W020 */
/* eslint no-console: [2, { allow: ["info", "warn", "error"] }] */

'use strict';
var _ = require('lodash');
var urlencode = require('urlencode');
var request = require('request');
var moment = require('moment');
var swig = require('swig');
var express = require('express');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var methodOverride = require('method-override');
var os = require('os');
var path = require('path');
var uuid = require('uuid');
var multer = require('multer');
var UPYUN = require('upyun');
var crypto = require('crypto');
var fs = require('fs');

var app = express();

/* env */
var isDevelopment = app.get('env') === 'development';
var domain = 'm.moretao.com';

/* redis */
var redisHost = (isDevelopment ? '127.0.0.1' : '127.0.0.1');
var redis = require('redis'), redisClient = redis.createClient('6379', redisHost);

redisClient.on('error', function(err) { console.error(err); });
redisClient.on('connect', function() {});

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(express.static(__dirname + (isDevelopment ? '/assets' : '/public')));
app.use(bodyParser.json({ limit: '3mb' }));
app.use(bodyParser.urlencoded({ limit:'3mb', extended:true }));
app.use(flash());

app.use(methodOverride());

var systemSecretKey = process.env.SECRET_KEY_BASE;

app.use(cookieParser(systemSecretKey));

/* 时间地区 */
moment.locale('zh-cn');

// multer
var storage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, os.tmpdir()); },
  filename: function(req, file, cb) { cb(null, uuid.v4() + path.extname(file.originalname));}
});
var uploader = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// 又拍云
var upyun = new UPYUN('moretao-dev', 'moretao', 'zanmeichuanmei888', 'v0', 'legacy');

// require route files
var utils = {
  domain: domain,
  app: app,
  redis: redis,
  redisClient: redisClient,
  systemSecretKey: systemSecretKey,
  uploader: uploader,
  upyun: upyun,
  moment: moment,
  isDevelopment: isDevelopment,
  logged: logged
};

// require orm file
var orm = require('./models/orm')(utils);

// require route files
var admins = require('./routes/admins')(utils);
var users = require('./routes/users')(utils);
var fragments = require('./routes/fragments')(utils);
var accounts = require('./routes/accounts')(utils);
var addresses = require('./routes/addresses')(utils);
var messages = require('./routes/messages')(utils);
var complaints = require('./routes/complaints')(utils);
var favorites = require('./routes/favorites')(utils);
var topics = require('./routes/topics')(utils);
var photos = require('./routes/photos')(utils);
var categories = require('./routes/categories')(utils);
var commodities = require('./routes/commodities')(utils);
var invitationCodes = require('./routes/invitation_codes')(utils);
var tags = require('./routes/tags')(utils);
var ads = require('./routes/ads')(utils);
var tabs = require('./routes/tabs')(utils);
var publishtasks = require('./routes/publishtasks')(utils);
var searchHistories = require('./routes/search_histories')(utils);
var activities = require('./routes/activities')(utils);
var lotteries = require('./routes/lotteries')(utils);
var postcards = require('./routes/postcards')(utils);
var versions = require('./routes/versions')(utils);
var imports = require('./routes/imports')(utils);
var batch = require('./routes/batch')(utils);
var makefiles = require('./routes/makefiles')(utils);
var application = require('./routes/application')(utils);
var schedule = require('./routes/schedule')(utils);

// view engine setup
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

// session setup
var session = require('express-session');
var RedisStore = require('connect-redis')(session);

var sessionOptions = {
  secret: systemSecretKey,
  saveUninitialized: true,
  resave: false,
  proxy: false,
  rolling: true,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, domain: isDevelopment ? '' : '', secure: false }
};

app.set('view cache', isDevelopment);
swig.setDefaults({ cache: (isDevelopment ? false : 'memory'), locals: { env:app.get('env'), domain:domain, version:moment().format('YYYYMMDDHHMM'), moment:moment } });

app.use(session(_.extend({ store: new RedisStore({
  client: redisClient,
  ttl: 30 * 24 * 60 * 60
}) }, sessionOptions)));

// passport setup
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;

app.use(passport.initialize());
app.use(passport.session());

// 本地用户
passport.use(new LocalStrategy(function(username, password, done) {
  var query = { $or: [{ nickname : username }, { mobile: username }] };

  Admin.findOne(query, function(err, admin) {
    if (err) { return done(err); }
    if (!admin) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    if (!admin.checkPassword(password)) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, admin);
  });
}));

passport.serializeUser(function(admin, done) { done(null, admin.id); });
passport.deserializeUser(function(id, done) {
  Admin.findOne({ _id:id }, function(err, admin) { done(err, admin); });
});

// 本地用户
app.get('/signin', function(req, res) {
  res.render('signin', { message:req.flash('error') });
});

app.post('/signin', passport.authenticate('local', {
  failureFlash: true,
  failureRedirect: '/signin'
}), function(req, res) {
  req.user.last_sign_in_at = new Date();
  req.user.last_sign_in_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  req.user.save(function(err) {
    res.redirect('/');
  });
});

/* GET logout page. */
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

/* 全局转发器 Get */
app.get('/api/outdata', function(req, res) {
  var url = urlencode.decode(req.query.url);
  request.get(url).pipe(res);
});

/* 全局转发器 Post */
app.post('/api/outdata', function(req, res) {
  var url = urlencode.decode(req.body.url);
  request.post(url).form(req.body).pipe(res);
});

// routes settings
app.use(admins);
app.use(users);
app.use(accounts);
app.use(fragments);
app.use(addresses);
app.use(messages);
app.use(complaints);
app.use(favorites);
app.use(photos);
app.use(topics);
app.use(categories);
app.use(commodities);
app.use(invitationCodes);
app.use(tags);
app.use(ads);
app.use(tabs);
app.use(publishtasks);
app.use(searchHistories);
app.use(activities);
app.use(lotteries);
app.use(postcards);
app.use(versions);
app.use(batch);
app.use(imports);
app.use(makefiles);
app.use(application);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  var full = req.protocol + '://' + req.get('host') + req.originalUrl;
  console.error('404 URL: ' + full);
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(isDevelopment) {
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    var code = parseInt(err.statusCode);
    res.status(code);
    res.render('error', { error: err });
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
  });
}

/* 判断用户是否登录 */
function logged(req, res, next) {
  if (req.isAuthenticated()) return next();
  else {
    res.redirect('/signin');
    return null;
  }
}

module.exports = app;

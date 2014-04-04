'use strict';


module.exports = function (server, db) {
    //系统请求处理
    var system = require('./system');
    system(server);

  // Appkey APIs, only for test
  var Appkey = require('../models/appkey');
  server.get('/api/appkey/:id', function(req, res, next) {
      Appkey.findById(req.params.id, function(err, appkey) {
        if (err) return next(err);
        res.json(appkey);
      });
    });
    
  server.get('/api/appkey/client_id/:cid', function(req, res, next) {
      Appkey.findByClientId(req.params.cid, function(err, appkey) {
        if (err) return next(err);
        res.json(appkey);
      });
    });

  server.get('/api/appkey/client_secret/:cs', function(req, res, next) {
      Appkey.findByClientSecret(req.params.cs, function(err, appkey) {
        if (err) return next(err);
        res.json(appkey);
      });
    });
    
  server.get('/api/appkey/access_token/:at', function(req, res, next) {
      Appkey.findByAccessToken(req.params.at, function(err, appkey) {
        if (err) return next(err);
        res.json(appkey);
      });
    });
    
  server.get('/api/appkey/refresh_token/:rt', function(req, res, next) {
      Appkey.findByRefreshToken(req.params.rt, function(err, appkey) {
        if (err) return next(err);
        res.json(appkey);
      });
    });

  server.get('/api/appkey/client/:r', function(req, res, next) {
    var querystring = require('querystring');
    var urlparser = require('url');
    var ParamsWithValue = querystring.parse(urlparser.parse(req._url).query);
    console.log("\n\tParamsWithValue.cid:" + ParamsWithValue.cid);
    console.log("\tParamsWithValue.csecret:" + ParamsWithValue.csecret);
    Appkey.findByClient(ParamsWithValue.cid, ParamsWithValue.csecret,  function(err, appkey) {
        if (err) return next(err);
        res.json(appkey);
      });
    });
};

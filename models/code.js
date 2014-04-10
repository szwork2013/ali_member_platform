var Appkey = module.exports;

//初始化数据库连接
var bcrypt = require('bcrypt');


Appkey.findAll = function(limit, callback){
  if(arguments.length === 1) {  //limit is optional
    callback = limit;
    limit = null;
  }
  if(limit != null) {
    appkey.all().page(limit.start, limit.end, function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
  } else {
    appkey.all(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
  }
};

Appkey.find = function(params, callback){
  appkey.where(params, function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};

Appkey.findById = function(id, callback){
  appkey.findById(id, function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};

Appkey.findByClient = function(cid, csecret, callback){
  appkey.where({'client_id': cid, 'client_secret': csecret}).one(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};

Appkey.findByClientId = function(cid, callback){
  appkey.where({'client_id': cid}).one(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};

Appkey.findByClientSecret = function(cs, callback){
  appkey.where({'client_secret': cs}).one(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};

Appkey.findByAccessToken = function(at, callback){
  appkey.where({'access_token': at}).one(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};

Appkey.findByRefreshToken = function(rt, callback){
  appkey.where({'refresh_token': rt}).one(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, data);
        else callback('找不到相关数据');
      }
    });
};


// Implement the methods required by node-oauth2-server:
// https://github.com/thomseddon/node-oauth2-server

Appkey.getAccessToken = function(bearerToken, callback) {
  // callback(false, { expires: new Date(), user_id: 1 });
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');
  
  appkey.where({'access_token': bearerToken}).one(function(err, data) {
      if (err) callback(err);
      else {
        if (data) callback(null, {'user_id': data.user_id, 'expires': data.expires});
        else callback('错误：找不到相关数据');
      }
    });
};

Appkey.getClient = function (clientId, clientSecret, callback) {
  // callback(false, { client_id: 'thom' });
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');
  
  appkey.where({'client_id': clientId, 'client_secret': clientSecret}).one(function(err, data) {
    if (err) callback(err);
    else {
      if (data) callback(null, {'client_id': data.client_id});
      else callback('错误：找不到相关数据');
    }
  });
};

Appkey.grantTypeAllowed = function (clientId, grantType, callback) {
  // callback(false, true);
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');
  
  appkey.where({'client_id': clientId}).one(function(err, data) {
    if (err) callback(err);
    else {
      if (data) callback(false, true);  //目前只要有记录，支持全部类型
      else callback('错误：找不到相关数据');
    }
  });
};


Appkey.saveAccessToken = function (accessToken, clientId, userId, expires, callback) {
  // callback();
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');

  appkey.where({'client_id': clientId, 'user_id': userId}).one(function(err, data) {
    if (err) callback(err);
    else {
      if (data) { //记录已存在
        appkey.update()
                  .set({'access_token': accessToken, 'expires': expires})
                  .where({'client_id': clientId, 'user_id': userId})
                  .exec(function (err2, result) {
                    if(err2) callback(err2);
                    else if(result.affectedRows == 1) {
                      appkey.disconnect();
                      callback();
                    } else {
                      appkey.disconnect();
                      callback('错误：更新记录失败。Client ID： ' + clientId + ', User ID: ' + userId);
                    }
                  });
      } else {  //尚无记录
        appkey.create({'access_token': accessToken, 
                        'client_id': clientId, 
                        'user_id': userId,
                        'expires': expires},
                  function (err2, result) {
                    if(err2) callback(err2);
                    else if(result.affectedRows == 1) {
                      appkey.disconnect();
                      callback();
                    } else {
                      appkey.disconnect();
                      callback('错误：创建记录失败。AccessToken: ' + accessToken + ', Client ID： ' + clientId + ', User ID: ' + userId);
                    }
                  });
      }
    }
  });
};

Appkey.getUser = function (username, password, callback) {
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');
  user = db.map('users');
  
  user.where({'email': username}).one(function(err, data) {
    if (err) callback(err);
    else {
      if (data) {
        bcrypt.compare(password, data.encrypted_password, function(err2, result){
          if(err2)  callback(err2);
          else {
            if(result) {
              callback(null, {'id': data.id});
            } else {
              callback('错误：找不到相关数据，请检查输入的用户邮箱或密码是否正确。');
            }
          }
        });
      }
      else callback('错误：找不到相关数据，请检查输入的用户邮箱是否正确。');
    }
  });
};


Appkey.saveRefreshToken = function (refreshToken, clientId, userId, expires, callback) {
  // callback();
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');
  
  appkey.where({'client_id': clientId, 'user_id': userId}).one(function(err, data) {
    if (err) callback(err);
    else {
      if (data) { //记录已存在
        appkey.update()
                  .set({'refresh_token': refreshToken, 'expires': expires})
                  .where({'client_id': clientId, 'user_id': userId})
                  .exec(function (err2, result) {
                    if(err2) callback(err2);
                    else if(result.affectedRows == 1) {
                      db.disconnect();
                      callback();
                    } else {
                      db.disconnect();
                      callback('错误：更新记录失败。Client ID： ' + clientId + ', User ID: ' + userId);
                    }
                  });
      } else {  //尚无记录
        db.disconnect();
        callback('错误：记录不存在。Client ID： ' + clientId + ', User ID: ' + userId);
      }
    }
  });
};


Appkey.getRefreshToken = function (refreshToken, callback) {
  // callback(false, {
    // client_id: 'thom',
    // expires: new Date(),
    // user_id: '123'
  // });
  var config = require('../config.json');
  var db = require('mapper');
  db.connect(config.db_config, {verbose: true});
  appkey = db.map('appkeys');

  appkey.where({'refresh_token': refreshToken}).one(function(err, data) {
    if (err) callback(err);
    else {
      if (data) callback(null, {'client_id': data.client_id, 'user_id': data.user_id, 'expires': data.expires});
      else callback('错误：找不到相关数据');
    }
  });
};

Appkey.revokeRefreshToken = function (refreshToken, callback) {
  callback();
};




Appkey.expireRefreshToken = function (refreshToken, callback) {
  callback();
};

/*
    string type
        accessToken or refreshToken
    function callback (error, token)
        mixed error
            Truthy to indicate an error
        string|object|null token
            string indicates success
            null indicates to revert to the default token generator
            object indicates a reissue (i.e. will not be passed to saveAccessToken/saveRefreshToken)
                Must contain the following keys (if object):
                    string access_token OR refresh_token dependant on type
 */
// Appkey.generateToken = function (type, callback) {
//   
// };


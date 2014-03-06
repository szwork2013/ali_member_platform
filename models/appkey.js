var model = module.exports;

//初始化数据库连接
//var config = require('../config.json');
//var mysql = require('mysql');
//var bcrypt = require('bcrypt');
//var crypto = require('crypto');

/*
 * Required
 */

model.getAccessToken = function (bearerToken, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT access_token, client_id, expires, user_id FROM appkeys ' +
        'WHERE access_token = ?', [bearerToken], function (err, result) {
      // This object will be exposed in req.oauth.token
      // The user_id field will be exposed in req.user (req.user = { id: "..." }) however if
      // an explicit user object is included (token.user, must include id) it will be exposed
      // in req.user instead
      if(err) {
        callback(err);
        db.end();
      } else {
        callback(err, result[0]);
        console.log('getAccessToken: ', result);
        db.end();
      }
    });
};

model.createClient = function (uid, redirect_uri, callback) {
  var uuid = require('node-uuid');
  var crypto = require('crypto');
  var hasher=crypto.createHash("md5");  
  var db = mysql.createConnection(config.db_config);
  
  db.connect();
  // 首先确认用户Email
  db.query('SELECT email FROM users WHERE id = ?', [uid], function(err, result){
    console.log('Check uid: ', uid);
    if(err) {        
      callback(err);
      db.end();
    } else {
      clientId = uuid.v1(); // 生成Client ID
      clientSecret = hasher.update(uid+result.email+clientId).digest('hex');  // 生成Client Secret
      console.log('Generated client_id: ', clientId);
      console.log('Generated client_secret: ', clientSecret);
      // 确认数据库中不存在已有记录
      db.query('SELECT client_id, client_secret, redirect_uri FROM appkeys WHERE ' +
            'client_id = ? AND client_secret = ?', [clientId, clientSecret],
            function (err2, result2) {
        console.log('If there is already a record: ', result2);
        if(err2) {        
          callback(err2);
          db.end();
        } else if(result2[0] == null) {  // 不存在记录
          // 插入记录
          db.query('INSERT INTO appkeys (`user_id`,`client_id`,`client_secret`,`redirect_uri`) VALUES (?, ?, ?, ?)',
            [uid, clientId, clientSecret, redirect_uri],
            function(err3, result3) {
              if(err3) {
                callback(err3);
                db.end();
              } else {  // 回调
                callback(err3, {'client_id': clientId, 'client_secret': clientSecret, 'redirect_uri': redirect_uri});
                console.log('createClient: ', result3);
                db.end();
              }
            }); // end db.query('INSERT INTO appkeys
        } else {  // 存在记录
          callback(err2, result2[0]);
          console.log('createClient, already existed: ', result2);
          db.end();
        }
      }); // end db.query('SELECT client_id, client_secret, redirect_uri
    }
  }); // end db.query('SELECT email FROM users WHERE uid = ?'
};

model.getClient = function (clientId, clientSecret, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT client_id, client_secret, redirect_uri FROM appkeys WHERE ' +
        'client_id = ? AND client_secret = ?', [clientId, clientSecret],
        function (err, result) {
      // This object will be exposed in req.oauth.client
      if(err) {        
        callback(err);
        db.end();
      } else {
        callback(err, result[0]);
        console.log('getClient: ', result);
        db.end();
      }
    });
};

// This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
// it gives an example of how to use the method to resrict certain grant types
var authorizedClientIds = ['abc1', 'def2'];
model.grantTypeAllowed = function (clientId, grantType, callback) {
	// if (grantType === 'password') {
		// return callback(false, authorizedClientIds.indexOf(clientId.toLowerCase()) >= 0);
	// }

  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT client_id FROM appkeys WHERE client_id = ?', 
        [clientId],
        function (err, result) {
      // This object will be exposed in req.oauth.client
      if(err) {        
        callback(err);
        db.end();
      } else {  // 有结果就返回支持
        callback(false, result[0] != null);
        db.end();
      }
    });
};

model.saveAccessToken = function (accessToken, clientId, userId, expires, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT id FROM appkeys WHERE client_id = ? AND user_id = ?', [clientId, userId], function(err, result) {
    if(result) {
      db.query('UPDATE appkeys SET access_token = ?, expires = ? ' +
        'WHERE client_id = ? AND user_id = ?', 
        [accessToken, expires, clientId, userId],
        function (err2, result2) {
          callback(err2);
          console.log('saveAccessToken: update: ', result2);
          db.end();
        });
    } else {
      db.query('INSERT INTO appkeys(access_token, client_id, user_id, ' +
        'expires) VALUES (?, ?, ?, ?)', [accessToken, clientId, userId, expires],
        function (err2, result2) {
          callback(err2);
          console.log('saveAccessToken: insert:  ', result2);
          db.end();
        });
    }
  });
};

model.saveRefreshToken = function (refreshToken, clientId, userId, expires, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT id FROM appkeys WHERE client_id = ? AND user_id = ?', [clientId, userId], function(err, result) {
    if(result) {
      db.query('UPDATE appkeys SET refresh_token = ?, client_id = ?, user_id = ?, ' +
        'expires = ? WHERE client_id = ? AND user_id = ?', 
        [refreshToken, clientId, userId, expires, clientId, userId],
        function (err2, result2) {
          callback(err2);
          console.log('saveAccessToken: update : ', result2);
          db.end();
        });
    } else {
      db.query('INSERT INTO appkeys(refresh_token, client_id, user_id, ' +
        'expires) VALUES (?, ?, ?, ?)', [refreshToken, clientId, userId, expires],
        function (err2, result2) {
          callback(err2);
          console.log('saveRefreshToken: ', result2);
          db.end();
        });
    }
  });
};

/*
 * Required to support password grant type
 */
model.getUser = function (username, password, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT users.id AS id, users_roles.role_id AS role_id FROM users LEFT JOIN users_roles ON users.id = users_roles.user_id WHERE users.email = ?', username, function (err, result) {
    if(result) {
      db.query('SELECT encrypted_password FROM users WHERE email = ?', [username], function (err2, result2) {
        if(result2) {
          bcrypt.compare(password, result2[0].encrypted_password, function(err3, result3){
            if(err3) {
              callback(err3);
              db.end();
            }
            else {
              if(result3) {
                if(result[0].role_id) { // 用户有角色设定
                  callback(null, {'id': result[0].id, 'role': result[0].role_id});
                  console.log('getUser: ', result[0]);
                  db.end();
                } else {  // 用户未设定角色
                  callback(null, {'id': result[0].id, 'role': -1});
                  console.log('getUser: ', result[0]);
                  db.end();
                }
              } else {
                callback('错误：找不到相关数据，请检查输入的用户邮箱或密码是否正确。');
                console.log('错误：找不到相关数据，请检查输入的用户邮箱或密码是否正确。');
                db.end();
              }
            }
          });
        }
      });
    }
  });
};

model.getRefreshToken = function (refreshToken, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT client_id, client_secret, user_id, expires FROM appkeys WHERE ' +
        'refresh_token = ?', [refreshToken],
        function (err, result) {
      if(err) {
        db.end();
        callback(err);
      } else {
        db.end();
        callback(err, result[0]);
        console.log('getRefreshToken: ', result);
      }
    });
};


model.getAllByUid = function (uid, callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT * FROM appkeys ' +
        'WHERE user_id = ?', [uid], function (err, result) {
      if(err) {
        callback(err);
        db.end();
      } else {
        callback(err, result[0]);
        console.log('getAllByUid: ', result);
        db.end();
      }
    });
};


model.getAllPending = function (callback) {
  var db = mysql.createConnection(config.db_config);
  db.connect();
  db.query('SELECT k.id, k.client_id, k.redirect_uri, u.email, u.name FROM appkeys AS k INNER JOIN users AS u ON k.user_id = u.id ' +
    'WHERE ISNULL(k.access_token) AND NOT ISNULL(k.redirect_uri) AND NOT ISNULL(k.client_id)',
    function (err, result) {
      if(err) {
        callback(err);
        db.end();
      } else {
        callback(err, result);
        console.log('getAllPending: ', result);
        db.end();
      }
    });
};

model.generateToken = function (callback) {
  crypto.randomBytes(256, function (ex, buffer) {
    if (ex) return callback(error('server_error'));

    callback(false, crypto.createHash('sha1').update(buffer).digest('hex'));
  });
};
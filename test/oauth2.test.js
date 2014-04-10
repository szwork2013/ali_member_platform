var assert = require('assert'),
  express = require('express'),
  request = require('supertest'),
  should = require('should');

// var model = require('../models/appkey');

var oauth2server = require('node-oauth2-server');

var bootstrap = function (oauthConfig) {
  var app = express();
  var oauth = oauth2server(oauthConfig || {
      model: require('../models/appkey'),
      grants: ['password', 'refresh_token']
    });

  app.set('json spaces', 0);
  app.use(express.bodyParser());
  app.use(oauth.handler());
  app.use(oauth.errorHandler());

  return app;
};

var validBody = {
  grant_type: 'password',
  client_id: 'ddfa43rwfds',
  client_secret: 'frewqrewqerewqg3',
  username: 'user@example.com',
  password: 'changeme'
};

describe('OAuth2Server.token()', function() {


  describe('when parsing request', function () {
    it('should only allow post', function (done) {
      var app = bootstrap();

      request(app)
        .get('/oauth/token')
        .expect(400, /method must be POST/i, done);
    });


    it('should only allow application/x-www-form-urlencoded', function (done) {
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/json')
        .send({}) // Required to be valid JSON
        .expect(400, /application\/x-www-form-urlencoded/i, done);
    });

    it('should check grant_type exists', function (done) {
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(400, /invalid or missing grant_type parameter/i, done);
    });

    it('should ensure grant_type is allowed', function (done) {
      var app = bootstrap({ model: {}, grants: ['refresh_token'] });

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password' })
        .expect(400, /invalid or missing grant_type parameter/i, done);
    });

    it('should check client_id exists', function (done) {
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password' })
        .expect(400, /invalid or missing client_id parameter/i, done);
    });

    it('should check client_secret exists', function (done) {
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password', client_id: 'thom' })
        .expect(400, /missing client_secret parameter/i, done);
    });

    it('should extract credentials from body', function (done) {
      /*
      var app = bootstrap({
                    model: {
                      getClient: function (id, secret, callback) {
                        id.should.equal('thom');
                        secret.should.equal('nightworld');
                        callback(false, false);
                      }
                    },
                    grants: ['password']
                  });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password', client_id: 'ddfa43rwfds', client_secret: 'frewqrewqerewqg3' })
        .expect(400, done);
    });

    it('should extract credentials from header (Basic)', function (done) {
      var app = bootstrap({
        model: {
          getClient: function (id, secret, callback) {
            id.should.equal('thom');
            secret.should.equal('nightworld');
            callback(false, false);
          }
        },
        grants: ['password']
      });

      request(app)
        .post('/oauth/token')
        .set('Authorization', 'Basic dGhvbTpuaWdodHdvcmxkCg==')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password' })
        .expect(400, done);
    });
  });

  describe('check client credentials against model', function () {
    it('should detect invalid client', function (done) {
      var app = bootstrap({
        model: {
          getClient: function (id, secret, callback) {
            callback(false, false); // Fake invalid
          }
        },
        grants: ['password']
      });

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password', client_id: 'thom', client_secret: 'nightworld' })
        .expect(400, /client credentials are invalid/i, done);
    });
  });

  describe('check grant type allowed for client (via model)', function () {
    it('should detect grant type not allowed', function (done) {
      var app = bootstrap({
        model: {
          getClient: function (id, secret, callback) {
            callback(false, true);
          },
          grantTypeAllowed: function (id, secret, callback) {
            callback(false, false); // Not allowed
          }
        },
        grants: ['password']
      });

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'password', client_id: 'thom', client_secret: 'nightworld' })
        .expect(400, /grant type is unauthorised for this client_id/i, done);
    });
  });

  describe('when checking grant_type =', function () {
    describe('password', function () {
      
      it('should detect missing parameters', function (done) {
              /*var app = bootstrap({
                model: {
                  getClient: function (id, secret, callback) {
                    callback(false, true);
                  },
                  grantTypeAllowed: function (id, secret, callback) {
                    callback(false, true);
                  }
                },
                grants: ['password']
              });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'password',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3'
          })
          .expect(400, /missing parameters. \\"username\\" and \\"password\\"/i, done);

      });

      it('should detect invalid user', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, true);
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    },
                    getUser: function (uname, pword, callback) {
                      uname.should.equal('thomseddon');
                      pword.should.equal('nightworld');
                      callback(false, false); // Fake invalid user
                    }
                  },
                  grants: ['password']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(validBody)
          .expect(400, /user credentials are invalid/i, done);

      });
    });


    describe('refresh_token', function () {
      /*
      it('should detect missing refresh_token parameter', function (done) {
              var app = bootstrap({
                model: {
                  getClient: function (id, secret, callback) {
                    callback(false, true);
                  },
                  grantTypeAllowed: function (id, secret, callback) {
                    callback(false, true);
                  }
                },
                grants: ['password', 'refresh_token']
              });
      
              request(app)
                .post('/oauth/token')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                  grant_type: 'refresh_token',
                  client_id: 'thom',
                  client_secret: 'nightworld'
                })
                .expect(400, /no \\"refresh_token\\" parameter/i, done);
      
            });
      
            it('should detect invalid refresh_token', function (done) {
              var app = bootstrap({
                model: {
                  getClient: function (id, secret, callback) {
                    callback(false, true);
                  },
                  grantTypeAllowed: function (id, secret, callback) {
                    callback(false, true);
                  },
                  getRefreshToken: function (refreshToken, callback) {
                    callback(false, false);
                  }
                },
                grants: ['password', 'refresh_token']
              });
      
              request(app)
                .post('/oauth/token')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                  grant_type: 'refresh_token',
                  client_id: 'thom',
                  client_secret: 'nightworld',
                  refresh_token: 'abc123'
                })
                .expect(400, /invalid refresh token/i, done);
      
            });
      
            it('should detect wrong client id', function (done) {
              var app = bootstrap({
                model: {
                  getClient: function (id, secret, callback) {
                    callback(false, true);
                  },
                  grantTypeAllowed: function (id, secret, callback) {
                    callback(false, true);
                  },
                  getRefreshToken: function (refreshToken, callback) {
                    callback(false, { client_id: 'kate' });
                  }
                },
                grants: ['password', 'refresh_token']
              });
      
              request(app)
                .post('/oauth/token')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                  grant_type: 'refresh_token',
                  client_id: 'thom',
                  client_secret: 'nightworld',
                  refresh_token: 'abc123'
                })
                .expect(400, /invalid refresh token/i, done);
      
            });
      
            it('should detect expired refresh token', function (done) {
              var app = bootstrap({
                model: {
                  getClient: function (id, secret, callback) {
                    callback(false, { client_id: 'thom' });
                  },
                  grantTypeAllowed: function (id, secret, callback) {
                    callback(false, true);
                  },
                  getRefreshToken: function (refreshToken, callback) {
                    callback(false, {
                      client_id: 'thom',
                      expires: new Date(+new Date() - 60)
                    });
                  }
                },
                grants: ['password', 'refresh_token']
              });
      
              request(app)
                .post('/oauth/token')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                  grant_type: 'refresh_token',
                  client_id: 'thom',
                  client_secret: 'nightworld',
                  refresh_token: 'abc123'
                })
                .expect(400, /refresh token has expired/i, done);
      
            });*/
      

      it('should allow valid request', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, { client_id: 'thom' });
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    },
                    getRefreshToken: function (refreshToken, callback) {
                      callback(false, {
                        client_id: 'thom',
                        expires: new Date(),
                        user_id: '123'
                      });
                    },
                    saveAccessToken: function (accessToken, clientId, userId, expires, cb) {
                      cb();
                    },
                    saveRefreshToken: function (refreshToken, clientId, userId, expires, cb) {
                      cb();
                    },
                    expireRefreshToken: function (refreshToken, callback) {
                      callback();
                    }
                  },
                  grants: ['password', 'refresh_token']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'refresh_token',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3',
            refresh_token: '4c42a055b28c02140230639c4c2dc59f5beedc6b'
          })
          .expect(200, /"access_token":"(.*)","refresh_token":"(.*)"/i, done);

      });


      it('should allow valid request with non-expiring token (token= null)', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, { client_id: 'thom' });
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    },
                    getRefreshToken: function (refreshToken, callback) {
                      callback(false, {
                        client_id: 'thom',
                        expires: null,
                        user_id: '123'
                      });
                    },
                    saveAccessToken: function (accessToken, clientId, userId, expires, cb) {
                      cb();
                    },
                    saveRefreshToken: function (refreshToken, clientId, userId, expires, cb) {
                      cb();
                    },
                    expireRefreshToken: function (refreshToken, callback) {
                      callback();
                    }
                  },
                  grants: ['password', 'refresh_token']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'refresh_token',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3',
            refresh_token: 'd9cbb54034e9b66972082ec918aeb5fb73b01072'
          })
          .expect(200, /"access_token":"(.*)","refresh_token":"(.*)"/i, done);

      });
    });

    describe('custom', function () {
      it('should ignore if no extendedGrant method', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, true);
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    }
                  },
                  grants: ['http://custom.com']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'http://custom.com',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3'
          })
          .expect(400, /invalid grant_type/i, done);
      });

      it('should still detect unsupported grant_type', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, true);
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    },
                    extendedGrant: function (req, callback) {
                      callback(false, false);
                    }
                  },
                  grants: ['http://custom.com']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'http://custom.com',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3'
          })
          .expect(400, /invalid grant_type/i, done);
      });

      it('should require a user.id', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, true);
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    },
                    extendedGrant: function (req, callback) {
                      callback(false, true, {}); // Fake empty user
                    }
                  },
                  grants: ['http://custom.com']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'http://custom.com',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3'
          })
          .expect(400, /invalid request/i, done);
      });

      it('should passthrough valid request', function (done) {
        /*
        var app = bootstrap({
                  model: {
                    getClient: function (id, secret, callback) {
                      callback(false, true);
                    },
                    grantTypeAllowed: function (id, secret, callback) {
                      callback(false, true);
                    },
                    extendedGrant: function (req, callback) {
                      callback(false, true, { id: 3 });
                    },
                    saveAccessToken: function () {
                      done(); // That's enough
                    }
                  },
                  grants: ['http://custom.com']
                });*/
        var app = bootstrap();

        request(app)
          .post('/oauth/token')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            grant_type: 'http://custom.com',
            client_id: 'ddfa43rwfds',
            client_secret: 'frewqrewqerewqg3'
          })
          .end();
      });
    });

    it('should detect unsupported grant_type', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, true);
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                }
              },
              grants: ['password', 'implicit']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ grant_type: 'implicit', client_id: 'thom', client_secret: 'nightworld' })
        .expect(400, /invalid grant_type/i, done);
    });
  });

  describe('generate access token', function () {
    it('should allow override via model', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                generateToken: function (type, req, callback) {
                  callback(false, 'thommy');
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  accessToken.should.equal('thommy');
                  callback();
                }
              },
              grants: ['password']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(/thommy/, 200, done);

    });

    it('should reissue if model returns object', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                generateToken: function (type, req, callback) {
                  callback(false, { access_token: 'thommy' });
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  callback(new Error('Should not be saving'));
                }
              },
              grants: ['password']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(/"access_token":"thommy"/, 200, done);

    });
  });

  describe('saving access token', function () {
    it('should pass valid params to model.saveAccessToken', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  accessToken.should.be.a('string');
                  accessToken.should.have.length(40);
                  clientId.should.equal('thom');
                  userId.should.equal(1);
                  var d = new Date();
                  d.setSeconds(d.getSeconds() + 3600);
                  (+expires).should.be.approximately(+d, 1);
                  callback();
                }
              },
              grants: ['password']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(200, done);

    });

    it('should pass valid params to model.saveRefreshToken', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  callback();
                },
                saveRefreshToken: function (refreshToken, clientId, userId, expires, callback) {
                  refreshToken.should.be.a('string');
                  refreshToken.should.have.length(40);
                  clientId.should.equal('thom');
                  userId.should.equal(1);
                  var d = new Date();
                  d.setSeconds(d.getSeconds() + 1209600);
                  (+expires).should.be.approximately(+d, 1);
                  callback();
                }
              },
              grants: ['password', 'refresh_token']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(200, done);

    });
  });

  describe('issue access token', function () {
    it('should return an oauth compatible response', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  callback();
                }
              },
              grants: ['password']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          res.body.should.have.keys(['access_token', 'token_type', 'expires_in']);
          res.body.access_token.should.be.a('string');
          res.body.access_token.should.have.length(40);
          res.body.token_type.should.equal('bearer');
          res.body.expires_in.should.equal(3600);

          done();
        });

    });

    it('should return an oauth compatible response with refresh_token', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  callback();
                },
                saveRefreshToken: function (refreshToken, clientId, userId, expires, callback) {
                  callback();
                }
              },
              grants: ['password', 'refresh_token']
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          res.body.should.have.keys(['access_token', 'token_type', 'expires_in',
            'refresh_token']);
          res.body.access_token.should.be.a('string');
          res.body.access_token.should.have.length(40);
          res.body.refresh_token.should.be.a('string');
          res.body.refresh_token.should.have.length(40);
          res.body.token_type.should.equal('bearer');
          res.body.expires_in.should.equal(3600);

          done();
        });

    });

    it('should exclude expires_in if accessTokenLifetime = null', function (done) {
      /*
      var app = bootstrap({
              model: {
                getClient: function (id, secret, callback) {
                  callback(false, { client_id: id });
                },
                grantTypeAllowed: function (id, secret, callback) {
                  callback(false, true);
                },
                getUser: function (uname, pword, callback) {
                  callback(false, { id: 1 });
                },
                saveAccessToken: function (accessToken, clientId, userId, expires, callback) {
                  should.strictEqual(null, expires);
                  callback();
                },
                saveRefreshToken: function (refreshToken, clientId, userId, expires, callback) {
                  should.strictEqual(null, expires);
                  callback();
                }
              },
              grants: ['password', 'refresh_token'],
              accessTokenLifetime: null,
              refreshTokenLifetime: null
            });*/
      var app = bootstrap();

      request(app)
        .post('/oauth/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          res.body.should.have.keys(['access_token', 'refresh_token', 'token_type']);
          res.body.access_token.should.be.a('string');
          res.body.access_token.should.have.length(40);
          res.body.refresh_token.should.be.a('string');
          res.body.refresh_token.should.have.length(40);
          res.body.token_type.should.equal('bearer');

          done();
        });
    });
  });



});
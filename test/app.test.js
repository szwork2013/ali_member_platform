var request = require('supertest');

var app = require('../app');
var appkey = require('../models/appkey');

describe('db api app', function () {
  before(function (done) {
    app.listen(0, done);
  });
  // it('GET / should show the text body', function (done) {
    // request(app)
    // .get('/')
    // .expect(200)
    // .expect('X-Power-By', 'Nodejs')
    // .end(function (err, res) {
      // var body = res.text;
      // // 主页面显示
      // body.should.include('<h1>Nothing to do!</h1>');
      // done(err);
    // });
  // });
  
/*
  it('GET /api/codes/3 should show the 3rd code information', function (done) {
    request(app)
    .get('/api/codes/3')
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      
      body.should.include('"serial":1300000003');
      done(err);
    });
  });*/

  
  it('GET /api/appkey/1 should show the 1st appkey information', function (done) {
    request(app)
    .get('/api/appkey/1')
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      body.should.include('"client_id":"ddfa43rwfds"');
      done(err);
    });
  });
  
  it('GET /api/appkey/client_id/ddfa43rwfds should show the 1st appkey information', function (done) {
    request(app)
    .get('/api/appkey/client_id/ddfa43rwfds')
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      body.should.include('"client_id":"ddfa43rwfds"');
      done(err);
    });
  });
  
  it('GET /api/appkey/client_secret/frewqrewqerewqg3 should show the 1st appkey information', function (done) {
    request(app)
    .get('/api/appkey/client_secret/frewqrewqerewqg3')
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      body.should.include('"client_id":"ddfa43rwfds"');
      done(err);
    });
  });
  
  it('POST /api/appkey/client/r?cid=ddfa43rwfds&csecret=frewqrewqerewqg3 should show the 1st appkey information', function (done) {
    request(app)
    .get('/api/appkey/client/r?cid=ddfa43rwfds&csecret=frewqrewqerewqg3')
    // .post('/api/appkey/client')
    // .send({ cid: 'ddfa43rwfds', csecret: 'frewqrewqerewqg3' })
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      body.should.include('"client_id":"ddfa43rwfds"');
      done(err);
    });
  });
  
  it('GET /api/appkey/access_token/ffewfeioh3ohfjdnvkjs should show the 1st appkey information', function (done) {
    request(app)
    .get('/api/appkey/access_token/ffewfeioh3ohfjdnvkjs')
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      body.should.include('"client_id":"ddfa43rwfds"');
      done(err);
    });
  });
  
  it('GET /api/appkey/refresh_token/fhreoihfeihg3bejisjf should show the 1st appkey information', function (done) {
    request(app)
    .get('/api/appkey/refresh_token/fhreoihfeihg3bejisjf')
    .expect(200)
    .end(function (err, res) {
      var body = res.text;
      body.should.include('"client_id":"ddfa43rwfds"');
      done(err);
    });
  });
});



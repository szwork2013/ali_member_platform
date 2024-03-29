/**
 * Copyright 2013-present NightWorld.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var assert = require('assert'),
	express = require('express'),
	request = require('supertest'),
	should = require('should');

var oauth2server = require('node-oauth2-server');

var bootstrap = function (oauthConfig) {
	var app = express(),
		oauth = oauth2server(oauthConfig || { model: {} });

	app.use(express.bodyParser());
	app.use(oauth.handler());
	app.use(oauth.errorHandler());

	if (oauthConfig && oauthConfig.passthroughErrors) {
		app.use(function (err, req, res, next) {
			res.send('passthrough');
		});
	}

	return app;
};

describe('OAuth2Server.errorHandler()', function() {
	it('should return an oauth conformat response', function (done) {
		var app = bootstrap();

		request(app)
			.get('/')
			.expect(400)
			.end(function (err, res) {
				if (err) return done(err);

				res.body.should.have.keys('code', 'error', 'error_description');

				res.body.code.should.be.a('number');
				res.body.code.should.equal(res.statusCode);

				res.body.error.should.be.a('string');

				res.body.error_description.should.be.a('string');

				done();
			});
	});

	it('should passthrough non grant errors if requested', function (done) {
		var app = bootstrap({
			passthroughErrors: true,
			model: {}
		});

		request(app)
			.get('/')
			.expect(200, /^passthrough$/, done);
	});

	it('should never passthrough grant errors', function (done) {
		var app = bootstrap({
			passthroughErrors: true,
			model: {}
		});

		request(app)
			.post('/oauth/token')
			.expect(400, done);
	});
});
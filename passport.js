'use strict';

exports = module.exports = function(app, passport) {
  var LocalStrategy = require('passport-local').Strategy,
      TwitterStrategy = require('passport-twitter').Strategy,
      GitHubStrategy = require('passport-github').Strategy,
      FacebookStrategy = require('passport-facebook').Strategy,
      WeiboStrategy = require('passport-weibo').Strategy,
      QqStrategy = require('passport-qq').Strategy;

  passport.use(new LocalStrategy(
    function(username, password, done) {
      var conditions = { isActive: 'yes' };
      if (username.indexOf('@') === -1) {
        conditions.username = username;
      }
      else {
        conditions.email = username;
      }

      app.db.models.User.findOne(conditions, function(err, user) {
        if (err) {
          return done(err);
        }

        if (!user) {
          return done(null, false, { message: '未知用户' });
        }

        app.db.models.User.validatePassword(password, user.password, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (!isValid) {
            return done(null, false, { message: '密码错误' });
          }

          return done(null, user);
        });
      });
    }
  ));

  if (app.get('twitter-oauth-key')) {
    passport.use(new TwitterStrategy({
        consumerKey: app.get('twitter-oauth-key'),
        consumerSecret: app.get('twitter-oauth-secret')
      },
      function(token, tokenSecret, profile, done) {
        done(null, false, {
          token: token,
          tokenSecret: tokenSecret,
          profile: profile
        });
      }
    ));
  }

  if (app.get('github-oauth-key')) {
    passport.use(new GitHubStrategy({
        clientID: app.get('github-oauth-key'),
        clientSecret: app.get('github-oauth-secret'),
        customHeaders: { "User-Agent": app.get('project-name') }
      },
      function(accessToken, refreshToken, profile, done) {
        done(null, false, {
          accessToken: accessToken,
          refreshToken: refreshToken,
          profile: profile
        });
      }
    ));
  }

  if (app.get('facebook-oauth-key')) {
    passport.use(new FacebookStrategy({
        clientID: app.get('facebook-oauth-key'),
        clientSecret: app.get('facebook-oauth-secret')
      },
      function(accessToken, refreshToken, profile, done) {
        done(null, false, {
          accessToken: accessToken,
          refreshToken: refreshToken,
          profile: profile
        });
      }
    ));
  }

  if (app.get('weibo-oauth-key')) {
    passport.use(new WeiboStrategy({
        clientID: app.get('weibo-oauth-key'),
        clientSecret: app.get('weibo-oauth-secret')
      },
      function(accessToken, refreshToken, profile, done) {
        done(null, false, {
          accessToken: accessToken,
          refreshToken: refreshToken,
          profile: profile
        });
      }
    ));
  }

  if (app.get('qq-oauth-key')) {
    passport.use(new QqStrategy({
        clientID: app.get('qq-oauth-key'),
        clientSecret: app.get('qq-oauth-secret')
      },
      function(accessToken, refreshToken, profile, done) {
        done(null, false, {
          accessToken: accessToken,
          refreshToken: refreshToken,
          profile: profile
        });
      }
    ));
  }

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    app.db.models.User.findOne({ _id: id }).populate('roles.admin').populate('roles.account').exec(function(err, user) {
      if (user.roles && user.roles.admin) {
        user.roles.admin.populate("groups", function(err, admin) {
          done(err, user);
        });
      }
      else {
        done(err, user);
      }
    });
  });
};

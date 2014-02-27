'use strict';

var getReturnUrl = function(req) {
  var returnUrl = req.user.defaultReturnUrl();
  if (req.session.returnUrl) {
    returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;
  }
  return returnUrl;
};

exports.init = function(req, res){
  if (req.isAuthenticated()) {
    res.redirect(getReturnUrl(req));
  }
  else {
    res.render('login/index', {
      oauthMessage: '',
      oauthTwitter: !!req.app.get('twitter-oauth-key'),
      oauthGitHub: !!req.app.get('github-oauth-key'),
      oauthFacebook: !!req.app.get('facebook-oauth-key'),
      oauthWeibo: !!req.app.get('weibo-oauth-key'),
      oauthQq: !!req.app.get('qq-oauth-key'),
      oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
    });
  }
};

exports.login = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.username) {
      workflow.outcome.errfor.username = 'required';
    }

    if (!req.body.password) {
      workflow.outcome.errfor.password = 'required';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('abuseFilter');
  });

  workflow.on('abuseFilter', function() {
    var getIpCount = function(done) {
      var conditions = { ip: req.ip };
      req.app.db.models.LoginAttempt.count(conditions, function(err, count) {
        if (err) {
          return done(err);
        }

        done(null, count);
      });
    };

    var getIpUserCount = function(done) {
      var conditions = { ip: req.ip, user: req.body.username };
      req.app.db.models.LoginAttempt.count(conditions, function(err, count) {
        if (err) {
          return done(err);
        }

        done(null, count);
      });
    };

    var asyncFinally = function(err, results) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (results.ip >= req.app.config.loginAttempts.forIp || results.ipUser >= req.app.config.loginAttempts.forIpAndUser) {
        workflow.outcome.errors.push('You\'ve reached the maximum number of login attempts. Please try again later.');
        return workflow.emit('response');
      }
      else {
        workflow.emit('attemptLogin');
      }
    };

    require('async').parallel({ ip: getIpCount, ipUser: getIpUserCount }, asyncFinally);
  });

  workflow.on('attemptLogin', function() {
    req._passport.instance.authenticate('local', function(err, user, info) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        var fieldsToSet = { ip: req.ip, user: req.body.username };
        req.app.db.models.LoginAttempt.create(fieldsToSet, function(err, doc) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.errors.push('Username and password combination not found or your account is inactive.');
          return workflow.emit('response');
        });
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.emit('response');
        });
      }
    })(req, res);
  });

  workflow.emit('validate');
};

exports.loginTwitter = function(req, res, next){
  req._passport.instance.authenticate('twitter', function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    req.app.db.models.User.findOne({ 'twitter.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.render('login/index', {
          oauthMessage: 'No users found linked to your Twitter account. You may need to create an account first.',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return next(err);
          }

          res.redirect(getReturnUrl(req));
        });
      }
    });
  })(req, res, next);
};

exports.loginGitHub = function(req, res, next){
  req._passport.instance.authenticate('github', function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }
    req.app.db.models.User.findOne({ 'github.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.render('login/index', {
          oauthMessage: 'No users found linked to your GitHub account. You may need to create an account first.',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return next(err);
          }

          res.redirect(getReturnUrl(req));
        });
      }
    });
  })(req, res, next);
};

exports.loginFacebook = function(req, res, next){
  req._passport.instance.authenticate('facebook', { callbackURL: '/login/facebook/callback/' }, function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    req.app.db.models.User.findOne({ 'facebook.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.render('login/index', {
          oauthMessage: 'No users found linked to your Facebook account. You may need to create an account first.',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return next(err);
          }

          res.redirect(getReturnUrl(req));
        });
      }
    });
  })(req, res, next);
};

exports.loginWeibo = function(req, res, next){
  req._passport.instance.authenticate('weibo', { callbackURL: '/login/weibo/callback/' }, function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    req.app.db.models.User.findOne({ 'weibo.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.render('login/index', {
          oauthMessage: '未发现有用户连接到你的新浪微博帐号，你需要先创建一个帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return next(err);
          }

          res.redirect(getReturnUrl(req));
        });
      }
    });
  })(req, res, next);
};

exports.loginQq = function(req, res, next){
  req._passport.instance.authenticate('qq', { callbackURL: '/login/qq/callback/' }, function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    req.app.db.models.User.findOne({ 'qq.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.render('login/index', {
          oauthMessage: '未发现有用户连接到你的QQ帐号，你需要先创建一个帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return next(err);
          }

          res.redirect(getReturnUrl(req));
        });
      }
    });
  })(req, res, next);
};

exports.loginAli_discuz = function(req, res){
	 var workflow = req.app.utility.workflow(req, res);
	 
	 workflow.on('getaccesstoken',function(){
		 //获取accesstoken 然后获取用户信息 如果用户不存在,则自动注册进入mongodb
		 if(!req.query.accesstoken){
			 res.render('login/index', {
		          oauthMessage: '登录失败,请重新登录。',
		          oauthTwitter: !!req.app.get('twitter-oauth-key'),
		          oauthGitHub: !!req.app.get('github-oauth-key'),
		          oauthFacebook: !!req.app.get('facebook-oauth-key'),
		          oauthWeibo: !!req.app.get('weibo-oauth-key'),
		          oauthQq: !!req.app.get('qq-oauth-key')
		        });
		 }
		 else{
			 workflow.emit('getuserinfo');
		 }
	 });
	 workflow.on('getuserinfo',function(){
		 req._passport.ali_discuz.authenticate(req.query.accesstoken ,function(err ,info){
			  if (!info || !info.profile) {
			      return res.redirect('/login/');
			    }
			  req.app.db.models.User.findOne({ 'github.id': info.profile._json.id }, function(err, user) {
			      if (err) {
			        return next(err);
			      }

			      if (!user) {
			        res.render('login/index', {
			          oauthMessage: 'No users found linked to your GitHub account. You may need to create an account first.',
			          oauthTwitter: !!req.app.get('twitter-oauth-key'),
			          oauthGitHub: !!req.app.get('github-oauth-key'),
			          oauthFacebook: !!req.app.get('facebook-oauth-key'),
			          oauthWeibo: !!req.app.get('weibo-oauth-key'),
			          oauthQq: !!req.app.get('qq-oauth-key')
			        });
			      }
			      else {
			        req.login(user, function(err) {
			          if (err) {
			            return next(err);
			          }
			          res.redirect(getReturnUrl(req));
			        });
			      }
			    }); 
		 	});
	 });		 
	 workflow.emit('getaccesstoken');
};



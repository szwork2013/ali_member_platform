'use strict';

exports.init = function(req, res){
  if (req.isAuthenticated()) {
    res.redirect(req.user.defaultReturnUrl());
  }
  else {
    res.render('signup/index', {
      oauthMessage: '',
      oauthTwitter: !!req.app.get('twitter-oauth-key'),
      oauthGitHub: !!req.app.get('github-oauth-key'),
      oauthFacebook: !!req.app.get('facebook-oauth-key'),
      oauthWeibo: !!req.app.get('weibo-oauth-key'),
      oauthQq: !!req.app.get('qq-oauth-key')
    });
  }
};

exports.signup = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.username) {
      workflow.outcome.errfor.username = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
      workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
    }

    if (!req.body.email) {
      workflow.outcome.errfor.email = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
      workflow.outcome.errfor.email = 'invalid email format';
    }

    if (!req.body.password) {
      workflow.outcome.errfor.password = 'required';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function() {
    req.app.db.models.User.findOne({ username: req.body.username }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.username = '用户名已被占用';
        return workflow.emit('response');
      }

      workflow.emit('duplicateEmailCheck');
    });
  });

  workflow.on('duplicateEmailCheck', function() {
    req.app.db.models.User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.email = '此email已注册';
        return workflow.emit('response');
      }

      workflow.emit('createUser');
    });
  });

  workflow.on('createUser', function() {
    req.app.db.models.User.encryptPassword(req.body.password, function(err, hash) {
      if (err) {
        return workflow.emit('exception', err);
      }

      var fieldsToSet = {
        isActive: 'yes',
        username: req.body.username,
        email: req.body.email.toLowerCase(),
        password: hash, 
        search: [
          req.body.username,
          req.body.email
        ]
      };
      req.app.db.models.User.create(fieldsToSet, function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }
  
        workflow.user = user;
        workflow.emit('createAccount');
      });
    });
  });

  workflow.on('createAccount', function() {
    var fieldsToSet = {
      isVerified: req.app.get('require-account-verification') ? 'no' : 'yes',
      'name.full': workflow.user.username,
      user: {
        id: workflow.user._id,
        name: workflow.user.username
      },
      search: [
        workflow.user.username
      ]
    };

    req.app.db.models.Account.create(fieldsToSet, function(err, account) {
      if (err) {
        return workflow.emit('exception', err);
      }

      //update user with account
      workflow.user.roles.account = account._id;
      workflow.user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.emit('sendWelcomeEmail');
      });
    });
  });

  workflow.on('sendWelcomeEmail', function() {
    req.app.utility.sendmail(req, res, {
      from: req.app.get('smtp-from-name') +' <'+ req.app.get('smtp-from-address') +'>',
      to: req.body.email,
      subject: '你的 '+ req.app.get('project-name') +' 帐号',
      textPath: 'signup/email-text',
      htmlPath: 'signup/email-html',
      locals: {
        username: req.body.username,
        email: req.body.email,
        loginURL: 'http://'+ req.headers.host +'/login/',
        projectName: req.app.get('project-name')
      },
      success: function(message) {
        workflow.emit('logUserIn');
      },
      error: function(err) {
        console.log('发送欢迎邮件出错: '+ err);
        workflow.emit('logUserIn');
      }
    });
  });

  workflow.on('logUserIn', function() {
    req._passport.instance.authenticate('local', function(err, user, info) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        workflow.outcome.errors.push('登录失败，请联系管理员');
        return workflow.emit('response');
      }
      else {
        req.login(user, function(err) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.defaultReturnUrl = user.defaultReturnUrl();
          workflow.emit('response');
        });
      }
    })(req, res);
  });

  workflow.emit('validate');
};

exports.signupTwitter = function(req, res, next) {
  req._passport.instance.authenticate('twitter', function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({ 'twitter.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', { email: '' });
      }
      else {
        res.render('signup/index', {
          oauthMessage: '我们发现一个用户关联到你的 Twitter 帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
    });
  })(req, res, next);
};

exports.signupGitHub = function(req, res, next) {
  req._passport.instance.authenticate('github', function(err, user, info) {
    console.log("Github OAuth2 info: %j", info);
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({ 'github.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', { email: info.profile.emails && info.profile.emails[0].value || '' });
      }
      else {
        res.render('signup/index', {
          oauthMessage: '我们发现一个用户关联到你的 GitHub 帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
    });
  })(req, res, next);
};

exports.signupFacebook = function(req, res, next) {
  req._passport.instance.authenticate('facebook', { callbackURL: '/signup/facebook/callback/' }, function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({ 'facebook.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', { email: info.profile.emails && info.profile.emails[0].value || '' });
      }
      else {
        res.render('signup/index', {
          oauthMessage: '我们发现一个用户关联到你的 Facebook 帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
    });
  })(req, res, next);
};

exports.signupWeibo = function(req, res, next) {
  console.log(req);
  req._passport.instance.authenticate('weibo', function(err, user, info) {
    console.log("Weibo OAuth2 info: %j", info);
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({ 'weibo.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', { email: info.profile.emails && info.profile.emails[0].value || '' });
      }
      else {
        res.render('signup/index', {
          oauthMessage: '我们发现一个用户关联到你的新浪微博帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
    });
  })(req, res, next);
};

exports.signupQq = function(req, res, next) {
  req._passport.instance.authenticate('qq', function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({ 'qq.id': info.profile._json.id }, function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', { email: info.profile.emails && info.profile.emails[0].value || '' });
      }
      else {
        res.render('signup/index', {
          oauthMessage: '我们发现一个用户关联到你的QQ帐号。',
          oauthTwitter: !!req.app.get('twitter-oauth-key'),
          oauthGitHub: !!req.app.get('github-oauth-key'),
          oauthFacebook: !!req.app.get('facebook-oauth-key'),
          oauthWeibo: !!req.app.get('weibo-oauth-key'),
          oauthQq: !!req.app.get('qq-oauth-key')
        });
      }
    });
  })(req, res, next);
};


exports.signupSocial = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.email) {
      workflow.outcome.errfor.email = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
      workflow.outcome.errfor.email = '错误的 email 格式';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function() {
    workflow.username = req.session.socialProfile.username;
    if (!/^[a-zA-Z0-9\-\_]+$/.test(workflow.username)) {
      workflow.username = workflow.username.replace(/[^a-zA-Z0-9\-\_]/g, '');
    }

    req.app.db.models.User.findOne({ username: workflow.username }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.username = workflow.username + req.session.socialProfile.id;
      }
      else {
        workflow.username = workflow.username;
      }

      workflow.emit('duplicateEmailCheck');
    });
  });

  workflow.on('duplicateEmailCheck', function() {
    req.app.db.models.User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.email = '此 email 已注册';
        return workflow.emit('response');
      }

      workflow.emit('createUser');
    });
  });

  workflow.on('createUser', function() {
    var fieldsToSet = {
      isActive: 'yes',
      username: workflow.username,
      email: req.body.email.toLowerCase(),
      search: [
        workflow.username,
        req.body.email
      ]
    };
    fieldsToSet[req.session.socialProfile.provider] = req.session.socialProfile._json;

    req.app.db.models.User.create(fieldsToSet, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.user = user;
      workflow.emit('createAccount');
    });
  });

  workflow.on('createAccount', function() {
    var displayName = req.session.socialProfile.displayName || '';
    var nameParts = displayName.split(' ');
    var fieldsToSet = {
      isVerified: 'yes',
      'name.first': nameParts[0],
      'name.last': nameParts[1] || '',
      'name.full': displayName,
      user: {
        id: workflow.user._id,
        name: workflow.user.username
      },
      search: [
        nameParts[0],
        nameParts[1] || ''
      ]
    };
    req.app.db.models.Account.create(fieldsToSet, function(err, account) {
      if (err) {
        return workflow.emit('exception', err);
      }

      //update user with account
      workflow.user.roles.account = account._id;
      workflow.user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.emit('sendWelcomeEmail');
      });
    });
  });

  workflow.on('sendWelcomeEmail', function() {
    req.app.utility.sendmail(req, res, {
      from: req.app.get('smtp-from-name') +' <'+ req.app.get('smtp-from-address') +'>',
      to: req.body.email,
      subject: '你的 '+ req.app.get('project-name') +' 帐号',
      textPath: 'signup/email-text',
      htmlPath: 'signup/email-html',
      locals: {
        username: workflow.user.username,
        email: req.body.email,
        loginURL: 'http://'+ req.headers.host +'/login/',
        projectName: req.app.get('project-name')
      },
      success: function(message) {
        workflow.emit('logUserIn');
      },
      error: function(err) {
        console.log('发送欢迎邮件出错: '+ err);
        workflow.emit('logUserIn');
      }
    });
  });

  workflow.on('logUserIn', function() {
    req.login(workflow.user, function(err) {
      if (err) {
        return workflow.emit('exception', err);
      }

      delete req.session.socialProfile;
      workflow.outcome.defaultReturnUrl = workflow.user.defaultReturnUrl();
      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

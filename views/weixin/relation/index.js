'use strict'
var getReturnUrl = function(req) {
  var returnUrl = req.user.defaultReturnUrl();
  if (req.session.returnUrl) {
    returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;
  }
  return returnUrl;
};

exports.init = function(req ,res){
	if (req.isAuthenticated()) {
		res.render('weixin/relation/index',{
			localOpenid: !(req.session.tmp_openid && req.session.tmp_openid.localOpenid) ? '' : req.session.tmp_openid.localOpenid,
			otherOpenid: !(req.session.tmp_openid && req.session.tmp_openid.tpOpenid) ? '' : req.session.tmp_openid.tpOpenid,
			//第三方
			oauthTwitter: !!req.app.get('twitter-oauth-key'),
	        oauthGitHub: !!req.app.get('github-oauth-key'),
	        oauthFacebook: !!req.app.get('facebook-oauth-key'),
	        oauthWeibo: !!req.app.get('weibo-oauth-key'),
	        oauthQq: !!req.app.get('qq-oauth-key'),
	        oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
		});
	  }else{
		  res.end('请您先登录');
	  }
};


exports.local_relation = function(req ,res){
	  var workflow = req.app.utility.workflow(req, res);
	  
	  //验证数据
	  workflow.on('validate', function() {
	    if (!req.body.username) {
	      workflow.outcome.errfor.username = 'required';
	    }

	    if (!req.body.password) {
	      workflow.outcome.errfor.password = 'required';
	    }
	    if (!req.body.localOpenid) {
	    	workflow.outcome.errfor.openid = '获取openid失败,请重新进入页面进行关联操作';
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
	        workflow.outcome.errors.push('你已经达到了登录尝试次数的上限，请稍后再试。');
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

	          workflow.outcome.errors.push('用户名或密码不对，或者你的帐号已被禁用。');
	          return workflow.emit('response');
	        });
	      }
	      else {
	    	  
	    	  //存入openid并且更新
			var fieldsToSet = {
					'weixin.openid' :req.user.weixin.openid,
			};
			
			req.app.db.models.User.findByIdAndUpdate( user._id ,fieldsToSet ,function(err ,queryObj){
				if(err){
					return next(err);
				}
				//更新成功,存入session
				if(queryObj){
					
					//删除临时user account
					req.app.db.models.User.remove({_id : req.user._id});
					req.app.db.models.Account.remove({'user.id' : req.user._id});
					//等级新session
					req.login(user, function(err) {
				          if (err) {
				            return next(err);
				          }
	                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '帐号关联微信,登录成功');
					});
				}
			});
	      }
	    })(req, res);
	  });

	  workflow.emit('validate');
}


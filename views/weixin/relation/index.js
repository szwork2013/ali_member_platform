'use strict'

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
			var search = new Array();
			if(req.body.otherOpenid){
				search.push(req.body.otherOpenid);
			}
			search.push(req.body.localOpenid);
			var fieldsToSet = {
					'weixin.openid' : search,
			};
			req.app.db.models.User.findByIdAndUpdate( user._id ,fieldsToSet ,function(err ,queryObj){
				if(err){
					return next(err);
				}
				//更新成功,存入session
				if(queryObj){
					req.login(user, function(err) {
				          if (err) {
				            return next(err);
				          }
	                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '帐号关联微信,登录成功');
					});
				}
			});
			  
			  
			  
			  
			  
	        req.login(user, function(err) {
	          if (err) {
	            return workflow.emit('exception', err);
	          }
	          req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '本地登录成功');
	          workflow.emit('response');
	        });
	      }
	    })(req, res);
	  });

	  workflow.emit('validate');
}


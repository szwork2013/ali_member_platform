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
	    if (!req.user.weixin.openid) {
	    	workflow.outcome.errfor.openid = '获取openid失败,请注销后重新登录';
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
	    	  
	    	 console.log('查询到有用户了');
	    	 console.log('开始关联');
	    	 //将查询到的user openid 循环添加到关联帐号
	    	 //关联到的账户的openid
	    	 var userLenth = user.weixin.openid.length;
	    	 
	    	 //临时帐号的openid
	    	 var tmpUserLength =  req.user.weixin.openid.length
	    	 
	    	 //循环对比
	    	 for(var i=0 ;i < tmpUserLength ;i++){
	    		 var isExist = false;
	    		 for(var j=0 ; j < userLenth ;j++){
					if(userLenth[j] == tmpUserLength[i]){
						isExist = true;
						break;
					}
	    		 }
	    		//不存在 填入user.weixin.openid 数组里面
				if(!isExist){
					user.weixin.openid.push(tmpUserLength[i]);
				}
	    	 }
	    	 
	    	  //存入openid并且更新
			var fieldsToSet = {
					'weixin.openid' :user.weixin.openid,
			};
			console.log('临时帐号openid');
			console.log(req.user.weixin.openid);
			console.log('关联帐号openid');
			console.log(user.weixin.openid);
			
			console.log('更新关联帐号的openid');
			
			req.app.db.models.User.findByIdAndUpdate( user._id ,fieldsToSet ,function(err ,queryObj){
				if(err){
					return next(err);
				}
				//更新成功,存入session
				if(queryObj){
					console.log('更新成功,开始删除临时帐号');
					//删除临时user account
					req.app.db.models.User.remove({_id : req.user._id});
					req.app.db.models.Account.remove({'user.id' : req.user._id});
					//等级新session
					console.log('使用关联帐号登录');
					req.login(user, function(err) {
				          if (err) {
				            return next(err);
				          }
	                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '帐号关联微信');
					});
				}else{
					console.log('关联失败');
					workflow.outcome.errors.push('更新用户失败');
			        return workflow.emit('response');
				}
			});
	      }
	    })(req, res);
	  });

	  workflow.emit('validate');
}

exports.Ali_discuz_relation = function(req ,res){
	console.log(req.query);
	res.end('end');
};
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
	  var weixin = require('weixin');
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
	    	 weixin.mergeOpenid(req , user ,function(err ,user){
	    		 if(err){
	    			 return workflow.outcome.errors.push(err);
	    		 }
	    		 //删除临时帐号
	    		 req.app.db.models.User.remove({_id : req.user._id},function(err){
						if(err){
							console.log('errRemove');
						}
						req.app.db.models.Account.remove({'user.id' : req.user._id});
				  });
	    		 req.login(user, function(err) {
	   	           if (err) {
	   	             return next(err);
	   	           }
	   	           console.log(req.user);
	               req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '帐号关联微信');
	               return workflow.emit('response');
	   		     });
	    		 
	    	 });
	      }
	    })(req, res);
	  });

	  workflow.emit('validate');
}

exports.Ali_discuz_relation = function(req ,res){
	var weixin = require('weixin');
	var workflow = req.app.utility.workflow(req, res);
	 
	 workflow.on('getaccesstoken',function(){
		 //获取accesstoken 然后获取用户信息 如果用户不存在,则自动注册进入mongodb
		 if(!req.query.accesstoken || req.query.error){
			 if (req.isAuthenticated()) {
				return res.render('weixin/relation/index',{
						oauthMessage: '关联失败,请重新登录。error:'+req.query.error,
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
		 }else{
			 workflow.emit('getuserinfo');
		 }
	 });
	 workflow.on('getuserinfo',function(){
		 req._passport.ali_discuz.authenticate(req.query.accesstoken ,function(err ,info){
			 if(err){
				 return res.render('weixin/relation/index',{
						oauthMessage: '获取关联帐号信息失败,请重新登录。error:'+req.query.error,
						//第三方
						oauthTwitter: !!req.app.get('twitter-oauth-key'),
				        oauthGitHub: !!req.app.get('github-oauth-key'),
				        oauthFacebook: !!req.app.get('facebook-oauth-key'),
				        oauthWeibo: !!req.app.get('weibo-oauth-key'),
				        oauthQq: !!req.app.get('qq-oauth-key'),
				        oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
					});
			 }
			 if (!info) {
				 return res.render('weixin/relation/index',{
						oauthMessage: '无此关联账户信息,请重新确认。error:'+req.query.error,
						//第三方
						oauthTwitter: !!req.app.get('twitter-oauth-key'),
				        oauthGitHub: !!req.app.get('github-oauth-key'),
				        oauthFacebook: !!req.app.get('facebook-oauth-key'),
				        oauthWeibo: !!req.app.get('weibo-oauth-key'),
				        oauthQq: !!req.app.get('qq-oauth-key'),
				        oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
					});
			 }
			 req.app.db.models.User.findOne({ 'ali_discuz.uid': info._json.uid }, function(err, user) {
				  if (err) {
			        return next(err);
			      }
			      if (!user) {
			    	  return res.render('weixin/relation/index',{
							oauthMessage: '无此账户信息,您可以先进行注册。error:'+req.query.error,
							//第三方
							oauthTwitter: !!req.app.get('twitter-oauth-key'),
					        oauthGitHub: !!req.app.get('github-oauth-key'),
					        oauthFacebook: !!req.app.get('facebook-oauth-key'),
					        oauthWeibo: !!req.app.get('weibo-oauth-key'),
					        oauthQq: !!req.app.get('qq-oauth-key'),
					        oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
						});
			      }
			      else {
			    	 console.log('查询到有用户了');
			    	 console.log('开始关联');
			    	 weixin.mergeOpenid(req , user ,function(err ,user){
			    		 if(err){
			    			 return workflow.outcome.errors.push(err);
			    		 }
			    		 if(user){
			    			//删除临时帐号
				    		 req.app.db.models.User.remove({_id : req.user._id},function(err){
									if(err){
										console.log('errRemove');
									}
									req.app.db.models.Account.remove({'user.id' : req.user._id});
							  });
				    		 req.login(user, function(err) {
				   	           if (err) {
				   	             return next(err);
				   	           }
				   	           console.log(req.user);
				               req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '帐号关联微信');
				               return res.redirect(getReturnUrl(req));
				    		 }
			    		 }else{
			    			 return res.render('weixin/relation/index',{
									oauthMessage: '关联失败,请您返回页面后重新尝试。error:'+req.query.error,
									//第三方
									oauthTwitter: !!req.app.get('twitter-oauth-key'),
							        oauthGitHub: !!req.app.get('github-oauth-key'),
							        oauthFacebook: !!req.app.get('facebook-oauth-key'),
							        oauthWeibo: !!req.app.get('weibo-oauth-key'),
							        oauthQq: !!req.app.get('qq-oauth-key'),
							        oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
								});
			    		 }
			    		 
			   		     });
			    		 
			    	 });
			      }
			    }); 
		 	});
	 });		 
	 workflow.emit('getaccesstoken');	 
};
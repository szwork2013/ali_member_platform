'use strict'

var getReturnUrl = function(req) {
  var returnUrl = req.user.defaultReturnUrl();
  if (req.session.returnUrl) {
    returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;
  }
  return returnUrl;
};

/**
 * 关联帐号
 * 用户帐号和第三方公众号openid的关联
 * 通过引导用户输入帐号密码,关联上此openid,openid需要get方式传输进来
 */
exports.relation_init = function(req, res ,next){
	 var workflow = req.app.utility.workflow(req, res);
	 var weixin = require('weixin');

	//用户点击url进来,首先获取本地openid
	  workflow.on('getLocalOpenid', function() {
		  // 此处将会有一个get方式传回来的code
		  if(req.query.code && req.query.code!=''){
			  weixin.webGrant(req.query.code ,function(err ,data){
				  console.log('err:'+err);
				  if(err){
					return next(err);
				  }
				  console.log('data:'+data.openid);
				  if(data && data.openid){
					  //判断是否有外来openid,有就直接关联否则直接登录
					  workflow.emit('checkLocalOpenid',data);
				  }
				  else{
					 //获取不到本地openid ,证明是第一次的,所以引导进入输入帐号密码页面进行关联
					  res.render('weixin/relation/index',{
						  oauthMessage: '未检测到您的关联账户,请您先关联账户.',
				          oauthTwitter: !!req.app.get('twitter-oauth-key'),
				          oauthGitHub: !!req.app.get('github-oauth-key'),
				          oauthFacebook: !!req.app.get('facebook-oauth-key'),
				          oauthWeibo: !!req.app.get('weibo-oauth-key'),
				          oauthQq: !!req.app.get('qq-oauth-key'),
				          oauthAliDiscuz: !! req.app.get('ali_discuz-oauth-key'),
					  });
				  }
			  });
		  }
		  else{
			  //没有获得code 非法url或者微信出问题,需要重新尝试
			  var url = '/weixin/?error='+ encodeURIComponent('出现错误,请重新登录');
			  res.redirect(url);
		  }
	  });
	  
	  
	  //检测openid的情况
	  workflow.on('checkLocalOpenid', function(data) {
		  console.log(data.openid);
		  var localOpenid = data.openid;//dreamcastle 的openid
		  var otherOpenid = req.query.openid;//第三方来源的openid 不一定有
		  //查询本地openid是否已经关联的 , 没有的话 需要输入用户帐号密码同时关联两个 否则只关联一个
		  req.app.db.models.User.findOne({"weixin.openid" :{"$all":[localOpenid]}}, function(err, user) {
			  if(err){
				console.log(err);
				return next(err);
			  }
			  if(user){
				  if(!otherOpenid){
					  req.login(user, function(err) {
				          if (err) {
				            return next(err);
				          }
	                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '本地微信openid:"' + otherOpenid + '"登录成功');
				          res.redirect(getReturnUrl(req));
				      });
				  }else{
						var openidLength = user.weixin.openid.length;
						var exists = false;
						for(var i = 0 ;i < openidLength ;i++){
							if(user.weixin.openid[i] == otherOpenid){
								console.log('第三方openid:'+otherOpenid+'已存在');
								exists = true;
								break;
							}
						}
						if(!exists){
							//本地关联otherid
							 workflow.emit('relationOtherOpenid',user,otherOpenid);
						}else{
							//已存在,直接登录
							req.login(user, function(err) {
						          if (err) {
						            return next(err);
						          }
			                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '第三方微信openid:"' + otherOpenid + '"登录成功');
						          res.redirect(getReturnUrl(req));
						      });
						}
				  }
			  }else{
				  //还没有关联过本地openid和第三方openid,需要帐号关联两个
				  workflow.emit('relationBothOpenid',user,localOpenid,otherOpenid);
			  }
			  
		  });
	  });
	  
	  //关联第三方openid
	  workflow.on('relationOtherOpenid', function(user,otherOpenid) {
		  user.weixin.openid.push(otherOpenid);
		  var fieldsToSet = {
					'weixin.openid':user.weixin.openid,
			};
		  req.app.db.models.Account.findByIdAndUpdate( user._id ,fieldsToSet ,function(err ,queryObj){
				if(err){
					return next(err);
				}
				//添加成功,直接登录
				if(queryObj){
					req.login(user, function(err) {
				          if (err) {
				            return next(err);
				          }
	                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '关联微信第三方openid:"' + otherOpenid + '"并登录成功');
				          res.redirect(getReturnUrl(req));
				        });
				}
			});
	  });
	  workflow.on('relationBothOpenid', function(user,localOpenid,otherOpenid) {
		  console.log('跳转到登录页面');
		  res.render('weixin/relation/index');
	  });
	  
	  workflow.emit('getLocalOpenid');
};


exports.relation_local = function(req , res ,next){
	var workflow = req.app.utility.workflow(req, res);
	  console.log(req.body);
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
	      });//添加成功,直接登录
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
	    	  //登录正确
	    	//接受两个openid 同时添加记录
	    	 var openidLength = user.weixin.openid.length;
	    	 if(openidLength < 1){
	    		 user.weixin.openid = new Array();
	    	 }
	    	//判断是否存在第三方openid
	    	if(req.body.otherOpenid){
	    		user.weixin.openid.push(req.body.otherOpenid);
	    	}
	    	//添加本地openid
	    	user.weixin.openid.push(req.body.localOpenid);
	    	
	    	//更新openid
			var fieldsToSet = {
					'weixin.openid':user.weixin.openid,
			};
	    	req.app.db.models.Account.findByIdAndUpdate( user._id,fieldsToSet ,function(err ,queryObj){
				if(err){
					return next(err);
				}
				//添加成功,直接登录
				if(queryObj){
					req.login(user, function(err) {
				          if (err) {
				            return next(err);
				          }
			              req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '关联微信openid:"' + otherOpenid + '"登录成功');
//				          res.redirect(getReturnUrl(req));
				          workflow.emit('response');
				        });
				}
			});
			
	      }
	    })(req, res);
	  });

	  workflow.emit('validate');
};








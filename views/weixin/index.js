'use strict'
exports.wx = function(req ,res){
	console.log(req.query);
	res.end();
};

var getReturnUrl = function(req) {
  var returnUrl = req.user.defaultReturnUrl();
  if (req.session.returnUrl) {
    returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;
  }
  return returnUrl;
};
/**
 * 登录
 * 用户从微信访问页面(无论是不是关注用户),都会通过当前对应的appid和密匙获得用户对此公众号的openid
 * 然后通过openid检查用户是否关联帐号,如果关联了,自动登录,如果没有关联(已有帐号),让用户进入关联页面将帐号和openid关联起来
 * 如果用户还没有帐号,则让用户注册,注册后同时关联
 */
exports.init = function(req, res ,next){
	 if (req.isAuthenticated()) {
		 return res.redirect(getReturnUrl(req));
	 }
	//判断是否有外来openid
	if(req.query.openid && req.query.openid!=''){
		//有外来openid l例如通过口袋通带着openid转过来
		//查找是否有已关联此openid
		 req.app.db.models.User.findOne({"weixin.openid" :{"$all":[req.query.openid]}}, function(err, user) {
			 if(err){
				console.log(err);
				return  ;
			 }
			 if(user){
				 //有关联 直接登录
				 req.login(user, function(err) {
			          if (err) {
			            return next(err);
			          }
			          req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '使用微信已关联openid:'+req.query.openid+'登录成功');
			         return  res.redirect(getReturnUrl(req));
			        });
			 }
		 });
	}else{
		req.query.openid = '';
		//没有第三方 则是页面登录 如果存在当前openid 直接登录了
		
	}
	
	//到提示注册帐号或者关联帐号的页面
	var weixin = require('weixin');
	 res.render('weixin/index',{
		 error : req.query.error,
		 	//	生成可以获得code的url
		 relationUrl: weixin.callbackUrl({callbackurl:'http://beta.alithefox.cn/weixin/relation/?openid='+req.query.openid,state:'dreamcastle'}),
		 signupUrl: weixin.callbackUrl({callbackurl:'http://beta.alithefox.cn/weixin/signup/?openid='+req.query.openid,state:'dreamcastle'}),
	 });
	
};






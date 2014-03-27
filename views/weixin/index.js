'use strict'
exports.wx = function(req ,res){
	console.log(req.query);
	res.end(req.query.echostr);
};

/**
 * 用户进入
 * 用户从分享或者朋友圈或者指定网址点击进入
 * 1.如果分享的是第三方,则会有一个超链接连接到本站点进行验证然后登录关联等动作
 * 2.如果是本站内容,用户进入的第一个页面就会自动登录/引导关联/
 * 
 * 关联过程
 * 1.如果是第一次从微信公众号进来(包括分享页面),会获得会员平台的openid,此时引导关联帐号或者注册帐号(库里没有这个openid)
 * 2.如果是已经关联过会员平台的openid,则使用openid直接登录然后关联第三方的openid(如果有的话)
 * 
 */


//初始化
exports._init = function(req ,res ,next){
	//微信来源
//	 'user-agent': 'Mozilla/5.0 (Linux; Android 4.4.2; LG-P880 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36 MicroMessenger/5.2.380',
	//普通来源
//	'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:17.0) Gecko/20131029 Firefox/17.0',
	//判断来源 user-agent 区分是从微信来的还是别的地方来的(是否含有 MicroMessenger) req.headers.user-agent
	
	//req.headers.host	主域名
	//req.url	//后缀
	var weixin = require('weixin');
	var user_agent = req.headers['user-agent'].toLowerCase();
	
	if(user_agent.indexOf('micromessenger') != '-1'){
		console.log('微信浏览器')
		//跳转到微信页面然后返回当前页面 获取code
		console.log(weixin.callbackUrl({callbackurl:req.headers.host+req.url,state:'dreamcastle'}));
		var url = weixin.callbackUrl({callbackurl:req.headers.host+req.url,state:'dreamcastle'});
		res.redirect(url);
	}
//	var user_agent = req.headers.user-agent;
	console.log(req.query);
	res.end('end');
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
		//模拟用户登录
		//获取codeurl
		
		
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






'use strict'
exports.wx = function(req ,res){
	console.log(req.query);
	res.end(req.query.echostr);
};
exports.test = function(req ,res){
	console.log(req.body);
	console.log(req.query);
	res.end('test page!');
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
 * 参数描述:
 * 一般第三方过来的openid的属性名称为 tpOpenid(测试)
 */
exports.init = function(req ,res ,next){
	var weixin = require('weixin');
	var workflow = req.app.utility.workflow(req, res);
	console.log('init');
	//通过文件头检查来源
	 workflow.on('checkUserAgent',function(){
		 console.log('checkUserAgent');
		 if(!req.session.tmp_openid){
			 req.session.tmp_openid = null;
		 }
		var user_agent = req.headers['user-agent'].toLowerCase();
		if(user_agent.indexOf('micromessenger') == '-1'){
			console.log('其他浏览器');
			//其他浏览器
			next();
		}else{
			console.log('微信浏览器');
			//微信浏览器
			workflow.emit('userIsLogin');
		}
	 });
	 
	 //判断用户是否已经登录(session)并且是否存在openid
	 workflow.on('userIsLogin',function(){
		 console.log(req.user);
		 //已经登录 有session并且weixin对象和openid属性存在并且不为空
		 if(req.user && req.user.weixin && req.user.weixin.openid.length > 0){
			 
			 console.log('存在session并且openid不为空');
			 console.log(req.user.weixin);
			 var tpOpenid = new Array();
			 if(req.query.tpOpenid)
				 tpOpenid.push(req.query.tpOpenid);
			 console.log(tpOpenid);
			 workflow.emit('relation',tpOpenid);
		 }else if(!req.user && req.session.tmp_openid && req.session.tmp_openid.localOpenid){
			 //是否已经存有openid的session但是没有进行关联登录
			 console.log('是否已经存有openid的session但是没有进行关联登录');
			 console.log(req.session.tmp_openid);
			 next();
		 }else{
			 console.log('不存在session或者openid为空');
			 workflow.emit('getOpenid');
		 }
	 });
	 
	 //从code获取本地openid
	 workflow.on('getOpenid',function(){
		 
		 //通过code判断是用户主动点击(微信会返回有code)链接过来还是被动过来(一般不带有code)的
		 if(!req.query.code){
			 /**
			  * @todo
			  */
			 console.log('用户被动点击,需要模拟用户点击请求code');
			 var url ='http://'+req.headers.host+req.url;
			 console.log(weixin.callbackUrl({callbackurl:url,state:req.app.config.weixin.state}));
			 return res.render('weixin/render',{
					url:weixin.callbackUrl({callbackurl:url,state:req.app.config.weixin.state}),
			 });
		 }else{
			 /**
			  * @todo
			  */
			 console.log('已请求到code:'+req.query.code);
			 weixin.webGrant(req.query.code ,function(err ,data){
				 if(err){
					return next(err);
				 }
				 /**
				  * @todo
				  */
				 console.log('获取到本地openid:'+data.openid);
				 if(data && data.openid !=''){
					 var search = new Array();
					 search.push(data.openid);
					 
					 //用户是否已经登录过了
					 if(req.user){
						 console.log("用户已经登录过了,现在跳转");
						 return workflow.emit('relation',search);
					 }
					 
					 //查找是否有用户存在,有的话直接登录
					 req.app.db.models.User.findOne({"weixin.openid" :{"$in":search}}, function(err, user){
						 if(err){
							return next(err);
						 }
						 //如果查找到 自动帮助用户登录
						 
						 console.log(user);
						 
						 if(user){
							 req.login(user, function(err) {
								 if (err) {
									 return next(err);
								 }
								 req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '微信登录成功');
							});
							 console.log(search);
							 workflow.emit('relation',search);
						 }else{
							 console.log('查询openid获取不到用户,将存入session后自动跳转');
							 req.session.tmp_openid = {
									 localOpenid : data.openid,
									 tpOpenid    : req.query.tpOpenid || '',
							 };
							 console.log(req.session);
							 next();
						 }
					 });
				 }else{
					//没有取得openid  程序有错误
					console.log('没有取得openid  程序有错误');
					next();					
				 }
			 });
		 }
	 });
	 
	 //关联openid
	 workflow.on('relation',function(searchArr){
		 console.log(searchArr);
		 console.log(req.user.weixin.openid);
		 var sLength = searchArr.length;
		 var userLenth = req.user.weixin.openid.length;
		 //对比
		 for(var i=0 ;i < sLength ;i++){
				var isExist = false;
				for(var j=0 ; j < userLenth ;j++){
					if(searchArr[i] == req.user.weixin.openid[j]){
						isExist = true;
						break;
					}
				}
				//不存在 填入user.weixin.openid 数组里面
				if(!isExist){
					req.user.weixin.openid.push(searchArr[i]);
				}
			}
		 if(userLenth < req.user.weixin.openid.length){
				var fieldsToSet = {
						'weixin.openid':req.user.weixin.openid,
				};
				req.app.db.models.User.findByIdAndUpdate( req.user._id ,fieldsToSet ,function(err ,queryObj){
					if(err){
						return next(err);
					}
					//更新成功,存入session
					if(queryObj){
						console.log('自动关联openid并更新成功');
						req.session.tmp_openid =null;
					}
					next();
				});
			}else{
				next();
			}
	 });
	 
	 workflow.emit('checkUserAgent');
}









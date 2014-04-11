'use strict'
exports.wx = function(req ,res){
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
 * 参数描述:
 * 一般第三方过来的openid的属性名称为 tpOpenid(测试)
 */
exports.init = function(req ,res ,next){
	var weixin = require('weixin').init(req);
	
	var workflow = req.app.utility.workflow(req, res);
	console.log('init');
	//通过文件头检查来源
	 workflow.on('checkUserAgent',function(){
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
		 //已经登录 有session并且weixin对象和openid属性存在并且不为空
		 if(req.user && req.user.weixin && req.user.weixin.openid.length > 0){
			 console.log('存在session并且openid不为空');
			 var tpOpenid = new Array();
			 //添加第三方
			 if(req.query.tpOpenid)
				 tpOpenid.push(req.query.tpOpenid);
			 
			 //直接关联
			 workflow.emit('relation',tpOpenid);
		 }else{
			 console.log('不存在session或者openid为空');
			 //获取openid
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
			 console.log('需要模拟用户点击请求code');
			 var url ='http://'+req.headers.host+req.url;
			 
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
					 if(req.query.tpOpenid){
						 search.push(req.query.tpOpenid);
		              }
					 //用户是否已经登录过了
					 if(req.user){
						 console.log("用户已经登录过了,现在开始关联帐号");
						 return workflow.emit('relation',search);
					 }
					 
					 //查找是否有用户存在,有的话直接登录并关联
					 req.app.db.models.User.findOne({"weixin.openid" :{"$in":search}}, function(err, user){
						 if(err){
							return next(err);
						 }
						 //如果查找到 自动帮助用户登录
						 if(user){
							 console.log('已查询到用户');
//							 req.login(user, function(err) {
//								 if (err) {
//									 return next(err);
//								 }
//								 req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '微信登录成功');
//							});
							 workflow.emit('relation',search);
						 }else{
							 console.log('查询openid获取不到用户,将存入session后自动跳转');
							 //直接注册
							 console.log('自动注册临时帐号');
							 var fieldsToSet = {
								        isActive: 'yes',
								        username: data.openid,
								        email: data.openid+'@example.com',
								        password: '', 
								        weixin: {
								        	openid:[data.openid]
								        },
								      };
							 req.app.db.models.User.create(fieldsToSet, function(err, user) {
								 if (err) {
							          return next(err);
							     }
								 if(!user) 
									 return next();
								 //create account 
								 var fullname ='';
								 var sourceLength = req.app.config.weixin.source;
								 for(var i=0 ;i < sourceLength ;i++){
									 if(req.query.state == req.app.config.weixin.source[i].name){
										 fullname = req.app.config.weixin.source[i].fullname;
										 break;
									 }
								 }
								 if(fullname){
									 fullname = req.app.config.weixin.source[0].fullname
								 }
								 console.log("state="+req.query.state+"fullname="+fullname);
								 
								 fieldsToSet = {
									      isVerified: req.app.get('require-account-verification') ? 'no' : 'yes',
									      'name.full': fullname,
									      user: {
									        id: user._id,
									        name: user.username
									      },
									      search: [
									       user.username
									      ]
									    };
							    req.app.db.models.Account.create(fieldsToSet, function(err, account) {
							        if (err) {
							        	return next(err);
							        }
							        if(!account) 
							        	return next();
							        //update user with account
							        user.roles.account = account._id;
							        user.save(function(err, user) {
							          if (err) {
							            return next(err);
							          }
//							          req.login(user, function(err) {
//							              if (err) {
//							            	  return next(err)
//							              }
//							              workflow.emit('relation',search);
//							            });
							        });
							          workflow.emit('relation',search);
							      });
							 });
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
					}
					next();
				});
			}else{
				next();
			}
	 });
	 
	 workflow.emit('checkUserAgent');
}









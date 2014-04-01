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
	
	//通过文件头检查来源
	 workflow.on('checkUserAgent',function(){
		 if(!req.session.tmp_openid){
			 req.session.tmp_openid={};
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
		 //已经登录 有session并且weixin对象和openid属性存在并且不为空
		 if(req.user.weixin && req.user.weixin.openid && req.user.weixin.openid != []){
			 
			 console.log('存在session并且openid不为空');
			 
			 workflow.emit('relation');
		 }else if(req.session.tmp_openid){
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
					 //查找是否有用户存在,有的话直接登录
					 req.app.db.models.User.findOne({"weixin.openid" :{"$in":search}}, function(err, user){
						 if(err){
							return next(err);
						 }
						 //如果查找到 自动帮助用户登录
						 if(user){
							 req.login(user, function(err) {
								 if (err) {
									 return next(err);
								 }
								 req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '微信登录成功');
							});
							 workflow.emit('relation',search);
						 }else{
							 console.log('查询openid获取不到用户,将存入session后自动跳转');
							 req.session.tmp_openid = {
									 localOpenid : data.openid,
									 tpOpenid    : req.query.tpOpenid,
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
	 workflow.on('relation',function(search){
		 var sLength = search.length;
		 var userLenth = req.user.weixin.openid.length;
		 //对比
		 for(var i=0 ;i < sLength ;i++){
				var isExist = false;
				for(var j=0 ; j < userLenth ;j++){
					if(search[i] == req.user.weixin.openid[j]){
						isExist = true;
						break;
					}
				}
				//不存在 填入user.weixin.openid 数组里面
				if(!isExist){
					req.user.weixin.openid(search[i]);
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
							req.session.tmp_openid ='';
						}
						next();
					});
				}else{
					next();
				}
			}
	 });
	 
	 workflow.emit('checkUserAgent');
}

////初始化
//exports._init = function(req ,res ,next){
//	var weixin = require('weixin');
//	//微信来源
////	 'user-agent': 'Mozilla/5.0 (Linux; Android 4.4.2; LG-P880 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36 MicroMessenger/5.2.380',
//	//普通来源
////	'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:17.0) Gecko/20131029 Firefox/17.0',
//	//判断来源 user-agent 区分是从微信来的还是别的地方来的(是否含有 MicroMessenger) req.headers.user-agent
//	
//	//req.headers.host	主域名
//	//req.url	//后缀
//	var user_agent = req.headers['user-agent'].toLowerCase();
//	
////	&& user_agent.indexOf('micromessenger') != '-1'
//	//其他浏览器
//	if(user_agent.indexOf('micromessenger') == '-1'){
//		return next();
//	}
//	
//	//注意:render=1 参数作为是否需要自动为用户跳转登录的标志信息,如果是通过链接点击进来 要加上 值为1
//	if( !req.query.code && (req.query.render != '1' || req.query.render != 1) && user_agent.indexOf('micromessenger') != '-1'){
//		console.log('微信跳转');
//		//跳转到微信页面然后返回当前页面 获取code
//		var url ='http://'+req.headers.host+req.url;
//		
//		if(url.indexOf('?') != '-1'){
//			url+='&render=1';
//		}else{
//			url+='?render=1';
//		}
//		return res.render('weixin/render',{
//			url:weixin.callbackUrl({callbackurl:url,state:req.app.config.weixin.state}),
//		});
//	}else{
//		console.log('获取到code:'+req.query.code);
//		//获取返回的数据 有code
//		var otherOpenid = req.query.openid;	//第三方id
//		var code = req.query.code;			//身份code
//		//检查是否可以自动登录
//		weixin.webGrant(code ,function(err ,data){
//			if(err){
//				return next(err);
//			}
//			console.log('获取到本地openid:'+data.openid);
//			if(data && data.openid !=''){
//				//直接使用openid登录并且直接更新openid
//				var search = new Array();
//				if(otherOpenid){
//					search.push(otherOpenid);  
//				}
//				search.push(data.openid);
//				console.log('查询内容:'+search);
//				req.app.db.models.User.findOne({"weixin.openid" :{"$in":search}}, function(err, user){
//					if(err){
//						return next(err);
//					}
//					if(user){
//						//循环对比两个openid是否在里面 不在的话更新一下
//						//获取本次openid长度
//						var sLength = search.length;
//						var userLenth = user.weixin.openid.length;
//						//对比
//						for(var i=0 ;i < sLength ;i++){
//							var isExist = false;
//							for(var j=0 ; j < userLenth ;j++){
//								if(search[i] == user.weixin.openid[j]){
//									isExist = true;
//									break;
//								}
//							}
//							//不存在 填入user.weixin.openid 数组里面
//							if(!isExist){
//								user.weixin.openid.push(search[i]);
//							}
//						}
//						var fieldsToSet = {
//								'weixin.openid':user.weixin.openid,
//						};
//						//更新
//						req.app.db.models.User.findByIdAndUpdate( user._id ,fieldsToSet ,function(err ,queryObj){
//							if(err){
//								return next(err);
//							}
//							//更新成功,存入session
//							if(queryObj){
////								req.login(user, function(err) {
////							          if (err) {
////							            return next(err);
////							          }
////				                      req.app.logger.log(req.app, user.username, req.app.reqip.getClientIp(req), 'INFO', 'login', '用户' + user.username + '关联微信第三方openid:"' + otherOpenid + '"并登录成功');
////								});
//								return next();
//							}
//						});
//						
//					}else{
//						//直接跳入引导页面 第三方来源点击链接后过来
//						if(req.query.state == req.app.config.weixin.state){
//							return res.render('weixin/relation/index',{
//								oauthMessage: '未检测到您的关联账户,请您先关联账户.',
//								localOpenid:data.openid,
//								otherOpenid:otherOpenid,
//								//第三方
//								
//							});
//						}else{
//							//此openid和外来openid 存入session 导航栏让用户选择是关联帐号或者新建帐号//本地来源 自己自登录
//							req.session._wx_openid = search;
//							return next();
//						}
//						
//					}
//					
//				});
//			}else{
//				//没有取得openid  程序有错误
//				res.end('error:错误 请重新登录');
//				return ;
//			}
//		});
//		
//	}
//	
//};
//
//
//exports.a = function(req ,res){
//	return res.render('weixin/relation/index',{
//		oauthMessage: '未检测到您的关联账户,请您先关联账户.',
//		localOpenid:'',
//		otherOpenid:'',
//		//第三方
//		
//	});
//	res.end('aaaa page');
//};









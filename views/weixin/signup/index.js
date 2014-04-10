/**
 * 注册帐号
 * 首先是通过本appid对应获取到的openid注册 然后如果有get参openid进来(通过第三方微信公众号进来注册)来源参数
 * 则同时注册然后关联
 */
exports.signup_init = function(req , res ,next){
	console.log(req.query.openid+'/relation');
	//输入帐号密码
	//提交验证
	//验证通过 自动生成新的用户数据+openid
	res.end('signup_init');
};

exports.signup = function(req , res ,next){
	
};
'use strict';

exports.init = function(req, res){
  res.render('account/points/index',{
	  levelName : req.user.roles.account.integral.levelName,
	  consumeMomey : req.user.roles.account.integral.consumeMoney,
	  points : req.user.roles.account.integral.points,
  });
};

//测试函数
exports.test = function(req ,res){

//		  req.app.db.models.Account ,req.user.roles.account.integral;
	  
	  var Integral = new (require('member_integral')(req))();
	  //下列函数 第一个参数 200 代表输入的金额 会根据个人会员等级转换积分,提升等级等等
	  Integral.reducePoints(18 ,function(err ,result){
		  if(err){
			  console.log(err);
		  }
		  if(result){
			  //result 包含有旧的个人积分信息和新添加的个人信息
			  console.log(result);
			  //req.user.roles.account.integral 包含有个人添加积分后的所有新信息(包括等级,消费金额,等级名称等)
			  console.log(req.user.roles.account.integral);
			  //日志记录参考例子:
			  //用户admin使用防伪码: testing 兑换积分成功.(原消费总消费金额:2800,新增消费金额:321,新总消费金额:3121;原总积分:4880,新增积分:642,新总积分:5522;原等级:至尊VIP会员,新增等级:0,新等级:至尊VIP会员)
//			  req.app.logger.log(req.app, req.user.username, req.app.reqip.getClientIp(req), 'SUCCESS', 'convertCode', '用户' + req.user.username + '使用防伪码: testing 兑换积分成功.(原消费总消费金额:' + result.oldConsumeMoney + ',新增消费金额:' + result.addMoney + ',新总消费金额:' + req.user.roles.account.integral.consumeMoney + ';原总积分:' + result.oldPoints + ',新增积分:' + result.addPoints + ',新总积分:' + req.user.roles.account.integral.points + ';原等级:' + result.oldLevelName + ',新增等级:' + result.addLevel + ',新等级:'+ req.user.roles.account.integral.levelName +')');
			  req.app.logger.log(req.app, req.user.username, req.app.reqip.getClientIp(req), 'SUCCESS', 'addPoints', '用户' + req.user.username + '兑换消费积分.(原总积分:' + result.oldPoints + ',消费积分:' + result.reducePoints + ',新总积分:' + req.user.roles.account.integral.points + ')');
			  
			  console.log('success add!!!!');
		  }
	  });
	  
//	  req.app.db.models.Integral.create({isUse:'yes'});
	  
	  res.end();
};
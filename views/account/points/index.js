'use strict';

exports.init = function(req, res){
  res.render('account/points/index',{
	  levelName : req.user.roles.account.integral.levelName,
	  consumeMomey : req.user.roles.account.integral.consumeMoney,
	  points : req.user.roles.account.integral.points,
  });
};


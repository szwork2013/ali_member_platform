'use strict';

exports.init = function(req, res){
  res.render('index');
};

exports.wx_check = function(req ,res){
	console.log(req.query);
	res.end();
}
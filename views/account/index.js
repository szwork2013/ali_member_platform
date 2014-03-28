'use strict';

exports.init = function(req, res, next){
  var outcome = {};

  var getAccountData = function(callback) {
    if (req.user.qq) {
      //console.log('QQ Nick: ', req.user.qq.nickname);
      outcome.nickname = req.user.qq.nickname;
      outcome.avatar = req.user.qq.figureurl;
    } else if(req.user.weibo) {
      //console.log('Weibo Nick: ', req.user.weibo.screen_name);
      outcome.nickname = req.user.weibo.screen_name;
      outcome.avatar = req.user.weibo.profile_image_url;
    }
    req.app.db.models.Account.findById(req.user.roles.account.id, 'name').exec(function(err, account) {
      if (err) {
        return callback(err, null);
      }

      outcome.fullname = account.name.full;
      callback(null, 'done');
    });
  };

  var asyncFinally = function(err, results) {
    if (err) {
      return next(err);
    }

    res.render('account/index', {
      fullname: outcome.fullname == '' ? req.user.username : outcome.fullname,
      nickname: outcome.nickname == '' ? '我的帐号' : outcome.nickname,
      avatar: outcome.avatar == '' ? '' : outcome.avatar
    });
  };

  require('async').parallel([getAccountData], asyncFinally);
//  res.render('account/index');
};

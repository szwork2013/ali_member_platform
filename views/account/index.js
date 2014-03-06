'use strict';

exports.init = function(req, res, next){
  var outcome = {};

  var getAccountData = function(callback) {
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
      fullname: outcome.fullname
    });
  };

  require('async').parallel([getAccountData], asyncFinally);
//  res.render('account/index');
};

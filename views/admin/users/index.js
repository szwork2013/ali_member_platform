'use strict';

exports.find = function(req, res, next){
  req.query.username = req.query.username ? req.query.username : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.username) {
    filters.username = new RegExp('^.*?'+ req.query.username +'.*$', 'i');
  }

  if (req.query.isActive) {
    filters.isActive = req.query.isActive;
  }

  if (req.query.roles && req.query.roles === 'admin') {
    filters['roles.admin'] = { $exists: true };
  }

  if (req.query.roles && req.query.roles === 'account') {
    filters['roles.account'] = { $exists: true };
  }

  req.app.db.models.User.pagedFind({
    filters: filters,
    keys: 'username email isActive',
    limit: req.query.limit,
    page: req.query.page,
    sort: req.query.sort
  }, function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      results.filters = req.query;
      res.send(results);
    }
    else {
      results.filters = req.query;
      res.render('admin/users/index', { data: { results: JSON.stringify(results) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.User.findById(req.params.id).populate('roles.admin', 'name.full').populate('roles.account', 'name.full').exec(function(err, user) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(user);
    }
    else {
      res.render('admin/users/details', { data: { record: escape(JSON.stringify(user)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.username) {
      workflow.outcome.errors.push('请输入一个用户名。');
      return workflow.emit('response');
    }

    if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
      workflow.outcome.errors.push('只允许使用英文字母、数字、-和_');
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function() {
    req.app.db.models.User.findOne({ username: req.body.username }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errors.push('此用户名已被占用。');
        return workflow.emit('response');
      }

      workflow.emit('createUser');
    });
  });

  workflow.on('createUser', function() {
    var fieldsToSet = {
      username: req.body.username,
      search: [
        req.body.username
      ]
    };
    req.app.db.models.User.create(fieldsToSet, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = user;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.isActive) {
      req.body.isActive = 'no';
    }

    if (!req.body.username) {
      workflow.outcome.errfor.username = '必须的';
    }
    else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
      workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
    }

    if (!req.body.email) {
      workflow.outcome.errfor.email = '必须的';
    }
    else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
      workflow.outcome.errfor.email = 'invalid email format';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function() {
    req.app.db.models.User.findOne({ username: req.body.username, _id: { $ne: req.params.id } }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.username = 'username already taken';
        return workflow.emit('response');
      }

      workflow.emit('duplicateEmailCheck');
    });
  });

  workflow.on('duplicateEmailCheck', function() {
    req.app.db.models.User.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: req.params.id } }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.email = 'email already taken';
        return workflow.emit('response');
      }

      workflow.emit('patchUser');
    });
  });

  workflow.on('patchUser', function() {
    var fieldsToSet = {
      isActive: req.body.isActive,
      username: req.body.username,
      email: req.body.email.toLowerCase(),
      search: [
        req.body.username,
        req.body.email
      ]
    };

    req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('patchAdmin', user);
    });
  });

  workflow.on('patchAdmin', function(user) {
    if (user.roles.admin) {
      var fieldsToSet = {
        user: {
          id: req.params.id,
          name: user.username
        }
      };
      req.app.db.models.Admin.findByIdAndUpdate(user.roles.admin, fieldsToSet, function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.emit('patchAccount', user);
      });
    }
    else {
      workflow.emit('patchAccount', user);
    }
  });

  workflow.on('patchAccount', function(user) {
    if (user.roles.account) {
      var fieldsToSet = {
        user: {
          id: req.params.id,
          name: user.username
        }
      };
      req.app.db.models.Account.findByIdAndUpdate(user.roles.account, fieldsToSet, function(err, account) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.emit('populateRoles', user);
      });
    }
    else {
      workflow.emit('populateRoles', user);
    }
  });

  workflow.on('populateRoles', function(user) {
    user.populate('roles.admin roles.account', 'name.full', function(err, populatedUser) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.user = populatedUser;
      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.password = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.newPassword) {
      workflow.outcome.errfor.newPassword = '必须的';
    }

    if (!req.body.confirm) {
      workflow.outcome.errfor.confirm = '必须的';
    }

    if (req.body.newPassword !== req.body.confirm) {
      workflow.outcome.errors.push('密码不一致。');
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('patchUser');
  });

  workflow.on('patchUser', function() {
    req.app.db.models.User.encryptPassword(req.body.newPassword, function(err, hash) {
      if (err) {
        return workflow.emit('exception', err);
      }

      var fieldsToSet = { password: hash };
      req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        user.populate('roles.admin roles.account', 'name.full', function(err, user) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.user = user;
          workflow.outcome.newPassword = '';
          workflow.outcome.confirm = '';
          workflow.emit('response');
        });
      });
    });
  });

  workflow.emit('validate');
};

exports.linkAdmin = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有关联用户到管理员的权限。');
      return workflow.emit('response');
    }

    if (!req.body.newAdminId) {
      workflow.outcome.errfor.newAdminId = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('verifyAdmin');
  });

  workflow.on('verifyAdmin', function(callback) {
    req.app.db.models.Admin.findById(req.body.newAdminId).exec(function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!admin) {
        workflow.outcome.errors.push('未找到管理员。');
        return workflow.emit('response');
      }

      if (admin.user.id && admin.user.id !== req.params.id) {
        workflow.outcome.errors.push('此管理员已关联到另一个用户。');
        return workflow.emit('response');
      }

      workflow.admin = admin;
      workflow.emit('duplicateLinkCheck');
    });
  });

  workflow.on('duplicateLinkCheck', function(callback) {
    req.app.db.models.User.findOne({ 'roles.admin': req.body.newAdminId, _id: {$ne: req.params.id} }).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errors.push('另一个用户已关联到该管理员。');
        return workflow.emit('response');
      }

      workflow.emit('patchUser');
    });
  });

  workflow.on('patchUser', function(callback) {
    req.app.db.models.User.findById(req.params.id).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      user.roles.admin = req.body.newAdminId;
      user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        user.populate('roles.admin roles.account', 'name.full', function(err, user) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.user = user;
          workflow.emit('patchAdmin');
        });
      });
    });
  });

  workflow.on('patchAdmin', function() {
    workflow.admin.user = { id: req.params.id, name: workflow.outcome.user.username };
    workflow.admin.save(function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.unlinkAdmin = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有取消用户到管理员关联的权限。');
      return workflow.emit('response');
    }

    if (req.user._id === req.params.id) {
      workflow.outcome.errors.push('你不能取消自己与管理员帐号的关联。');
      return workflow.emit('response');
    }

    workflow.emit('patchUser');
  });

  workflow.on('patchUser', function() {
    req.app.db.models.User.findById(req.params.id).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        workflow.outcome.errors.push('未找到用户。');
        return workflow.emit('response');
      }

      var adminId = user.roles.admin;
      user.roles.admin = null;
      user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        user.populate('roles.admin roles.account', 'name.full', function(err, user) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.user = user;
          workflow.emit('patchAdmin', adminId);
        });
      });
    });
  });

  workflow.on('patchAdmin', function(id) {
    req.app.db.models.Admin.findById(id).exec(function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!admin) {
        workflow.outcome.errors.push('未找到管理员。');
        return workflow.emit('response');
      }

      admin.user = undefined;
      admin.save(function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};

exports.linkAccount = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有关联用户到会员帐号的权限。');
      return workflow.emit('response');
    }

    if (!req.body.newAccountId) {
      workflow.outcome.errfor.newAccountId = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('verifyAccount');
  });

  workflow.on('verifyAccount', function(callback) {
    req.app.db.models.Account.findById(req.body.newAccountId).exec(function(err, account) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!account) {
        workflow.outcome.errors.push('未找到会员帐号。');
        return workflow.emit('response');
      }

      if (account.user.id && account.user.id !== req.params.id) {
        workflow.outcome.errors.push('此会员帐号已关联到另一个用户。');
        return workflow.emit('response');
      }

      workflow.account = account;
      workflow.emit('duplicateLinkCheck');
    });
  });

  workflow.on('duplicateLinkCheck', function(callback) {
    req.app.db.models.User.findOne({ 'roles.account': req.body.newAccountId, _id: {$ne: req.params.id} }).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errors.push('另一个用户已关联到该会员帐号。');
        return workflow.emit('response');
      }

      workflow.emit('patchUser');
    });
  });

  workflow.on('patchUser', function(callback) {
    req.app.db.models.User.findById(req.params.id).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      user.roles.account = req.body.newAccountId;
      user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        user.populate('roles.admin roles.account', 'name.full', function(err, user) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.user = user;
          workflow.emit('patchAccount');
        });
      });
    });
  });

  workflow.on('patchAccount', function() {
    workflow.account.user = { id: req.params.id, name: workflow.outcome.user.username };
    workflow.account.save(function(err, account) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.unlinkAccount = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有取消用户到会员帐号关联的权限。');
      return workflow.emit('response');
    }

    workflow.emit('patchUser');
  });

  workflow.on('patchUser', function() {
    req.app.db.models.User.findById(req.params.id).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        workflow.outcome.errors.push('用户未找到。');
        return workflow.emit('response');
      }

      var accountId = user.roles.account;
      user.roles.account = null;
      user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        user.populate('roles.admin roles.account', 'name.full', function(err, user) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.user = user;
          workflow.emit('patchAccount', accountId);
        });
      });
    });
  });

  workflow.on('patchAccount', function(id) {
    req.app.db.models.Account.findById(id).exec(function(err, account) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!account) {
        workflow.outcome.errors.push('会员帐号未找到。');
        return workflow.emit('response');
      }

      account.user = undefined;
      account.save(function(err, account) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有删除用户的权限。');
      return workflow.emit('response');
    }

    if (req.user._id === req.params.id) {
      workflow.outcome.errors.push('你不能删除你自己。');
      return workflow.emit('response');
    }

    workflow.emit('deleteUser');
  });

  workflow.on('deleteUser', function(err) {
    req.app.db.models.User.findByIdAndRemove(req.params.id, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

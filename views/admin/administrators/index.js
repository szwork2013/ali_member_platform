'use strict';

exports.find = function(req, res, next){
  req.query.search = req.query.search ? req.query.search : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.search) {
    filters.search = new RegExp('^.*?'+ req.query.search +'.*$', 'i');
  }

  req.app.db.models.Admin.pagedFind({
    filters: filters,
    keys: 'name.full',
    limit: req.query.limit,
    page: req.query.page,
    sort: req.query.sort
  }, function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      results.filters = req.query;
      res.send(results);
    }
    else {
      results.filters = req.query;
      res.render('admin/administrators/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  var outcome = {};

  var getAdminGroups = function(callback) {
    req.app.db.models.AdminGroup.find({}, 'name').sort('name').exec(function(err, adminGroups) {
      if (err) {
        return callback(err, null);
      }

      outcome.adminGroups = adminGroups;
      return callback(null, 'done');
    });
  };

  var getRecord = function(callback) {
    req.app.db.models.Admin.findById(req.params.id).populate('groups', 'name').exec(function(err, record) {
      if (err) {
        return callback(err, null);
      }

      outcome.record = record;
      return callback(null, 'done');
    });
  };

  var asyncFinally = function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(outcome.record);
    }
    else {
      res.render('admin/administrators/details', {
        data: {
          record: escape(JSON.stringify(outcome.record)),
          adminGroups: outcome.adminGroups
        }
      });
    }
  };

  require('async').parallel([getAdminGroups, getRecord], asyncFinally);
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body['name.full']) {
      workflow.outcome.errors.push('请输入姓名。');
      return workflow.emit('response');
    }

    workflow.emit('createAdministrator');
  });

  workflow.on('createAdministrator', function() {
    var nameParts = req.body['name.full'].trim().split(/\s/);
    var fieldsToSet = {
      name: {
        first: nameParts.shift(),
//        middle: (nameParts.length > 1 ? nameParts.shift() : ''),
        last: (nameParts.length === 0 ? '' : nameParts.join(' ')),
      }
    };
    fieldsToSet.name.full = fieldsToSet.name.first + (fieldsToSet.name.last ? ' '+ fieldsToSet.name.last : '');
    fieldsToSet.search = [
      fieldsToSet.name.first,
//      fieldsToSet.name.middle,
      fieldsToSet.name.last
    ];

    req.app.db.models.Admin.create(fieldsToSet, function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = admin;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.first) {
      workflow.outcome.errfor.first = '必须的';
    }

    if (!req.body.last) {
      workflow.outcome.errfor.last = '必须的';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('patchAdministrator');
  });

  workflow.on('patchAdministrator', function() {
    var fieldsToSet = {
      name: {
        first: req.body.first,
//        middle: req.body.middle,
        last: req.body.last,
        full: req.body.first +' '+ req.body.last
      },
      search: [
        req.body.first,
//        req.body.middle,
        req.body.last
      ]
    };

    req.app.db.models.Admin.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      admin.populate('groups', 'name', function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.outcome.admin = admin;
        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};

exports.groups = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有修改管理员所属分组的权限。');
      return workflow.emit('response');
    }

    if (!req.body.groups) {
      workflow.outcome.errfor.groups = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('patchAdministrator');
  });

  workflow.on('patchAdministrator', function() {
    var fieldsToSet = {
      groups: req.body.groups
    };

    req.app.db.models.Admin.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      admin.populate('groups', 'name', function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.outcome.admin = admin;
        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};

exports.permissions = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有权限来修改管理员的权限。');
      return workflow.emit('response');
    }

    if (!req.body.permissions) {
      workflow.outcome.errfor.permissions = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('patchAdministrator');
  });

  workflow.on('patchAdministrator', function() {
    var fieldsToSet = {
      permissions: req.body.permissions
    };

    req.app.db.models.Admin.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      admin.populate('groups', 'name', function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.outcome.admin = admin;
        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};

exports.linkUser = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有关联管理员到用户的权限。');
      return workflow.emit('response');
    }

    if (!req.body.newUsername) {
      workflow.outcome.errfor.newUsername = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('verifyUser');
  });

  workflow.on('verifyUser', function(callback) {
    req.app.db.models.User.findOne({ username: req.body.newUsername }, 'username').exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        workflow.outcome.errors.push('未找到用户。');
        return workflow.emit('response');
      }
      else if (user.roles && user.roles.admin && user.roles.admin !== req.params.id) {
        workflow.outcome.errors.push('用户已经关联到另一个管理员。');
        return workflow.emit('response');
      }

      workflow.user = user;
      workflow.emit('duplicateLinkCheck');
    });
  });

  workflow.on('duplicateLinkCheck', function(callback) {
    req.app.db.models.Admin.findOne({ 'user.id': workflow.user._id, _id: { $ne: req.params.id } }).exec(function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (admin) {
        workflow.outcome.errors.push('另一个管理员已经关联到此用户。');
        return workflow.emit('response');
      }

      workflow.emit('patchUser');
    });
  });

  workflow.on('patchUser', function() {
    req.app.db.models.User.findByIdAndUpdate(workflow.user._id, { 'roles.admin': req.params.id }).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('patchAdministrator');
    });
  });

  workflow.on('patchAdministrator', function(callback) {
    req.app.db.models.Admin.findByIdAndUpdate(req.params.id, { user: { id: workflow.user._id, name: workflow.user.username } }).exec(function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      admin.populate('groups', 'name', function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.outcome.admin = admin;
        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};

exports.unlinkUser = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有取消用户与管理员关联的权限。');
      return workflow.emit('response');
    }

    if (req.user.roles.admin._id === req.params.id) {
      workflow.outcome.errors.push('你不能将你自己与管理员取消关联。');
      return workflow.emit('response');
    }

    workflow.emit('patchAdministrator');
  });

  workflow.on('patchAdministrator', function() {
    req.app.db.models.Admin.findById(req.params.id).exec(function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!admin) {
        workflow.outcome.errors.push('未找到管理员。');
        return workflow.emit('response');
      }

      var userId = admin.user.id;
      admin.user = { id: undefined, name: ''};
      admin.save(function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        admin.populate('groups', 'name', function(err, admin) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.admin = admin;
          workflow.emit('patchUser', userId);
        });
      });
    });
  });

  workflow.on('patchUser', function(id) {
    req.app.db.models.User.findById(id).exec(function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        workflow.outcome.errors.push('用户未找到。');
        return workflow.emit('response');
      }

      user.roles.admin = undefined;
      user.save(function(err, user) {
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
      workflow.outcome.errors.push('你没有权限删除管理员。');
      return workflow.emit('response');
    }

    if (req.user.roles.admin._id === req.params.id) {
      workflow.outcome.errors.push('你不能将你自己的管理员帐号删除。');
      return workflow.emit('response');
    }

    workflow.emit('deleteAdministrator');
  });

  workflow.on('deleteAdministrator', function(err) {
    req.app.db.models.Admin.findByIdAndRemove(req.params.id, function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

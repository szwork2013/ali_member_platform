'use strict';

exports.find = function(req, res, next){
  req.query.name = req.query.name ? req.query.name : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.name) {
    filters.name = new RegExp('^.*?'+ req.query.name +'.*$', 'i');
  }

  req.app.db.models.AdminGroup.pagedFind({
    filters: filters,
    keys: 'name',
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
      res.render('admin/admin-groups/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.AdminGroup.findById(req.params.id).exec(function(err, adminGroup) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(adminGroup);
    }
    else {
      res.render('admin/admin-groups/details', { data: { record: escape(JSON.stringify(adminGroup)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有创建管理员分组的权限。');
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errors.push('请输入一个名称。');
      return workflow.emit('response');
    }

//    if (!/^[a-zA-Z0-9\_]+$/.test(req.body.name)) {
//      workflow.outcome.errors.push('只允许使用英文字母、数字和_');
//      return workflow.emit('response');
//    }

    workflow.emit('duplicateAdminGroupCheck');
  });

  workflow.on('duplicateAdminGroupCheck', function() {
    req.app.db.models.AdminGroup.findById(req.app.utility.slugify(req.body.name)).exec(function(err, adminGroup) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (adminGroup) {
        workflow.outcome.errors.push('该分组已存在。');
        return workflow.emit('response');
      }

      workflow.emit('createAdminGroup');
    });
  });

  workflow.on('createAdminGroup', function() {
    var fieldsToSet = {
      _id: req.app.utility.slugify(req.body.name),
      name: req.body.name
    };

    req.app.db.models.AdminGroup.create(fieldsToSet, function(err, adminGroup) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = adminGroup;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有修改管理员分组的权限。');
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errfor.name = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('patchAdminGroup');
  });

  workflow.on('patchAdminGroup', function() {
    var fieldsToSet = {
      name: req.body.name
    };

    req.app.db.models.AdminGroup.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, adminGroup) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.adminGroup = adminGroup;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.permissions = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有权限修改管理员分组的权限。');
      return workflow.emit('response');
    }

    if (!req.body.permissions) {
      workflow.outcome.errfor.permissions = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('patchAdminGroup');
  });

  workflow.on('patchAdminGroup', function() {
    var fieldsToSet = {
      permissions: req.body.permissions
    };

    req.app.db.models.AdminGroup.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, adminGroup) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.adminGroup = adminGroup;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有删除管理员分组的权限。');
      return workflow.emit('response');
    }

    workflow.emit('deleteAdminGroup');
  });

  workflow.on('deleteAdminGroup', function(err) {
    req.app.db.models.AdminGroup.findByIdAndRemove(req.params.id, function(err, adminGroup) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

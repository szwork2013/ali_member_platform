'use strict';

exports.find = function(req, res, next){
  req.query.pivot = req.query.pivot ? req.query.pivot : '';
  req.query.name = req.query.name ? req.query.name : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.pivot) {
    filters.pivot = new RegExp('^.*?'+ req.query.pivot +'.*$', 'i');
  }
  if (req.query.name) {
    filters.name = new RegExp('^.*?'+ req.query.name +'.*$', 'i');
  }

  req.app.db.models.Category.pagedFind({
    filters: filters,
    keys: 'pivot name',
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
      res.render('admin/categories/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.Category.findById(req.params.id).exec(function(err, category) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(category);
    }
    else {
      res.render('admin/categories/details', { data: { record: escape(JSON.stringify(category)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有创建分类的权限。');
      return workflow.emit('response');
    }

    if (!req.body.pivot) {
      workflow.outcome.errors.push('前缀是必须的。');
      return workflow.emit('response');
    }

    if (!/^[a-zA-Z0-9\_]+$/.test(req.body.pivot)) {
      workflow.outcome.errors.push('前缀只允许使用英文字母、数字和_');
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errors.push('名称是必须的。');
      return workflow.emit('response');
    }

    workflow.emit('duplicateCategoryCheck');
  });

  workflow.on('duplicateCategoryCheck', function() {
    req.app.db.models.Category.findById(req.app.utility.slugify(req.body.pivot +' '+ req.body.name)).exec(function(err, category) {
      if (err) {
        return workflow.emit('exception', err);
      }

      console.log('Cat search: ' + req.app.utility.slugify(req.body.pivot +' '+ req.body.name));
      if (category) {
        workflow.outcome.errors.push('此前缀+分类已存在。');
        return workflow.emit('response');
      }

      workflow.emit('createCategory');
    });
  });

  workflow.on('createCategory', function() {
    var fieldsToSet = {
      _id: req.app.utility.slugify(req.body.pivot +' '+ req.body.name),
      pivot: req.body.pivot,
      name: req.body.name
    };

    req.app.db.models.Category.create(fieldsToSet, function(err, category) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = category;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有修改分类的权限。');
      return workflow.emit('response');
    }

    if (!req.body.pivot) {
      workflow.outcome.errfor.pivot = 'pivot';
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errfor.name = '必须的';
      return workflow.emit('response');
    }

    workflow.emit('patchCategory');
  });

  workflow.on('patchCategory', function() {
    var fieldsToSet = {
      pivot: req.body.pivot,
      name: req.body.name
    };

    req.app.db.models.Category.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, category) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.category = category;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('你没有删除分类的权限。');
      return workflow.emit('response');
    }

    workflow.emit('deleteCategory');
  });

  workflow.on('deleteCategory', function(err) {
    req.app.db.models.Category.findByIdAndRemove(req.params.id, function(err, category) {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

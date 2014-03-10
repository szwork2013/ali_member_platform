'use strict';

exports.init = function(req, res){
  res.render('account/products/index');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.serial) {
      workflow.outcome.errfor.serial = 'required';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('associate');
  });

  workflow.on('associate', function() {
    var request = require('request');
    console.log('Associate - token: '+req.app.config.product.key);

    request.post(req.app.config.product.url+'associate',
      {form:{reg_uid: req.user.id, code: req.body.serial, access_token: req.app.config.product.key}},
      function(error, response, body){

      console.log('Associate - result: ', JSON.parse(body));
      if (error) {
        return workflow.emit('exception', error);
      }
      // 判断返回串是否是错误信息
      if (body && JSON.parse(body).hasOwnProperty('error')) {
        return workflow.emit('exception', JSON.parse(body).error);
      }

      workflow.emit('patchAccount', body);
    });
  });

  /*
  返回样例：
   { sc_info:
   { id: 2,
   serial: 1300000002,
   code: '70051363961347045121',
   pid: 1,
   bid: 4,
   times: '1',
   created_at: '2013-12-11T07:32:57.000Z',
   updated_at: '2014-02-24T07:08:20.000Z',
   reg_uid: '53156f20c07ddc1335802a96',
   reg_date: '2014-03-10T07:31:13.081Z',
   reg_times: 1,
   page_id: '2013-1-00001',
   production_date: null,
   arrival_date: '2013-12-01T00:00:00.000Z',
   recipient_id: 1,
   note_id: 1,
   status: 4 },
   p_info:
   { sku: '10001',
   uuid: '8024-0F97-9DAB-8FDF',
   name: 'TestProduct1',
   status: 0,
   thumb: 'undefined://undefined/uploads/product/image/1/thumb_选区_002.png',
   small_thumb: 'undefined://undefined/uploads/product/image/1/small_thumb_选区_002.png',
   image: 'undefined://undefined/uploads/product/image/1/选区_002.png' } }
   */

  workflow.on('patchAccount', function(result) {
    req.app.db.models.Account.findById(req.user.roles.account.id, function(err, account){
      console.log('patchAccount: '+result);
      if(err) {
        return workflow.emit('exception', err);
      }
      // 设定当前关联的产品id，比上一个已关联产品id大1
      var p_id = 1;
      if(account && account.hasOwnProperty('products')) {
        if(account.products.length > 0) {
          p_id = account.products[account.products.length - 1].product.id + 1;
        }
      }

      var product = {
        product: {
          id: p_id,
          info: result
        }
      };
      req.app.db.models.Account.findOneAndUpdate(req.user.roles.account.id, {$push: {products: product}}, function(err, account) {
        if (err) {
          return workflow.emit('exception', err);
        }
        req.app.logger.log(req.app, req.user.username, req.ip, 'INFO', 'account.product', '会员' + account.name.full + '关联了产品' + result);
        workflow.outcome.account = account;
        return workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};
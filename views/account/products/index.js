'use strict';

var compose_products_info = function(products) {
  //对相同产品，合并产品信息，但是防伪码信息不合并
  var groupBy = require('group-by');  //使用group-by模块
  var grp_products = groupBy(products, 'product.info.p_info.uuid'); //按照uuid分组
  var result = [];
  for(var key in grp_products) {  //key即uuid
    var ps = grp_products[key]; //一组产品信息
    //console.log("PS: ", ps);
    var scs_info = [];
    for(var i in ps) {  //将防伪码信息放到数组里
      //console.log("P in PS: ", ps[i]);
      scs_info.push({sc_info: ps[i].product.info.sc_info});
    }
    //将产品信息、防伪码数组、产品登记个数放到结果数组里
    result.push({uuid: key, total: ps.length, p_info: ps[ps.length - 1].product.info.p_info, scs_info: scs_info});
  }
  return result;
}

var renderSettings = function(req, res, next) {
  var outcome = {};

//  var getProductsData = function(callback) {
//    req.app.db.models.Account.findById(req.user.roles.account.id, 'products').exec(function(err, account) {
//      if (err) {
//        return callback(err, null);
//      }
//
//      //输出给backbone客户端的结果数组products
//      outcome.products = compose_products_info(account.products);  //account.products;
//      callback(null, 'done');
//    });
//  };

  var asyncFinally = function(err, results) {
    if (err) {
      return next(err);
    }

    // 渲染页面，index.jade 页末的!{data.products}即为此数据
    res.render('account/products/index');
//    res.render('account/products/index', {
//      data: {
//        products: escape(JSON.stringify(outcome.products))
//      }
//    });
  };

//  require('async').parallel([getProductsData], asyncFinally);
  require('async').parallel([], asyncFinally);
};

exports.init = function(req, res, next){
  renderSettings(req, res, next);
};

//exports.read = function(req, res, next){
//  var outcome = {};
//  req.app.db.models.Account.findById(req.user.roles.account.id, 'products').exec(function(err, account) {
//    if (err) {
//      return next(err, null);
//    }
//
//    //输出给backbone客户端的结果数组products
//    outcome.products = compose_products_info(account.products);  //account.products;
//    res.json({
//      data: {
//        products: escape(JSON.stringify(outcome.products))
//      }
//    });
//  });
//};

exports.read = function(req, res, next){
  var outcome = {};

  var getRecord = function(callback) {
    req.app.db.models.Account.findById(req.user.roles.account.id, 'products').exec(function(err, account) {
      if (err) {
        return next(err, null);
      }

      //输出给backbone客户端的结果数组products
      outcome.products = compose_products_info(account.products);  //account.products;
      return callback(null, 'done');
    });
  };

  var asyncFinally = function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send({data: {products: outcome.products}});
    }
  };

  require('async').parallel([getRecord], asyncFinally);
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

      if (req.session.passport.user) {
        workflow.emit('associate');
      } else {
        return workflow.emit('exception', '你的当前会话已结束，请重新登录');
      }
  });

  workflow.on('associate', function() {
    var request = require('request');

    //使用POST方式提交关联请求
    request.post(req.app.config.product.url+'associate',
      {form:{reg_uid: req.user.id, code: req.body.serial, access_token: req.app.config.product.key}},
      function(error, response, body){

      var result = JSON.parse(body.trim());

      if (error) {
        return workflow.emit('exception', error);
      }
      // 判断返回串是否是错误信息
      if (body && result.hasOwnProperty('error')) {
        return workflow.emit('exception', result.error);
      }

      workflow.emit('patchAccount', result);
    });
  });

  /*
  返回样例：
   {
     sc_info: //防伪码信息
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
     p_info:  //关联的产品信息
       { sku: '10001',
       uuid: '8024-0F97-9DAB-8FDF',
       name: 'TestProduct1',
       price: 100.00,
       status: 0,
       thumb: 'http://localhost:3000/uploads/product/image/1/thumb_选区_002.png',
       small_thumb: 'http://localhost:3000/uploads/product/image/1/small_thumb_选区_002.png',
       image: 'http://localhost:3000/uploads/product/image/1/选区_002.png' }
   }
   */

  workflow.on('patchAccount', function(result) {
    req.app.db.models.Account.findById(req.user.roles.account.id, function(err, account){

      if(err) {
        return workflow.emit('exception', err);
      }
      // 设定当前关联的产品id，比上一个已关联产品id大1
      var p_id = 1;
      if(account.products) {
        if(account.products.length > 0) {
          p_id = account.products[account.products.length - 1].product.id + 1;
        }
      }

      // 会员积分属性
      if(account.integral.isNullOrUndefined) {
        //console.log("No integral!");
        account.push({integral: {}});
        account.save();
        //console.log("Add integral：", account.integral);
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

        req.app.logger.log(req.app, req.user.username, req.ip, 'INFO', 'account.product', '会员' + account.name.full +
          '使用防伪码' + result.sc_info.code +
          '关联了产品' + result.p_info.name);

        var integral = new (require('member_integral')(req))();
        //console.log("Price? ", product.product.info.p_info.price);
        integral.convertCode(product.product.info.p_info.price, function(err, result2){
          if(err){
            req.app.logger.log(req.app, req.user.username, req.ip, 'ERROR', 'account.integral',
              '会员' + account.name.full +
              '增加积分失败，错误：' + err
            );
            //console.log("err: ", err);
          }
          req.app.logger.log(req.app, req.user.username, req.ip, 'INFO', 'account.integral',
            '会员' + account.name.full +
            '兑换积分成功。（原总消费:' + result2.oldConsumeMoney +
            '，新增消费:' + result2.addMoney +
            '，现总消费:' + req.user.roles.account.integral.consumeMoney +
            '；原总积分:' + result2.oldPoints +
            '，新增积分:' + result2.addPoints +
            '，现总积分:' + req.user.roles.account.integral.points +
            '；原等级:' + result2.oldLevelName +
            '，新增等级:' + result.addLevel +
            '，现等级:' + req.user.roles.account.integral.levelName + '）'
          );
          //console.log("result: ", result2);
        });

        workflow.outcome.newproduct = product;  //将productdb返回的关联产品信息附加到response
        return workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};
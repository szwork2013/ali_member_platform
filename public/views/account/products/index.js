/* global app:true */

(function() {
  'use strict';

  app = app || {};

  app.Products = Backbone.Model.extend({
    idAttribute: '_id',
    url: '/account/products/'
  });

  app.NewProduct = Backbone.Model.extend({
    idAttribute: '_id',
    url: '/account/products/'
  });

  app.Serial = Backbone.Model.extend({
    url: '/account/products/',
    defaults: {
      success: false,
      errors: [],
      errfor: {},
      serial: ''
    }
  });

  app.Badges = Backbone.Model.extend({
    url: '/account/products/',
    defaults: {
      success: false,
      errors: [],
      errfor: {},
      badges: ''
    }
  });

  app.SerialView = Backbone.View.extend({
    el: '#serial',
    template: _.template( $('#tmpl-serial').html() ),
    events: {
      'click .btn-send': 'send'
    },
    initialize: function() {
      this.model = new app.Serial();
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
    },
    send: function() {
      this.model.save({
        serial: this.$el.find('[name="serial"]').val()
      });
    }
  });

  app.BadgesView = Backbone.View.extend({
    el: '#badges',
    template: _.template( $('#tmpl-badges').html() ),
    data: $('#data-products'),
    initialize: function() {
      this.model = new app.Badges();
      //alert(JSON.stringify(app.mainView.products.attributes));
      this.model.set({
        badges: app.mainView.products.attributes
      });
      this.listenTo(app.serialView.model, 'change', this.syncUp);
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    syncUp: function() {
      //alert('SerialView changed 1');
      // 检查serialView模型的属性是否包含newproduct
      if(app.serialView.model.attributes.hasOwnProperty('newproduct')) {
        //alert('SerialView changed 2: '+app.serialView.model.attributes.newproduct.product.info.p_info.name);
        var products = new app.Products();
        products.fetch({url: '/account/products/fetch/',
          success:function(model,response){
            alert('success');
            //model为获取到的数据
            //alert(JSON.stringify(model));
            this.model.set({
              badges: model
            });
            alert("render 2: "+JSON.stringify(this.model.attributes));
            this.render();
          },error:function(){
            //当返回格式不正确或者是非json数据时，会执行此方法
            //alert('error');
        }});
        //this.data.html(products.fetch());
      }
    },
    render: function() {
//      for(var key in app.mainView.products.attributes) {
//        alert(key);
//      }
      alert("render 1: "+JSON.stringify(this.model.attributes));
      this.$el.html(this.template( this.model.attributes ));
    }
  });


  app.MainView = Backbone.View.extend({
    el: '.page .container',
    initialize: function() {
      app.mainView = this;
      this.products = new app.Products( JSON.parse( unescape($('#data-products').html()) ) );

      app.serialView = new app.SerialView();
      app.badgesView = new app.BadgesView();
    }
  });

  $(document).ready(function() {
    app.mainView = new app.MainView();
  });
}());

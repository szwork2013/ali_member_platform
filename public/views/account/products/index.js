/* global app:true */

(function() {
  'use strict';

  app = app || {};

  app.Products = Backbone.Model.extend({
    idAttribute: '_id',
    url: '/account/products/fetch/'
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

      var isWeixin = navigator.userAgent.match(/(micromessenger)/);
      if(isWeixin) {
        this.$el.find('[class="alerts"]').val('微信用户请先关联已有用户，否则在以后合并的话会丢失当前用户的产品资料和积分');
      } else {
        this.$el.find('[class="alerts"]').val('非微信用户');
      }
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
    initialize: function() {
      this.model = new app.Products();
      this.model.fetch();
      this.listenTo(app.serialView.model, 'change', this.syncUp);
      this.listenTo(this.model, 'sync', this.render);
    },
    syncUp: function() {
      // 检查serialView模型的属性是否包含newproduct
      if(app.serialView.model.attributes.hasOwnProperty('newproduct')) {
        this.model.fetch({reset: true});
      }
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
    }
  });


  app.MainView = Backbone.View.extend({
    el: '.page .container',
    initialize: function() {
      app.serialView = new app.SerialView();
      app.badgesView = new app.BadgesView();
    }
  });

  $(document).ready(function() {
    app.mainView = new app.MainView();
  });
}());

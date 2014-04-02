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

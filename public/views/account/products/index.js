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
    initialize: function() {
      this.model = new app.Badges();
      //alert(JSON.stringify(app.mainView.products.attributes));
      this.model.set({
        badges: app.mainView.products.attributes
      });
//      this.listenTo(app.mainView.products, 'change', this.syncUp);
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
//    syncUp: function() {
//      this.model.set({
//        badges: app.mainView.products
//      });
//    },
    render: function() {
//      for(var key in app.mainView.products.attributes) {
//        alert(key);
//      }

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

/* global app:true */

(function() {
  'use strict';

  app = app || {};

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

  $(document).ready(function() {
    app.serialView = new app.SerialView();
  });
}());

(function() {
  'use strict';
  app = app || {};

  app.HeaderView = Backbone.View.extend({
    el: '#header',
    template: _.template( $('#tmpl-header').html() ),
    initialize: function() {
      this.model = app.mainView.account;
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
    }
  });

  app.MainView = Backbone.View.extend({
    el: '.page .container',
    initialize: function() {
      app.mainView = this;
      this.account = new app.Account( JSON.parse( unescape($('#data-account').html()) ) );

      app.headerView = new app.HeaderView();
    }
  });

  $(document).ready(function() {
    app.mainView = new app.MainView();
  });

//  $('.day-of-year').text(moment().format('DDD'));
//  $('.day-of-month').text(moment().format('D'));
//  $('.week-of-year').text(moment().format('w'));
//  $('.day-of-week').text(moment().format('d'));
//  $('.week-year').text(moment().format('gg'));
//  $('.hour-of-day').text(moment().format('H'));
}());

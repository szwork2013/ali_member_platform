/* global app:true */

(function() {
  'use strict';

  app = app || {};

  app.Login = Backbone.Model.extend({
    url: '/weixin/relation/',
    defaults: {
      errors: [],
      errfor: {},
      username: '',
      password: '',
      otherOpenid:'',
      localOpenid:'',
    }
  });

  app.LoginView = Backbone.View.extend({
    el: '#login',
    template: _.template( $('#tmpl-login').html() ),
    events: {
      'submit form': 'preventSubmit',
      'keypress [name="password"]': 'loginOnEnter',
      'click .btn-login': 'login'
    },
    initialize: function() {
      this.model = new app.Login({localOpenid:$('#tmpl-login-localOpenid').html(),otherOpenid:$('#tmpl-login-otherOpenid').html()});
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    render: function() {
    	//alert(JSON.stringify( this.model.attributes ));
      this.$el.html(this.template( this.model.attributes ));
      this.$el.find('[name="username"]').focus();
    },
    preventSubmit: function(event) {
      event.preventDefault();
    },
    loginOnEnter: function(event) {
      if (event.keyCode !== 13) { return; }
      if ($(event.target).attr('name') !== 'password') { return; }
      event.preventDefault();
      this.login();
    },
    login: function() {
      this.$el.find('.btn-login').attr('disabled', true);

      this.model.save({
        username: this.$el.find('[name="username"]').val(),
        password: this.$el.find('[name="password"]').val(),
        otherOpenid: this.$el.find('[name="otherOpenid"]').val(),
        localOpenid: this.$el.find('[name="localOpenid"]').val(),
      },{
        success: function(model, response) {
          if (response.success) {
            location.href = '/weixin/relation/';
          }
          else {
            model.set(response);
          }
        }
      });
    }
  });

  $(document).ready(function() {
    app.loginView = new app.LoginView();
  });
}());

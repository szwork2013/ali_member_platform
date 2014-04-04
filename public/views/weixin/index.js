/* global app:true */

(function() {
  'use strict';

  app = app || {};
  app.Weixin = Backbone.Model.extend({
	    url: '/weixin/',
	    defaults: {
	    	relationUrl:'',
	    	signupUrl:'',
	    	error:'',
	    }
	  });
  
  app.WeixinView = Backbone.View.extend({
	  el:'#weixin',
	  template: _.template( $('#tmpl-router').html() ),
	  
	  initialize : function(){
		  this.model = new app.Weixin({relationUrl: $('#data-relationUrl').html(),signupUrl:  $('#data-signupUrl').html(),error:$('#data-error').html()});
		  this.render();
	  },
	  
	  render:function(){
		  this.$el.html(this.template( this.model.attributes ));   
	  },
  });
  $(document).ready(function() {
	  app.weixin = new app.WeixinView();
  });
}());

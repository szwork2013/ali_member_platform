/* global app:true */

(function() {
  'use strict';

  app = app || {};
  app.Render = Backbone.Model.extend({
	    defaults: {
	    	url:'',
	    }
	  });
  
  app.RenderView = Backbone.View.extend({
	  el:'#render',
	  template: _.template( $('#tmpl-render').html() ),
	  
	  initialize : function(){
		  this.model = new app.Render({url: $('#data-render').html()});
		  var wx_url = $('#data-render').html();
		  location.href =wx_url;
//		  this.render();
	  },
	  
	  render:function(){
		  this.$el.html(this.template( this.model.attributes ));
		  var wx_url = $('#data-render').html();
//		  location.href =wx_url;
	  },
  });
  $(document).ready(function() {
	  app.render = new app.RenderView();
  });
}());

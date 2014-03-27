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
		  this.render();
	  },
	  
	  render:function(){
		  this.$el.html(this.template( this.model.attributes ));
		 var urlss = $('#data-render').html();
		  window.location.href=urlss;
	  },
  });
  $(document).ready(function() {
	  app.render = new app.RenderView();
  });
}());

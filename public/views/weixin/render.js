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
//		  alert(JSON.stringify(this.model.attributes));
//		  this.$el.html(this.template( this.model.attributes ));
		  window.location.href=this.model.url;
	  },
  });
  $(document).ready(function() {
	  app.render = new app.RenderView();
  });
}());

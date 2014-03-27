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
	  },
  });
  $(document).ready(function() {
	  app.render = new app.RenderView();
	  var wx_url = $('#data-render').html();
	  alert(wx_url)
	  location.href = wx_url;
  });
}());

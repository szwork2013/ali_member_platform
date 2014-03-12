'use strict';

exports = module.exports = function(app, mongoose) {
  var integralSchema = new mongoose.Schema({
	  nameCode : {type: String, default: 'default'},
	  name : {type: String, default: '默认'},	//方案名字
	  isUse :{type: String, default: 'no'},
	  PointsPercentOfLeve:{
		 lv1:{
			consumeMoney :{type: Number, default: 0 },
			percent : { type: Number, default: 1 },
			levelName :{ type: String ,default:'普通会员'}
		 },//普通		100%
		 lv2:{
			 consumeMoney :{type: Number, default: 199 },
			 percent : { type: Number, default: 1.2 },
			 levelName :{ type: String ,default:'高级会员'}
		 },//高级		120%
		 lv3:{
			 consumeMoney :{type: Number, default: 499 },
			 percent : { type: Number, default: 1.5 },
			 levelName :{ type: String ,default:'VIP会员'}
		 },//VIP		150%
		 lv4:{
			 consumeMoney :{type: Number, default: 999 },
			 percent : { type: Number, default: 2 },
			 levelName :{ type: String ,default:'至尊VIP会员'}
		 },//至尊VIP	200%
	  },
  });
  integralSchema.plugin(require('./plugins/pagedFind'));
  integralSchema.index({ name: 1 });
  integralSchema.index({ nameCode: 1 });
  integralSchema.index({ isUse: 1 });
  integralSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Integral', integralSchema);
};

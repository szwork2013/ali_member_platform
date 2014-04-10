'use strict';

exports.port = process.env.PORT || 3000;
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'localhost/drywall'
};
exports.companyName = 'Beijing Dream Castle Culture Co., Ltd';
exports.projectName = '梦之城堡会员平台';
exports.systemEmail = 'xxx@a-li.com.cn';
exports.cryptoKey = 'k3yb0ardc4t';
exports.loginAttempts = {
  forIp: 50,
  forIpAndUser: 7,
  logExpiration: '20m'
};
exports.requireAccountVerification = false;
exports.smtp = {
  from: {
    name: process.env.SMTP_FROM_NAME || exports.projectName +' 网站',
    address: process.env.SMTP_FROM_ADDRESS || 'your@email.addy'
  },
  credentials: {
    user: process.env.SMTP_USERNAME || 'your@email.addy',
    password: process.env.SMTP_PASSWORD || 'bl4rg!',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    ssl: true
  }
};
exports.oauth = {
  twitter: {
    key: process.env.TWITTER_OAUTH_KEY || '',
    secret: process.env.TWITTER_OAUTH_SECRET || ''
  },
  facebook: {
    key: process.env.FACEBOOK_OAUTH_KEY || '',
    secret: process.env.FACEBOOK_OAUTH_SECRET || ''
  },
  github: {
    key: process.env.GITHUB_OAUTH_KEY || '',
    secret: process.env.GITHUB_OAUTH_SECRET || ''
  },
  weibo: {
    key: process.env.WEIBO_OAUTH_KEY || '',
    secret: process.env.WEIBO_OAUTH_SECRET || ''
  },
  qq: {
    key: process.env.QQ_OAUTH_KEY || '',
    secret: process.env.QQ_OAUTH_SECRET || ''
  },
  ali_discuz: {
    key: process.env.ALI_DISCUZ_OAUTH_KEY || true,
    secret: process.env.ALI_DISCUZ_OAUTH_SECRET || true,
    host: "http://localhost/ali_site/"
  }
};

exports.product = {
  url: 'http://localhost:3333/api/',
  key: 'b657e3c23602ab4ff99aaceea827739a5b959688'
};

exports.mysql_cfg = {
  user: 'root',
  pass: 'password',
  db: 'ali_member_platform_logs',
  host: 'localhost',
  port: 3306,
  charset: 'utf8'
};

exports.weixin = {
		state:'dreamcastle',
		AppId:'wxce7ebe6fb9d479b1',
		AppSecret:'e16b8a0a7b72a80e9440b2d999bb9328',
		source:new Array(
				{
					name:'dreamcastle',
					fullname:'梦之城会员'
				},
				{
					name:'ali',
					fullname:'阿狸会员'
				},
				{
					name:'daxiong',
					fullname:'大熊会员'
				},
				{
					name:'taozi',
					fullname:'桃子会员'
				}
		)

};
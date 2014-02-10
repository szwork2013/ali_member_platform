module.exports = function (server) {

//------------------
// 系统级请求处理
//------------------

//首页
/*    server.get('/', function (req, res) {
        if (!req.session.user) {
            res.redirect("/login");
        } else {
            res.render('index', {
                title: '梦之城产品用户数据库',
                userid: req.session.user,
                role: req.session.role
            });
        }
    });*/

// 显示登录页面
/*    server.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            userid: req.session.user,
            role: req.session.role
        });
    });*/

// 处理退出请求
/*    server.get('/logout', function (req, res) {
        req.session.destroy();

        res.render('login', {
            title: '登录',
            userid: false,
            role: false
        });
    });*/

// 显示Token页面
    server.get('/token', function (req, res) {
        if (req.session.user) {
            showTokenInfo(req.session.user, req.session.role, res);
        } else {
            res.render('login', {
                title: '登录',
                userid: req.session.user,
                role: req.session.role
            });
        }
    });


// 显示Approve页面
    server.get('/approve', function (req, res) {
        if (req.session.user && req.session.role == 1) {
            var model = require('../models/appkey');
            model.getAllPending(function (err, result) {
                if (err) {
                    res.render('approve', {
                        title: '审核API申请 - 获取数据出错',
                        pending: err,
                        userid: req.session.user,
                        role: req.session.role
                    });
                } else {
                    res.render('approve', {
                        title: '审核API申请',
                        pending: result,
                        userid: req.session.user,
                        role: req.session.role
                    });
                }
            }); // end model.getAllPending
        } else {
            res.redirect('back');
        }
    });

// 在页面显示Token信息
    function showTokenInfo(uid, role, res) {
        var model = require('../models/appkey');
        model.getAllByUid(uid, function (err, result) {
            if (err) {
                res.render('token', {
                    title: '授权码信息 - 获取出错:' + err,
                    token: null,
                    userid: uid,
                    role: role
                });
            } else if (result) {
                // console.log('Token info: ', result);
                if (result.access_token) { // 已经有Access Token
                    res.render('token', {
                        title: '授权码信息',
                        token: result,
                        userid: uid,
                        role: role
                    });
                } else {  // 有Client ID了但还没有审核赋予Access Token
                    res.render('pendingApproval', {
                        title: '授权码信息 - 等待管理员审核中',
                        clientInfo: result,
                        userid: uid,
                        role: role
                    });
                }
            } else {  // 还没有Client ID记录的用户，显示申请授权页面
                res.render('applyToken', {
                    title: '申请API授权',
                    userid: uid,
                    role: role
                });
            }
        });
    }

// 处理登录请求
/*    server.post('/login', function (req, res) {
        var model = require('../models/appkey');
        //debug: console.log('req.body = ', req.body);
        model.getUser(req.body.email, req.body.pwd, function (err, result) {
            if (err) {
                res.render('login', {
                    title: '登录失败，请重新登录',
                    userid: req.session.user,
                    role: req.session.role
                });
            } else if (result.id) {  //通过登录
                req.session.user = result.id; //设定会话用户
                req.session.role = result.role;
                showTokenInfo(result.id, result.role, res);  //显示Token信息
            } else {
                res.render('login', {
                    title: '登录出现问题，请重新登录',
                    userid: req.session.user,
                    role: req.session.role
                });
            }
        });
    });*/


// 处理申请API请求
    server.post('/apply', function (req, res) {
        if (req.session.user) {
            var model = require('../models/appkey');
            model.createClient(req.session.user, req.body.callback_url, function (err, result) {
                if (err) {
                    console.log('Apply Error: ', err);
                    res.render('applyToken', {
                        title: '申请API授权 - 出错：' + err,
                        userid: req.session.user,
                        role: req.session.role
                    });
                } else {  // 客户端信息创建成功，需要管理员介入批准以生成Access Token
                    res.render('pendingApproval', {
                        title: '申请API授权 - 等待管理员批准',
                        clientInfo: result,
                        userid: req.session.user,
                        role: req.session.role
                    });
                }
            });
        } else {
            res.render('login', {
                title: '登录',
                userid: req.session.user,
                role: req.session.role
            });
        }
    });


// 处理申请API请求
    server.post('/approve', function (req, res) {
        if (req.session.user) {
            var model = require('../models/appkey');
            var expires = 31536000;
            var oauth = server.get('oauth');

            model.getAllByUid(req.session.user, function (err, result) {
                if (err) {
                    res.render('approve', {
                        title: '审核API申请 - 获取数据出错',
                        pending: err,
                        userid: req.session.user,
                        role: req.session.role
                    });
                } else if (result) {
                    console.log("oauth: ", oauth);
                    if (oauth.accessTokenLifetime !== null) {
                        expires = new Date();
                        expires.setSeconds(expires.getSeconds() + oauth.accessTokenLifetime);
                    }
                    model.generateToken(function (err2, result2) {
                        if (err2) {
                            res.render('approve', {
                                title: '审核API申请 - 生成Access Token出错',
                                pending: err2,
                                userid: req.session.user,
                                role: req.session.role
                            });
                        } else {
                            model.saveAccessToken(result2, result.client_id, req.session.user, expires, function (err3) {
                                if (err3) {
                                    res.render('approve', {
                                        title: '审核API申请 - 保存Access Token出错',
                                        pending: err3,
                                        userid: req.session.user,
                                        role: req.session.role
                                    });
                                } else {
                                    model.getAllPending(function (err4, result4) {
                                        if (err4) {
                                            res.render('approve', {
                                                title: '审核API申请 - 获取数据出错',
                                                pending: err4,
                                                userid: req.session.user,
                                                role: req.session.role
                                            });
                                        } else {
                                            res.render('approve', {
                                                title: '审核API申请',
                                                pending: result4,
                                                userid: req.session.user,
                                                role: req.session.role
                                            });
                                        }
                                    }); // end model.getAllPending

                                    model.generateToken(function (err5, result5) {
                                        if (err5) {
                                            res.render('approve', {
                                                title: '审核API申请 - 生成Refresh Token出错',
                                                pending: err5,
                                                userid: req.session.user,
                                                role: req.session.role
                                            });
                                        } else {
                                            model.saveRefreshToken(result5, result.client_id, req.session.user, expires, function (err6) {
                                                if (err6) {
                                                    res.render('approve', {
                                                        title: '审核API申请 - 保存Refresh Token出错',
                                                        pending: err6,
                                                        userid: req.session.user,
                                                        role: req.session.role
                                                    });
                                                } else {
                                                    model.getAllPending(function (err7, result7) {
                                                        if (err7) {
                                                            res.render('approve', {
                                                                title: '审核API申请 - 获取数据出错',
                                                                pending: err7,
                                                                userid: req.session.user,
                                                                role: req.session.role
                                                            });
                                                        } else {
                                                            res.render('approve', {
                                                                title: '审核API申请',
                                                                pending: result7,
                                                                userid: req.session.user,
                                                                role: req.session.role
                                                            });
                                                        }
                                                    }); // end model.getAllPending
                                                }
                                            }); // end model.saveAccessToken
                                        }
                                    }); // end server.oauth.token.generateToken
                                }
                            }); // end model.saveAccessToken
                        }
                    }); // end server.oauth.token.generateToken
                }
            });
        }
    });

}
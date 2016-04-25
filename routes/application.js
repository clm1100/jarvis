/* jshint -W079 */
/* jshint -W020 */
/* eslint no-console: [2, { allow: ["info", "warn", "error"] }] */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var os = require('os');
var fs = require('fs');
var thunk = require('thunks')();
var ObjectID = require('mongodb').ObjectID;
var UPYUN = require('upyun');
var gm = require('gm');
var path = require('path');
var uuid = require('uuid');
var checksum = require('checksum');
var crypto = require('crypto');
var ueditor = require('ueditor');

module.exports = function(utils) {
  /* 首页 */
  router.get('/', utils.logged, function(req, res) {
    var today = utils.moment().startOf('day'), tomorrow = utils.moment(today).add(1, 'days');

    thunk.all([
      // 总用户
      thunk(function(cb) { User.count({}, function(err, result) { cb(err, result); }); }),
      // 总微信用户
      thunk(function(cb) { User.count({ provider:'wechat' }, function(err, result) { cb(err, result); }); }),
      // 今日登录用户
      thunk(function(cb) {
        User.count({ last_sign_in_at: { $gte: today.toDate(), $lt: tomorrow.toDate() } }, function(err, result) { cb(err, result); });
      }),
      // 今日注册用户
      thunk(function(cb) {
        User.count({ at: { $gte: today.toDate(), $lt: tomorrow.toDate() } }, function(err, result) { cb(err, result); });
      }),
      // 商品总数
      thunk(function(cb) { Commodity.count({}, function(err, result) { cb(err, result); }); }),
      // 今日商品
      thunk(function(cb) {
        Commodity.count({ at: { $gte: today.toDate(), $lt: tomorrow.toDate() } }, function(err, result) { cb(err, result); });
      }),
      // 评论总数
      thunk(function(cb) { Comment.count({}, function(err, result) { cb(err, result); }); }),
      // 今日评论
      thunk(function(cb) {
        Comment.count({ at: { $gte: today.toDate(), $lt: tomorrow.toDate() } }, function(err, result) { cb(err, result); });
      }),
      // 点赞总数
      thunk(function(cb) { Zan.count({}, function(err, result) { cb(err, result); }); }),
      // 今日点赞
      thunk(function(cb) {
        Zan.count({ at: { $gte: today.toDate(), $lt: tomorrow.toDate() } }, function(err, result) { cb(err, result); });
      }),
      // 购买跳转总数
      thunk(function(cb) { ToShoppingRecord.count({}, function(err, result) { cb(err, result); }); }),
      // 今日购买跳转
      thunk(function(cb) {
        ToShoppingRecord.count({ at: { $gte: today.toDate(), $lt: tomorrow.toDate() } }, function(err, result) { cb(err, result); });
      }),
      // 商品评论前五
      thunk(function(cb) { Commodity.find().sort('-comments_count').limit(5).exec(function(err, result) { cb(err, result); }); }),
      // 商品点赞前五
      thunk(function(cb) { Commodity.find().sort('-zans_count').limit(5).exec(function(err, result) { cb(err, result); }); }),
      // 标签使用前五
      thunk(function(cb) { Tag.find().sort('-count').limit(5).exec(function(err, result) { cb(err, result); }); }),
      // 自定义标签使用前五
      thunk(function(cb) {
        Commodity.aggregate([
          { $unwind: '$custom_tags' },
          { $project: { cd: '$custom_tags.d' } },
          { $match : { cd : { $ne: null } } },
          { $group: { _id: { d: '$cd' }, count: { $sum: 1 } } },
          { $sort : { count : -1 } },
          { $limit : 5 }
        ]).exec(function(err, result) {
          var hots = _.map(result, function(item) { return { d:item._id.d, count:item.count }; });
          cb(err, hots);
        });
      })
    ])(function(error, results) {
      res.render('index', {
        current: req.user,
        total_users_count: results[0],
        total_wechat_users_count: results[1],
        today_signin_count: results[2],
        today_signup_count: results[3],
        total_commodities_count: results[4],
        today_commodities_count: results[5],
        total_comments_count: results[6],
        today_comments_count: results[7],
        total_zans_count: results[8],
        today_zans_count: results[9],
        total_to_shopping_count: results[10],
        today_to_shopping_count: results[11],
        top5_comments_commodities: results[12],
        top5_zans_commodities: results[13],
        top5_tags: results[14],
        top5_custom_tags: results[15]
      });
    });
  });

  router.post('/api/photos/upload/signature', function(req, res) {
    res.json(createImageUploadSignature(req, '/photo/f/'));
  });

  router.post('/api/avatars/upload/signature', function(req, res) {
    res.json(createImageUploadSignature(req, '/user/avatar/'));
  });

  router.post('/api/message/upload/signature', function(req, res) {
    var fid = req.body.fid;
    res.json(createImageUploadSignature(req, '/message/' + fid + '/'));
  });

  utils.app.use('/ueditor', ueditor(os.tmpdir(), function(req, res, next) {
    // ueditor 客户发起上传图片请求
    if(req.query.action === 'uploadimage') {
      var dir = path.join(__dirname, '../tmp');
      var file = req.ueditor.file;
      var name = uuid.v4() + path.extname(req.ueditor.filename);
      var filepath = path.join(dir, name);
      var mimetype = req.ueditor.mimetype;
      file.pipe(fs.createWriteStream(filepath));

      gm(filepath).autoOrient().write(filepath, function(err) {
        checksum.file(filepath, function(err, sum) {
          utils.upyun.uploadFile('/ckeditor/picture/data/' + name, filepath, mimetype, sum, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(error, result) {
            fs.unlink(filepath, function(err) { res.json({ url: name, original: req.ueditor.filename, state: 'SUCCESS' }); });
          });
        });
      });
    } else if(req.query.action === 'images') {
      //  客户端发起图片列表请求
      var upyun = new UPYUN('moretao-dev', 'moretao', 'zanmeichuanmei888', 'v0', 'legacy');
      var start = parseInt(req.query.start);
      var size = parseInt(req.query.size);

      upyun.listDir('/ckeditor/picture/data', function(err, result) {
        var total = result.data.files.length;
        var files = _.slice(result.data.files, start, start + size);
        var list = _.map(files, function(item, i) { return { url:item.name }; });

        res.json({ state: 'SUCCESS', list: list, start: start, total: total });
      });
    } else {
      // 客户端发起其它请求
      res.setHeader('Content-Type', 'application/json');
      res.json(require('../views/ueditor/config.json'));
    }
  }));

  function createImageUploadSignature(req, dir) {
    var filename = req.body.filename;
    var expiration = req.body.expiration;
    var ext = path.extname(filename);
    var apikey = 'DhbmJa4RXVYhrFDjTiK1NY4aaVg=';
    var newname = uuid.v4() + ext;
    var bucket = 'moretao-dev';
    var savekey = dir + newname;
    var policy = new Buffer(JSON.stringify({ bucket:bucket, expiration:expiration, 'save-key':savekey, 'x-gmkerl-rotate':'auto' })).toString('base64');
    var signature = crypto.createHash('md5').update(policy + '&' + apikey).digest('hex');

    return { policy:policy, signature:signature, filename:newname };
  }

  // 用于手动更新 ES 索引
  router.get('/es/index/update', function(req, res) {
    thunk.all([
      thunk(function(cb) {
        Tag.esTruncate(function(err) {
          var tagsStream = Tag.synchronize(), count = 0;

          tagsStream.on('data', function(err, doc) { count++; });
          tagsStream.on('close', function() { cb(null, { title:'tags', count:count }); });
        });
      }),
      thunk(function(cb) {
        Topic.esTruncate(function(err) {
          var topicsStream = Topic.synchronize(), count = 0;

          topicsStream.on('data', function(err, doc) { count++; });
          topicsStream.on('close', function() { cb(null, { title:'topics', count:count }); });
        });
      }),
      thunk(function(cb) {
        Commodity.esTruncate(function(err) {
          var commoditiesStream = Commodity.synchronize(), count = 0;

          commoditiesStream.on('data', function(err, doc) { count++; });
          commoditiesStream.on('close', function() { cb(null, { title:'commodities', count:count }); });
        });
      })
    ])(function(err, result) {
      res.render('updatas/migration', { result:result });
    });
  });

  // 数据迁移
  router.get('/datas/migration', function(req, res) {
    var result = [], subcomments = [];

    thunk.all([
      thunk(function(cb) {
        var list = [];

        Comment.find({}).deepPopulate(commentDeepItems).exec(function(err, items) {
          _.each(items, function(item) {
            if(_.isEmpty(item.user)) list.push(item.id);
            var slist = [];
            _.each(item.sub_comments, function(sub) {
              if(_.isEmpty(sub.user)) subcomments.push({ p:item.id, s:sub.id });
            });
          });

          result.push('删除无效的评论 ' + (list.length) + ' 条.');
          if(list.length === 0) cb(err, null);
          else Comment.remove({ _id:{ $in:list } }, function(err) { cb(err, null); });
        });
      }),
      thunk(function(cb) {
        var list = [];

        Account.find({}).populate('user').exec(function(err, items) {
          _.each(items, function(item) { if(_.isEmpty(item.user)) list.push(item.id); });
          result.push('删除无效的账户 ' + (list.length) + ' 条.');
          if(list.length === 0) cb(err, null);
          else Account.remove({ _id:{ $in:list } }, function(err) { cb(err, null); });
        });
      }),
      thunk(function(cb) {
        var list = [];

        Zan.find({}).populate('user').exec(function(err, items) {
          _.each(items, function(item) { if(!item.user) list.push(item.id); });
          result.push('删除无效的点赞 ' + (list.length) + ' 条.');
          if(list.length === 0) cb(err, null);
          else Zan.remove({ _id:{ $in:list } }, function(err) { cb(err, null); });
        });
      })
    ])(function(error, results) {
      var functions = _.map(subcomments, function(sub) {
        return thunk(function(callback) {
          Comment.findByIdAndUpdate(sub.p, { $pull: { sub_comments:{ _id: sub.s } } }, function(err) { callback(null, null); });
        });
      });

      thunk.all(functions)(function(error, results) {
        result.push('删除无效的回复 ' + subcomments.length + ' 条.');
        res.render('datas/migration', { current: req.user, result:result });
      });
    });
  });

  return router;
};

/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var path = require('path');
var fs = require('fs');
var xlsx = require('node-xlsx');
var flash = require('connect-flash');
var request = require('request');
var ObjectID = require('mongodb').ObjectID;

/* 管理员 */
module.exports = function(utils) {
  router.get('/batch/zans', utils.logged, function(req, res) {
    res.render('batch/zans', { current: req.user });
  });

  // 批量商品点赞
  router.post('/api/commodities/batch/zans', utils.logged, function(req, res) {
    var min = parseInt(req.body.min);
    var max = parseInt(req.body.max);

    thunk.all([
      // 获取点赞的用户
      thunk(function(cb) { User.find({}).limit(max).select('id').exec(function(err, items) { cb(err, items); }); }),

      // 获取全部商品
      thunk(function(cb) { Commodity.find({ is_publish:true }).sort('-at').exec(function(err, items) { cb(err, items); }); })
    ])(function(error, result) {
      var users = result[0];
      var items = result[1];

      var functions = _.map(items, function(item) {
        return thunk(function(cb) {
          var zans = [];

          Zan.find({ commodity:item.id }).select('user').exec(function(err, zs) {
            var ids = _.map(zs, function(z) { return z.user.toString(); });

            var end = _.random(min, max);
            var useds = _.slice(users, 0, end - 1);

            _.each(useds, function(u) {
              if(ids.indexOf(u.id.toString()) < 0) zans.push({ commodity:new ObjectID(item.id), user:new ObjectID(u.id) });
            });

            if(zans.length < 1) cb(null, null);
            else {
              var bulk = Zan.collection.initializeUnorderedBulkOp({ useLegacyOps:true });
              _.each(zans, function(item, i) { bulk.insert(item); });
              bulk.execute(function(err, result) { item.save(function(err) { cb(null, null); }); });
            }
          });
        });
      });

      thunk.all(functions)(function(error, results) { res.json({ status:200 }); });
    });
  });

  // 批量专题点赞
  router.post('/api/topics/batch/zans', utils.logged, function(req, res) {
    var min = parseInt(req.body.min);
    var max = parseInt(req.body.max);

    thunk.all([
      // 获取点赞的用户
      thunk(function(cb) { User.find({}).limit(max).select('id').exec(function(err, items) { cb(err, items); }); }),

      // 获取全部商品
      thunk(function(cb) { Topic.find({ is_publish:true }).sort('-at').exec(function(err, items) { cb(err, items); }); })
    ])(function(error, result) {
      var users = result[0];
      var items = result[1];

      var functions = _.map(items, function(item, i) {
        return thunk(function(cb) {
          Zan.find({ topic:item.id }).select('user').exec(function(err, zs) {
            var ids = _.map(zs, function(z) { return z.user.toString(); });
            var end = _.random(min, max);
            var useds = _.slice(users, 0, end - 1);
            var zans = [];

            _.each(useds, function(u) {
              if(ids.indexOf(u.id.toString()) < 0) zans.push({ topic:new ObjectID(item.id), user:new ObjectID(u.id) });
            });

            if(zans.length === 0) cb(null, null);
            else {
              var bulk = Zan.collection.initializeUnorderedBulkOp({ useLegacyOps: true });
              _.each(zans, function(item, i) { bulk.insert(item); });
              bulk.execute(function(err, result) { item.save(function(err) { cb(null, null); }); });
            }
          });
        });
      });

      thunk.all(functions)(function(error, results) { res.json({ status:200 }); });
    });
  });

  // 批量活动点赞
  router.post('/api/activities/batch/zans', utils.logged, function(req, res) {
    var min = parseInt(req.body.min);
    var max = parseInt(req.body.max);

    thunk.all([
      // 获取点赞的用户
      thunk(function(cb) { User.find({}).limit(max).select('id').exec(function(err, items) { cb(err, items); }); }),

      // 获取全部商品
      thunk(function(cb) { Activity.find({ is_publish:true }).sort('-at').exec(function(err, items) { cb(err, items); }); })
    ])(function(error, result) {
      var users = result[0];
      var items = result[1];

      var functions = _.map(items, function(item) {
        return thunk(function(cb) {
          Zan.find({ activity:item.id }).select('user').exec(function(err, zs) {
            var ids = _.map(zs, function(z) { return z.user.toString(); });
            var end = _.random(min, max);
            var useds = _.slice(users, 0, end - 1);

            var zans = [];
            _.each(useds, function(u) {
              if(ids.indexOf(u.id.toString()) < 0) zans.push({ activity:new ObjectID(item.id), user:new ObjectID(u.id) });
            });

            if(zans.length < 1) cb(null, null);
            else {
              var bulk = Zan.collection.initializeUnorderedBulkOp({ useLegacyOps: true });
              _.each(zans, function(item, i) { bulk.insert(item); });
              bulk.execute(function(err, result) { item.save(function(err) { cb(null, null); }); });
            }
          });
        });
      });

      thunk.all(functions)(function(error, results) { res.json({ status: 200 }); });
    });
  });

  router.get('/batch/sms', utils.logged, function(req, res) {
    res.render('batch/sms', { current: req.user });
  });

  router.post('/batch/sms', utils.uploader.single('file'), utils.logged, function(req, res) {
    var api = 'http://121.43.107.8:8888/sms.aspx?userid=${userid}&account=${account}&password=${pswd}&mobile=${mobile}&content=${msg}&sendTime=&action=send';
    var total = 0, userid = '162', account = 'mtw', pswd = '123456789';
    var smses = [];

    // 单发短信
    if(req.file) {
      var file = req.file;
      var tab = xlsx.parse(file.path)[0];
      _.each(tab.data, function(line, i) {
        var mobile = line[0] + '';
        if(i > 0 && line.length > 1 && mobile.length === 11 && line[1].length > 10) {
          smses.push(_.template(api)({ userid:userid, account:account, pswd:pswd, mobile:line[0], msg:encodeURIComponent(line[1]) }));
        }
      });
    } else smses.push(_.template(api)({ userid:userid, account:account, pswd:pswd, mobile:req.body.mobile, msg:encodeURIComponent(req.body.msg) }));
    // 群发短信
    var funcs = _.map(smses, function(item) {
      return thunk(function(cb) { request.post(item, function(err, res, body) { cb(err, body); }); });
    });

    thunk.all(funcs)(function(error, results) {
      res.render('batch/sms', { message:'已发送 ' + smses.length + ' 条短信', current: req.user });
    });
  });

  return router;
};

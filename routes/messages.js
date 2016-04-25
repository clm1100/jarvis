/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var path = require('path');
var flash = require('connect-flash');
var UPYUN = require('upyun');
var gm = require('gm');

/* 管理员 */
module.exports = function(utils) {
  router.get('/messages', utils.logged, function(req, res) {
    res.render('messages/list', { current: req.user });
  });

  router.get('/messages/new', utils.logged, function(req, res) {
    var item = new Message();
    res.render('messages/edit', { item:item, current: req.user });
  });

  router.get('/messages/:id', utils.logged, function(req, res) {
    Message.findById(req.params.id).populate('from to').exec(function(err, item) {
      res.render('messages/edit', { item:item, current: req.user });
    });
  });

  router.delete('/messages/:id', utils.logged, function(req, res) {
    Message.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.nickname + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/messages/:id', utils.uploader.single('photo'), utils.logged, function(req, res) {
    Message.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Message();

      item.from = req.body.from;
      item.to = req.body.to;
      item.msg = req.body.msg;

      var file = req.file;
      if(file && file.path) {
        var upyun = new UPYUN('moretao-dev', 'moretao', 'zanmeichuanmei888', 'v0', 'legacy');

        gm(path).autoOrient().write(file.path, function(err) {
          upyun.uploadFile('/message/' + req.body.from + '/' + file.filename, file.path, file.mimetype, true, function(err, result) {
            item.photo = file.filename;
            item.save(function(err) { res.render('messages/edit', { item:item, current: req.user, message:'保存成功' }); });
          });
        });
      } else item.save(function(err) { res.render('messages/edit', { item:item, current: req.user, message:'保存成功' }); });
    });
  });

  router.get('/messages/:id/reply', utils.logged, function(req, res) {
    Message.findById(req.params.id).populate('from to').exec(function(err, item) {
      var fid = item.from.id;
      var tid = item.to.id;

      Message.find().or([{ to:tid, from:fid }, { to:fid, from:tid }]).populate('from to').sort('at').exec(function(err, items) {
        // 因为是回复, 所以颠倒原来的 From 和 To
        res.render('messages/reply', { items:items, from: item.to, to: item.from });
      });
    });
  });

  router.post('/api/messages/reply', utils.logged, function(req, res) {
    var item = new Message({ from:req.body.from, to:req.body.to, msg:req.body.msg, photo:req.body.photo });
    if(item.photo && item.photo.length > 0) item.photo = path.basename(item.photo);
    item.save(function(err) { res.json({ error:err }); });
  });

  router.get('/api/messages', utils.logged, function(req, res) {
    var query = req.query;
    var start = parseInt(query.start);
    var size = parseInt(query.length);
    var draw = parseInt(query.draw);
    var search = _.trim(query.search.value);
    var order = query.order;
    var columns = query.columns;

    var or = {};
    var sort = {};

    // 搜索参数
    if(search && search.length > 3) {
      var re = new RegExp(search, 'i');
      or = [{ nickname:{ $regex:re } }, { mobile:{ $regex:re } }, { email:{ $regex: re } }];
    }

    // 排序参数
    if(order.length > 0) {
      _.each(order, function(item, i) {
        var field = columns[item.column].name;
        var dir = item.dir === 'asc' ? 1 : -1;
        _.set(sort, field, dir);
      });
    }

    thunk.all([
      thunk(function(cb) {
        Message.find().or(or).populate('from to').skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Message.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = [];

      _.each(results[0], function(item, i) {
        if(item && item.from && item.to) data.push([item.id, item.from.nickname, item.to.nickname, item.msg, item.at]);
        else Message.remove({ _id:item.id }, function(err) { console.error('Not exist from or to: ' + item.id, err); });
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

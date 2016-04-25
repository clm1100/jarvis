/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var _u = require('./utils');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var path = require('path');
var fs = require('fs');
var gm = require('gm');
var flash = require('connect-flash');
var urlencode = require('urlencode');
var ObjectID = require('mongodb').ObjectID;

/* 管理员 */
module.exports = function(utils) {
  router.get('/users', utils.logged, function(req, res) {
    res.render('users/list', { current: req.user });
  });

  router.get('/users/new', utils.logged, function(req, res) {
    res.render('users/edit', { item:new User(), current: req.user });
  });

  router.get('/users/:id', utils.logged, function(req, res) {
    var query = { user:req.params.id };
    thunk.all([
      thunk(function(cb) { User.findById(req.params.id).populate('tags').exec(function(err, item) { cb(err, item); }); }),
      thunk(function(cb) { Address.find(query).sort({ is_default:-1 }).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Favorite.find(query).populate('commodities').sort({ at:1 }).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Commodity.find(query).sort({ at:1 }).exec(function(err, items) { cb(err, items); }); })
    ])(function(error, results) {
      var taglist = {};
      _.each(TagList, function(t) { _.set(taglist, t.v, t.d); });
      res.render('users/edit', { item:results[0], addresses: results[1], favorites: results[2], commodities:results[3], taglist:taglist, current: req.user });
    });
  });

  router.delete('/users/:id', utils.logged, function(req, res) {
    User.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.nickname + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/users/:id', utils.uploader.single('avatar'), utils.logged, function(req, res) {
    User.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new User();
      var body = req.body;
      item.nickname = body.nickname;
      item.mobile = body.mobile;
      item.email = body.email;
      item.pass = body.pass;
      item.confirm_pass = body.confirm_pass;
      item.public = body.public;

      // 标签相关
      var tags = body.tags;
      if(tags && !_.isArray(tags)) tags = [tags];

      // 删除标签
      item.tags = tags ? _.remove(item.tags, function(t) { return t && _.indexOf(tags, t) < 0; }) : null;

      // 添加标签
      _.each(tags, function(t, i) {
        var is = _.findIndex(item.tags, function(tag) { return tag && tag === t; });
        if(is < 0) item.tags.push(t);
      });

      if(req.file && req.file.path) {
        var path = req.file.path;
        gm(path).autoOrient().write(path, function(err) {
          var avatar = req.file;
          utils.upyun.uploadFile('/user/avatar/' + avatar.filename, avatar.path, avatar.mimetype, true, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(err, result) {
            item.avatar = avatar.filename;
            item.save(function(err) {
              fs.unlink(avatar.path, function(err) { res.render('users/edit', { item:item, current: req.user, message:'保存成功' }); });
            });
          });
        });
      } else item.save(function(err) { res.render('users/edit', { item:item, current: req.user, message:'保存成功' }); });
    });
  });

  router.get('/api/users', utils.logged, function(req, res) {
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
    if(search && search.length > 1) {
      or = [];
      if(_u.isMongoId(search)) or.push({ _id: search });
      else {
        var re = new RegExp(search, 'i');
        or.push({ nickname:{ $regex:re } }, { mobile: { $regex:re } }, { email:{ $regex:re } });
      }
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
      thunk(function(cb) { User.find().or(or).skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { User.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) { return [item.id, item.nickname, item.mobile, item.email]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  /* 商品搜索 */
  router.get('/api/users/search/:key/:page', function(req, res) {
    if(_.isEmpty(req.params.key)) { res.json({ items:null }); return; }

    var key = urlencode.decode(req.params.key);
    var page = parseInt(req.params.page);
    if(!page) page = 0;
    var query = { nickname:new RegExp(key, 'i') };
    thunk.all([
      thunk(function(cb) { User.find(query).skip(page * 40).limit(40).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { User.count(query).exec(function(err, count) { cb(err, count); }); })
    ])(function(cb, results) {
      res.json({ items: results[0], total:results[1] });
    });
  });

  return router;
};

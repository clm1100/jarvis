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
  router.get('/versions/:appid/latest', function(req, res) {
    Version.findOne({ active:true, appid:req.params.ap.id }).sort('-at').exec(function(err, version) {
      res.json(version);
    });
  });

  router.get('/versions/:appid/latest/download', function(req, res) {
    Version.findOne({ active:true, appid:req.params.ap.id }).sort('-at').exec(function(err, version) {
      res.redirect(version.url);
    });
  });

  router.get('/versions', utils.logged, function(req, res) {
    res.render('versions/list', { current: req.user });
  });

  router.get('/versions/new', utils.logged, function(req, res) {
    res.render('versions/edit', { item:new Version(), current: req.user });
  });

  router.get('/versions/:id', utils.logged, function(req, res) {
    Version.findById(req.params.id).populate('from to').exec(function(err, item) {
      res.render('versions/edit', { item:item, current: req.user });
    });
  });

  router.delete('/versions/:id', utils.logged, function(req, res) {
    Version.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, version: item.reason + ' 已经删除' }); });
      else res.json({ status: 404, version: '没有找到要删除的对象' });
    });
  });

  router.post('/versions/:id', utils.logged, function(req, res) {
    Version.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Version();
      var body = req.body;
      item.appid = body.appid;
      item.v = body.v;
      item.d = body.d;
      item.url = body.url;
      item.force = body.force;
      item.active = body.active;

      item.save(function(err) { res.render('versions/edit', { item:item, current: req.user, version:'保存成功' }); });
    });
  });

  router.get('/api/versions', utils.logged, function(req, res) {
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
      or = [{ v:{ $regex:re } }, { d:{ $regex:re } }];
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
        Version.find().or(or).skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); });
      }),
      thunk(function(cb) { Version.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) { return [item.id, item.v, item.d, item.url, item.active, item.force, item.at]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

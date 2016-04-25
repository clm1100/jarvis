/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
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
  router.get('/search_histories', utils.logged, function(req, res) {
    res.render('search_histories/list', { current: req.user });
  });

  router.get('/search_histories/new', utils.logged, function(req, res) {
    res.render('search_histories/edit', { item:new SearchHistory(), current: req.user });
  });

  router.get('/search_histories/:id', utils.logged, function(req, res) {
    SearchHistory.findById(req.params.id).exec(function(err, item) {
      res.render('search_histories/edit', { item:item, current: req.user });
    });
  });

  router.delete('/search_histories/:id', utils.logged, function(req, res) {
    SearchHistory.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.t + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/search_histories/:id', utils.logged, function(req, res) {
    SearchHistory.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new SearchHistory();

      item.t = req.body.t;
      item.count = req.body.count;

      item.save(function(err) { res.redirect('/search_histories/' + item.id + '?message=' + urlencode.encode('保存成功')); });
    });
  });

  router.get('/api/search_histories', utils.logged, function(req, res) {
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
      or = [{ d:{ $regex:re } }];
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
        SearchHistory.find().or(or).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { SearchHistory.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) { return [item.id, item.t, item.count]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

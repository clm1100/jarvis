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

/* 抽奖 */
module.exports = function(utils) {
  router.get('/postcards', utils.logged, function(req, res) {
    res.render('postcards/list', { current: req.user });
  });

  router.get('/postcards/new', utils.logged, function(req, res) {
    res.render('postcards/edit', { item:new Postcard(), current:req.user });
  });

  router.get('/postcards/:id', utils.logged, function(req, res) {
    Postcard.findById(req.params.id).populate('from to').exec(function(err, item) {
      if(item) item.prizes = _.sortBy(item.prizes, 'order');
      res.render('postcards/edit', { item:item, current: req.user });
    });
  });

  router.delete('/postcards/:id', utils.logged, function(req, res) {
    Postcard.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, lottery: item.t + ' 已经删除' }); });
      else res.json({ status: 404, lottery: '没有找到要删除的对象' });
    });
  });

  router.post('/postcards/:id', utils.logged, function(req, res) {
    Postcard.findById(req.params.id).exec(function(err, item) {
      var keys = req.body.planskey;
      var t = req.body.planst;
      var plans = {};
      if(!!keys && !!t) {
        if(typeof keys === 'string') plans[keys] = t;
        else {
          for(var i = 0; i < keys.length; i++) {
            if(keys[i]) plans[keys[i]] = t[i];
          }
        }
      }
      if(!item) item = new Postcard();
      item.t = req.body.t;
      item.plans = plans;
      item.start = utils.moment(req.body.start, 'YYYY年MM月DD日').format('MM/DD/YYYY');
      item.end = utils.moment(req.body.end, 'YYYY年MM月DD日').format('MM/DD/YYYY');
      item.save(function(err) {
        res.render('postcards/edit', { item:item, current: req.user, lottery:'保存成功' });
      });
    });
  });

  router.get('/api/postcards', utils.logged, function(req, res) {
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
      thunk(function(cb) { Postcard.find().or(or).skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Postcard.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) { return [item.id, item.t, item.num, item.start, item.end, item.close]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

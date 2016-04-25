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
  router.get('/complaints', utils.logged, function(req, res) {
    res.render('complaints/list', { current: req.user });
  });

  router.get('/complaints/new', utils.logged, function(req, res) {
    res.render('complaints/edit', { item:new Complaint(), current: req.user });
  });

  router.get('/complaints/:id', utils.logged, function(req, res) {
    Complaint.findById(req.params.id).populate('from to').exec(function(err, item) {
      res.render('complaints/edit', { item:item, current: req.user });
    });
  });

  router.delete('/complaints/:id', utils.logged, function(req, res) {
    Complaint.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, complaint: item.reason + ' 已经删除' }); });
      else res.json({ status: 404, complaint: '没有找到要删除的对象' });
    });
  });

  router.post('/complaints/:id', utils.logged, function(req, res) {
    Complaint.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Complaint();
      var body = req.body;
      item.user = body.user;
      item.commodity = body.commodity;
      item.reason = body.reason;
      item.processed = body.processed;

      item.save(function(err) { res.render('complaints/edit', { item:item, current:req.user, complaint:'保存成功' }); });
    });
  });

  router.get('/api/complaints', utils.logged, function(req, res) {
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
      or = [{ nickname:{ $regex:re } }, { mobile:{ $regex:re } }, { email: { $regex:re } }];
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
        Complaint.find().or(or).populate('user commodity').skip(start).limit(size).sort(sort).exec(function(err, items) {
          cb(err, items);
        });
      }),
      thunk(function(cb) { Complaint.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = [];

      _.each(results[0], function(item, i) {
        if(item && item.user && item.commodity) data.push([item.id, item.user.nickname, item.commodity.t, item.reason, item.at, item.processed]);
        else item.remove(function(err) { /* 不处理 */ });
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

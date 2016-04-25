/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var _u = require('./utils');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var path = require('path');
var flash = require('connect-flash');
var ObjectID = require('mongodb').ObjectID;

/* 管理员 */
module.exports = function(utils) {
  router.get('/accounts', utils.logged, function(req, res) {
    res.render('accounts/list', { current: req.user });
  });

  router.get('/accounts/new', utils.logged, function(req, res) {
    res.render('accounts/edit', { item:new Account(), current: req.user });
  });

  router.get('/accounts/:id', utils.logged, function(req, res) {
    Account.findById(req.params.id).populate('user').exec(function(err, item) {
      res.render('accounts/edit', { item:item, current: req.user });
    });
  });

  router.delete('/accounts/:id', utils.logged, function(req, res) {
    Account.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.nickname + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/accounts/:id', utils.logged, function(req, res) {
    var id = _u.isMongoId(req.params.id) ? req.params.id : new ObjectID();
    var datas = { user:req.body.user, points:req.body.points };

    Account.findOneAndUpdate({ _id:id }, { $set:datas }, { upsert:true, new:true }).exec(function(err, item) {
      res.render('accounts/edit', { item:item, current: req.user, message:'保存成功' });
    });
  });

  router.get('/api/accounts', utils.logged, function(req, res) {
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
      or = [{ nickname: { $regex: re } }, { mobile: { $regex: re } }, { email: { $regex: re } }];
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
      thunk(function(cb) { Account.find().populate('user').skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Account.count().exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) { return [item.id, item.user ? item.user.nickname : '', item.points]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

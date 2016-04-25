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
  router.get('/fragments', utils.logged, function(req, res) {
    Fragment.distinct('group').exec(function(err, items) {
      res.render('fragments/list', { groups:items, current:req.user });
    });
  });

  router.get('/fragments/new', utils.logged, function(req, res) {
    Fragment.distinct('group').exec(function(err, items) {
      res.render('fragments/edit', { item:new Fragment(), groups:items, current: req.user });
    });
  });

  router.get('/fragments/:id', utils.logged, function(req, res) {
    Fragment.distinct('group').exec(function(err, items) {
      Fragment.findById(req.params.id).populate('ads').exec(function(err, item) {
        if(item) item.ads = _.sortBy(item.ads, 'position');
        res.render('fragments/edit', { item:item, groups:items, current: req.user });
      });
    });
  });

  // 广告排序;
  router.post('/fragments/:id/sortable', utils.logged, function(req, res) {
    var items = req.body.items;
    var id = req.params.id;
    _.each(items, function(item, i) {
      Ad.update({ _id:item.id }, { $set:{ position:item.position } }, function(err, num) { if(err) console.error(err); });
    });

    res.json({ result:true });
  });

  router.delete('/fragments/:id', utils.logged, function(req, res) {
    Fragment.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.desc + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/fragments/:id', utils.logged, function(req, res) {
    var id = _u.isMongoId(req.params.id) ? req.params.id : new ObjectID();
    var datas = { group:req.body.group, desc:req.body.desc, order:req.body.order, ads:req.body.ads };

    Fragment.findOneAndUpdate({ _id:id }, { $set:datas }, { upsert:true, new:true }).populate('ads').exec(function(err, item) {
      res.render('fragments/edit', { item:item, current: req.user, message:'保存成功' });
    });
  });

  router.get('/api/fragments', utils.logged, function(req, res) {
    var query = req.query;
    var start = parseInt(query.start);
    var size = parseInt(query.length);
    var draw = parseInt(query.draw);
    var search = _.trim(query.search.value);
    var order = query.order;
    var columns = query.columns;
    var filters = query.filters;

    var cop = {}, or = {}, sort = {};

    // 搜索参数
    if(search && search.length > 3) {
      var re = new RegExp(search, 'i');
      or = [{ group: { $regex:re } }, { desc: { $regex:re } }];
    }

    // 排序参数
    if(order.length > 0) {
      _.each(order, function(item, i) {
        var field = columns[item.column].name;
        var dir = item.dir === 'asc' ? 1 : -1;
        _.set(sort, field, dir);
      });
    }

    // 字段过滤
    _.each(filters, function(item, i) {
      var field, val;

      if(item.value.start && item.value.end) {
        var start = item.value.start;
        var end = item.value.end;
        if(start && end && start.length > 0 && end.length > 0) {
          field = columns[item.i].name;
          val = { $gte:start, $lt:end };
          _.set(cop, field, val);
        }
      } else {
        val = item.value;

        if(val && val.length > 0) {
          field = columns[item.i].name;

          if(_.isArray(val)) {
            var evens = _.remove(val, function(n) { return _.trim(n).length > 0; });
            if(evens.length > 0) _.set(cop, field, { $in:evens });
          } else _.set(cop, field, val);
        }
      }
    });

    thunk.all([
      thunk(function(cb) { Fragment.find(cop).populate('ads').skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Fragment.count(cop).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) { return [item.id, item.group, item.desc, item.order]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  router.post('/fragments/:id/ads', utils.logged, function(req, res) {
    var datas = req.body.ads;
    Ad.find({ _id:{ $in:datas } }, function(err, item) {
      if(err) console.error(err);
      res.json(item);
    });
  });

  return router;
};

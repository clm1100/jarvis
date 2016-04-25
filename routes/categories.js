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
var fs = require('fs');
var gm = require('gm');

/* 管理员 */
module.exports = function(utils) {
  router.get('/categories', utils.logged, function(req, res) {
    Category.find({}).populate('parent').sort('parent').exec(function(err, items) {
      res.render('categories/list', { categories:items, current: req.user });
    });
  });

  router.get('/categories/new', utils.logged, function(req, res) {
    Category.find({}).populate('parent').sort('parent').exec(function(err, items) {
      res.render('categories/edit', { categories:items, item:new Category(), current: req.user });
    });
  });

  router.get('/categories/:id', utils.logged, function(req, res) {
    Category.find({}).populate('parent').sort('parent').exec(function(err, items) {
      Category.findById(req.params.id).exec(function(err, item) {
        res.render('categories/edit', { categories:items, item:item, current: req.user });
      });
    });
  });

  router.post('/categories/:id', utils.logged, function(req, res) {
    Category.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Category();

      item.t = req.body.t;
      item.path = req.body.path;
      item.parent = req.body.parent;

      item.save(function(err) {
        res.redirect(200, 'categories/edit', { item:item, current:req.user, message:'保存成功' });
      });
    });
  });

  router.delete('/categories/:id', utils.logged, function(req, res) {
    Category.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.nickname + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.get('/api/categories', utils.logged, function(req, res) {
    var query = req.query;
    var start = parseInt(query.start);
    var size = query.size ? parseInt(query.size) : 10;
    var draw = parseInt(query.draw);
    var search = _.trim(query.search.value);
    var order = query.order;
    var columns = query.columns;
    var filters = query.filters;

    var cop = {};
    var or = {};
    var sort = {};

    // 搜索参数
    if(search && search.length > 1) {
      or = [];
      if(_u.isMongoId(search)) or.push({ _id:search });
      else {
        var re = new RegExp(search, 'i');
        or = [{ t:{ $regex:re } }, { path:{ $regex:re } }];
      }
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
        Category.find(cop).or(or).populate('parent').sort('parent').skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Category.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) { return [item.id, item.parent ? item.parent.t : '', item.t, item.path]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  router.get('/api/get_categories/son/:id', utils.logged, function(req, res) {
    Category.find({ parent:req.params.id }).exec(function(err, items) { res.json({ items:items }); });
  });

  return router;
};

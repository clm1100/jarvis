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

/* 广告 */
module.exports = function(utils) {
  router.get('/tabs', utils.logged, function(req, res) {
    res.render('tabs/list', { current: req.user, types: TabTypes });
  });

  router.get('/tabs/new', utils.logged, function(req, res) {
    res.render('tabs/edit', { item:new Tab(), current: req.user });
  });

  router.get('/tabs/sortable', utils.logged, function(req, res) {
    var num = req.query.num;
    Tag.find({ type:num }).sort({ position:'1' }).exec(function(err, items) {
      res.render('tabs/sortable', { items:items, current: req.user });
    });
  });

  router.post('/tabs/sortable', utils.logged, function(req, res) {
    var list = req.body.list;
    var bulk = Tag.collection.initializeUnorderedBulkOp({ useLegacyOps:true });
    _.each(list, function(item, i) {
      bulk.find({ _id:new ObjectID(item.id) }).update({ $set: { position:parseInt(item.position) } });
    });

    bulk.execute(function(err, result) {
      if(err) console.error(err);
      res.json(result);
    });
  });

  router.get('/tabs/:id', utils.logged, function(req, res) {
    Tab.findById(req.params.id).populate('ads').exec(function(err, item) {
      if(item) item.ads = _.sortBy(item.ads, 'position');
      res.render('tabs/edit', { item:item, current: req.user });
    });
  });

  router.delete('/tabs/:id', utils.logged, function(req, res) {
    Tab.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.nickname + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/tabs/:id', utils.logged, function(req, res) {
    Tab.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Tab();
      var body = req.body;
      item.t = body.t;
      item.type = body.type;
      item.ref = body.ref;
      item.ads = body.ads;
      item.position = body.position;
      item.start = body.start ? utils.moment(_.trim(body.start), 'YYYY年MM月DD日') : null;
      item.end = body.end ? utils.moment(_.trim(body.end), 'YYYY年MM月DD日') : null;
      item.save(function(err) {
        res.redirect('/tabs/' + item.id);
      });
    });
  });

  router.get('/api/tabs', utils.logged, function(req, res) {
    var query = req.query;
    var start = parseInt(query.start);
    var size = parseInt(query.length);
    var draw = parseInt(query.draw);
    var search = _.trim(query.search.value);
    var order = query.order;
    var columns = query.columns;
    var filters = query.filters;

    var cop = {};
    var or = {};
    var sort = {};

    // 搜索参数
    if(search && search.length > 3) {
      var re = new RegExp(search, 'i');
      or = [{ d:{ $regex:re } }];
    }

    // 字段过滤
    _.each(filters, function(item, i) {
      var field, val;

      if(item.value.start && item.value.end) {
        var start = item.value.start;
        var end = item.value.end;
        if(start && end && start.length > 0 && end.length > 0) {
          field = columns[item.i].name;
          val = { $gte:start, $lt: end };
          _.set(cop, field, val);
        }
      } else {
        val = item.value;

        if(val && val.length > 0) {
          field = columns[item.i].name;

          if(_.isArray(val)) {
            var evens = _.remove(val, function(n) { return _.trim(n).length > 0; });
            if(evens.length > 0) _.set(cop, field, { $in:evens });
          } else {
            if(field === 'start' || field === 'end') {
              var check = field === 'start' ? { $gte:val } : { $lte:val };
              _.set(cop, field, check);
            } else _.set(cop, field, val);
          }
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
        Tab.find(cop).or(or).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Tab.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) { return [item.id, item.t, item.type, item.start, item.end]; });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  router.post('/tabs/:list/sortable', utils.logged, function(req, res) {
    var items = req.body.items;
    var id = req.params.list;
    _.each(items, function(item, i) {
      Ad.update({ _id:item.id }, { $set:{ position:item.position } }, function(err, num) {
        // 不需要处理
        if(err) console.error(err);
      });
    });

    res.json({ result:true });
  });

  return router;
};

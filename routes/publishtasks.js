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
  router.get('/publishtasks', utils.logged, function(req, res) {
    res.render('publishtasks/list', { current: req.user });
  });

  router.get('/publishtasks/new', utils.logged, function(req, res) {
    res.render('publishtasks/edit', { item:new PublishTask(), types:PublishTaskTypes });
  });

  router.get('/publishtasks/:id', utils.logged, function(req, res) {
    PublishTask.findById(req.params.id, function(err, date) {
      if(err) console.error(err);
      res.render('publishtasks/edit', { item:date, types:PublishTaskTypes });
    });
  });

  // 定时发布保存
  router.post('/publishtasks/:id', utils.logged, function(req, res) {
    PublishTask.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new PublishTask();
      var body = req.body;
      item.t = body.t;
      item.cid = body.cid;
      item.type = body.type;
      item.time = utils.moment(_.trim(body.time), 'YYYY年MM月DD日 HH:mm');
      item.save(function(err) {
        if(err) console.error(err);
        res.redirect('/publishtasks/' + item.id + '?message=' + urlencode.encode('保存成功'));
      });
    });
  });


  router.delete('/publishtasks/:id', utils.logged, function(req, res) {
    PublishTask.findById(req.params.id, function(err, item) {
      item.remove(function(err) { res.json({ status:200, message: req.params.id + ' 已经删除' }); });
    });
  });

  router.get('/api/publishtasks', utils.logged, function(req, res) {
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
        PublishTask.find(cop).or(or).skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); });
      }),
      thunk(function(cb) { PublishTask.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) {
        var type = _.filter(PublishTaskTypes, function(pt) { if(pt.v === item.type) return true; else return false; });
        return [item._id, item.cid, item.t, type[0].t, item.time];
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

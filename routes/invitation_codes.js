/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var path = require('path');
var flash = require('connect-flash');

/* 管理员 */
module.exports = function(utils) {
  router.get('/invitation_codes', utils.logged, function(req, res) {
    res.render('invitation_codes/list', { current: req.user });
  });

  router.get('/invitation_codes/new', utils.logged, function(req, res) {
    res.render('invitation_codes/edit', { item:new InvitationCode(), current: req.user });
  });

  router.get('/invitation_codes/:id', utils.logged, function(req, res) {
    InvitationCode.findById(req.params.id).exec(function(err, item) {
      res.render('invitation_codes/edit', { item:item, current: req.user });
    });
  });

  router.delete('/invitation_codes/:id', utils.logged, function(req, res) {
    InvitationCode.findById(req.params.id).exec(function(err, item) {
      if(item) {
        item.remove(function(err) {
          res.json({ status:200, message: item.nickname + ' 已经删除' });
        });
      } else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/invitation_codes/:id', utils.logged, function(req, res) {
    InvitationCode.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new InvitationCode();
      var body = req.body;
      item.nickname = body.nickname;
      item.mobile = body.mobile;
      item.email = body.email;
      item.pass = body.pass;
      item.confirm_pass = body.confirm_pass;

      item.save(function(err) {
        res.render('invitation_codes/edit', { item:item, current: req.user, message:'保存成功' });
      });
    });
  });

  router.get('/api/invitation_codes', utils.logged, function(req, res) {
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
      or = [{ code:{ $regex:re } }];
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
        InvitationCode.find().or(or).skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); });
      }),
      thunk(function(cb) { InvitationCode.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) { return [item.id, item.code, item.used]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  return router;
};

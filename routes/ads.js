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
  router.get('/ads', utils.logged, function(req, res) {
    res.render('ads/list', { current: req.user, types: AdTypes, ref_types:AdRefTypes });
  });

  router.get('/ads/new', utils.logged, function(req, res) {
    res.render('ads/edit', { item:new Ad(), current: req.user });
  });

  router.get('/ads/sortable', utils.logged, function(req, res) {
    var num = req.query.num;
    Ad.find({ type:num }).sort({ position:'1' }).exec(function(err, items) {
      res.render('ads/sortable', { items:items, current: req.user, types:AdTypes });
    });
  });

  router.post('/ads/sortable', utils.logged, function(req, res) {
    var list = req.body.list;
    var bulk = Ad.collection.initializeUnorderedBulkOp({ useLegacyOps: true });
    _.each(list, function(item, i) {
      bulk.find({ _id: new ObjectID(item.id) }).update({ $set:{ position:parseInt(item.position) } });
    });

    bulk.execute(function(err, result) {
      if(err) console.error(err);
      res.json(result);
    });
  });

  router.get('/ads/:id', utils.logged, function(req, res) {
    Ad.findById(req.params.id).exec(function(err, item) { res.render('ads/edit', { item:item, current: req.user }); });
  });

  router.delete('/ads/:id', utils.logged, function(req, res) {
    Ad.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.nickname + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  router.post('/ads/:id', utils.uploader.single('cover'), utils.logged, function(req, res) {
    Ad.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Ad();
      var body = req.body;
      item.d = body.d;
      item.link = body.link;
      item.type = body.type;
      item.ref = body.ref;
      item.ref_type = body.ref_type;
      item.position = body.position;
      item.start = body.start ? utils.moment(_.trim(body.start), 'YYYY年MM月DD日') : null;
      item.end = req.body.end ? utils.moment(_.trim(body.end), 'YYYY年MM月DD日') : null;

      thunk(function(cb) {
        if(req.file && req.file.path) {
          var path = req.file.path;
          gm(path).autoOrient().write(path, function(err) {
            var cover = req.file;
            utils.upyun.uploadFile('/ad/cover/' + cover.filename, cover.path, cover.mimetype, true, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(err, result) {
              item.cover = cover.filename;
              fs.unlink(cover.path, function(err) { cb(err, null); });
            });
          });
        } else cb(null, null);
      })(function(es, rs) { item.save(function(err) { res.redirect('/ads/' + item.id + '?message=' + urlencode.encode('保存成功')); }); });
    });
  });

  router.get('/api/ads', utils.logged, function(req, res) {
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
      or = [{ d: { $regex: re } }];
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
        Ad.find(cop).or(or).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Ad.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) {
        return [item.id, item.d, item.link, item.cover_original + '!waterfall', item.type, item.ref_type, item.start, item.end];
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  /* Ad 搜索 */
  router.get('/api/ads/search/:key/:page', function(req, res) {
    if(_.isEmpty(req.params.key)) { res.json({ items:null }); return; }

    var key = urlencode.decode(req.params.key);
    var page = parseInt(req.params.page);
    if(!page) page = 0;

    var query = { d:new RegExp(key, 'i') };
    thunk.all([
      thunk(function(cb) { Ad.find(query).skip(page * 40).limit(40).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Ad.count(query).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      res.json({ items: results[0], total:results[1] });
    });
  });


  return router;
};

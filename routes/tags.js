/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var _u = require('./utils');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var fs = require('fs');
var gm = require('gm');
var urlencode = require('urlencode');
var path = require('path');
var flash = require('connect-flash');
var ObjectID = require('mongodb').ObjectID;

/* 管理员 */
module.exports = function(utils) {
  router.get('/tags', utils.logged, function(req, res) {
    res.render('tags/list', { current: req.user, lists:TagList });
  });

  router.get('/tags/new', utils.logged, function(req, res) {
    res.render('tags/edit', { item: new Tag(), current: req.user, lists:TagList });
  });

  router.get('/tags/:id', utils.logged, function(req, res) {
    Tag.findById(req.params.id).populate('ads').exec(function(err, item) {
      if (item) item.ads = _.sortBy(item.ads, 'position');
      res.render('tags/edit', { item:item, current:req.user, lists:TagList });
    });
  });

  router.delete('/tags/:id', utils.logged, function(req, res) {
    Tag.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message:item.nickname + ' 已经删除' }); });
      else res.json({ status:404, message:'没有找到要删除的对象' });
    });
  });

  router.post('/tags/:id', utils.uploader.single('cover'), utils.logged, function(req, res) {
    Tag.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Tag();
      var body = req.body;
      item.list = body.list;
      item.t = body.t;
      item.d = body.d;
      item.position = body.position;
      item.limit = body.limit;
      item.used = body.used;
      item.ads = body.ads;
      var synonyms = body.synonyms.replace(/\s+/g, '').split(',');
      if(synonyms.length < 2) synonyms = body.synonyms.replace(/\s+/g, '').split('，');

      var associations = body.associations.replace(/\s+/g, '').split(',');
      if(associations.length < 2) associations = body.associations.replace(/\s+/g, '').split('，');

      item.synonyms = synonyms;
      item.associations = associations;
      item.count = body.count;

      thunk(function(cb) {
        if(req.file && req.file.path) {
          var path = req.file.path;
          gm(path).autoOrient().write(path, function(err) {
            var cover = req.file;
            utils.upyun.uploadFile('/tag/cover/' + cover.filename, cover.path, cover.mimetype, true, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(err, result) {
              item.cover = cover.filename;
              fs.unlink(cover.path, function(err) { cb(err, null); });
            });
          });
        } else cb(null, null);
      })(function(es, rs) {
        item.save(function(err) {
          item.populate('ads', function() {
            res.render('tags/edit', { item:item, current:req.user, lists:TagList, message:'保存成功' });
          });
        });
      });
    });
  });

  router.get('/tags/:list/sortable', utils.logged, function(req, res) {
    Tag.find({ list:req.params.list }).sort({ position:'1' }).exec(function(err, items) {
      res.render('tags/sortable', { items:items, current: req.user });
    });
  });

  router.post('/tags/:list/sortable', utils.logged, function(req, res) {
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

  router.get('/api/tags', utils.logged, function(req, res) {
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
    if(search && search.length > 1) {
      or = [];
      if(_u.isMongoId(search)) or.push({ _id:search });
      else {
        var re = new RegExp(search, 'i');
        or = [{ t:{ $regex:re } }, { synonyms:{ $regex:re } }];
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
          _.set(cop, field, val);
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
        Tag.find(cop).or(or).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Tag.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) {
        return [
          item.id,
          _.findLast(TagList, function(n) { return n.v === item.list; }).d,
          item.t,
          item.synonyms.join(' '),
          item.associations.join(' '),
          item.cover_thumb,
          item.limit,
          item.used,
          item.position
        ];
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  /* 商品搜索 */
  router.get('/api/tags/search/:list/:key/:page', function(req, res) {
    var params = req.params;
    if(_.isEmpty(params.key)) { res.json({ items:null }); return; }

    var key = urlencode.decode(params.key);
    var page = parseInt(params.page);

    if(!page) page = 0;

    var filter = (req.params.list !== 'all') ? filter = { term:{ list:params.list } } : {};

    Tag.search({
      filtered: {
        query: { query_string:{ query:key } },
        filter: filter
      }
    }, { from:page * 40, size:40 }, function(err, results) {
      var items = results ? results.hits.hits : [];
      var total = results ? results.hits.total : 0;

      res.json({ items:items, total:total });
    });
  });

  router.post('/tags/:id/ads', utils.logged, function(req, res) {
    var datas = req.body.ads;
    Ad.find({ _id:{ $in:datas } }, function(err, item) {
      if(err) console.error(err);
      res.json(item);
    });
  });
  /********************************************/
  router.get('/tags/data/api',function(req,res){
    Tag.find({list:'works'},function(err,items){
      var tt  =items.map(function(element){
        if(element.synonyms){
          return element.list
        }else{
          return element.list;
        }
      });
      res.json(tt);
    })
  });
  return router;
};

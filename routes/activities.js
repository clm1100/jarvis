/* jshint -W079 */ /* jshint -W020 */

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

/* 活动 */
module.exports = function(utils) {
  router.get('/activities', utils.logged, function(req, res) {
    res.render('activities/list', { current: req.user });
  });

  router.get('/activities/new', utils.logged, function(req, res) {
    res.render('activities/edit', { item:new Activity({ is_publish:false }), current:req.user });
  });

  router.get('/activities/sortable', utils.logged, function(req, res) {
    Activity.find({ force_top:true }).sort({ position:'1' }).exec(function(err, items) {
      res.render('activities/sortable', { items:items, current:req.user });
    });
  });

  router.post('/activities/sortable', utils.logged, function(req, res) {
    var list = req.body.list;
    var bulk = Activity.collection.initializeUnorderedBulkOp({ useLegacyOps:true });
    _.each(list, function(item, i) { bulk.find({ _id: new ObjectID(item.id) }).update({ $set:{ position:parseInt(item.position) } }); });

    bulk.execute(function(err, result) {
      if(err) console.error(err);
      res.json(result);
    });
  });

  router.get('/activities/:id', utils.logged, function(req, res) {
    var id = req.params.id;
    thunk.all([
      thunk(function(cb) { Activity.findById(id).populate('tags').deepPopulate(activityDeepItems).exec(function(err, item) { cb(err, item); }); }),
      thunk(function(cb) { Zan.find({ activity:id }).populate('user').exec(function(err, zans) { cb(err, zans); }); }),
      thunk(function(cb) { Comment.find({ activity:id }).populate('user').exec(function(err, comments) { cb(err, comments); }); })
    ])(function(error, results) {
      res.render('activities/edit', { item:results[0], zans:results[1], comments:results[2], current:req.user, message: req.query.message, taglists:TagList });
    });
  });

  router.post('/activities/:id', utils.uploader.single('cover'), utils.logged, function(req, res) {
    Activity.findById(req.params.id).deepPopulate(activityDeepItems).exec(function(err, item) {
      if(!item) item = new Activity();

      // 基本数据
      var body = req.body;
      item.t = body.t;
      item.c = body.c;
      item.d = body.d;
      item.limit = body.limit;
      item.count = body.count;

      item.is_publish = (body.is_publish === 'true' || body.is_publish === 'on');
      item.show_ext = (body.show_ext === 'true' || body.show_ext === 'on');

      item.start = body.start ? utils.moment(_.trim(body.start), 'YYYY年MM月DD日') : null;
      item.end = body.end ? utils.moment(_.trim(body.end), 'YYYY年MM月DD日') : null;

      item.is_out = (body.is_out === 'true' || body.is_out === 'on');
      item.url = body.url;

      // 关联商品
      item.commodities = body.commodities;

      // 标签相关
      var tags = body.tags;
      if(tags && !_.isArray(tags)) tags = [tags];

      // 删除标签
      item.tags = tags ? _.remove(item.tags, function(t) { return t && _.indexOf(tags, t) < 0; }) : null;

      // 添加标签
      _.each(tags, function(t, i) {
        var is = _.findIndex(item.tags, function(tag) { return tag && tag === t; });
        if(is < 0) item.tags.push(t);
      });

      thunk(function(cb) {
        // 处理头图
        if(req.file && req.file.path) {
          var path = req.file.path;
          gm(path).autoOrient().write(path, function(err) {
            var cover = req.file;
            utils.upyun.uploadFile('/activity/cover/' + cover.filename, cover.path, cover.mimetype, true, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(err, result) {
              item.cover = cover.filename;
              fs.unlink(cover.path, function(err) { cb(err, null); });
            });
          });
        }else item.save(function(err) { res.redirect('/activities/' + item.id + '?message=' + urlencode.encode('保存成功')); });
      })(function(error, results) {
        item.save(function(err) { res.redirect('/activities/' + item.id + '?message=' + urlencode.encode('保存成功')); });
      });
    });
  });

  router.post('/activities/:id/comments', utils.logged, function(req, res) {
    var id = req.params.id;
    Activity.findById(id).exec(function(err, item) {
      Comment.findById(req.body.cid).exec(function(err, comment) {
        if(!comment) comment = new Comment();
        comment.user = req.body.user;
        comment.c = req.body.c;
        comment.activity = id;

        comment.save(function(err) {
          item.save(function(err) {
            Comment.findById(comment.id).deepPopulate(commentDeepItems).exec(function(err, co) { res.json(co); });
          });
        });
      });
    });
  });

  router.delete('/activities/:id/comments/:cid', utils.logged, function(req, res) {
    Activity.findById(req.params.id).exec(function(err, item) {
      var cid = req.params.cid;

      Comment.findById(cid).exec(function(err, comment) {
        comment.remove(function(err) { item.save(function(err) { res.json({ result:cid }); }); });
      });
    });
  });

  router.delete('/activities/:id', utils.logged, function(req, res) {
    var id = req.params.id;

    Activity.findById(id, function(err, item) {
      item.remove(function(err) { res.json({ status:200, message: id + ' 已经删除' }); });
    });
  });

  router.get('/api/activities', utils.logged, function(req, res) {
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
    if(search && search.length >= 2) {
      or = [];
      if(_u.isMongoId(search)) or.push({ _id: search });
      else {
        var re = new RegExp(search, 'i');
        or.push({ t:{ $regex: re } });
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
          val = { $gte:start, $lt: end };
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
        Activity.find(cop).or(or).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Activity.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) {
        return [item.id, item.t, item.cover_thumb, item.at, item.end, item.limit, item.count, item.is_publish, item.position];
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  /* 活动搜索 */
  router.get('/api/activities/search/:key/:page', function(req, res) {
    if(_.isEmpty(req.params.key)) { res.json({ items:null }); return; }

    var key = urlencode.decode(req.params.key);
    var page = parseInt(req.params.page);
    if(!page) page = 0;

    Activity.search({
      filtered: {
        query: { query_string: { query:key } },
        filter: { term:{ is_publish: true } }
      }
    }, { from:page * 20, size:20 }, function(err, results) {
      var items = results ? results.hits.hits : [];
      var total = results ? results.hits.total : 0;

      res.json({ items: items, total:total });
    });
  });

  return router;
};

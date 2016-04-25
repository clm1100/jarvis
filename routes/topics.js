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
  router.get('/topics', utils.logged, function(req, res) {
    res.render('topics/list', { current: req.user });
  });

  router.get('/topics/new', utils.logged, function(req, res) {
    res.render('topics/edit', { item:new Topic(), zans:[], comments:[], current: req.user, taglists:TagList });
  });

  router.get('/topics/sortable', utils.logged, function(req, res) {
    Topic.find({ force_top:true }).sort({ position:'1' }).exec(function(err, items) {
      res.render('topics/sortable', { items:items, current: req.user });
    });
  });

  router.post('/topics/sortable', utils.logged, function(req, res) {
    var list = req.body.list;
    var bulk = Topic.collection.initializeUnorderedBulkOp({ useLegacyOps:true });
    _.each(list, function(item, i) {
      bulk.find({ _id: new ObjectID(item.id) }).update({ $set: { position:parseInt(item.position) } });
    });

    bulk.execute(function(err, result) {
      if(err) console.error(err);
      res.json(result);
    });
  });

  router.get('/topics/:id', utils.logged, function(req, res) {
    var query = { topic:req.params.id };
    thunk.all([
      thunk(function(cb) {
        Topic.findById(req.params.id).populate('tags').deepPopulate(topicDeepItems).exec(function(err, item) { cb(err, item); });
      }),
      thunk(function(cb) { Zan.find(query).populate('user').exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Comment.find(query).populate('user').exec(function(err, items) { cb(err, items); }); })
    ])(function(error, vals) {
      res.render('topics/edit', { item:vals[0], zans:vals[1], comments:vals[2], current:req.user, message:req.query.message, taglists:TagList });
    });
  });

  // 攻略保存
  router.post('/topics/:id', utils.uploader.single('cover'), utils.logged, function(req, res) {
    Topic.findById(req.params.id).deepPopulate(topicDeepItems).exec(function(err, item) {
      if(!item) item = new Topic();

      var body = req.body;

      // 基本数据
      item.t = body.t;
      item.c = body.c;

      var oldIsPublish = (item.is_publish === 'true' || item.is_publish === 'on');
      item.is_publish = (body.is_publish === 'true' || body.is_publish === 'on');
      item.show_ext = (body.show_ext === 'true' || body.show_ext === 'on');

      var newat = body.at;

      if(newat && newat.length > 0) item.at = utils.moment(body.at, 'YYYY年MM月DD日 HH:mm:ss');

      item.is_out = (body.is_out === 'true' || body.is_out === 'on');
      item.url = body.url;
      item.force_top = body.force_top === 'true';
      item.position = body.position;

      // 关联商品
      item.commodities = body.commodities;

      // 点赞相关
      var zans = body.zans;
      if(!_.isArray(zans) && zans) zans = [zans];

      Zan.find({ topic:item.id }).populate('user').exec(function(err, zs) {
        // 删除赞
        _.each(zs, function(z) { if(z.user === null || (zans && zans.indexOf(z.user.id) < 0)) z.remove(); });

        // 添加赞
        _.each(zans, function(z, i) {
          var is = _.findIndex(zs, function(zan) { return zan.user && zan.user.id === z; });
          if(is < 0) {
            var zan = new Zan({ user:z, topic:item.id });
            zan.save();
          }
        });
      });

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

      if(req.file && req.file.path) {
        var path = req.file.path;
        gm(path).autoOrient().write(path, function(err) {
          var cover = req.file;
          utils.upyun.uploadFile('/topic/cover/' + cover.filename, cover.path, cover.mimetype, true, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(err, result) {
            item.cover = cover.filename;
            item.save(function(err) {
              fs.unlink(cover.path, function(err) {
                res.redirect('/topics/' + item.id + '?message=' + urlencode.encode('保存成功'));
              });
            });
          });
        });
      } else item.save(function(err) { res.redirect('/topics/' + item.id + '?message=' + urlencode.encode('保存成功')); });
    });
  });

  router.post('/topics/:id/comments', utils.logged, function(req, res) {
    Topic.findById(req.params.id).exec(function(err, item) {
      var cid = req.body.cid;
      var user = req.body.user;
      var c = req.body.c;

      Comment.findById(cid).exec(function(err, comment) {
        if(!comment) comment = new Comment();
        comment.user = user;
        comment.c = c;
        comment.topic = req.params.id;

        comment.save(function(err) {
          item.save(function(err) {
            Comment.findById(comment.id).deepPopulate(commentDeepItems).exec(function(err, co) { res.json(co); });
          });
        });
      });
    });
  });

  router.delete('/topics/:id/comments/:cid', utils.logged, function(req, res) {
    Topic.findById(req.params.id).exec(function(err, item) {
      var cid = req.params.cid;

      Comment.findById(cid).exec(function(err, comment) {
        comment.remove(function(err) { item.save(function(err) { res.json({ result:cid }); }); });
      });
    });
  });

  router.delete('/topics/:id', utils.logged, function(req, res) {
    var id = req.params.id;

    Topic.findById(id, function(err, item) {
      item.remove(function(err) { res.json({ status:200, message: id + ' 已经删除' }); });
    });
  });

  router.get('/api/topics', utils.logged, function(req, res) {
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
      if(_u.isMongoId(search)) or.push({ _id:search });
      else {
        var re = new RegExp(search, 'i');
        or.push({ t:{ $regex:re } });
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
        Topic.find(cop).or(or).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Topic.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, rs) {
      var data = rs ? _.map(rs[0], function(item, i) { return [item.id, item.t, item.cover_thumb, item.at, item.is_publish, item.position]; }) : [];
      var result = { draw:draw, recordsTotal:rs ? rs[1] : 0, recordsFiltered:rs ? rs[1] : 0, data:data };
      res.json(result);
    });
  });

  /* 原创搜索 */
  router.get('/api/topics/search/:key/:page', function(req, res) {
    if(_.isEmpty(req.params.key)) res.json({ items:null });
    else {
      var key = urlencode.decode(req.params.key);
      var page = parseInt(req.params.page);
      if(!page) page = 0;

      Topic.search({
        filtered: {
          query:{ query_string: { query:key } },
          filter:{ term:{ is_publish: true } }
        }
      }, { from:page * 20, size:20 }, function(err, results) {
        var items = results ? results.hits.hits : [];
        var total = results ? results.hits.total : 0;

        res.json({ items: items, total:total });
      });
    }
  });

  return router;
};

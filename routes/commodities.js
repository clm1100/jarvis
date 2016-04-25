/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var _u = require('./utils');
var express = require('express');
var router = express.Router();
var urlencode = require('urlencode');
var thunk = require('thunks')();
var path = require('path');
var flash = require('connect-flash');
var ObjectID = require('mongodb').ObjectID;

/* 管理员 */
module.exports = function(utils) {
  router.get('/commodities', utils.logged, function(req, res) {
    res.render('commodities/list', { current: req.user });
  });

  router.get('/commodities/new', utils.logged, function(req, res) {
    var item = new Commodity({ is_publish:false });
    item.save(function(err) { res.redirect('/commodities/' + item.id); });
  });

  // 商品预览
  router.get('/commodities/preview', utils.logged, function(req, res) {
    res.render('commodities/preview', { isDevelopment:utils.isDevelopment });
  });

  // 商品排序
  router.get('/commodities/sortable', utils.logged, function(req, res) {
    Commodity.find({ force_top:true }).sort('-force_top position -at').exec(function(err, items) {
      res.render('commodities/sortable', { items:items, current: req.user });
    });
  });

  // 商品排序保存
  router.post('/commodities/sortable', utils.logged, function(req, res) {
    var list = req.body.list;
    var bulk = Commodity.collection.initializeUnorderedBulkOp({ useLegacyOps:true });
    _.each(list, function(item, i) {
      bulk.find({ _id:new ObjectID(item.id) }).update({ $set:{ position:parseInt(item.position) } });
    });

    bulk.execute(function(err, result) {
      if(err) console.error(err);
      res.json(result);
    });
  });

  // 商品详情
  router.get('/commodities/:id', utils.logged, function(req, res) {
    thunk.all([
      thunk(function(cb) {
        Commodity.findById(req.params.id).populate('tags').deepPopulate(commodityDeepItems).exec(function(err, item) {
          if (item) item.photos = _.sortBy(item.photos, 'position');
          cb(err, item);
        });
      }),
      thunk(function(cb) { Zan.find({ commodity:req.params.id }).populate('user').exec(function(err, zans) { cb(err, zans); }); }),
      thunk(function(cb) { Category.find({ parent:null }).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Comment.find({ commodity:req.params.id }).populate('user').exec(function(err, comments) { cb(err, comments); }); }),
      thunk(function(cb) { Tag.find({ list:{ $in:['sex', 'age'] } }, function(err, items) { cb(null, items); }); })
    ])(function(error, results) {
      var taglist = {};
      _.each(TagList, function(t) { _.set(taglist, t.v, t.d); });

      res.render('commodities/edit', { item:results[0], zans:results[1], current: req.user, categories: results[2], comments:results[3], taglist: taglist, moment:utils.moment, usedtag:results[4] });
    });
  });

  // 保存商品评论
  router.post('/commodities/:id/comments', utils.logged, function(req, res) {
    Commodity.findById(req.params.id).exec(function(err, item) {
      var cid = req.body.cid;
      Comment.findById(cid).exec(function(err, comment) {
        if(!comment) comment = new Comment();
        comment.user = req.body.user;
        comment.c = req.body.c;
        comment.commodity = req.params.id;

        comment.save(function(err) {
          item.save(function(err) {
            Comment.findById(comment.id).deepPopulate(commentDeepItems).exec(function(err, co) { res.json(co); });
          });
        });
      });
    });
  });

  // 商品插入图片
  router.post('/commodities/insert/photos', utils.logged, function(req, res) {
    var cid = req.body.id;
    var fName = req.body.name;
    var imgPosition = req.body.position;

    Commodity.findById(cid).exec(function(err, item) {
      var photo = new Photo({ position:imgPosition, f:fName });
      if(item) {
        item.photos.push(photo);
        item.save(function() { res.json(photo); });
      } else res.json(photo);
    });
  });

  // 删除商品
  router.delete('/commodities/:id', utils.logged, function(req, res) {
    var id = req.params.id;

    Commodity.findById(id, function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: id + ' 已经删除' }); });
      else res.json({ status:200, message: id + ' 已经删除' });
    });
  });

  // 删除商品评论
  router.delete('/commodities/:id/comments/:cid', utils.logged, function(req, res) {
    Commodity.findById(req.params.id).exec(function(err, item) {
      var cid = req.params.cid;

      Comment.findById(cid).exec(function(err, comment) {
        comment.remove(function(err) { item.save(function(err) { res.json({ result:cid }); }); });
      });
    });
  });

  // 保存商品图片排序
  router.post('/commodities/:id/photos/position', utils.logged, function(req, res) {
    var list = req.body.list;
    var id = req.params.id;

    _.each(list, function(item, i) {
      Commodity.update({ _id:id, 'photos._id': new ObjectID(item.id) }, { $set:{ 'photos.$.position':item.position } }, function(err, num) {
        // 不需要处理
        if(err) console.error(err);
      });
    });

    res.json({ result:true });
  });

  // 删除商品图片
  router.post('/commodities/:id/photo/:pid', utils.logged, function(req, res) {
    var id = req.params.id;
    var pid = req.params.pid;
    Commodity.findById(id).exec(function(err, item) {
      var array = item.photos;
      _.remove(array, function(photos) { return (photos._id).toString() === pid.toString(); });
      if(array === null) array = [];
      Commodity.find({ _id:id }).update({ $set:{ photos:array } }, function(err) {
        if(err) console.error(err);
        res.json({ item:item });
      });
    });
  });

  // 保存商品
  router.post('/commodities/:id', utils.logged, function(req, res) {
    thunk.all([
      thunk(function(cb) {
        Commodity.findById(req.params.id).exec(function(err, item) {
          if(item) item.photos = _.sortBy(item.photos, 'position');
          cb(err, item);
        });
      }),
      thunk(function(cb) {
        User.findOne({ nickname:req.body.nickname }).exec(function(err, u) {
          if(u) cb(err, u);
          else {
            var user = req.body.user;
            if(user && user.length > 0) User.findById(user).exec(function(err, u) { cb(err, u); });
            else cb(err, null);
          }
        });
      })
    ])(function(error, results) {
      var item = results[0];
      var user = results[1];

      if(!item) item = new Commodity();
      var body = req.body;
      item.id = body.id;
      item.t = body.t;
      item.sid = body.sid;
      item.url = body.url;
      item.op = body.op;
      item.p = body.p;
      item.position = body.position;
      item.copy_right = (body.copy_right === 'true' || body.copy_right === 'on');
      item.show_ext = (body.show_ext === 'true' || body.show_ext === 'on');
      item.is_publish = (body.is_publish === 'true' || body.is_publish === 'on');
      item.force_top = (body.force_top === 'true' || body.force_top === 'on');
      item.is_abroad = (body.is_abroad === 'true' || body.is_abroad === 'on');

      var newat = body.at;

      if(newat && newat.length > 0) item.at = utils.moment(body.at, 'YYYY年MM月DD日 HH:mm:ss');

      var oldStatus = item.is_light === 'true';
      item.is_light = body.is_light === 'true';
      item.is_selected = body.is_selected === 'true';

      item.currency = body.currency;
      item.region = body.region;
      item.topics = body.topics;

      // if(_.trim(req.body.categories).length > 0) item.categories = req.body.categories.split(',');
      item.categories = body.categories;
      item.user = user;
      item.d = body.d;

      // 点赞相关
      var zans = body.zans;
      if(!_.isArray(zans) && zans) zans = [zans];

      Zan.find({ commodity:item.id }).populate('user').exec(function(err, zs) {
        // 删除赞
        _.each(zs, function(z) { if(z.user === null || zans.indexOf(z.user.id) < 0) z.remove(); });

        // 添加赞
        _.each(zans, function(z, i) {
          var is = _.findIndex(zs, function(zan) { return zan.user && zan.user.id === z; });
          if(is < 0) {
            var zan = new Zan({ user:z, commodity:item.id });
            zan.save();
          }
        });
      });

      // 标签相关
      var tags = body.tags;
      if(tags && !_.isArray(tags)) tags = [tags];
      tags = _.uniq(tags);
      item.tags = tags;

      // if(tags && !_.isArray(tags)) tags = [tags];
      //
      // //删除标签
      // item.tags = tags ? _.remove(item.tags, function(t) { return t && _.indexOf(tags, t.toString()) > 0; }) : null;
      //
      // // 添加标签
      // _.each(tags, function(t, i) {
      //   var is = _.findIndex(item.tags, function(tag) { return tag && tag.toString() === t; });
      //   if(is < 0) item.tags.push(t);
      // });

      // 自定义标签相关
      var customs = [];
      var customTags = JSON.parse(body.customTags);

      // 添加自定义
      _.each(customTags, function(t, i) {
        if(t.txt && t.txt.length > 0) {
          var custom = new CustomTag({ d:t.txt, o:t.o, x:t.x, y:t.y });
          customs.push(custom);
        }
      });

      item.customTags = customs;

      // 活动处理
      var activities;
      if(item.d && item.d.length > 0) {
        var activityRegStr = '#.*?#';
        var activityReg = new RegExp(activityRegStr, 'gi');
        activities = item.d.match(activityReg);
      }
      if(!activities) activities = [];

      // At 处理
      var ats;
      if(item.d && item.d.length > 0) {
        var atRegStr = '@.*?\\s+';
        var atReg = new RegExp(atRegStr, 'gi');
        ats = item.d.match(atReg);
      }
      if(!ats) ats = [];

      // 保存活动
      var activitiesfuncs = _.map(activities, function(a) {
        return thunk(function(cb) {
          var t = a.replace(/#/g, '');
          Activity.findOneAndUpdate({ t:t }, { $set:{ t:t }, $inc:{ count:1 } }, { upsert:true, new:true }).exec(function(err, item) {
            cb(err, item);
          });
        });
      });

      // 发送通知
      var atfuncs = _.map(ats, function(a) {
        return thunk(function(cb) {
          var nickname = _.trim(a.replace(/@/g, ''));
          User.findOne({ nickname:nickname }).exec(function(err, user) {
            if(user) {
              var notice = new Notice({
                type:NoticeTypes.commodity_comment_at,
                user:user,
                partner:item.user,
                data:{ commodity:item.id }
              });

              notice.save(function(err) { cb(err, notice); });
            } else cb(null, null);
          });
        });
      });

      thunk.seq([
        // 保存活动
        activitiesfuncs,

        // 发送通知
        atfuncs,

        // 生成商品推广信息
        function(cb) { item.makePromotionData(function() { cb(null, null); }); },

        // 保存商品
        function(cb) { item.save(function(error) { cb(null, null); }); },

        // 加精加 10 分
        function(cb) {
          if(oldStatus === false && item.is_light === true) {
            var content = { user:item.user };
            var options = { upsert: true, new:true };
            Account.findOneAndUpdate(content, { $set:content, $inc:{ points:10 } }, options).exec(function(err, account) {
              cb(null, null);
            });
          } else cb(null, null);
        }
      ])(function(error, result) { res.redirect('/commodities/' + item.id + '?message=' + urlencode.encode('保存成功')); });
    });
  });

  // API 商品列表
  router.get('/api/commodities', utils.logged, function(req, res) {
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
        or.push({ t: { $regex:re } });
        or.push({ d: { $regex:re } });
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
        Commodity.find(cop).or(or).deepPopulate(commodityDeepItems).skip(start).limit(size).sort(sort).exec(function(err, items) {
          _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });
          cb(err, items);
        });
      }),
      thunk(function(cb) { Commodity.count(cop).or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item) {
        var tags = _.map(item.tags, function(t) { return t.t; });
        return [item.id, item.t, item.url, item.price, tags, item.is_selected, item.is_light, item.is_publish, item.user ? item.user.nickname : '', item.categories, item.at, item.force_top];
      });

      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  /* 商品搜索 */
  router.get('/api/commodities/search/:key/:page', function(req, res) {
    if(_.isEmpty(req.params.key)) { res.json({ items:null }); return; }

    var key = urlencode.decode(req.params.key);
    var page = parseInt(req.params.page);
    if(!page) page = 0;

    Commodity.search({
      filtered: {
        query: { query_string:{ query:key } },
        filter: { term:{ is_publish: true } }
      }
    }, { from:page * 40, size:40 }, function(err, results) {
      var items = results ? results.hits.hits : [];
      var total = results ? results.hits.total : 0;

      if(items && items.length > 0) _.each(items, function(item) { item.photos = _.sortBy(item.photos, 'position'); });

      res.json({ items: items, total:total });
    });
  });

  return router;
};

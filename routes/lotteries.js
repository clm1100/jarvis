/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var thunk = require('thunks')();
var ObjectID = require('mongodb').ObjectID;

/* 抽奖 */
module.exports = function(utils) {
  router.get('/lotteries', utils.logged, function(req, res) {
    res.render('lotteries/list', { current: req.user });
  });

  router.get('/lotteries/new', utils.logged, function(req, res) {
    res.render('lotteries/edit', { item:new Lottery(), current: req.user });
  });

  router.get('/lotteries/:id', utils.logged, function(req, res) {
    Lottery.findById(req.params.id).populate('from to').exec(function(err, item) {
      if (item) item.prizes = _.sortBy(item.prizes, 'order');

      thunk.all([
        thunk(function(cb) {
          // 输出奖池排序分配结果
          LotteryPoolRecord.aggregate([
            { $match: { lottery: new ObjectID(item.id) } },
            { $group: { _id: { day:'$day', order:'$order' }, num: { $sum:1 } } },
            { $sort: { _id:1 } }
          ], function(err, result) {
            var cc = [];
            var days = [];

            _.each(result, function(r) { if(days.indexOf(r._id.day) < 0) days.push(r._id.day); });

            _.each(days, function(d) {
              var dtotal = 0;
              var items = [];
              _.each(result, function(r) { if(r._id.day === d) dtotal += r.num; });
              _.each(item.prizes, function(p) {
                var ptotal = 0;
                _.each(result, function(r) { if(r._id.day === d && p.order === r._id.order) ptotal += r.num; });
                items.push({ order:p.order, count: ptotal });
              });

              cc.push({ day:d, count:dtotal, items:items });
            });

            cb(null, cc);
          });
        }),
        thunk(function(cb) {
          // 当前中奖结果
          LotteryReceiveRecord.aggregate([
            { $match:{ lottery:new ObjectID(item.id) } },
            { $group:{ _id:'$prize', num: { $sum:1 } } },
            { $sort:{ _id:1 } }
          ], function(err, result) {
            var cc = [];

            _.each(item.prizes, function(p) {
              _.each(result, function(r) { if(r._id === p.id) cc.push({ order:p.order, count: r.num }); });
            });

            cb(null, cc);
          });
        }),
        thunk(function(cb) {
          LotteryReceiveRecord.find({ lottery:req.params.id }).populate('user lottery').exec(function(err, result) {
            _.each(result, function(r) {
              _.each(item.prizes, function(p) { if(r.prize === p.id) r.order = p.order; });
            });

            cb(null, result);
          });
        })
      ])(function(error, results) {
        var ptotal = 0;
        _.each(results[0], function(p) { ptotal += p.count; });

        var rtotal = 0;
        _.each(results[1], function(r) { rtotal += r.count; });
        res.render('lotteries/edit', { item:item, pools:results[0], records:results[1], rtotal:rtotal, ptotal:ptotal, current:req.user, recordes:results[2] });
      });
    });
  });

  router.delete('/lotteries/:id', utils.logged, function(req, res) {
    Lottery.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, lottery: item.t + ' 已经删除' }); });
      else res.json({ status: 404, lottery: '没有找到要删除的对象' });
    });
  });

  router.post('/lotteries/:id', utils.logged, function(req, res) {
    Lottery.findById(req.params.id).exec(function(err, item) {
      if(!item) item = new Lottery();
      var body = req.body;
      item.t = body.t;
      item.prefix = body.prefix;
      item.num = body.num;
      item.start = utils.moment(body.start, 'YYYY年MM月DD日').format('MM/DD/YYYY');
      item.end = utils.moment(body.end, 'YYYY年MM月DD日').format('MM/DD/YYYY');
      item.close = utils.moment(body.close, 'YYYY年MM月DD日').format('MM/DD/YYYY');

      item.save(function(err) {
        res.render('lotteries/edit', { item:item, current: req.user, lottery:'保存成功' });
      });
    });
  });

  router.get('/api/lotteries', utils.logged, function(req, res) {
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
      or = [{ v: { $regex:re } }, { d:{ $regex:re } }];
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
      thunk(function(cb) { Lottery.find().or(or).skip(start).limit(size).sort(sort).exec(function(err, items) { cb(err, items); }); }),
      thunk(function(cb) { Lottery.count().or(or).exec(function(err, count) { cb(err, count); }); })
    ])(function(error, results) {
      var data = _.map(results[0], function(item, i) { return [item.id, item.t, item.prefix, item.start, item.end, item.close]; });
      var result = { draw:draw, recordsTotal:results[1], recordsFiltered:results[1], data:data };
      res.json(result);
    });
  });

  router.post('/api/prizes', utils.logged, function(req, res) {
    var body = req.body;
    var id = body.id;
    var pid = body.pid;
    var title = body.title;
    var order = body.order;
    var num = body.num;
    var type = body.type;

    Lottery.findById(id, function(err, l) {
      if(!l) { res.json({ item:null }); return; }

      var item = _.isEmpty(pid) ? new Prize() : null;
      if(!item) _.each(l.prizes, function(p) { if(p.id === pid) item = p; });
      item.title = title;
      item.order = order;
      item.num = num;
      item.type = type;

      if(!item) res.json({ item:null });
      else l.save(function(err) { res.json({ item:item }); });
    });
  });

  router.post('/prize/new', utils.logged, function(req, res) {
    var body = req.body;
    var id = body.id;
    var title = body.title;
    var order = body.order;
    var num = body.num;
    var type = body.type;

    var item = new Prize({ title:title, order:order, num:num, type:type });

    Lottery.findById(id, function(err, l) {
      l.prizes.push(item);
      l.save(function(err) {
        if(err) console.error(err);
        res.json({ item: item });
      });
    });
  });

  router.post('/prize/del', utils.logged, function(req, res) {
    var pid = req.body.pid;
    var id = req.body.id;
    Lottery.findById(id, function(err, l) {
      var index;
      for(var i = 0; i < l.prizes.length; i++) {
        if(l.prizes[i].id === pid) index = i;
      }

      l.prizes.splice(index, 1);
      l.save(function(err, data) {
        if(err) console.error(err);
        res.json({ ok: err ? 'no' : 'ok' });
      });
    });
  });

  router.get('/lotteries/:id/records', function(req, res) {
    var start = utils.moment().add('day', -1).startOf('day'); // set to 12:00 am today
    var end = utils.moment().add('day', -1).endOf('day'); // set to 23:59 pm today

    Lottery.findById(req.params.id).exec(function(err, item) {
      LotteryReceiveRecord.find({ lottery:req.params.id, at:{ $gte: start, $lt:end } }).populate('user').exec(function(err, rs) {
        var cc = _.map(rs, function(r) {
          var prize = _.filter(item.prizes, function(p) { return p.id === r.prize; })[0];
          return { order:prize.order, code: r.code, name:r.name, phone:r.phone, user:r.user.mobile, address:r.address, zipcode:r.zipcode, at:r.at, idnum:r.idnum };
        });

        res.json(cc);
      });
    });
  });

  return router;
};

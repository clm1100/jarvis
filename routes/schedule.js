/* jshint -W079 */
/* jshint -W020 */
/* eslint no-console: [2, { allow: ["info", "warn", "error"] }] */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var sizeOf = require('image-size');
var request = require('request');
var thunk = require('thunks')();
var schedule = require('node-schedule');
var ObjectID = require('mongodb').ObjectID;

/* 管理员 */
module.exports = function(utils) {
  // 每小时一次任务
  var perHourJob = schedule.scheduleJob('0 0 * * * *', function() {
    perHourTask();
  });

  function perHourTask() {
    var now = new Date();

    console.info(now + ' - 开始执行每小时任务');

    var start = utils.moment(now).startOf('hour');
    var end = utils.moment(now).endOf('hour');
    var time = utils.moment(now);

    PublishTask.find({ time:{ $gte:start.valueOf(), $lte:end.valueOf() } }, function(err, items) {
      if(items.length > 0) {
        var functions = _.map(items, function(item) {
          return thunk(function(cb) {
            item.remove(function(err) {
              var query = { _id:new ObjectID(item.cid) };
              var update = { $set:{ is_publish:true, at:time } };

              // 商品
              if(item.type === PublishTaskTypes.commodity.v) {
                Commodity.update(query, update, function(err, count) { cb(null, null); });
              } else if (item.type === PublishTaskTypes.topic.v) {
                Topic.update(query, update, function(err, count) { cb(null, null); });
              } else if (item.type === PublishTaskTypes.activity.v) {
                Activity.update(query, update, function(err, count) { cb(null, null); });
              } else if (item.type === PublishTaskTypes.ad.v) {
                Ad.update(query, update, function(err, count) { cb(null, null); });
              } else cb(null, null);
            });
          });
        });

        thunk.all(functions)(function(error, results) { console.info(new Date() + ' - 执行每小时任务成功'); });
      } else console.info(new Date() + ' - 执行每小时任务成功');
    });
  }

  // 每天一次任务
  var perDailyJob = schedule.scheduleJob('0 0 4 * * *', function() {
    perDailyTask();
  });

  function perDailyTask() {
    console.info(new Date() + ' - 开始执行每天任务');

    var lotteries;

    thunk.all([
      // 获取所有的抽奖信息
      thunk(function(cb) { Lottery.find({}, function(err, items) { lotteries = items; cb(null, null); }); }),

      // 清空奖池, 准备重新生成
      thunk(function(cb) { LotteryPoolRecord.remove({}, function(err) { cb(err, null); }); }),

      // 重新生成地址文件
      thunk(function(cb) {
        Region.find({ level:{ $lt:4 } }, function(err, items) {
          var l1 = {}, l2 = {}, l3 = {};
          _.each(items, function(item) {
            var data = { c:item.code, n:item.name, p:item.parent };
            if(item.level === 1) { l1[data.c] = { data:data, items:{} }; }
            if(item.level === 2) { l2[data.c] = { data:data, items:{} }; }
            if(item.level === 3) { l3[data.c] = { data:data }; }
          });

          _.each(l3, function(item) {
            var p = l2[item.data.p];
            if(p) p.items[item.data.c] = item;
          });

          _.each(l2, function(item) {
            var p = l1[item.data.p];
            if(p) p.items[item.data.c] = item;
          });

          // 生成地址文件并上传 UPYUN
          var fname = 'regions.js';
          var fpath = __dirname + '/../tmp/' + fname;
          var body = 'var all_regions = ' + JSON.stringify(l1) + ';';

          fs.writeFile(fpath, body, function(err) {
            if(err) {
              console.error(err);
              cb(err, null);
            } else {
              utils.upyun.uploadFile('/region/' + fname, fpath, 'text/javascript', true, function(err, result) {
                fs.unlink(fpath, function(err) { cb(err, null); });
              });
            }
          });
        });
      }),
      // 批量检查 Photo 的 ratio
      thunk(function(cb) {
        Commodity.find({}, function(err, items) {
          var cfunc = _.map(items, function(item) {
            return thunk(function(pcb) {
              if(!item.photos || item.photos.length < 1) { pcb(null, null); return; }
              var needSave = false;
              thunk.all(_.map(item.photos, function(p) {
                return thunk(function(scb) {
                  if(p.ratio && p.ratio > 0) { scb(null, null); return; }
                  var url = p.thumb.replace('!thumb', '!waterfall');
                  request.get({ url:url, encoding:null }, function(err, res, body) {
                    if(err || !body) { scb(null, null); return; }
                    var d = sizeOf(body);
                    if(d) { p.ratio = d.width / d.height; needSave = true; }
                    scb(null, null);
                  });
                });
              }))(function(error, results) { if(needSave) item.save(function(err) { pcb(null, null); }); else pcb(null, null); });
            });
          });

          thunk.all(cfunc)(function(error, results) { cb(null, null); });
        });
      })
    ])(function(error, results) {
      // 更新抽奖活动的奖池
      var lfuncs = _.map(lotteries, function(item) {
        return thunk(function(cb) {
          var today = new Date();
          var toStart = utils.moment(item.start).diff(today, 'days');

          // 排除过期的活动
          if(utils.moment(item.end).diff(today, 'days') < 0) { cb(null, null); return; }

          // 计算剩余的天数, 注意由于日期的开始和结束都算活动时间, 所以需要额外的 +1
          var days = utils.moment(item.end).diff(item.start, 'days') - Math.abs(toStart) + 1;
          var strategy = item.strategy;
          var datas = [];
          var pfuncs = _.map(item.prizes, function(p) {
            return thunk(function(pcb) {
              // 如果没中奖
              if(_.includes(strategy.normal, p.order)) { pcb(null, null); return; }

              // 获取已经发出的数量
              LotteryReceiveRecord.count({ lottery:item.id, prize: p.id }, function(err, count) {
                var total = p.num - count;
                // 如果奖品已经发完了
                if(total <= 0) { pcb(null, null); return; }
                var offset = toStart > 0 ? 0 : Math.abs(toStart);

                // 随机分配每天的奖池
                _.times(total, function(n) {
                  var day = _.random(1 + offset, days + offset);
                  datas.push({ day:day, order:p.order, used:false, lottery: new ObjectID(item.id) });
                });

                pcb(null, null);
              });
            });
          });

          thunk.all(pfuncs)(function(error, results) {
            if(datas.length > 0) {
              var bulk = LotteryPoolRecord.collection.initializeUnorderedBulkOp({ useLegacyOps: true });
              _.each(datas, function(item, i) { bulk.insert(item); });
              bulk.execute(function(err, result) { cb(null, null); });
            } else cb(null, null);
          });
        });
      });

      thunk.all(lfuncs)(function(error, results) {
        // 输出任务结果
        thunk.all([
          // 奖池信息
          thunk(function(cb) {
            // 输出奖池分配结果
            thunk.all(_.map(lotteries, function(l) {
              return thunk(function(lcb) {
                LotteryPoolRecord.aggregate([
                  { $match: { lottery: l.id } },
                  { $group: { _id: { day: '$day' }, num: { $sum:1 } } },
                  { $sort: { _id: 1 } }
                ], function(err, result) {
                  console.info('=====================================');
                  console.info(l.t);
                  console.info(result);
                  lcb(null, null);
                });
              });
            }))(function(error, results) { cb(null, null); });
          })
        ])(function(error, results) { console.info(new Date() + ' - 执行每天任务成功'); });
      });
    });
  }

  // 每周一次任务
  var perWeeklyJob = schedule.scheduleJob('0 0 5 * * 1', function() {
    perWeeklyTask();
  });

  function perWeeklyTask() {
    console.info(new Date() + ' - 开始执行每周任务');

    thunk.all([
      thunk(function(cb) {
        // 删除过期的通知 (二个月之前)
        var before2Months = utils.moment().add(-2, 'months');
        Notice.remove({ at:{ $lte:before2Months } }, function(err) {
          if(err) console.error(err);
          cb(err, null);
        });
      }),
      // 删除搜索记录中搜索次数小于等于 5 的记录
      thunk(function(cb) { SearchHistory.remove({ count:{ $lte:5 } }, function(err) { cb(err, null); }); })
    ])(function(error, results) { console.info(new Date() + ' - 执行每周任务成功'); });
  }
};

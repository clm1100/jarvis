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
var mime = require('mime');
var flash = require('connect-flash');
var xlsx = require('node-xlsx');
var Zip = require('adm-zip');
var uuid = require('uuid');

module.exports = function(utils) {
  router.get('/imports/:type', utils.logged, function(req, res) {
    var tip;

    switch(req.params.type) {
      case 'categories':
        tip = '数据文件为 ZIP 格式, 包含 list.xlsx 文件(注意! 仅支持 XLSX 格式) images 目录';
        break;
      default:
        tip = '数据文件为 xlsx 格式';
    }

    res.render('imports/index', { tip: tip, current: req.user });
  });

  /* 分类 */
  router.post('/imports/categories', utils.uploader.single('file'), utils.logged, function(req, res) {
    var file = req.file;
    var tab = xlsx.parse(file.path)[1];
    var total = 0;

    var nodes = [];

    _.each(tab.data, function(line, i) {
      if(i > 0 && line[12]) {
        path = line[12].split(',');

        if(line[0] && _.trim(line[0]).length > 0) nodes.push(_.trim(line[0]) + '|' + _.trimRight(path.slice(0, 1).join(','), ',') + ',' + '|' + '0');
        if(line[2] && _.trim(line[2]).length > 0) {
          nodes.push(_.trim(line[2]) + '|' + _.trimRight(path.slice(0, 2).join(','), ',') + ',' + '|' +
            _.trimRight(path.slice(0, 1).join(','), ',') + ',' + '|' + _.trim(line[0]));
        }
        if(line[4] && _.trim(line[4]).length > 0) {
          nodes.push(_.trim(line[4]) + '|' + _.trimRight(path.slice(0, 3).join(','), ',') + ',' + '|' +
            _.trimRight(path.slice(0, 2).join(','), ',') + ',' + '|' + _.trim(line[2]));
        }
        if(line[6] && _.trim(line[6]).length > 0) {
          nodes.push(_.trim(line[6]) + '|' + _.trimRight(path.slice(0, 4).join(','), ',') + ',' + '|' +
            _.trimRight(path.slice(0, 3).join(','), ',') + ',' + '|' + _.trim(line[4]));
        }
        if(line[8] && _.trim(line[8]).length > 0) {
          nodes.push(_.trim(line[8]) + '|' + _.trimRight(path.slice(0, 5).join(','), ',') + ',' + '|' +
            _.trimRight(path.slice(0, 4).join(','), ',') + ',' + '|' + _.trim(line[6]));
        }
        if(line[10] && _.trim(line[10]).length > 0) {
          nodes.push(_.trim(line[10]) + '|' + _.trimRight(path.slice(0, 6).join(','), ',') + ',' + '|' +
            _.trimRight(path.slice(0, 5).join(','), ',') + ',' + '|' + _.trim(line[8]));
        }
      }
    });

    nodes = _.uniq(nodes);
    total = 0;

    var functions = _.map(nodes, function(value) {
      return function(cb) {
        var kv = value.split('|');
        if(kv.length <= 2) { cb(null, null); return; }

        total++;
        if(kv[2] === '0') {
          // 根节点, 无父节点
          Category.findOne({ path:kv[1] }, function(err, c) {
            if(!c) {
              c = new Category({ t:kv[0], path:kv[1], parent:null });
              c.save(function(err) { cb(null, c); });
            } else cb(null, c);
          });
        } else {
          // 有父节点
          var pt = kv[3];
          var pl = kv[2];
          var options = { upsert: true, new:true };
          Category.findOneAndUpdate({ path:pl }, { $set:{ t:pt, path:pl } }, options, function(err, parent) {
            var title = kv[0];
            Category.findOneAndUpdate({ path:kv[1] }, { $set:{ t:title, path:kv[1], parent:parent.id } }, options, function(err, item) {
              cb(null, item);
            });
          });
        }
      };
    });

    thunk.all(functions)(function(error, results) {
      res.render('imports/index', { message: '共导入 ' + total + ' 条数据', current: req.user });
    });
  });

  /* 标签 */
  router.post('/imports/tags', utils.uploader.single('file'), utils.logged, function(req, res) {
    var file = req.file;

    var zip = new Zip(file.path);
    var root = path.join(__dirname, '../tmp/tags/');
    zip.extractAllTo(root, true);

    var tabs = xlsx.parse(root + 'list.xlsx');
    var total = 0;

    var list = [];

    _.each(tabs, function(t) {
      var taglist = _.find(TagList, function(item) { return item.v === t.name; });
      if(taglist) _.each(t.data, function(line, i) { if(i > 0) list.push({ line:line, list:taglist }); });
    });

    var functions = _.map(list, function(item) {
      return thunk(function(cb) {
        var line = item.line;
        var taglist = item.list;

        var title = _.trim(line[0]);
        var nicknames = line[1] ? line[1].split(',') : [];
        var associations = line[2] ? line[2].split(',') : [];
        var image = line[3] ? line[3] : null;
        var d = line[4] ? line[4] : null;

        var update = { list:taglist.v, t:title, synonyms:nicknames, associations:associations, d: d };
        var options = { upsert:true };

        thunk(function(scb) {
          if(image && image.length > 1) {
            var p = root + 'images/' + image;
            var filename = uuid.v4() + path.extname(p);
            var mimetype = mime.lookup(p);

            gm(p).autoOrient().write(p, function(err) {
              utils.upyun.uploadFile('/tag/cover/' + filename, p, mimetype, true, { 'x-gmkerl-exif-switch':true, 'x-gmkerl-rotate':'auto' }, function(err, result) {
                update.cover = filename;
                scb(err, null);
              });
            });
          } else scb(null, null);
        })(function(error, result) {
          total++;
          Tag.findOneAndUpdate({ list:taglist.v, t:title }, update, options, function(err, item) {
            cb(err, item);
          });
        });
      });
    });

    thunk.all(functions)(function(error, results) {
      res.render('imports/index', { message: '共导入 ' + total + ' 条数据', current: req.user });
    });
  });

  /* 区域 */
  router.post('/imports/regions', utils.uploader.single('file'), utils.logged, function(req, res) {
    var file = req.file;
    var tab = xlsx.parse(file.path)[0];
    var total = 0;

    if(tab.data && tab.data.length > 0) {
      Region.remove({}, function(err) {
        var bulk = Region.collection.initializeOrderedBulkOp();

        _.each(tab.data, function(line, i) {
          if(i > 0) {
            var code = _.trimEnd(line[0], '0');
            var pcode = _.trimEnd(line[2], '0');
            if(!pcode || pcode.length === 0) pcode = 0;
            bulk.insert({ code:parseInt(code), name:line[1], parent:parseInt(pcode), level:parseInt(line[6]) });
          }
        });

        bulk.execute(function(err, result) {
          res.render('imports/index', { message: '共导入 ' + tab.data.length + ' 条数据', current: req.user });
        });
      });
    } else {
      res.render('imports/index', { message: '共导入 0 条数据', current: req.user });
    }
  });

  return router;
};

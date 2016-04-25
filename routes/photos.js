/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var path = require('path');
var flash = require('connect-flash');
var UPYUN = require('upyun');
var thunk = require('thunks')();

/* 管理员 */
module.exports = function(utils) {
  router.get('/photos', utils.logged, function(req, res) {
    res.render('photos/list', { current: req.user });
  });

  router.get('/api/photos', utils.logged, function(req, res) {
    var upyun = new UPYUN('moretao-dev', 'moretao', 'zanmeichuanmei888', 'v0', 'legacy');
    var start = parseInt(req.query.start);
    var size = parseInt(req.query.size);
    var dir = req.query.dir;

    upyun.listDir(dir, function(err, result) {
      var total = result.data.files.length;
      var endpoint = start + size;

      if(endpoint > total) endpoint = total;

      var files = _.slice(result.data.files, start, endpoint);

      var data = [];

      var folderCount = 0;

      _.each(files, function(item, i) { if(item.type === 'folder') folderCount++; });

      if(folderCount === files.length) {
        var functions = _.map(files, function(file) {
          return thunk(function(cb) {
            upyun.listDir(dir + '/' + file.name, function(err, result) {
              result.dir = dir + '/' + file.name;
              cb(err, result);
            });
          });
        });

        thunk.all(functions)(function(error, results) {
          _.each(result, function(group) {
            if(group.data) {
              _.each(group.data.files, function(item) {
                data.push({ name:item.name, dir:group.dir, size:parseFloat(item.length / 1024).toFixed(1) + ' KB' });
              });
            }
          });

          res.json({ start:start, total:total, data:data });
        });
      } else {
        _.each(files, function(item) {
          data.push({ name:item.name, dir:dir, size:parseFloat(item.length / 1024).toFixed(1) + ' KB' });
        });

        res.json({ start:start, total:total, data:data });
      }
    });
  });

  router.delete('/api/photos', utils.logged, function(req, res) {
    var upyun = new UPYUN('moretao-dev', 'moretao', 'zanmeichuanmei888', 'v0', 'legacy');

    if(req.body.path) upyun.removeFile(req.body.path, function(err, result) { res.json(result); });
  });

  return router;
};

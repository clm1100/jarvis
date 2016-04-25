/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var gm = require('gm');
var flash = require('connect-flash');

module.exports = function(utils) {
  router.get('/datas/makefiles', utils.logged, function(req, res) {
    res.render('makefiles/index', { current: req.user });
  });

  router.post('/datas/makefiles/:type', utils.logged, function(req, res) {
    Region.find({}, function(err, items) {
      var datas = _.map(items, function(item) { return { code:item.code, name:item.name, parent:item.parent, level:item.level }; });
      var dataFile = __dirname + '/../tmp/regions.json';
      var body = JSON.stringify(datas);
      fs.writeFile(dataFile, body, function(err) {
        var msg = err ? err.message : '文件已经写入 ' + dataFile;
        res.render('makefiles/index', { current: req.user, message: msg });
      });
    });
  });

  return router;
};

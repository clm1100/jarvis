/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var _u = require('./utils');
var express = require('express');
var router = express.Router();
var path = require('path');
var flash = require('connect-flash');

/* 管理员 */
module.exports = function(utils) {
  router.post('/favorites', utils.logged, function(req, res) {
    var body = req.body;
    var id = body.id;
    var datas = { t:body.t, user:body.uid, is_open:body.is_open === 'true', commodities:body.cids };

    var cop = _u.isMongoId(id) ? { _id:id } : _.pick(datas, ['t', 'user']);
    Favorite.findOne(cop).exec(function(err, item) {
      if(!item) item = new Favorite(datas);
      else item = item.merge(item, datas);
      item.save(function(err) { res.json({ item:item }); });
    });
  });

  router.delete('/favorites/:id', utils.logged, function(req, res) {
    Favorite.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.t + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  return router;
};

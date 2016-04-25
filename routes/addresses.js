/* jshint -W079 */
/* jshint -W020 */

'use strict';
var _ = require('lodash');
var _u = require('./utils');
var express = require('express');
var router = express.Router();
var path = require('path');
var flash = require('connect-flash');

/* 地址 */
module.exports = function(utils) {
  router.get('/addresses/:id', utils.logged, function(req, res) {
    Address.findById(req.params.id).exec(function(err, item) { res.json(item); });
  });

  router.get('/regions/:code/subs', utils.logged, function(req, res) {
    Region.find({ parent:parseInt(req.params.code) }).exec(function(err, items) { res.json(items); });
  });

  router.post('/addresses', utils.logged, function(req, res) {
    var body = req.body;
    var id = body.id;
    var datas = {
      user:body.user,
      province:body.province ? parseInt(body.province) : null,
      city:body.city ? parseInt(body.city) : null,
      district:body.district ? parseInt(body.district) : null,
      street:body.street ? parseInt(body.street) : null,
      addr:body.addr,
      zip:body.zip,
      to:body.to,
      phone:body.phone,
      is_default:(body.is_default === 'true')
    };

    var cop = _u.isMongoId(id) ? { _id:id } : _.omit(datas, ['zip', 'is_default']);
    Address.findOne(cop).exec(function(err, item) {
      if(!item) item = new Address(datas);
      else item = _.merge(item, datas);
      item.save(function(err) { res.json({ item:item }); });
    });
  });

  router.delete('/addresses/:id', utils.logged, function(req, res) {
    Address.findById(req.params.id).exec(function(err, item) {
      if(item) item.remove(function(err) { res.json({ status:200, message: item.t + ' 已经删除' }); });
      else res.json({ status: 404, message: '没有找到要删除的对象' });
    });
  });

  return router;
};

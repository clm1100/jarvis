var _ = require('lodash');
var ObjectId = require('mongodb').ObjectID;

exports.replacePunctuations = function(str) {
  return (str && _.trim(str).length > 0) ? str.replace(/[\\pP+~$`^=|\d\[\]{}<>～!｀：［］＄＾＋＝\/｜＜＞￥×《》「」]/g, '') : '';
};

exports.isMongoId = function(id) {
  return _.isEmpty(id) ? false : ObjectId.isValid(id);
};

exports.isNotMongoId = function(id) {
  return _.isEmpty(id) ? true : !ObjectId.isValid(id);
};

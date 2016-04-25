/* eslint no-useless-escape:0 */

doT.templateSettings = {
  evaluate: /\[\[([\s\S]+?)\]\]/g, interpolate: /\[\[=([\s\S]+?)\]\]/g, encode: /\[\[!([\s\S]+?)\]\]/g,
  use: /\[\[#([\s\S]+?)\]\]/g, define: /\[\[##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\]\]/g,
  conditional: /\[\[\?(\?)?\s*([\s\S]*?)\s*\]\]/g, iterate: /\[\[~\s*(?:\]\]|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\]\])/g,
  varname: 'it', strip: false, append: true, selfcontained: false
};

var UPYUN_MORETAO = 'http://v0.api.upyun.com/moretao-dev';

(function($) {
  $.extend({
    put: function(url, data, callback, type) {
      if (jQuery.isFunction(data)) {
        type = type || callback;
        callback = data;
        data = null;
      }
      return jQuery.ajax({ type:'PUT', url:url, data:data, success:callback, dataType:type });
    },
    delete:function(url, data, callback, type) {
      if(jQuery.isFunction(data)) {
        type = type || callback;
        callback = data;
        data = null;
      }
      return jQuery.ajax({ type:'DELETE', url:url, data:data, success:callback, dataType:type });
    },
    removeHTMLTags: function(txt) {
      return $.trim(txt).replace(/<\/?[^>]*>/g, '');
    }
  });
})(jQuery);

$.fn.serializeObject = function() {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function() {
    if(o[this.name] !== undefined) {
      if(!o[this.name].push) o[this.name] = [o[this.name]];
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

$(document).ready(function() {
  moment.locale('zh-CN');
  $('.slick-container').slick();

  $('.datepicker').datepicker({ language:'zh-CN', orientation:'bottom' });
  $('#datetimepicker1').datetimepicker({
    locale:'zh-CN',
    format:'YYYY年MM月DD日 HH:mm'
  });

  $('input.switch').bootstrapSwitch({
    onColor: 'success',
    offColor: 'danger',
    size: 'small'
  });

  $('.multiselect').multiselect();
  lightbox.option({ resizeDuration: 200, wrapAround: true });
});

var storeWithExpiration = {
  set: function(key, val, exp) {
    localStorage.setItem(key, JSON.stringify({ val:val, exp:exp, time:new Date().getTime() / 1000 }));
  },
  get: function(key) {
    var info = JSON.parse(localStorage.getItem(key));
    if (!info) { return null; }
    if (new Date().getTime() / 1000 - info.time > info.exp) { return null; }
    return info.val;
  }
};

var MOODs = {
  dejected: '(＞﹏＜)',
  great: '<(￣3￣)>',
  happy: '(￣▽￣)',
  ashow: '︶ε╰',
  crazy: 'o(≧口≦)o',
  blackline: '("▔□▔)',
  surprised: 'Σ( ° △ °|||)',
  shrug: 'ㄟ( ▔, ▔ )ㄏ',
  friend: '””\\(￣ー￣) (￣ー￣)//””',
  cry: 'ಥ_ಥ'
};

// URL 校验
function urlify(text) {
  var regexp = new RegExp('(http[s]{0,1}|ftp)://[a-zA-Z0-9\\.\\-]+\\.([a-zA-Z]{2,4})(:\\d+)?(/[a-zA-Z0-9\\.\\-~!@#$%^&*+?:_/=<>]*)?', 'gi');
  var result = text.match(regexp);
  return result ? result[0] : text;
}

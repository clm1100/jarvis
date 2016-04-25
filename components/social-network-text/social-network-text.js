/**
 * Created by Mamba on 8/4/15.
 */
(function ($) {
  var defaults = {
    debug: true,
    atChar: '@',
    tagChar: '#',
    onTag: function(tag, txt) { return "<a href='" + txt + "'>" + tag + "</a>"; },
    onAt: function(at, txt) { return "<a href='" + txt + "'>" + at + "</a>"; }
  };

  $.sntext = function(text, options) {
    var opts = $.extend({}, defaults, options);
    var result;

    var tagRegStr = opts.tagChar + ".*?" + opts.tagChar;
    var tagReg = new RegExp(tagRegStr, "gi");

    if(opts.debug) {
      var tags = text.match(tagReg);
      console.log("Match: " + tags);
    }

    result = text.replace(tagReg, function(tag) {
      var source = $.trim(tag);
      var html = opts.onTag(source, source.replace(/#/g, ''));
      return html + "&nbsp";
    });

    var atRegStr = opts.atChar + ".*?\\s+";
    var atReg = new RegExp(atRegStr, "gi");

    if(opts.debug) {
      var ats = result.match(atReg);
      console.log("Match: " + ats);
    }

    result = result.replace(atReg, function(at) {
      var source = $.trim(at);
      var html = opts.onAt(source, source.replace(/@/, ''));
      return html + "&nbsp";
    });

    return result;
  };
})(jQuery);
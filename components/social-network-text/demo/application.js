$(function() {
  var source = $("#source-text").html();
  var text = $.sntext(source, {
    onTag: function(tag, txt) {
      return "<a href='/search/" + txt + "'>" + tag + "</a>";
    },
    onAt: function(at, txt) {
      return "<a href='/search/" + txt + "'>" + at + "</a>";
    }
  });
  $("#result-text").html(text);
});
/**
 * Created by Mamba on 7/23/15.
 */
var imagesGridSize = 40;
var imagesGrid;
var upyun = 'http://dev.images.moretao.com';

$(document).ready(function() {
  var container = $('#images-grid-container');
  setup().scroll();

  $('#dir_filter').change(function() {
    imagesGrid.masonry('destroy');
    imagesGrid = null;
    $('.grid-item').remove();
    var container = $('#images-grid-container');
    container.infinitescroll('binding', 'unbind');
    container.infinitescroll('destroy');
    container.data('infinitescroll', null);

    setup().scroll();
  });
});

function setup() {
  var container = $('#images-grid-container');
  return container.infinitescroll({
    debug          : false,
    behavior       : 'local',
    binder         : container,
    extraScrollPx  : 100,
    navSelector    : '#next',
    nextSelector   : '#next a',
    dataType       : 'json',
    path: function(page) {
      var dir = $('#dir_filter').val();
      // 后台需要开始的位置, page - 1 是为了从零开始, -2 是因为第一次滚动是手工执行的.
      var start = (page - 2) * imagesGridSize;
      return '/api/photos?start=' + start + '&size=' + imagesGridSize + '&dir=' + dir;
    },
    appendCallback : false
  }, function(json, opts) {
    json.prefix = upyun;
    var tpl = doT.template($('#grid-page-tpl').text());
    var html = $(tpl(json));
    var grid = $('#images-grid');
    grid.append(html);

    if(imagesGrid) {
      grid.imagesLoaded(function() {
        imagesGrid.masonry('appended', html);
      });
    } else {
      imagesGrid = grid.imagesLoaded(function() {
        grid.masonry({
          itemSelector: '.grid-item',
          isAnimated: true
        });
      });
    }
  });
}

function remove(name, dir) {
  var path = dir + '/' + name;
  var api = '/api/photos';

  $.ajax({
    url:api,
    type:'DELETE',
    data:{ path:path },
    success: function(data) {
      if(data.statusCode === 200) {
        var grid = $('#images-grid');
        var id = '#' + removeExt(name);
        grid.masonry('remove', $(id)).masonry('layout');
      }
    }
  });
}

function removeExt(str) {
  return str.replace(/\.[^/.]+$/, '');
}

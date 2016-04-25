/**
 * Created by Mamba on 7/23/15.
 */
var datatables;
$(document).ready(function() {
  var table = $('#main-datatables');

  if(table) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      processing: true,
      serverSide: true,
      ajax: '/api/tags',
      fnServerParams: function(data) {
        var filters = [];
        var list = $('#list_filter').val(); // 抓取条件value
        if(list && list.length > 0) filters.push({ i:1, value:list }); // 若只有一个条件，直接存入
        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name: '_id' },
        { name: 'list' },
        { name: 't' },
        { name: 'synonyms' },
        { name: 'associations' },
        { name: 'cover' },
        { name: 'limit' },
        { name: 'used' },
        { name: 'position' }
      ],
      columnDefs: [
        {
          targets: [5],
          render: function(data, type, row) {
            if(!data) return '';
            return '<a data-lightbox="' + row[0] + '" href="' + data.replace('!thumb', '') + '"><img src="' + data + '" width="24"></a>';
          }
        },
        {
          targets: [6],
          render: function(data, type, row) {
            return data === -1 ? '无限制' : data;
          }
        },
        {
          targets: [9],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick=\'destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });

    $('#list_filter').change(function() {
      datatables.draw();
    });
  }

  // 图标
  var coverInput = $('#cover-input');
  if(coverInput.length > 0) {
    var loader = new ImagePreview('#cover-input', {
      placeholder: '#cover-preview',
      height: '128px',
      callback: function() {
        $('#show-cover-link').attr('href', $('#cover-preview').find('> img').attr('src'));
      }
    });
  }
  changeImgPosition();
  // 排序
  var sortableList = $('#ads-list-group');
  if(sortableList.length > 0) {
    sortableList.sortable({
      sort: true, scroll: true,
      animation: 100,
      ghostClass: 'sortable-ghost',
      onEnd: function(evt) {
        var items = [];
        $.each($('.list-group-item'), function(i, item) {
          items.push({ id: $(item).attr('data-id'), position: ++i });
        });
        var list = $('#list_filter').val();
        var api = '/tags/' + list + '/sortable';
        $.post(api, { items:items }, function(data) {
          // 自动提交，无需反映
        });
      }
    });
  }
  // 添加图片publish-img-input
  $('#photo-input').change(function() {
    var api = '/api/photos/upload/signature';
    var file = document.getElementById('photo-input').files[0];
    var expiration = Math.floor(new Date().getTime() / 1000) + 86400;
    $.post(api, { filename:file.name, expiration:expiration }, function(data) {
      var form = new FormData();
      form.append('policy', data.policy);
      form.append('signature', data.signature);
      form.append('file', file);
      form.append('x-gmkerl-rotate', 'auto');

      $.ajax({
        url: UPYUN_MORETAO,
        type: 'POST',
        data:  form,
        mimeType: 'multipart/form-data',
        contentType: false,
        cache: false,
        processData:false,
        error:function(err) { console.error(err); },
        success: function(data, status, xhr) {
          var json = JSON.parse(data);
          var img = 'http://dev.images.moretao.com' + json.url + '!content';
          var fName = json.url.substring(9);
          var cid = $('#tagsId').val();
          var imgPosition = $('#sortable-list').children('div').length;
          $.post('/tags/insert/photos', { name:fName, position:imgPosition, id:cid }, function(data) {
            var removeImgBt = '<span id="remove_this" onclick="$(this).parent().remove();" class="fa fa-remove"></span>';
            var newImg = $('#commodities-img').clone();
            var pic = newImg.find('img');
            newImg.attr('id', null);
            pic.attr('data-id', data.id);
            pic.attr('src', img);
            pic.attr('width', '100%');
            pic.css('width', '100%');
            pic.addClass('list-group-item');
            newImg.prepend(removeImgBt);
            $('#sortable-list').append(newImg);
            newImg.show();
            $('#sortable-list').sortable('put', newImg);
            changeImgPosition();
          });
        }
      });
    });
  });
});

function sort() {
  var list = $('#list_filter').val();
  if($.trim(list).length > 0) window.location.href = '/tags/' + list + '/sortable';
  else BootstrapDialog.alert('请选择一个列表分类');
}
function create() { window.location.href = '/tags/new'; }
function edit(id) { window.open('/tags/' + id, '_blank'); }
function reset() { $('#list_filter').val(''); datatables.draw(); }

function destroy(id) {
  $.ajax({
    url:'/tags/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

function changeImgPosition() {
  var sortableList = $('#sortable-list');
  if(sortableList.length > 0) {
    var commodityid = sortableList.attr('data-commodityid');
    sortableList.sortable('destroy');
    sortableList.sortable({
      sort: true,
      scroll: true,
      animation: 100,
      ghostClass: 'sortable-ghost',
      onEnd: function(evt) {
        var list = [];
        $.each($('#sortable-list').find('.list-group-item'), function(i, item) {
          if(i === 0) {
            var main = $('#commodity-main-img');
            main.find('img').attr('src', $(item).attr('src'));
          }
          list.push({ id: $(item).attr('data-id'), position: ++i });
        });
        var api = '/tags/' + commodityid + '/photos/position';
        $.post(api, { list:list }, function(data) {

        });
      }
    });
  }
}

// 删除图片
function deleteImg(photoId) {
  var tagsId = $('#sortable-list').attr('data-commodityid');
  var url = '/tags/' + tagsId + '/photo/' + photoId;
  $.post(url, function(data) {
    $.each($('#sortable-list').find('.list-group-item'), function(i, item) {
      if(i === 0) {
        var main = $('#commodity-main-img');
        main.find('img').attr('src', $(item).attr('src'));
      }
    });
    changeImgPosition();
  });
}

// 显示添加 Ads
function showAddAds() {
  $('#add-ad-modal').modal('show');
  $('#ad-search-input').val('');
  $('#ads-result-list').find('> ul').html('');
}

// 保存 Ads
function saveAds() {
  var id = url(-1, window.location.href);
  var ads = $('#ads-result-list input[name=ads]:checked').map(function() { return $(this).val(); }).get();
  var currents = $('#ads-list-group input[name=ads]:checked').map(function() { return $(this).val(); }).get();

  ads = currents.concat(ads);
  var tpl = doT.template($('#ads-result').text());
  var api = '/tags/' + id + '/ads';
  $.post(api, { ads:ads }, function(data) {
    $('#ads-list-group').html(tpl(data));
    $('#add-ad-modal').modal('hide');
  });
}

// 搜索 Ads
function searchAds() {
  var list = $('#ads-list-select option:selected').val();
  var keyword = $('#ad-search-input').val();
  if($.trim(keyword).length < 1) return false;

  var tpl = doT.template($('#ads-tpl').text());

  var api = '/api/ads/search/' + keyword + '/0';
  $.get(api, function(data) {
    $('#ads-result-list').find('ul').append(tpl(data));
  });

  return true;
}

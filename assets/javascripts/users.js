/* global all_regions */
/**
 * Created by Mamba on 7/23/15.
 */
var datatables;
var regions;

$(document).ready(function() {
  var table = $('#main-datatables');

  if(table) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      processing: true,
      serverSide: true,
      ajax: '/api/users',
      columns: [
        { name: '_id' },
        { name: 'nickname' },
        { name: 'mobile' },
        { name: 'email' }
      ],
      columnDefs: [
        {
          targets: [4],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick="destroy(\'' + row[0] + '\')" class="btn btn-danger hide">删除</button>';
          }
        }
      ]
    });
  }

  var coverInput = $('#cover-input');
  if(coverInput.length > 0) {
    var loader = new ImagePreview('#cover-input', {
      placeholder: '#cover-preview',
      height: '128px'
    });
  }
});

function create() { window.location.href = '/users/new'; }
function edit(id) { window.open('/users/' + id, '_blank'); }

function destroy(id) {
  BootstrapDialog.show({
    title: '此操作不可恢复!',
    message: '确认要删除这个用户吗?',
    buttons: [{
      label: '取消',
      action: function(dialog) { dialog.close(); }
    }, {
      label: '删除',
      action: function(dialog) {
        $.ajax({
          url:'/users/' + id,
          type:'DELETE',
          success: function(data) {
            $('.alert strong').html(data.message);
            $('.alert').show().fadeIn();
            dialog.close();
            if(datatables) datatables.draw();
            else history.go(-1);
          }
        });
      }
    }]
  });
}

function saveFavorite() {
  var id = url(-1, window.location.href);
  var fid = $('#favorite-id-input').val();
  var t = $('#favorite-name-input').val();
  if($.trim(t).length < 1) return;

  var cids = $.map($('input[name=commodities]:checked'), function(c) { return c.value;});

  var api = '/favorites';
  $.post(api, { id:fid, uid:id, t:t, cids:cids }, function(data) {
    $('#edit-favorite-modal').modal('hide');
    location.reload();
  });
}

function editFavorite(fid) {
  $('#commodity-result-list').find('ul').html('');
  $('#edit-favorite-modal').modal('show');
  var lis = $('#' + fid).find('li');
  $('#favorite-id-input').val(fid);

  var tpl = doT.template($('#commodities-tpl').text());

  $.each(lis, function(i, li) {
    li = $(li);
    if(i === 0) {
      $('#favorite-name-input').val(li.attr('data-t'));
    } else {
      var html = tpl({ items:[{ id:li.attr('data-id'), t:li.attr('data-t') }], checked:true });
      $('#commodity-result-list').find('ul').append(html);
    }
  });
}

function destroyFavorite() {
  var fid = $('#favorite-id-input').val();
  if(!fid || fid.length < 1) return;

  $.ajax({
    url:'/favorites/' + fid,
    type:'DELETE',
    success: function(data) {
      location.reload();
    }
  });
}

function getSubRegions(parent) {
  var list = {};
  $.ajax({
    type : 'get',
    url : '/regions/' + parent + '/subs',
    async : false,
    success : function(data) {
      $.each(data, function(i, d) { list[d.code] = { data:{ c:d.code, n:d.name, p:d.parent } }; });
    }
  });
  return list;
}

function onAddressSelectChenge(level) {
  var selects = $('#address-form select');
  for (var i = 0; i < selects.length; i++) { if((i + 1) > level) $(selects[i]).val(''); }

  var list = {};
  var l1 = $(selects[0]).val();
  var l2 = $(selects[1]).val();
  var l3 = $(selects[2]).val();
  var l4 = $(selects[3]).val();

  if(level === 1) list = all_regions[l1].items;
  if(level === 2) list = all_regions[l1].items[l2].items;
  if(level === 3) {
    var parent = $(selects[level - 1]);
    list = getSubRegions(parent.val());
  }

  var node = $(selects[level]);
  var options = [];
  var first = node.find('option:first').html();
  options.push('<option value="">' + first + '</option>');
  $.each(list, function(l) {
    var it = list[l];
    options.push('<option value="' + it.data.c + '">' + it.data.n + '</option>');
  });

  node.html(options.join(''));
}

function editAddress(fid) {
  $('#edit-address-modal-body').html('');
  var tpl = doT.template($('#address-tpl').text());
  if(fid && fid.length > 0) {
    $.get('/addresses/' + fid, function(data) {
      var html = tpl(data);

      $('#edit-address-modal-body').html(html);
      $('#edit-address-modal').modal('show');
    });
  } else {
    var html = tpl({});

    $('#edit-address-modal-body').html(html);
    $('#edit-address-modal').modal('show');
  }
}

function saveAddress() {
  var params = $('#address-form').serializeObject();

  if($.trim(params.province).length < 1 || $.trim(params.city).length < 1) {
    BootstrapDialog.show({ message: '请填写必要的信息!' });
  } else {
    var api = '/addresses';
    $.post(api, params, function(data) { location.reload(); });
  }
}

function destroyAddress() {
  var aid = $('#address-id-input').val();
  if(!aid || aid.length < 1) return;

  $.ajax({
    url:'/addresses/' + aid,
    type:'DELETE',
    success: function(data) {
      location.reload();
    }
  });
}

// 搜索相关商品
function searchCommodities() {
  var keyword = $('#commodity-search-input').val();
  if($.trim(keyword).length < 2) return false;

  var tpl = doT.template($('#commodities-tpl').text());

  var api = '/api/topics/search/' + keyword + '/0';
  $.get(api, function(data) {
    var html = tpl(data);
    $('#commodity-result-list').find('ul').append(html);
  });
  return true;
}

// 搜索标签
function searchTags(list) {
  var keyword = $('#tag-search-input').val();
  if($.trim(keyword).length < 1) return false;

  var tpl = doT.template($('#tags-tpl').text());

  var api = '/api/tags/search/' + list + '/' + keyword + '/0';
  $.get(api, function(data) {
    var html = tpl(data);
    $('#tag-result-list').find('ul').append(html);
  });

  return true;
}

// 添加标签
function addTags() {
  var ids = $('#tag-result-list').find('input[name=tags]:checked').map(function(i, ele) {
    return $(ele).parent();
  }).get();

  $('#tags-list-group').append(ids);
  $('#add-tag-modal').modal('hide');
}

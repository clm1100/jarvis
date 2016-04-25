/**
 * Created by Mamba on 7/23/15.
 */
var datatables, groupNames = typeof(groupNames) !== undefined ? groupNames : [];
$(document).ready(function() {
  var table = $('#main-datatables');

  if(table) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      processing: true,
      serverSide: true,
      ajax: '/api/fragments',
      fnServerParams: function(data) {
        var filters = [];
        var group = $('#group_filter').val();
        if(group && group.length > 0) filters.push({ i:1, value:group }); // 若只有一个条件，直接存入
        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name: '_id' },
        { name: 'group' },
        { name: 'desc' },
        { name: 'order' }
      ],
      columnDefs: [
        {
          targets: [4],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick="destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });
  }

  $('#group_filter').change(function() { datatables.draw(); });

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
        var api = '/fragments/' + list + '/sortable';
        $.post(api, { items:items }, function(data) {
          // 自动提交，无需反映
        });
      }
    });
  }

  // 提示
  var groupInput = $('form input[name=group]');
  if(groupInput.length > 0) {
    groupInput.typeahead({
      source:groupNames,
      autoSelect:true
    });
  }
});

function create() { window.location.href = '/fragments/new'; }
function edit(id) { window.open('/fragments/' + id, '_blank'); }
function destroy(id) {
  $.delete('/fragments/' + id, function(data) {
    var alert = $('.alert');
    alert.find('strong').html(data.message);
    alert.show().fadeIn();
    if(datatables) datatables.draw();
    else history.go(-1);
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
  var api = '/fragments/' + id + '/ads';
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
  $.get(api, function(data) { $('#ads-result-list').find('ul').append(tpl(data)); });

  return true;
}

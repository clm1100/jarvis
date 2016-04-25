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
      ajax: '/api/tabs',
      fnServerParams: function(data) {
        var filters = [];

        var type = $('#type_filter').val(); // 抓取条件value
        if(type && type.length > 0) filters.push({ i:3, value:type }); // 若只有一个条件，直接存入

        var startDate = $('#start_date_filter').val(); // 抓取开始时间
        var endDate = $('#end_date_filter').val(); // 抓取结束时间

        var start = moment(startDate, 'YYYY年MM月DD日').format('MM/DD/YYYY');
        var end = moment(endDate, 'YYYY年MM月DD日').format('MM/DD/YYYY');

        if(startDate && startDate.length > 0) filters.push({ i:4, value:start }); // 若只有一个条件，直接存入
        if(endDate && endDate.length > 0) filters.push({ i:5, value:end }); // 若只有一个条件，直接存入

        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name: '_id' },
        { name: 't' },
        { name: 'link' },
        { name: 'type' },
        { name: 'start' },
        { name: 'end' }
      ],
      columnDefs: [
        {
          targets: [5],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick=\'destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });

    $('#type_filter, #start_date_filter, #end_date_filter').change(function() {
      datatables.draw();
    });
  }

  // 头图
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
        var api = '/tabs/' + list + '/sortable';
        $.post(api, { items:items }, function(data) {
            // 自动提交，无需反映
        });
      }
    });
  }
});

function reset() { history.go(0); }

function create() { window.location.href = '/tabs/new'; }
function edit(id) {
  window.open('/tabs/' + id, '_blank');
}
function sort() {
  var num = $('#type_filter').val();
  window.location.href = '/tabs/sortable?num=' + num;
}

function destroy(id) {
  $.ajax({
    url:'/tabs/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
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

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
      ajax: '/api/ads',
      fnServerParams: function(data) {
        var filters = [];

        var type = $('#type_filter').val(); // 抓取条件value
        if(type && type.length > 0) filters.push({ i:4, value:type }); // 若只有一个条件，直接存入

        var refType = $('#ref_type_filter').val(); // 抓取条件value
        if(refType && refType.length > 0) filters.push({ i:5, value:refType }); // 若只有一个条件，直接存入

        var startDate = $('#start_date_filter').val();// 抓取开始时间
        var endDate = $('#end_date_filter').val();// 抓取结束时间

        var start = moment(startDate, 'YYYY年MM月DD日').format('MM/DD/YYYY');
        var end = moment(endDate, 'YYYY年MM月DD日').format('MM/DD/YYYY');

        if(startDate && startDate.length > 0) filters.push({ i:6, value:start }); // 若只有一个条件，直接存入
        if(endDate && endDate.length > 0) filters.push({ i:7, value:end }); // 若只有一个条件，直接存入

        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name: '_id' },
        { name: 'd' },
        { name: 'link' },
        { name: 'cover' },
        { name: 'type', visible: false },
        { name: 'ref_type', visible: false },
        { name: 'start', visible: false },
        { name: 'end', visible: false }
      ],
      columnDefs: [
        {
          targets: [3],
          render: function(data, type, row) {
            return "<a data-lightbox='" + row[0] + "' href='" + data.replace('!waterfall', '') + "'><img src='" + data + "'></a>";
          }
        },
        {
          targets: [8],
          render: function(data, type, row) {
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>&nbsp;" +
              "<button onclick=\"destroy('" + row[0] + "')\" class='btn btn-danger'>删除</button>";
          }
        }
      ]
    });

    $('#type_filter,#ref_type_filter, #start_date_filter, #end_date_filter').change(function() {
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
  var sortableList = $('#sortable-list');
  if(sortableList.length > 0) {
    sortableList.sortable({
      sort: true,
      scroll: true,
      animation: 100,
      ghostClass: 'sortable-ghost',
      onEnd: function(evt) {
        var list = [];
        $.each($('.list-group-item'), function(i, item) {
          list.push({ id:$(item).attr('data-id'), position:++i });
        });
        var api = '/ads/sortabe';
        $.post(api, { list:list }, function(data) {
          // 自动提交，无需反映
        });
      }
    });
  }
});

function reset() { history.go(0); }

function create() { window.location.href = '/ads/new'; }
function edit(id) {
  window.open('/ads/' + id, '_blank');
}
function sort() {
  var num = $('#type_filter').val();
  window.location.href = '/ads/sortable?num=' + num;
}

function destroy(id) {
  $.ajax({
    url:'/ads/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

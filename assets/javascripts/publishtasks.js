/**
 * Created by Mamba on 7/23/15.
 */

var datatables;
var ueTopics;

$(document).ready(function() {
  var table = $('#main-datatables');

  if(table) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      processing: true,
      serverSide: true,
      order: [[3, 'desc']],
      ajax: '/api/publishtasks',
      columns: [
        { name: '_id' },
        { name: 'cid' },
        { name: 't' },
        { name: 'type' },
        { name: 'time' }
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
  }
});


// 创建
function create() { window.location.href = '/publishtasks/new'; }

// 编辑
function edit(id) { window.open('/publishtasks/' + id, '_blank'); }
function reset() { $('#is_publish_filter, #start_date_filter, #end_date_filter').val(''); datatables.draw(); }

function destroy(id) {
  $.ajax({
    url:'/publishtasks/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

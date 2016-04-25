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
      order: [[2, 'desc']],
      ajax: '/api/search_histories',
      columns: [
        { name: '_id' },
        { name: 't' },
        { name: 'count' }
      ],
      columnDefs: [
        {
          targets: [3],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick=\'destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });
  }
});

function create() { window.location.href = '/search_histories/new'; }
function edit(id) { window.open('/search_histories/' + id, '_blank'); }

function destroy(id) {
  $.ajax({
    url:'/search_histories/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

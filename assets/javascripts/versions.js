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
      order: [[3, 'desc']],
      ajax: '/api/versions',
      columns: [
        { name: 'id' },
        { name: 'v' },
        { name: 'd' },
        { name: 'url' },
        { name: 'active' },
        { name: 'force' },
        { name: 'at' }
      ],
      columnDefs: [
        {
          targets: [6],
          render: function(data, type, row) { return moment(data).fromNow();}
        },
        {
          targets: [7],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick="destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });
  }
});

function create() { window.location.href = '/versions/new'; }
function edit(id) { window.location.href = '/versions/' + id; }
function destroy(id) {
  $.ajax({
    url:'/versions/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

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
      ajax: '/api/invitation_codes',
      columns: [
        { name: '_id' },
        { name: 'code' },
        { name: 'used' }
      ],
      columnDefs: [
        {
          targets: [2],
          render: function(data, type, row) { return data ? '是' : '否'; }
        },
        {
          targets: [3],
          render: function(data, type, row) {
            return '<button onclick="destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });
  }
});

function destroy(id) {
  $.ajax({
    url:'/invitation_codes/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

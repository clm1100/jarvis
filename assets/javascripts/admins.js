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
      ajax: '/api/admins',
      columns: [
        { name: '_id' },
        { name: 'nickname' },
        { name: 'mobile' },
        { name: 'email' },
        { name: 'last_sign_in_at' }
      ],
      columnDefs: [
        {
          targets: [4],
          render: function(data, type, row) { return moment(data).fromNow();}
        },
        {
          targets: [5],
          render: function(data, type, row) {
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>&nbsp;" +
              "<button onclick=\"destroy('" + row[0] + "')\" class='btn btn-danger'>删除</button>";
          }
        }
      ]
    });
  }
});

function create() { window.location.href = '/admins/new'; }
function edit(id) { window.open('/admins/' + id, '_blank'); }
function destroy(id) {
  $.ajax({
    url:'/admins/' + id,
    type:'DELETE',
    success:function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

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
      ajax: '/api/postcards',
      columns: [
        { name: 'id' },
        { name: 't' },
        { name: 'num' },
        { name: 'start' },
        { name: 'end' },
        { name: 'close' }
      ],
      columnDefs: [
        { targets: [3], render: function(data, type, row) { return moment(data).fromNow();} },
        { targets: [4], render: function(data, type, row) { return moment(data).fromNow();} },
        { targets: [5], render: function(data, type, row) { return moment(data).fromNow();} },
        {
          targets: [6],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick=\'destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });
  }
  $('#mxp_btn_add').click(function() {
    mxpAddPlans();
  });
});

function create() { window.location.href = '/postcards/new'; }
function edit(id) { window.open('/postcards/' + id, '_blank'); }
function destroy(id) {
  $.ajax({
    url:'/postcards/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

function mxpAddPlans() {
  var content = $('<div class="col-sm-4"><input type="text" class="form-control" name="planskey" placeholder="明信片" value=""></div>' +
    '<div class="col-sm-6"><input type="text"  class="form-control" name="planst" placeholder="个数" value=""></div>');
  $('#mxp_plans').append(content);
}

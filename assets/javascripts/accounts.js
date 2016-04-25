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
      ajax: '/api/accounts',
      columns: [
        { name: '_id' },
        { name: 'nickname' },
        { name: 'points' }
      ],
      columnDefs: [
        {
          targets: [3],
          render: function(data, type, row) {
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>&nbsp;" +
              "<button onclick=\"destroy('" + row[0] + "')\" class='btn btn-danger'>删除</button>";
          }
        }
      ]
    });
  }
});

function create() { window.location.href = '/accounts/new'; }
function edit(id) { window.open('/accounts/' + id, '_blank'); }
function destroy(id) {
  $.ajax({
    url:'/accounts/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

function showUserSelectModal() {
  var modal = $('#user-select-modal');
  modal.find('input[name=nickname]').val('');
  modal.find('p.user').remove();
  modal.modal('show');
}

function searchUsers() {
  var tpl = doT.template($('#users-tpl').text());
  var modal = $('#user-select-modal');
  var key = modal.find('input[name=nickname]').val();
  var api = '/api/users/search/' + key + '/0';
  $.get(api, function(data) {
    var html = tpl(data);
    modal.find('.modal-body').append(html);
  });
}

function selectUser(uid, nickname) {
  $('form input[name=user]').val(uid);
  $('form input[name=nickname]').val(nickname);
  $('#user-select-modal').modal('hide');
}

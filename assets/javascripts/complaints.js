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
      ajax: '/api/complaints',
      columns: [
        { name: 'id' },
        { name: 'nickname' },
        { name: 'commodity' },
        { name: 'reason' },
        { name: 'at' },
        { name: 'processed' }
      ],
      columnDefs: [
        {
          targets: [4],
          render: function(data, type, row) { return moment(data).fromNow();}
        },
        {
          targets: [6],
          render: function(data, type, row) {
            return '<button onclick="edit(\'' + row[0] + '\')" class="btn btn-info">编辑</button>&nbsp;' +
              '<button onclick="destroy(\'' + row[0] + '\')" class="btn btn-danger">删除</button>';
          }
        }
      ]
    });
  }
});

function create() { window.location.href = '/complaints/new'; }
function edit(id) { window.open('/complaints/' + id, '_blank'); }
function destroy(id) {
  $.ajax({
    url:'/complaints/' + id,
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
  var modal = $('#user-select-modal');

  $('form input[name=user]').val(uid);
  $('form input[name=user-nickname]').val(nickname);

  modal.modal('hide');
}

function showCommoditySelectModal() {
  var modal = $('#commodity-select-modal');
  modal.find('input[name=t]').val('');
  modal.find('p.commodity').remove();
  modal.modal('show');
}

// 搜索相关商品
function searchCommodities() {
  var tpl = doT.template($('#commodities-tpl').text());
  var modal = $('#commodity-select-modal');
  var key = modal.find('input[name=t]').val();
  var api = '/api/commodities/search/' + key + '/0';
  $.get(api, function(data) {
    var html = tpl(data);
    modal.find('.modal-body').append(html);
  });
}

function selectCommodity(cid, t) {
  var modal = $('#commodity-select-modal');

  $('form input[name=commodity]').val(cid);
  $('form input[name=commodity-t]').val(t);

  modal.modal('hide');
}

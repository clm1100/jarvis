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
      ajax: '/api/lotteries',
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
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>&nbsp;" +
              "<button onclick=\"destroy('" + row[0] + "')\" class='btn btn-danger hide'>删除</button>";
          }
        }
      ]
    });
  }

  var prizeEditForm = $('#prize-edit-form');
  if(prizeEditForm && prizeEditForm.length > 0) {
    prizeEditForm.submit(function() {
      savePrize();
      return false;
    });
  }
});

$(function() {
  $('#example_lottery').dataTable();
});

function create() { window.location.href = '/lotteries/new'; }
function edit(id) { window.open('/lotteries/' + id, '_blank'); }
function destroy(id) {
  $.ajax({
    url:'/lotteries/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

function editPrize(pid, order, title, num, type) {
  var id = url(-1, window.location.href);

  $('#prize-edit-modal').modal('show');
  var form = $('#prize-edit-form');

  form.find('input[name=id]').val(id);
  form.find('input[name=pid]').val(pid);
  form.find('input[name=title]').val(title);
  form.find('select[name=order]').val(order);
  form.find('input[name=num]').val(num);
  form.find('select[name=type]').val(type);
}

function savePrize() {
  $('#prize-edit-modal').modal('hide');

  var params = $('#prize-edit-form').serializeObject();

  $.post('/api/prizes', params, function(data) {

  });

  return false;
}

function addPrize() {
  $('#prize-add-modal').modal('show');
}

function ajaxadd(id) {
  var url = '/prize/new';
  var form = $('#prize-add-form');
  var data = {
    id:id,
    title:form.find('input[name=title]').val(),
    order:form.find('select[name=order]').val(),
    num:form.find('input[name=num]').val(),
    type:form.find('select[name=type]').val()
  };
  $.post(url, data, function(data) { /* 不做处理 */});
  location.reload();
}

function destroyPrize(pid, id) {
  var url = '/prize/del';
  var data = {
    pid:pid,
    id:id
  };

  BootstrapDialog.show({
    title: '此操作不可恢复!',
    message: '确认要删除这个攻略吗?',
    buttons: [{
      label: '取消',
      action: function(dialog) { dialog.close();}
    }, {
      label: '删除',
      action: function(dialog) {
        $.ajax({
          url:url,
          type:'POST',
          data:data,
          success: function() {
            dialog.close();
            location.reload();
          }
        });
      }
    }]
  });
}

function editorPrize() {
  $('#prize-edit-form').submit();
  location.reload();
}

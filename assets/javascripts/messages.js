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
      order: [[4, 'desc']],
      ajax: '/api/messages',
      columns: [
        { name: '_id' },
        { name: 'from' },
        { name: 'to' },
        { name: 'msg' },
        { name: 'at' }
      ],
      columnDefs: [
        {
          targets: [3],
          render: function(data, type, row) {
            return '<div style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;-webkit-text-overflow:ellipsis;width:200px;">' + data + '</div>';
          }
        },
        {
          targets: [4],
          render: function(data, type, row) { return moment(data).fromNow();}
        },
        {
          targets: [5],
          render: function(data, type, row) {
            return '<button onclick="reply(\'' + row[0] + '\')" class="btn btn-info">回复</button>';
          }
        }
      ]
    });
  }

  if($('#message-image-input').length > 0) {
    var loader = new ImagePreview('#message-image-input', { placeholder: '#message-image', width: '128px' });
  }
});

function create() { window.location.href = '/messages/new'; }
function edit(id) { window.location.href = '/messages/' + id; }
function reply(id) {
  window.open('/messages/' + id + '/reply', '_blank');
}

function destroy(id) {
  $.ajax({
    url:'/messages/' + id,
    type:'DELETE',
    success: function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

function showUserSelectModal(type) {
  var modal = $('#user-select-modal');
  modal.find('input[name=type]').val(type);
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
  var type = modal.find('input[name=type]').val();

  if(type === 'to') {
    $('form input[name=to]').val(uid);
    $('form input[name=to-nickname]').val(nickname);
  } else {
    $('form input[name=from]').val(uid);
    $('form input[name=from-nickname]').val(nickname);
  }

  modal.modal('hide');
}

function sendMessage(fid, tid) {
  var msg = $('input[name=msg]').val();
  var photo = $('#message-image-input');

  if(msg.length < 1 && photo.val().length < 1) return;

  if(photo.val().length > 0) {
    var api = '/api/message/upload/signature';
    var file = document.getElementById('message-image-input').files[0];
    var expiration = Math.floor(new Date().getTime() / 1000) + 86400;

    $.post(api, { filename:file.name, expiration:expiration, fid:fid }, function(data) {
      var form = new FormData();
      form.append('policy', data.policy);
      form.append('signature', data.signature);
      form.append('file', file);
      form.append('x-gmkerl-rotate', 'auto');

      $.ajax({
        url: UPYUN_MORETAO,
        type: 'POST',
        data:  form,
        mimeType: 'multipart/form-data',
        contentType: false,
        cache: false,
        processData:false,
        success: function(data, status, xhr) {
          var json = JSON.parse(data);
          $.post('/api/messages/reply', { from:fid, to:tid, msg:msg, photo:json.url }, function(data) {
            history.go(0);
          });
        }
      });
    });
  } else {
    $.post('/api/messages/reply', { from:fid, to:tid, msg:msg }, function(data) {
      history.go(0);
    });
  }
}

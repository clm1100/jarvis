/**
 * Created by Mamba on 7/23/15.
 */

var datatables;
var ueActivity;

$(document).ready(function() {
  var table = $('#main-datatables');

  if(table.length > 0) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      processing: true,
      serverSide: true,
      ajax: '/api/activities',
      order: [[3, 'desc']],
      fnServerParams: function(data) {
        var filters = [];
        var isPublish = $('#is_publish_filter').val(); // 抓取条件value
        if(isPublish && isPublish.length > 0) filters.push({ i:4, value:isPublish }); // 若只有一个条件，直接存入

        var startDate = $('#start_date_filter').val(); // 抓取开始时间
        var endDate = $('#end_date_filter').val(); // 抓取结束时间

        if(startDate.length > 0 && endDate.length > 0) { // 开始和结束的时间必须都有
          var start = moment(startDate, 'YYYY年MM月DD日').format('MM/DD/YYYY'); // 转换成无中文字符的日期
          var end = moment(endDate, 'YYYY年MM月DD日').format('MM/DD/YYYY');
          filters.push({ i:3, value:{ start:start, end:end } }); // push进去，必须是开始和结束的时间都有
        }

        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name: '_id' },
        { name: 't' },
        { name: 'cover' },
        { name: 'at' },
        { name: 'end' },
        { name: 'limit' },
        { name: 'count' },
        { name: 'is_publish' },
        { name: 'position' }
      ],
      columnDefs: [
        {
          targets: [2],
          render: function(data, type, row) {
            return data ? "<a data-lightbox='" + row[0] + "' href='" + data.replace('!thumb', '') + "'><img src='" + data + "' width='24'></a>" : '';
          }
        },
        {
          targets: [3],
          render: function(data, type, row) { return data ? moment(data).format('YYYY年MM月DD日') : '';}
        },
        {
          targets: [4],
          render: function(data, type, row) { return data ? moment(data).format('YYYY年MM月DD日') : '';}
        },
        {
          targets: [5],
          render: function(data, type, row) {
            return data === -1 ? '无限制' : data;
          }
        },
        {
          targets: [9],
          render: function(data, type, row) {
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>&nbsp;" +
                   "<button onclick=\"destroy('" + row[0] + "')\" class='btn btn-danger'>删除</button>";
          }
        }
      ]
    });

    $('#start_date_filter, #end_date_filter').change(function() {
      datatables.draw();
    });
  }

  // 详情编辑器
  var contentTextarea = $('#content-textarea');
  if(contentTextarea.length > 0) {
    ueActivity = UE.getEditor('content-textarea');
    ueActivity.ready(function() {
      $('#myTabContent .activity_add').click(function() {
        var link = '<link data="activity_link" href="http://2.suancai.sinaapp.com/theme3.css" rel="stylesheet">';
        var content = ueActivity.getContent();
        if(content.indexOf('activity_link') === -1) {
          ueActivity.setContent(link + content);
        }
        $(this).addClass('pulse animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
          $(this).removeClass('pulse animated');
        });
        var str = $(this).html();
        ueActivity.setContent(str, true);
      });
    });
  }
  // 原创预览;
  $('#activities_preview').click(function() {
    var content = '<link href="http://statics.moretao.com/stylesheets/application.css?version=201510211710" rel="stylesheet">' + ueActivity.getContent();
    var cc = window.open('', 'newwindow', 'height=800, width=400, top=0, left=300, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no');
    cc.document.write(content);
  });

  // 头图
  var coverInput = $('#cover-input');
  if(coverInput.length > 0) {
    var loader = new ImagePreview('#cover-input', {
      placeholder: '#cover-preview',
      height: '128px',
      callback:function() { $('#show-cover-link').attr('href', $('#cover-preview').find('> img').attr('src')); }
    });
  }

  // 排序
  var sortableList = $('#sortable-list');
  if(sortableList.length > 0) {
    sortableList.sortable({
      sort: true,
      scroll: true,
      animation: 100,
      ghostClass: 'sortable-ghost',
      onEnd:function(evt) {
        var list = [];
        $.each($('.list-group-item'), function(i, item) {
          list.push({ id:$(item).attr('data-id'), position:++i });
        });
        var api = '/activities/sortable';
        $.post(api, { list:list }, function(data) {
          // 自动提交，无需反映
        });
      }
    });
  }
});

// 原创排序
function sort() { window.location.href = '/activities/sortable'; }

// 创建
function create() { window.location.href = '/activities/new'; }

// 编辑
function edit(id) { window.open('/activities/' + id, '_balnk'); }
function reset() { $('#is_publish_filter, #start_date_filter, #end_date_filter').val(''); datatables.draw(); }

// 删除整个原创
function destroy(id) {
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
          url:'/activities/' + id,
          type:'DELETE',
          success: function(data) {
            $('.alert strong').html(data.message);
            $('.alert').show().fadeIn();
            dialog.close();
            if(datatables) datatables.draw();
            else history.go(-1);
          }
        });
      }
    }]
  });
}

// 搜索标签
function searchTags(list) {
  var keyword = $('#tag-earch-input').val();
  if($.trim(keyword).length < 2) return false;

  var tpl = doT.template($('#tags-tpl').text());

  var api = '/api/tags/search/' + list + '/' + keyword + '/0';
  $.get(api, function(data) {
    var html = tpl(data);
    $('#tag-result-list').find('ul').append(html);
  });

  return true;
}

// 添加标签
function addTags() {
  var ids = $('#tag-result-list').find('input[name=tags]:checked').map(function(i, ele) {
    return $(ele).parent();
  }).get();

  $('#tags-list-group').append(ids);
  $('#add-tag-modal').modal('hide');
}

// 查找用户
function searchUsers(type) {
  var input;

  if(type === 'zan') input = '#zan-search-input';
  if(type === 'comment') input = '#comment-search-input';

  var keyword = $(input).val();
  if($.trim(keyword).length < 2) return false;

  var tpl = doT.template($('#users-tpl').text());

  var api = '/api/users/search/' + keyword + '/0';
  $.get(api, function(data) {
    if(type === 'zan') data.name = 'zans';
    if(type === 'comment') data.name = 'comments';

    var html = tpl(data);

    var list;

    if(type === 'zan') list = '#zans-result-list';
    if(type === 'comment') list = '#comments-result-list';

    $(list).find('ul').html(html);
  });

  return true;
}

// 添加评论
function addComment() {
  $('#add-comment-modal').modal('show');
  $('#comment-id-input').val('');
  $('#comment-search-input').val('');
  $('#comment-c-input').val('');
  $('#comments-result-list').find('> ul').html('');
}

// 编辑评论
function editComment(item) {
  $('#add-comment-modal').modal('show');

  var data = $(item).parent();

  $('#comment-id-input').val(data.attr('data-id'));

  var tpl = doT.template($('#users-tpl').text());
  var users = [];
  users.push({ id:data.attr('data-user'), nickname:data.attr('data-nickname') });

  var html = tpl({ items:users, checked:true, name:'comments' });

  $('#comments-result-list').find('ul').html(html);
  $('#comment-c-input').val(data.attr('data-c'));
}

// 删除评论
function removeComments() {
  var id = url(-1, window.location.href);
  var cid = $('#comment-id-input').val();

  var api = '/activities/' + id + '/comments/' + cid;

  $.ajax({
    url:api,
    type:'DELETE',
    success: function(data) {
      var list = $('#comments-list-group').find('> li');
      list.each(function(i, line) {
        line = $(line);
        var cid = line.attr('data-id');
        if(cid === data.result) line.remove();
        $('#add-comment-modal').modal('hide');
      });
    }
  });
}

// 保存评论
function saveComments() {
  var id = url(-1, window.location.href);
  var cid = $('#comment-id-input').val();
  var user = $('#comments-result-list input[name=comments]:checked').val();
  var content = $('#comment-c-input').val();

  var params = { cid:cid, user:user, c:content };
  var api = '/activities/' + id + '/comments';

  var tpl = doT.template($('#comments-tpl').text());

  var group = $('#comments-list-group');

  $.post(api, params, function(data) {
    var list = $('#comments-list-group').find('> li');

    var upgrade = false;

    list.each(function(i, line) {
      line = $(line);
      var cid = line.attr('data-id');

      if(cid === data._id) {
        var html = tpl(data);
        line.html(html);
        upgrade = true;
      }
    });

    if(!upgrade) {
      var html = tpl(data);
      group.prepend(html);
    }

    $('#add-comment-modal').modal('hide');
  });
}

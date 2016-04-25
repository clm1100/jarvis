/**
 * Created by Mamba on 7/23/15.
 */
var datatables;
var isDragDrop;
$(document).ready(function() {
  var table = $('#main-datatables');

  if(table.length > 0) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      autoWidth: false,
      processing: true,
      serverSide: true,
      pagingType: 'listbox',
      order: [[10, 'desc']],
      ajax: '/api/commodities',
      fnServerParams: function(data) {
        var filters = [];
        var isSelected = $('#is_selected_filter').val(); // 抓取条件value
        if(isSelected && isSelected.length > 0) filters.push({ i:5, value:isSelected }); // 若只有一个条件，直接存入

        var isPublish = $('#is_publish_filter').val(); // 抓取条件value
        if(isPublish && isPublish.length > 0) filters.push({ i:7, value:isPublish }); // 若只有一个条件，直接存入

        var isLight = $('#is_light_filter').val(); // 抓取条件value
        if(isLight && isLight.length > 0) filters.push({ i:6, value:isLight }); // 若只有一个条件，直接存入

        var forceTop = $('#force_top_filter').val(); // 抓取条件value
        if(forceTop && forceTop.length > 0) filters.push({ i:11, value:forceTop }); // 若只有一个条件，直接存入

        var startDate = $('#start_date_filter').val(); // 抓取开始时间
        var endDate = $('#end_date_filter').val(); // 抓取结束时间

        if(startDate.length > 0 && endDate.length > 0) { // 开始和结束的时间必须都有
          var start = moment(startDate, 'YYYY年MM月DD日').format('MM/DD/YYYY'); // 转换成无中文字符的日期
          var end = moment(endDate, 'YYYY年MM月DD日').format('MM/DD/YYYY');

          filters.push({ i:11, value:{ start:start, end:end } }); // push进去，必须是开始和结束的时间都有
        }

        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name:'_id' },
        { name:'t' },
        { name:'url', visible:false },
        { name:'price' },
        { name:'tags' },
        { name:'is_selected' },
        { name:'is_light' },
        { name:'is_publish' },
        { name:'user' },
        { name:'categories', visible: false },
        { name:'at' },
        { name:'force_top', visible: false }

      ],
      columnDefs: [
        {
          targets: [10],
          render: function(data, type, row) { return moment(data).fromNow();}
        },
        {
          targets: [12],
          render: function(data, type, row) {
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>&nbsp;" +
              "<button onclick=\"destroy('" + row[0] + "')\" class='btn btn-danger'>删除</button>";
          }
        }
      ]
    });

    $('#is_selected_filter,#is_publish_filter, #is_light_filter, #force_top_filter, #start_date_filter, #end_date_filter').change(function() {
      datatables.draw();
    });
  }

  var startDateFilter = $('#at-datetime-select');
  if(startDateFilter && startDateFilter.length > 0) {
    startDateFilter.datetimepicker({
      format: 'YYYY年MM月DD日 HH:mm:ss'
    });
  }

  // 详情编辑器
  var contentTextarea = $('#content-textarea');
  if(contentTextarea.length > 0) {
    var ue = UE.getEditor('content-textarea');
  }

  changeImgPosition();

  // 加载主图上可移动的自定义标签
  var main = $('#commodity-main-img');
  if(main.length > 0) {
    bindCustomTagEdit();

    main.bind('click', function(event) {
      $('#add-tag-x-input').val(event.offsetX);
      $('#add-tag-y-input').val(event.offsetY);
      $('#add-tag-o-l-input').prop('checked', true);

      var view = $('#add-custom-tag-modal');
      $('#is-edit-tag').val(false);
      $('#custom-tag-input').val('');
      view.modal('show');

      event.preventDefault();
      return false;
    });
  }
});

function reset() { history.go(0); }

function changeImgPosition() {
  var sortableList = $('#sortable-list');
  if(sortableList.length > 0) {
    var commodityid = sortableList.attr('data-commodityid');
    sortableList.sortable('destroy');
    sortableList.sortable({
      sort: true,
      scroll: true,
      animation: 100,
      ghostClass: 'sortable-ghost',
      onEnd: function(evt) {
        var list = [];
        $.each($('#sortable-list').find('.list-group-item'), function(i, item) {
          if(i === 0) {
            var main = $('#commodity-main-img');
            main.find('img').attr('src', $(item).attr('src'));
          }
          list.push({ id:$(item).attr('data-id'), position:++i });
        });
        var api = '/commodities/' + commodityid + '/photos/position';
        $.post(api, { list:list }, function(data) {

        });
      }
    });
  }
}

// 删除图片
function deleteImg(photoId) {
  var commodityId = $('#sortable-list').attr('data-commodityid');
  var url = '/commodities/' + commodityId + '/photo/' + photoId + '';
  $.post(url, function(data) {
    $.each($('#sortable-list').find('.list-group-item'), function(i, item) {
      if(i === 0) {
        var main = $('#commodity-main-img');
        main.find('img').attr('src', $(item).attr('src'));
      }
    });
    changeImgPosition();
  });
}

function bindCustomTagEdit() {
  var main = $('#commodity-main-img');
  var tags = $('.custom-tag');

  $.pep.unbind(tags);

  main.find('.custom-tag').pep({
    useCSSTranslation: false,
    constrainTo: 'parent',
    start: function(e) { isDragDrop = true; }
  });

  tags.click(function(e) {
    if(isDragDrop) {
      isDragDrop = false;
      e.preventDefault();
      return false;
    }

    var tag = $(e.currentTarget);
    tag.attr('id', 'current-edit-custom-tag');

    var left = parseInt(tag.find('.dot').css('left'));
    var input = left === 0 ? $('#add-tag-o-l-input') : $('#add-tag-o-r-input');

    input.prop('checked', true);

    var view = $('#add-custom-tag-modal');
    view.modal('show');

    $('#is-edit-tag').val(true);
    $('#custom-tag-input').val(tag.find('.txt').html());

    e.preventDefault();
    return false;
  });
}

function saveCustomTag() {
  var view = $('#add-custom-tag-modal');
  var isEdit = $('#is-edit-tag').val() === 'true';
  var txt = $('#custom-tag-input').val();

  if(isEdit === true) {
    var current = $('#current-edit-custom-tag');
    var text = current.find('.txt');
    text.html(txt);
    var o = $("input[name='add-tag-o-input']:checked").val();

    if(o === 'l') {
      current.find('.dot').animate({ left:0 });
      text.animate({ 'border-radius':'0 10px 0 10px' });
    } else {
      current.find('.dot').animate({ left:parseInt(text.css('width')) + 4 });
      text.animate({ 'border-radius': '10px 0 10px 0' });
    }
  } else {
    var left = $('#add-tag-x-input').val();
    var top = $('#add-tag-y-input').val();

    var tpl = doT.template($('#custom-tag-tpl').text());
    var html = tpl({ txt:txt, left:(parseInt(left) / 375), top:(parseInt(top) / 375) });
    var main = $('#commodity-main-img');
    main.append(html);

    bindCustomTagEdit();
  }

  view.modal('hide');
}

function removeCustomTag() {
  $('#current-edit-custom-tag').remove();
}

function create() { window.location.href = '/commodities/new'; }
function edit(id) {
  window.open('/commodities/' + id, '_blank');
}

// 删除整个商品
function destroy(id) {
  BootstrapDialog.show({
    title: '此操作不可恢复!',
    message: '确认要删除这个商品吗?',
    buttons: [{
      label: '取消',
      action: function(dialog) { dialog.close(); }
    }, {
      label: '删除',
      action: function(dialog) {
        $.ajax({
          url:'/commodities/' + id,
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
function searchTags() {
  var list = $('#tags-list-select option:selected').val();
  var keyword = $('#tag-search-input').val();
  if($.trim(keyword).length < 1) return false;

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

// 分类
$('#categories_filter').change(function() {
  var cids = $.map($('#categories_filter').find('option:selected'), function(item) { return item.value; });
  $('#categories_arry').val(cids);
});

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

// 添加赞
function addZans() {
  var ids = $('#zans-result-list').find('input[name=zans]:checked').map(function(i, ele) {
    return $(ele).parent();
  }).get();

  $('#zans-list-group').append(ids);
  $('#add-zan-modal').modal('hide');
}

// 添加评论
function addComment() {
  $('#add-comment-modal').modal('show');
  $('#comment-id-input').val('');
  $('#comment-search-input').val('');
  $('#comment-c-input').val('');
  $('#comments-result-list').find('> ul').html('');
}

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

  var api = '/commodities/' + id + '/comments/' + cid;

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
// 添加图片publish-img-input
$('#cover-input').change(function() {
  var api = '/api/photos/upload/signature';
  var file = document.getElementById('cover-input').files[0];
  var expiration = Math.floor(new Date().getTime() / 1000) + 86400;
  $.post(api, { filename:file.name, expiration:expiration }, function(data) {
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
      error:function(err) { console.error(err); },
      success: function(data, status, xhr) {
        var json = JSON.parse(data);
        var img = 'http://dev.images.moretao.com' + json.url + '!content';
        var fName = json.url.substring(9);
        var cid = $('#commodities_id').val();
        var imgPosition = $('#sortable-list').children('div').length;
        $.post('/commodities/insert/photos', { name:fName, position:imgPosition, id:cid }, function(data) {
          var removeImgBt = "<span id='remove_this' onclick='$(this).parent().remove();' class='fa fa-remove'></span>";
          var newImg = $('#commodities-img').clone();
          var pic = newImg.find('img');
          newImg.attr('id', null);
          pic.attr('data-id', data.id);
          pic.attr('src', img);
          pic.attr('width', '100%');
          pic.css('width', '100%');
          pic.addClass('list-group-item');
          newImg.prepend(removeImgBt);
          $('#sortable-list').append(newImg);
          newImg.show();
          $('#sortable-list').sortable('put', newImg);
          changeImgPosition();
        });
      }
    });
  });
});

// 保存评论
function saveComments() {
  var id = url(-1, window.location.href);
  var cid = $('#comment-id-input').val();
  var user = $('#comments-result-list input[name=comments]:checked').val();

  var content = $('#comment-c-input').val();

  var params = { cid:cid, user:user, c:content };
  var api = '/commodities/' + id + '/comments';

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

// 搜索相关专题
function searchTopics() {
  var keyword = $('#topic-search-input').val();
  if ($.trim(keyword).length < 1) return false;

  var tpl = doT.template($('#topics-tpl').text());

  var api = '/api/topics/search/' + keyword + '/0';
  $.get(api, function(data) {
    var html = tpl(data);
    $('#topics-result-list').find('ul').html(html);
  });
  return true;
}

// 添加相关专题
function addTopics() {
  var ids = $('#topics-result-list').find('input[name=topics]:checked').map(function(i, ele) {
    return $(ele).parent();
  }).get();

  $('#topics-list-group').append(ids);
  $('#add-topic-modal').modal('hide');
}

function saveCommodity() {
  var tags = [];
  var tagItems = $('#commodity-main-img').find('.custom-tag');

  $.each(tagItems, function(i, tag) {
    var t = $(tag);
    var txt = t.find('.txt').html();
    var point = parseInt(t.find('.dot').css('left'));
    var x = parseFloat(t.css('left').replace('px', ''));
    var y = parseFloat(t.css('top').replace('px', ''));

    tags.push({ txt:txt, x:(x / 384), y:(y / 384), o:(point === 0 ? 'l' : 'r') });
  });

  $('#custom-tags-input').val(JSON.stringify(tags));

  return true;
}

// 置顶排序;
function sort() { window.location.href = '/commodities/sortable'; }

$(function() {
  // 排序
  var sortableList = $('#commodities-sortable-list');
  if(sortableList.length > 0) {
    sortableList.sortable({
      sort: true,
      scroll: true,
      animation: 100,
      ghostClass: 'sortable-ghost',
      onEnd: function(evt) {
        var list = [];
        $.each($('.list-group-item'), function(i, item) {
          list.push({ id: $(item).attr('data-id'), position: ++i });
        });
        var api = '/commodities/sortable';
        $.post(api, { list:list }, function(data) {
          // 自动提交，无需反映
        });
      }
    });
  }
});
// 商品预览
function preview() {
  var oid = $('.preview').attr('id');
  var previewUrl = '/commodities/preview?' + oid;
  window.open(previewUrl, 'newwindow', 'width=1000, top=0, left=0, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no');
}
function checkPreview() {
  var checkLock = $('#commodity-main-img img').attr('src');
  if(checkLock) preview();
}

$(function() {
  $('#categories_filter_cc').on('change', 'select', function() {
    var id = $(this).val();
    $(this).nextAll().remove();
    categoriesAjax(id);
  });
});

function categoriesAjax(id) {
  var url = '/api/get_categories/son/' + id;
  $.get(url, function(data) {
    var tpl = doT.template($('#categories-tpl').text());
    if(data.items.length > 0) {
      var html = tpl(data);
      $('#categories_filter_cc').append(html);
    }
  });
}

// 添加分类；
function addCategories() {
  var t = $('#categories_filter_cc select :selected').last().val();
  var title = $('#categories_filter_cc select :selected').last().text();

  var t2 = $('#categories_filter_cc select :selected').eq(-2).val();
  var title2 = $('#categories_filter_cc select :selected').eq(-2).text();

  var str;
  var ids;

  if(t && title) {
    str = '<li><input type="checkbox" name="categories" value=' + t + ' title= ' + title + ' checked=""> ' + title + '</li>';
    ids = $(str);
  } else {
    str = '<li><input type="checkbox" name="categories" value=' + t2 + ' title=' + title2 + ' checked=""> ' + title2 + '</li>';
    ids = $(str);
  }

  $('#categories-list-group').append(ids);
  $('#add-categories-modal').modal('hide');
}

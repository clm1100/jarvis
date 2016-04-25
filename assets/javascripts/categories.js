/**
 * Created by Mamba on 7/23/15.
 */
var datatables;
$(document).ready(function() {
  var table = $('#main-datatables');

  if(table.length > 0) {
    datatables = table.DataTable({
      language: { url: '/javascripts/libs/datatables-chinese.json' },
      processing: true,
      serverSide: true,
      ajax: '/api/categories',
      fnServerParams: function(data) {
        var filters = [];
        var rootNode = $('#root_node_filter').val(); // 抓取条件value
        if(rootNode && rootNode.length > 0) filters.push({ i:1, value:rootNode }); // 若只有一个条件，直接存入
        data.filters = filters; // 赋值给filters
      },
      columns: [
        { name: '_id' },
        { name: 'parent' },
        { name: 't' },
        { name: 'path' }
      ],
      columnDefs: [
        {
          targets: [4],
          render: function(data, type, row) {
            return "<button onclick=\"edit('" + row[0] + "')\" class='btn btn-info'>编辑</button>";
          }
        }
      ]
    });

    $('#root_node_filter').change(function() {
      datatables.draw();
    });
  }
});

function create() { window.location.href = '/categories/new'; }

function edit(id) { window.open('/categories/' + id, '_blank'); }

function destroy(id) {
  $.ajax({
    url:'/categories/' + id,
    type:'DELEE',
    success:function(data) {
      $('.alert strong').html(data.message);
      $('.alert').show().fadeIn();
      if(datatables) datatables.draw();
      else history.go(-1);
    }
  });
}

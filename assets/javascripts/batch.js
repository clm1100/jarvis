/**
 * Created by Mamba on 7/23/15.
 */
var datatables;
$(document).ready(function() {});

function addZansCount() {
  var type = $('#zans-type-select').val();
  var min = $('#zans-min-input').val();
  var max = $('#zans-max-input').val();
  var api = '/api/' + type + '/batch/zans';

  $.post(api, { min:min, max:max }, function(data) {
    if(data.status === 200) BootstrapDialog.show({ title:'提示', message:'批量点赞完成!' });
  });
}

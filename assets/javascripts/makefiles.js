$(document).ready(function() {
  $('form').attr('action', '/datas/makefiles/' + $('#make-type-select').val());

  $('#make-type-select').change(function() {
    var type = $('#make-type-select').val();
    $('form').attr('action', '/datas/makefiles/' + type);
  });
});

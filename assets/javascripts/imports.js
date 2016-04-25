$(document).ready(function() {
  var type = url(-1, window.location.href);
  $('form').attr('action', '/imports/' + type);
});

$(document).ready(function() {
  $('.navbar').hide();
  $('#page-wrapper').attr('id', '');


  var form = $('#signin-form');

  form.find('input[name=username]').focus(function() {
    $('.image-for-username').show();
    $('.image-for-password').hide();
  });

  form.find('input[name=password]').focus(function() {
    $('.image-for-username').hide();
    $('.image-for-password').show();
  });

  var message = $('.message').val();
});

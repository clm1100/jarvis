function create(){window.location.href="/messages/new"}function edit(a){window.location.href="/messages/"+a}function reply(a){window.open("/messages/"+a+"/reply","_blank")}function destroy(a){$.ajax({url:"/messages/"+a,type:"DELETE",success:function(a){$(".alert strong").html(a.message),$(".alert").show().fadeIn(),datatables?datatables.draw():history.go(-1)}})}function showUserSelectModal(a){var b=$("#user-select-modal");b.find("input[name=type]").val(a),b.find("input[name=nickname]").val(""),b.find("p.user").remove(),b.modal("show")}function searchUsers(){var a=doT.template($("#users-tpl").text()),b=$("#user-select-modal"),c=b.find("input[name=nickname]").val(),d="/api/users/search/"+c+"/0";$.get(d,function(c){var d=a(c);b.find(".modal-body").append(d)})}function selectUser(a,b){var c=$("#user-select-modal"),d=c.find("input[name=type]").val();"to"===d?($("form input[name=to]").val(a),$("form input[name=to-nickname]").val(b)):($("form input[name=from]").val(a),$("form input[name=from-nickname]").val(b)),c.modal("hide")}function sendMessage(a,b){var c=$("input[name=msg]").val(),d=$("#message-image-input");if(!(c.length<1&&d.val().length<1))if(d.val().length>0){var e="/api/message/upload/signature",f=document.getElementById("message-image-input").files[0],g=Math.floor((new Date).getTime()/1e3)+86400;$.post(e,{filename:f.name,expiration:g,fid:a},function(d){var e=new FormData;e.append("policy",d.policy),e.append("signature",d.signature),e.append("file",f),e.append("x-gmkerl-rotate","auto"),$.ajax({url:UPYUN_MORETAO,type:"POST",data:e,mimeType:"multipart/form-data",contentType:!1,cache:!1,processData:!1,success:function(d,e,f){var g=JSON.parse(d);$.post("/api/messages/reply",{from:a,to:b,msg:c,photo:g.url},function(a){history.go(0)})}})})}else $.post("/api/messages/reply",{from:a,to:b,msg:c},function(a){history.go(0)})}var datatables;$(document).ready(function(){var a=$("#main-datatables");if(a&&(datatables=a.DataTable({language:{url:"/javascripts/libs/datatables-chinese.json"},processing:!0,serverSide:!0,order:[[4,"desc"]],ajax:"/api/messages",columns:[{name:"_id"},{name:"from"},{name:"to"},{name:"msg"},{name:"at"}],columnDefs:[{targets:[3],render:function(a,b,c){return'<div style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;-webkit-text-overflow:ellipsis;width:200px;">'+a+"</div>"}},{targets:[4],render:function(a,b,c){return moment(a).fromNow()}},{targets:[5],render:function(a,b,c){return"<button onclick=\"reply('"+c[0]+'\')" class="btn btn-info">回复</button>'}}]})),$("#message-image-input").length>0){new ImagePreview("#message-image-input",{placeholder:"#message-image",width:"128px"})}});
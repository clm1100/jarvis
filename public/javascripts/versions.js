function create(){window.location.href="/versions/new"}function edit(a){window.location.href="/versions/"+a}function destroy(a){$.ajax({url:"/versions/"+a,type:"DELETE",success:function(a){$(".alert strong").html(a.message),$(".alert").show().fadeIn(),datatables?datatables.draw():history.go(-1)}})}var datatables;$(document).ready(function(){var a=$("#main-datatables");a&&(datatables=a.DataTable({language:{url:"/javascripts/libs/datatables-chinese.json"},processing:!0,serverSide:!0,order:[[3,"desc"]],ajax:"/api/versions",columns:[{name:"id"},{name:"v"},{name:"d"},{name:"url"},{name:"active"},{name:"force"},{name:"at"}],columnDefs:[{targets:[6],render:function(a,b,c){return moment(a).fromNow()}},{targets:[7],render:function(a,b,c){return"<button onclick=\"edit('"+c[0]+'\')" class="btn btn-info">编辑</button>&nbsp;<button onclick="destroy(\''+c[0]+'\')" class="btn btn-danger">删除</button>'}}]}))});
function reset(){history.go(0)}function create(){window.location.href="/ads/new"}function edit(a){window.open("/ads/"+a,"_blank")}function sort(){var a=$("#type_filter").val();window.location.href="/ads/sortable?num="+a}function destroy(a){$.ajax({url:"/ads/"+a,type:"DELETE",success:function(a){$(".alert strong").html(a.message),$(".alert").show().fadeIn(),datatables?datatables.draw():history.go(-1)}})}var datatables;$(document).ready(function(){var a=$("#main-datatables");a&&(datatables=a.DataTable({language:{url:"/javascripts/libs/datatables-chinese.json"},processing:!0,serverSide:!0,ajax:"/api/ads",fnServerParams:function(a){var b=[],c=$("#type_filter").val();c&&c.length>0&&b.push({i:4,value:c});var d=$("#ref_type_filter").val();d&&d.length>0&&b.push({i:5,value:d});var e=$("#start_date_filter").val(),f=$("#end_date_filter").val(),g=moment(e,"YYYY年MM月DD日").format("MM/DD/YYYY"),h=moment(f,"YYYY年MM月DD日").format("MM/DD/YYYY");e&&e.length>0&&b.push({i:6,value:g}),f&&f.length>0&&b.push({i:7,value:h}),a.filters=b},columns:[{name:"_id"},{name:"d"},{name:"link"},{name:"cover"},{name:"type",visible:!1},{name:"ref_type",visible:!1},{name:"start",visible:!1},{name:"end",visible:!1}],columnDefs:[{targets:[3],render:function(a,b,c){return"<a data-lightbox='"+c[0]+"' href='"+a.replace("!waterfall","")+"'><img src='"+a+"'></a>"}},{targets:[8],render:function(a,b,c){return"<button onclick=\"edit('"+c[0]+"')\" class='btn btn-info'>编辑</button>&nbsp;<button onclick=\"destroy('"+c[0]+"')\" class='btn btn-danger'>删除</button>"}}]}),$("#type_filter,#ref_type_filter, #start_date_filter, #end_date_filter").change(function(){datatables.draw()}));var b=$("#cover-input");if(b.length>0){new ImagePreview("#cover-input",{placeholder:"#cover-preview",height:"128px",callback:function(){$("#show-cover-link").attr("href",$("#cover-preview").find("> img").attr("src"))}})}var c=$("#sortable-list");c.length>0&&c.sortable({sort:!0,scroll:!0,animation:100,ghostClass:"sortable-ghost",onEnd:function(a){var b=[];$.each($(".list-group-item"),function(a,c){b.push({id:$(c).attr("data-id"),position:++a})});var c="/ads/sortabe";$.post(c,{list:b},function(a){})}})});
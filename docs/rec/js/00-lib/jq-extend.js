
jQuery.fn.extend({
  serializeDict: function() {
    var obj = {}
    var $inputs = $(this.find(":input"));
    $inputs = $inputs.add(this.filter(":input"));
    $inputs.each(function(index, input){
      input = $(input);
      input.serializeArray().forEach((i, index) => {
        if ((typeof i.value.trim === "function") && i.value.trim()==='') i.value=null;
        else {
          var n=Number(i.value);
          if (!isNaN(n)) {
            var tp = input.data("type");
            if (tp==null && input.is("input")) tp = input.attr("type");
            if (["number", "range"].indexOf(tp)>=0) {
              i.value = n;
            }
          }
        }
        if (i.name.endsWith("[]")) {
          i.name = i.name.substr(0, i.name.length-2);
          if (obj[i.name] === undefined) obj[i.name] = [i.value];
          else obj[i.name].push(i.value);
        } else {
          if (obj[i.name] === undefined) obj[i.name] = i.value;
          else {
            if (Array.isArray(obj[i.name])) obj[i.name].push(i.value);
            else obj[i.name] = [obj[i.name], i.value];
          }
        }
      });
    })
    return obj;
  }
});

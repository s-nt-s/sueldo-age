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

function chg(id, fnc) {
  $("*[name="+id+"]").change(fnc).change();
}

function do_round(v) {
  if (isNaN(v) || v == Infinity) return "-";
  var rnd = Math.round(v);
  rnd = rnd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  v = Math.round(v*100)/100;
  v = v.toString();
  var sp = v.split(/\./);
  var dc = sp.length==2?sp[1].length:0;
  var en = sp[0].length;
  v = sp[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (sp.length>1) v = v+","+sp[1];
  //v = `<code><span class="nm en${en} dc${dc}">${v}</span></code>`
  v = `<code title="${v}"><span class="nm">${rnd}</span></code>`
  return v;
}

function do_salary() {
  var f=$("form:visible");
  if (!f[0].checkValidity()) {
    $("#resultado").find("p.error").show();
    $("#resultado").find("div.msg").hide();
    return;
  }
  var d=f.serializeDict();
  d.irpf = d.irpf /100;
  d.ss = d.ss / 100;

  console.log(d);
  var trienio=0;
  var trienio_extra=0;
  var bruto_anual = d.base + (d.extra*2) + d.destino + d.especifico + d.productividad + trienio + (trienio_extra*2);
  $("#bruto_anual").html(do_round(bruto_anual));

  var bruto_mes = d.base + d.destino + (((d.destino + d.especifico)/14)*12) + trienio;
  $("#bruto_mes").html(do_round(bruto_mes/12));

  var bruto_extra = d.extra*2 + trienio_extra + (((d.destino + d.especifico)/14)*2);
  $("#bruto_extra").html(do_round(bruto_extra));

  var neto_mes = (d.base + trienio + d.productividad)/12 + (d.destino + d.especifico)/14;
  neto_mes = neto_mes * (1-d.irpf-d.ss) - d.muface;
  neto_mes = neto_mes - ((bruto_extra/12)*d.ss);
  $("#neto_mes").html(do_round(neto_mes));

  var neto_extra = (bruto_extra * (1-d.irpf) /2) - d.muface;
  $("#neto_extra").html(do_round(neto_extra));

  $("#neto_anual").html(do_round((neto_mes*12)+(neto_extra*2)));

  $("#resultado").find("p.error").hide();
  $("#resultado").find("div.msg").show();
}

$(document).ready(function(){
  chg("grupo", function(){
    var v = this.value;
    var r=retribuciones[v];
    if (r==null) return;
    var f=$(this).closest("form");
    f.find("*[name=muface]").val(muface[v]);
    f.find("*[name=base]").val(r.base.sueldo);
    f.find("*[name=extra]").val(r.diciembre.sueldo);
    do_salary();
  });
  chg("nivel", function(){
    if (this.value.length=='') return;
    var v = parseInt(this.value, 10);
    var x = retribuciones.niveles[v];
    if (x==null) return;
    var f=$(this).closest("form");
    f.find("*[name=destino]").val(x);
    do_salary();
  });
  $("form :input").change(do_salary);
})

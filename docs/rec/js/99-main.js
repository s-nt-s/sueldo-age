var GRUPOS=null;

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

function safe_div(n, x) {
  var aux = Math.pow(10, n.toString().length);
  n = (n*aux)/(x*aux);
  return n;
}

function _do_salary(silent) {
  var f=$("form:visible");
  if (!f[0].checkValidity()) {
    if(silent !== true) {
      f[0].reportValidity();
    }
    return false;
  }

  var d=f.serializeDict();
  d.irpf = safe_div(d.irpf, 100);
  d.ss = safe_div(d.ss, 100);


  d.muface = muface[d.grupo];
  if (d.muface==null) return false;

  var r=retribuciones[d.grupo];
  if (r==null) return false;

  d.base = r.base.sueldo;
  d.extra = r.diciembre.sueldo;

  var n = retribuciones.niveles[d.nivel];
  if (n==null) return false;

  d.destino = n;

  console.log(d);

  var trienio=0;
  var trienio_extra=0;
  GRUPOS.forEach((g, i) => {
    var tri = parseInt(f.find("*[name='tri"+g+"']").val(), 10);
    if (Number.isNaN(tri)) return;
    var r=retribuciones[g];
    if (r==null) return;
    trienio = trienio + tri*(r.base.trienio);
    trienio_extra = trienio_extra + tri*(r.diciembre.trienio);
  });

  var bruto_anual = d.base + (d.extra*2) + d.destino + d.especifico + d.productividad + trienio + (trienio_extra*2);
  $("#bruto_anual").html(do_round(bruto_anual));

  var bruto_mes = d.base + d.destino + (((d.destino + d.especifico)/14)*12) + trienio;
  $("#bruto_mes").html(do_round(bruto_mes/12));

  var bruto_extra = d.extra*2 + trienio_extra + (((d.destino + d.especifico)/14)*2);
  $("#bruto_extra").html(do_round(bruto_extra/2));

  var neto_mes = (d.base + trienio + d.productividad)/12 + (d.destino + d.especifico)/14;
  neto_mes = neto_mes * (1-d.irpf-d.ss) - d.muface;
  neto_mes = neto_mes - ((bruto_extra/12)*d.ss);
  $("#neto_mes").html(do_round(neto_mes));

  var neto_extra = ((bruto_extra/2) * (1-d.irpf)) - d.muface;
  $("#neto_extra").html(do_round(neto_extra));

  $("#neto_anual").html(do_round((neto_mes*12)+(neto_extra*2)));

  return true;
}


function do_salary(silent) {
  if(_do_salary(silent)) {
    $("#resultado").find("p.error").hide();
    $("#resultado").find("div.msg").show();
  } else {
    $("#resultado").find("p.error").show();
    $("#resultado").find("div.msg").hide();
  }
}

$(document).ready(function(){
  GRUPOS=$("*[name=grupo]:eq(0) option[value!='']").filter(function(){
    return this.value;
  }).map(function(){
    return this.value;
  }).get();
  $("form :input")
    .change(do_salary);
  do_salary(true);
})

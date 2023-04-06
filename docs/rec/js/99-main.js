var GRUPOS=null;

function chg(id, fnc) {
  $("*[name="+id+"]").change(fnc).change();
}

function do_round(v) {
  if (isNaN(v) || v == Infinity) return "-";
  let rnd = Math.round(v);
  rnd = rnd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  v = Math.round(v*100)/100;
  v = v.toString();
  let sp = v.split(/\./);
  let dc = sp.length==2?sp[1].length:0;
  let en = sp[0].length;
  v = sp[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (sp.length>1) v = v+","+sp[1];
  //v = `<code><span class="nm en${en} dc${dc}">${v}</span></code>`
  v = `<code title="${v}"><span class="nm">${rnd}</span></code>`
  return v;
}

function safe_div(n, x) {
  let aux = Math.pow(10, n.toString().length);
  n = (n*aux)/(x*aux);
  return n;
}
function safe_sum() {
  if (arguments.length==0) return 0;
  if (arguments.length==1) return arguments[0];
  let arr = Array.from(arguments);
  let aux = arr.map(function(i){return i.toString().length})
  aux = Math.max(...aux);
  aux = Math.pow(10, aux);
  let sum = arr.reduce(function(t, c) {return t+(c*aux)}, 0);
  return sum/aux;
}

function _do_salary(silent) {
  let f=$("form:visible");
  if (!f[0].checkValidity()) {
    if(silent !== true) {
      f[0].reportValidity();
    }
    return false;
  }

  let d=f.serializeDict();
  d.irpf = safe_div(d.irpf, 100);
  d.ss = safe_div(d.ss, 100);

  d.muface = MUFACE[d.grupo];
  if (d.muface==null) return false;

  let r=RETRIB[d.grupo];
  if (r==null) return false;

  d.base = r.base.sueldo;
  d.extra = r.diciembre.sueldo;

  let n = RETRIB.niveles[d.nivel];
  if (n==null) return false;

  d.destino = n;

  d.trienios={
    base:[],
    extra:[]
  }

  GRUPOS.forEach((g, i) => {
    let tri = d["tri"+g];
    if (Number.isNaN(tri)) return;
    let r=RETRIB[g];
    if (r==null) return;
    delete d["tri"+g];
    if (tri==0) return;
    d.trienios[g]=tri;
    d.trienios.base.push(tri*(r.base.trienio));
    d.trienios.extra.push(tri*(r.diciembre.trienio));
  });
  d.trienios.base = safe_sum.apply(this, d.trienios.base);
  d.trienios.extra = safe_sum.apply(this, d.trienios.extra);

  console.log(d);

  let bruto_anual = d.base + (d.extra*2) + d.destino + d.especifico + d.productividad + d.trienios.base + (d.trienios.extra*2);
  $("#bruto_anual").html(do_round(bruto_anual));

  let bruto_mes = d.base + (((d.destino + d.especifico)/14)*12) + d.trienios.base;
  $("#bruto_mes").html(do_round(bruto_mes/12));

  let bruto_extra = d.extra*2 + d.trienios.extra + (((d.destino + d.especifico)/14)*2);
  $("#bruto_extra").html(do_round(bruto_extra/2));

  let neto_mes = (d.base + d.trienios.base + d.productividad)/12 + (d.destino + d.especifico)/14;
  neto_mes = neto_mes * (1-d.irpf-d.ss) - d.muface;
  neto_mes = neto_mes - ((bruto_extra/12)*d.ss);
  $("#neto_mes").html(do_round(neto_mes));

  let neto_extra = ((bruto_extra/2) * (1-d.irpf)) - d.muface;
  $("#neto_extra").html(do_round(neto_extra));

  $("#neto_anual").html(do_round((neto_mes*12)+(neto_extra*2)));

  let deducciones = (bruto_anual*d.ss) + (d.muface*14);

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
  Q=new MKQ($("form:visible").serialize(), 0);
  $("#sueldo:visible a").attr("href", "?"+Q.toString()+"#sueldo");
}

$(document).ready(function(){
  GRUPOS=$("*[name=grupo]:eq(0) option[value!='']").filter(function(){
    return this.value;
  }).map(function(){
    return this.value;
  }).get();
  chg("grupo", function(){
    let md = MODA[this.value];
    if (md==null || md["nivel"]==null) return;
    let l=$(this).closest("form").find("input[name=nivel]");
    if (l.val().length==0) l.val(md["nivel"]);
  });
  $("form :input[name]").each(function(){
    let n=this.name;
    let v=Q.get(n);
    if (v!=null) this.value=v;
  })
  $("form :input")
    .change(do_salary);
  do_salary(true);
})

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
  const sp = v.split(/\./);
  //let dc = sp.length==2?sp[1].length:0;
  //let en = sp[0].length;
  v = sp[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (sp.length>1) {
    v = v+","+sp[1];
    if (sp[1].length==1) v = v+"0";
  }
  //v = `<code><span class="nm en${en} dc${dc}">${v}</span></code>`
  v = `<code title="${v}"><span class="nm">${rnd}</span></code>`
  return v;
}

function safe_div(n, x) {
  const aux = Math.pow(10, n.toString().length);
  n = (n*aux)/(x*aux);
  return n;
}
function safe_sum() {
  if (arguments.length==0) return 0;
  if (arguments.length==1) return arguments[0];
  const arr = Array.from(arguments);
  let aux = arr.map(function(i){return i.toString().length})
  aux = Math.max(...aux);
  aux = Math.pow(10, aux);
  const sum = arr.reduce(function(t, c) {return t+(c*aux)}, 0);
  return sum/aux;
}

function parseForm(silent) {
  const f=$("form:visible");
  if (!f[0].checkValidity()) {
    if(silent !== true) {
      f[0].reportValidity();
    }
    return null;
  }

  const d=f.serializeDict();
  d.irpf = safe_div(d.irpf, 100);
  d.ss = safe_div(d.ss, 100);
  d.mei= safe_div(d.mei, 100);

  d.muface = MUFACE[d.grupo];
  if (d.muface==null) return null;

  const r=RETRIB[d.grupo];
  if (r==null) return null;

  d.base = r.base.sueldo;
  d.extra = r.diciembre.sueldo;

  const n = RETRIB.niveles[d.nivel];
  if (n==null) return null;

  d.destino = n;

  d.trienios={
    base:[],
    extra:[]
  }

  GRUPOS.forEach((g, i) => {
    const tri = d["tri"+g];
    if (Number.isNaN(tri)) return;
    const r=RETRIB[g];
    if (r==null) return;
    delete d["tri"+g];
    if (tri==0) return;
    d.trienios[g]=tri;
    d.trienios.base.push(tri*(r.base.trienio));
    d.trienios.extra.push(tri*(r.diciembre.trienio));
  });
  d.trienios.base = safe_sum.apply(this, d.trienios.base);
  d.trienios.extra = safe_sum.apply(this, d.trienios.extra);

  console.log("D", d);

  return d;
}

function _do_salary(silent) {
  const d = parseForm(silent);
  if (d == null) return false;

  const n = new Nomina({
      base: new Ingreso({anual: d.base+d.trienios.base, pagas: 12}),
      extra: new Ingreso({mensual: d.extra+d.trienios.extra, pagas: 2}),
      destino: new Ingreso({anual: d.destino, pagas: 14}),
      especifico: new Ingreso({anual: d.especifico, pagas: 14}),
      productividad: new Ingreso({anual: d.productividad, pagas: 12}),
      muface: d.muface,
      irpf: d.irpf,
      ss: d.ss,
      mei: d.mei
  });

  const jqval = {
    "bruto_anual": n.bruto.anual,
    "neto_anual":  n.neto.anual,
    "bruto_mes":   n.bruto.normal.mensual,
    "neto_mes":    n.neto.normal.mensual,
    "bruto_extra": n.bruto.normal.mensual+n.bruto.extra.mensual,
    "neto_extra":  n.neto.normal.mensual+n.neto.extra.mensual,
    "bruto_media": n.bruto.anual/12,
    "neto_media":  n.neto.anual/12
  };

  for (const [jq, val] of Object.entries(jqval)) {
    $("#"+jq).html(do_round(val));
  }

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
    const md = MODA[this.value];
    if (md==null || md["nivel"]==null) return;
    const l=$(this).closest("form").find("input[name=nivel]");
    if (l.val().length==0) l.val(md["nivel"]);
  });
  $("form :input[name]").each(function(){
    const n=this.name;
    const v=Q.get(n);
    if (v!=null) this.value=v;
  })
  $("form :input")
    .change(do_salary);
  do_salary(true);
})

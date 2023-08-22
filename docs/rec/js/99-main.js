F=null;

class Form {
  
  constructor() {
    this.form = document.forms[0];
    this.error = document.querySelector("#resultado p.error");
    this.msg = document.querySelector("#resultado div.msg");
    this.link = document.querySelector("#sueldo a");
    this.grupo = this.form.elements['grupo'];
    this.nivel = this.form.elements['nivel'];
    this.grupos = Array.from(this.grupo.options).filter(e => e.value.length).map(e=>e.value);
  }

  get inputs() {
      return Array.from(this.form.elements).filter(e=>{
          return (e.name != null && e.name.length>0 || ["SELECT", "INPUT",  "TEXTAREA"].includes(e.tagName));
      });
  }

  getData() {
    const obj = {}
    Array.from(new FormData(this.form)).forEach(([k, v])=> {
        const _v = parseFloat(v);
        if (!Number.isNaN(_v)) v=_v;
        if (obj[k]==null) obj[k]=v;
        else if (Array.isArray(obj[k])) obj[k].push(v);
        else obj[k]=[obj[k], v];
    })
    return obj;
  }

  getQuery() {
      return new URLSearchParams(Array.from(new FormData(this.form))).toString();
  }

  checkValidity(silent) {
    if (!this.form.checkValidity()) {
      if(silent !== true) this.form.reportValidity();
      return false;
    }
    return true;
  }
}

function addEventListenerAndFire(node, event, fnc) {
  node.addEventListener(event, fnc);
  fnc.apply(node);
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
  if (!F.checkValidity(silent)) return null;

  const d = F.getData();
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

  F.grupos.forEach((g, i) => {
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

  const idval = {
    "bruto_anual": n.bruto.anual,
    "neto_anual":  n.neto.anual,
    "bruto_mes":   n.bruto.normal.mensual,
    "neto_mes":    n.neto.normal.mensual,
    "bruto_extra": n.bruto.normal.mensual+n.bruto.extra.mensual,
    "neto_extra":  n.neto.normal.mensual+n.neto.extra.mensual,
    "bruto_media": n.bruto.anual/12,
    "neto_media":  n.neto.anual/12
  };

  Object.entries(idval).forEach(([id, val])=>{
    document.getElementById(id).innerHTML = do_round(val);
  })

  return true;
}

function do_salary(silent) {
  if(_do_salary(silent)) {
    F.error.style.display = 'none';
    F.msg.style.display = '';
  } else {
    F.error.style.display = '';
    F.msg.style.display = 'none';
  }
  Q=new MKQ(F.getQuery(), 0);
  F.link.href = "?"+Q.toString()+"#sueldo";
}

document.addEventListener('DOMContentLoaded', function(){
  F = new Form();
  addEventListenerAndFire(F.grupo, "change", function(){
    const md = MODA[this.value];
    if (md==null || md["nivel"]==null) return;
    if (F.nivel.value.length==0) F.nivel.value = md["nivel"];
  });
  F.inputs.forEach(e=>{
    const v=Q.get(e.name);
    if (v!=null) e.value=v;
    e.addEventListener("change", do_salary);
  })
  do_salary(true);
});
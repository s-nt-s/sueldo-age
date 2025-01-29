const DATA = new Data();
const F = new Form();

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

  const g = DATA.grupo[d.grupo];
  if (g == null) return null;
  const n = DATA.nivel[d.nivel];
  if (n == null) return null;

  d.muface = g.muface;
  d.base = g.base;
  d.extra = g.extra_base;
  d.destino = n.complemento;

  d.trienios={
    base:[],
    extra:[]
  }
  Object.keys(DATA.grupo).forEach(gr=>{
    const tri = d["tri"+gr];
    if (Number.isNaN(tri)) return;
    delete d["tri"+gr];
    if (tri==0) return;
    const r = DATA.grupo[gr];
    if (r==null) return;
    d.trienios[gr]=tri;
    d.trienios.base.push(tri*(r.trienio));
    d.trienios.extra.push(tri*(r.extra_trienio));
  })
  d.trienios.base = safe_sum.apply(this, d.trienios.base);
  d.trienios.extra = safe_sum.apply(this, d.trienios.extra);

  console.log("D", d);

  return d;
}

function _do_salary(silent) {
  const d = parseForm(silent);
  if (d == null) return false;

  
  /** @type {Nomina} */
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
  const r = _do_salary(silent);
  if(r) {
    F.error.style.display = 'none';
    F.msg.style.display = '';
  } else {
    F.error.style.display = '';
    F.msg.style.display = 'none';
  }
  Q=new MKQ(F.getQuery(), 0);
  F.link.href = "?"+Q.toString()+"#sueldo";
}

const doMain = function(){
  if (DATA.readyState == "loading") return;
  if (document.readyState == "loading") return;

  Object.values(DATA.fuente).forEach(i => {
    const a1 = document.getElementById(i.id+"_url");
    const a2 = document.getElementById(i.id+"_via");
    const a = (a1 || a2);
    if (a1) a1.href = i.url;
    if (a2) a2.href = i.via;
    if (a!=null) {
      const t = (a.title || "").trim();
      if (t.length == 0) a.title="Datos de "+i.fecha;
      else a.title=t+ " (datos de "+i.fecha+")"
    }
  })

  const slot = document.getElementById("slot_trienios");
  Object.keys(DATA.grupo).forEach(g=>{
    F.grupo.insertAdjacentHTML('beforeend', `<option value="${g}">${g}</option>`);
    slot.insertAdjacentHTML('beforeend', `
      <div>
      <label for="tri${g}">${g}</label>
      <input
        id="tri${g}"
        max="20"
        min="0"
        name="tri${g}"
        required
        step="1"
        style="width: 3em"
        type="number"
        value="0"
      />
      </div>
    `);
  })
  const nvl = Object.keys(DATA.nivel);
  F.nivel.min = nvl[0];
  F.nivel.max = nvl[nvl.length-1];
  F.especifico.min = DATA.especifico.min;
  F.especifico.max = DATA.especifico.max;
  document.body.classList.remove("loading");

  F.inputs.forEach(e=>{
    const v=Q.get(e.name);
    if (v!=null) e.value=v;
    e.addEventListener("change", do_salary);
  })
  
  do_salary(true);
}

document.addEventListener('DOMContentLoaded', doMain);
document.addEventListener(Data.eventDataContentLoaded, doMain);

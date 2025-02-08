/** @type {Data} */
const DATA = new Data();
const $ = (id) => document.getElementById(id);

const __sort = (a, b) => {
  if (typeof a == "number") return a-b;
  if (typeof a.txt == "string") {
    a = a.txt;
    b = b.txt;
  }
  if (typeof a == "string") return a.toLowerCase().localeCompare(b.toLowerCase());
  return 0;
}

function toString(n, dec) {
  if (dec == null) dec = 0;
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function doOptions(id, arr) {
  let w = 0;
  const e = $(id);
  arr.sort(__sort).forEach(x=>{
    if (typeof x == "string") x={id:x, txt:x};
    if (typeof x == "number") x={id:x, txt:x.toString()};
    if (x.txt.length>w) w=x.txt.length;
    e.insertAdjacentHTML(
      "beforeend",
      `<option value="${x.id}">${x.txt}</option>`
    )
  });
  if (e.tagName=="SELECT") e.size=arr.length;
}
function doOptionsGroups(id, group) {
  const otros = [];
  group = group.filter(([g, arr])=>{
    if (arr.length==0) return false;
    if (arr.length>1) return true;
    const x = arr[0];
    otros.push({
      id: x.id,
      txt: g.txt + ' - ' + x.txt
    })
    return false;
  }).sort((a, b)=>__sort(a[0], b[0]));

  if (otros.length>0) group.push([
    {id:"otros", txt:"Otros"},
    otros
  ])
  let size = group.length;
  let w = 0;
  const e = $(id);
  group.forEach(([g, arr])=>{
    size = size + arr.length;
    e.insertAdjacentHTML(
      "beforeend",
      `<optgroup id="${id}_${g.id}" label="${g.txt}"></option>`
    )
    doOptions(`${id}_${g.id}`, arr);
  });
  if (e.tagName=="SELECT") e.size=size;
}

const doMain = async function () {
  if (DATA.readyState == "loading") return;
  if (document.readyState == "loading") return;

  Object.values(DATA.fuente).forEach((i) => {
    const a1 = document.getElementById(i.id + "_url");
    const a2 = document.getElementById(i.id + "_via");
    const a = a1 || a2;
    if (a1) a1.href = i.url;
    if (a2) a2.href = i.via;
    if (a != null) {
      const t = (a.title || "").trim();
      if (t.length == 0) a.title = "Datos de " + i.fecha;
      else a.title = t + " (datos de " + i.fecha + ")";
    }
  });

  const [
    ministerio,
    centro,
    unidad,
    pais,
    provincia,
    localidad,
    provision
  ] = await Promise.all([
    DATA.db.get("ministerio"),
    DATA.db.get("centro"),
    DATA.db.get("unidad"),
    DATA.db.get("pais"),
    DATA.db.get("provincia"),
    DATA.db.get("localidad"),
    DATA.db.get("provision")
  ]);

  const organismo = ministerio.map((p)=>{
    return [
      p,
      centro.flatMap((i)=>{
        if (i.ministerio!=p.id) return [];
        if (i.id>0) return i;
        return unidad.filter(x=>x.centro==i.id);
      })
    ]
  })
  const lugar = pais.map((p)=>{
    return [
      p,
      provincia.flatMap((i)=>{
        if (i.pais!=p.id) return [];
        if (i.id>0) return i;
        return localidad.filter(x=>x.provincia==i.id);
      })
    ]
  })

  doOptions("grupo", Object.values(DATA.grupo).map(n=>n.id));
  doOptions("nivel", Object.values(DATA.nivel).map(n=>n.id));
  doOptionsGroups("organismo", organismo);
  doOptionsGroups("lugar", lugar);
  doOptions("provision", provision);

  document.body.classList.remove("loading");
}

document.addEventListener("DOMContentLoaded", doMain);
document.addEventListener(Data.eventDataContentLoaded, doMain);

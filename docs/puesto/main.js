/** @type {Data} */
const DATA = new Data();
const $ = (id) => document.getElementById(id);

function getGrupo(puesto) {
  if (puesto == null) return null;
  if (puesto.grupo.length == 1) return DATA.grupo[puesto.grupo[0]];
  const g = Q.get("grupo");
  if (puesto.grupo.includes(g)) return DATA.grupo[g];
  return null;
}

function toString(n, dec) {
  if (dec == null) dec = 0;
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
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
  /** @type {Puesto} */
  const puesto = await DATA.getPuesto(Q.get("puesto"));
  if (puesto == null) throw "Puesto no encontrado";
  document.title = "Puesto "+puesto.id;
  /** @type {Grupo} */
  const grupo = getGrupo(puesto);
  /** @type {Nivel} */
  const nivel = DATA.nivel[puesto.nivel];
  $("puesto").textContent = puesto.id;
  $("nivel").textContent = nivel.id;
  if (grupo != null) {
    $("grupo").insertAdjacentHTML("afterend", `<dd>${grupo.id}</dd>`);
    const sueldo = getSueldo(puesto, grupo, nivel);
    $("sueldo").insertAdjacentHTML(
      "beforeend",
      `<a title='${toString(sueldo.bruto.anual, 2)} €/año' href='../?${puesto.id}&${grupo.id}'>${toString(sueldo.bruto.anual)} €/año</a>`
    );
  } else {
    puesto.grupo.reverse().forEach((g) => {
      const sueldo = getSueldo(puesto, DATA.grupo[g], nivel);
      $("grupo").insertAdjacentHTML(
        "afterend",
        `<dd><a href="?${puesto.id}&${g}">${g}</a> (sueldo <a title='${toString(sueldo.bruto.anual, 2)} €/año' href='../?${puesto.id}&${g}'>${toString(sueldo.bruto.anual)} €/año</a>)</dd>`
      );
    });
  }

  let unidad;
  let localidad;
  [
    $("cargo").textContent,
    $("administracion").textContent,
    $("tipo").textContent,
    $("provision").textContent,
    $("formacion").textContent,
    unidad,
    localidad
  ] = await Promise.all([
    DATA.db.get_one("cargo.txt", puesto.cargo),
    DATA.db.get_one("administracion.txt", puesto.administracion),
    DATA.db.get_one("tipo_puesto.txt", puesto.tipo),
    DATA.db.get_one("provision.txt", puesto.provision),
    puesto.formacion==null?null:DATA.db.get_one("formacion.txt", puesto.formacion),
    DATA.db.get_one("unidad", puesto.unidad),
    DATA.db.get_one("localidad", (puesto.localidad??u.localidad))
  ])
  const c = await DATA.db.get_one("centro", unidad.centro);
  const m = await DATA.db.get_one("ministerio", c.ministerio);
  [unidad, c, m].forEach(x=>{
    if (x.id>0) $("administracion").insertAdjacentHTML("afterend", `<dd>${x.txt}</dd>`);
  })
  const pr = await DATA.db.get_one("provincia", localidad.provincia);
  const pa = await DATA.db.get_one("pais", pr.pais);
  [localidad, pr, pa].forEach(x=>{
    if (x.id>0) $("lugar").insertAdjacentHTML("afterend", `<dd>${x.txt}</dd>`);
  })
  const cuerpos = await getFromPuesto("cuerpo", puesto.id);
  cuerpos.forEach(x=>{
    $("cuerpo").insertAdjacentHTML("afterend", `<dd>${x.id}: ${x.txt}</dd>`);
  })
  const obs = await getFromPuesto("observacion", puesto.id);
  obs.forEach(x=>{
    $("observacion").insertAdjacentHTML("afterend", `<dd>${x.id}: ${x.txt}</dd>`);
  })
  const tit = await getFromPuesto("titulacion", puesto.id);
  tit.forEach(x=>{
    $("titulacion").insertAdjacentHTML("afterend", `<dd>${x.id}: ${x.txt}</dd>`);
  })

  showMain();

  document.body.classList.remove("loading");
};

async function getFromPuesto(table, id) {
  const arr = await DATA.db.selectWhere("puesto_"+table+"."+table, "puesto", id);
  if (arr.length==0) return [];
  const vals = await DATA.db.get(table, ...arr);
  return vals.map(x=>{
    if (x.txt!='¿?') return x;
    x.txt = "<a target='_blank' href='https://github.com/s-nt-s/age-db/issues/1'>¿?</a>"
    return x;
  })
}

function showMain() {
  document.querySelectorAll("dd").forEach(dd=>{
    if (dd.textContent.trim().length==0) dd.remove();
  })
  document.querySelectorAll("dt").forEach(dt=>{
    if (!dt.nextElementSibling || dt.nextElementSibling.tagName !== "DD") {
      dt.remove();
    }
  })
  document.body.classList.remove("loading");
}

function getSueldo(puesto, grupo, nivel) {
  const sueldo = new Nomina({
    base: new Ingreso({ anual: grupo.base, pagas: 12 }),
    extra: new Ingreso({ mensual: grupo.extra_base, pagas: 2 }),
    destino: new Ingreso({ anual: nivel.destino, pagas: 14 }),
    especifico: new Ingreso({ anual: puesto.especifico, pagas: 14 }),
    productividad: new Ingreso({ anual: 0, pagas: 12 }),
    muface: 0,
    irpf: 0,
    ss: 0,
    mei: 0,
  });
  return sueldo;
}

document.addEventListener("DOMContentLoaded", doMain);
document.addEventListener(Data.eventDataContentLoaded, doMain);

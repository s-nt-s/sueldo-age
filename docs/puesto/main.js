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
  /** @type {FullPuesto} */
  const puesto = await DATA.getFullPuesto(Q.get("puesto"));
  
  if (puesto == null) throw "Puesto no encontrado";
  document.title = "Puesto "+puesto.id;
  /** @type {Grupo} */
  const grupo = getGrupo(puesto);
  /** @type {Nivel} */
  const nivel = DATA.nivel[puesto.nivel];
  $("puesto").textContent = puesto.id;
  $("nivel").textContent = nivel.id;
  $("vacante").textContent = puesto.vacante?"Si":"No";
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

  $("cargo").textContent = puesto.cargo;
  $("administracion").textContent = puesto.administracion;
  $("tipo").textContent = puesto.tipo;
  $("provision").textContent = puesto.provision;
  $("formacion").textContent = puesto.formacion;
  $("lugar").textContent = puesto.lugar;
  
  const __link = (x) =>{
      if (x.txt!='¿?') return x.txt;
      return "<a target='_blank' href='https://github.com/s-nt-s/age-db/issues/1'>¿?</a>";
  }

  puesto.organizacion.forEach(x=>{
    $("administracion").insertAdjacentHTML("afterend", `<dd>${__link(x)}</dd>`);
  })
  puesto.cuerpo.forEach(x=>{
    $("cuerpo").insertAdjacentHTML("afterend", `<dd>${x.id}: ${__link(x)}</dd>`);
  })
  puesto.observacion.forEach(x=>{
    $("observacion").insertAdjacentHTML("afterend", `<dd>${x.id}: ${__link(x)}</dd>`);
  })
  puesto.titulacion.forEach(x=>{
    $("titulacion").insertAdjacentHTML("afterend", `<dd>${x.id}: ${__link(x)}</dd>`);
  })

  showMain();

  document.body.classList.remove("loading");
};


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

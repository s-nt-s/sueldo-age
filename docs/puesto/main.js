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

function toString(n) {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  /** @type {Grupo} */
  const grupo = getGrupo(puesto);
  /** @type {Nivel} */
  const nivel = puesto == null ? null : DATA.nivel[puesto.nivel];
  if ([puesto, grupo, nivel].includes(null)) return;
  $("puesto").textContent = puesto.id;
  $("nivel").textContent = nivel.id;
  if (grupo == null) {
    puesto.grupo.reverse().forEach((g) => {
      $("grupo").insertAdjacentHTML(
        "afterend",
        `<dl><a href="?puesto=${puesto.id}&grupo=${g}">${g}</a></dl>`
      );
    });
    document
      .querySelectorAll(".if_grupo")
      .forEach((n) => (n.style.display = "none"));
    document.body.classList.remove("loading");
    return;
  }
  $("grupo").insertAdjacentHTML("afterend", `<dl>${grupo.id}</dl>`);

  const sueldo = new Nomina({
    base: new Ingreso({ anual: grupo.base, pagas: 12 }),
    extra: new Ingreso({ mensual: grupo.extra_base, pagas: 2 }),
    destino: new Ingreso({ anual: nivel.complemento, pagas: 14 }),
    especifico: new Ingreso({ anual: puesto.especifico, pagas: 14 }),
    productividad: new Ingreso({ anual: 0, pagas: 12 }),
    muface: 0,
    irpf: 0,
    ss: 0,
    mei: 0,
  });
  $("sueldo").textContent = toString(sueldo.bruto.anual) + " €/año";

  [
    $("cargo").textContent,
    $("administracion").textContent,
  ] = await Promise.all([
    DATA.db.get("cargo.txt", puesto.cargo),
    DATA.db.get("administracion.txt", puesto.administracion)
  ])

  document.body.classList.remove("loading");
};

document.addEventListener("DOMContentLoaded", doMain);
document.addEventListener(Data.eventDataContentLoaded, doMain);

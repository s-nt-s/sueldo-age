class Item {
    #obj;
    constructor(obj) {
      this.#obj = Object.freeze(obj);
    }
  
    get id() {
        return this.#obj.id;
    }
    get _obj() {
        return this.#obj;
    }
  }

class Fuente extends Item {
    get id() {
        return this._obj.id.toLocaleLowerCase();
    }
    get url() {
        return this._obj.fuente;
    }
    get via() {
        return this._obj.via;
    }
    get fecha() {
        return this._obj.fecha;
    }
}

class Grupo extends Item {
    /** @type {number} */
    get base() {
        return this._obj.base;
    }
    /** @type {number} */
    get trienio() {
        return this._obj.trienio;
    }
    /** @type {number} */
    get extra_base() {
        return this._obj.extra_base;
    }
    /** @type {number} */
    get extra_trienio() {
        return this._obj.extra_trienio;
    }
    /** @type {number} */
    get muface() {
        return this._obj.muface_cotizacion;
    }
    /** @type {number[]} */
    get niveles() {
        return this._obj.niveles;
    }
}

class Nivel extends Item {
    /** @type {number} */
    get complemento() {
        return this._obj.complemento_destino;
    }
}

class Puesto extends Item {
    /** @type {string[]} */
    get grupo() {
        return this._obj.grupo;
    }
    /** @type {number} */
    get nivel() {
        return this._obj.nivel;
    }
    /** @type {number} */
    get especifico() {
        return this._obj.especifico;
    }
}



class Data {
    static eventDataContentLoaded = "DATAContentLoaded"

    /** @type {DB} */
    #db;
    /** @type {Record<string, Fuente>} */
    #fuente;
    /** @type {Record<string, Grupo>} */
    #grupo;
    /** @type {Record<number, Nivel>} */
    #nivel;
    /** @type {min: number, max: number} */
    #especifico;
    /** @type {number} */
    #mei;

    constructor() {
        this.#db = new DB();
        this.#fuente = null;
        this.#grupo = null;
        this.#nivel = null;
        this.#especifico = null;
        this.getPuesto = cache(this, this.getPuesto);
        // https://www.boe.es/buscar/act.php?id=BOE-A-2023-6967
        this.#mei = (()=>{
            const y = new Date().getFullYear();
            if (y>=2029 && y<=2050) return 0.2;
            const mei = {
                2023: 0.1,
                2024: 0.12,
                2025: 0.13,
                2026: 0.15,
                2027: 0.17,
                2028: 0.18,
            }[y];
            return mei??0;
        })();
        this.#init();
    }

    get fuente() {
        return this.#fuente;
    }

    get grupo() {
        return this.#grupo;
    }

    get nivel() {
        return this.#nivel;
    }

    get especifico() {
        return this.#especifico;
    }

    get mei() {
        return this.#mei;
    }

    get db() {
        return this.#db;
    }

    async #init() {
        const to_obj = async (table, cls) => {
            return this.db.all(table).then(i=>{
                const r = {};
                i.forEach(e => {
                    const v = new cls(e);
                    r[v.id] = v;
                });
                return Object.freeze(r)
            })
        }
        const fire = () => {
            if (this.readyState=="loading") return;
            console.log("FIRE ", Data.eventDataContentLoaded)
            document.dispatchEvent(new CustomEvent(Data.eventDataContentLoaded, {
                detail: this,
                bubbles: true,
                cancelable: false
            }));
        }
        to_obj("fuente", Fuente).then(o=>this.#fuente=o).finally(fire);
        to_obj("nivel", Nivel).then(o=>this.#nivel=o).finally(fire);
        this.#getGrupos().then(o=>this.#grupo=o).finally(fire);
        this.#db.minmax("puesto.especifico").then(o=>this.#especifico=o).finally(fire);
    }

    get niveles() {
        const nvls = new Set();
        Object.values(this.#grupo).forEach(g=>{
            g.niveles.forEach(n=>nvls.add(n));
        })
        const arr = Array.from(nvls).sort((a, b) => a - b);
        return Object.freeze(arr);
    }

    async #getGrupos() {
        const grnv = await this.db.all("grupo_nivel");
        const grps = await this.db.all("grupo");
        const r = {};
        grps.forEach(e => {
            e.niveles = [];
            grnv.forEach(nv=>{
                if (nv.grupo==e.id) e.niveles.push(nv.nivel);
            })
            e.niveles = Object.freeze(e.niveles);
            r[e.id] = new Grupo(e);
        });
        return Object.freeze(r)
    }

    get readyState() {
        if (this.#fuente == null) return "loading";
        if (this.#grupo == null) return "loading";
        if (this.#nivel == null) return "loading";
        if (this.#especifico == null) return "loading";
        return "complete";
    }
    async nivelesEnGrupo(val) {
        return await this.#db.selectWhere("grupo_nivel.nivel", "grupo", val);
    }
    async gruposEnNivel(val) {
        return await this.#db.selectWhere("grupo_nivel.grupo", "nivel", val);
    }
    async getPuesto(id) {
        const p = await this.#db.get_one("puesto", id);
        p.grupo = await this.#db.selectWhere("puesto_grupo.grupo", "puesto", p.id);
        return new Puesto(p);
    }
}


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
        return this._obj.destino;
    }
    /** @type {min: number, max: number} */
    get especifico() {
        return {
            min: this._obj.min_especifico,
            max: this._obj.max_especifico
        }
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
    /** @type {number} */
    get cargo() {
        return this._obj.cargo;
    }
    /** @type {string} */
    get administracion() {
        return this._obj.administracion;
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
    /** @type {number} */
    #mei;

    constructor() {
        this.#db = new DB();
        this.#fuente = null;
        this.#grupo = null;
        this.#nivel = null;
        this.getPuesto = asyncCache(this, this.getPuesto);
        this.getRangeEspecifico = cache(this, this.getRangeEspecifico);
        this.getRangeNiveles = cache(this, this.getRangeNiveles);
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
        let puesto;
        [
            this.#fuente,
            this.#nivel,
            this.#grupo,
            puesto
        ] = await Promise.all([
            to_obj("fuente", Fuente),
            this.#getNiveles(),
            this.#getGrupos(),
            this.getPuesto(Q.puesto)
        ]);
        document.dispatchEvent(new CustomEvent(Data.eventDataContentLoaded, {
            detail: this,
            bubbles: true,
            cancelable: false
        }));
    }

    /** @type {number[]} */
    getRangeNiveles(gr) {
        const grp = this.grupo[gr];
        if (grp!=null) return grp.niveles;
        const nvls = new Set();
        Object.values(this.#grupo).forEach(g=>{
            g.niveles.forEach(n=>nvls.add(n));
        })
        const arr = Array.from(nvls).sort((a, b) => a - b);
        return Object.freeze(arr);
    }

    /** @type {min: number, max: number} */
    getRangeEspecifico(gr, nv) {
        const n = this.nivel[parseInt(nv)];
        if (n!=null) return n.especifico;
        const grp = this.grupo[gr];
        const grps = grp==null?Object.values(this.grupo):[grp];
        let mn = Infinity;
        let mx = -Infinity;
        grps.forEach(g=>{
            g.niveles.forEach(i=>{
                const es = this.nivel[i].especifico;
                if (es.min < mn) mn = es.min;
                if (es.max > mx) mx = es.max;
            })
        })
        return {
            min: mn,
            max: mx
        }
    }

    async #getNiveles() {
        let i = 0;
        const nvl = await this.db.all("nivel_complemento");
        if (nvl[0].min_especifico == null) nvl[0].min_especifico = 0;
        if (nvl[nvl.length-1].max_especifico == null) nvl[nvl.length-1].max_especifico = Infinity;
        nvl.forEach((n, x)=>{
            if (n.min_especifico == null) n.min_especifico = nvl[x-1].max_especifico;
            if (n.max_especifico == null) n.max_especifico = nvl[x+1].min_especifico;
        })
        const r = {};
        nvl.forEach(n=>r[n.id]=new Nivel(n));
        return Object.freeze(r);
    }

    async #getGrupos() {
        const [grnv, grps] = await Promise.all([
            this.db.all("grupo_nivel"),
            this.db.all("grupo")
        ]);
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
        return "complete";
    }
    async nivelesEnGrupo(val) {
        return await this.#db.selectWhere("grupo_nivel.nivel", "grupo", val);
    }
    async gruposEnNivel(val) {
        return await this.#db.selectWhere("grupo_nivel.grupo", "nivel", val);
    }
    async getPuesto(id) {
        id = parseInt(id);
        if (isNaN(id)) return null;
        const [p, grupo] = await Promise.all([
            this.#db.get_one("puesto", id),
            this.#db.selectWhere("puesto_grupo.grupo", "puesto", id)
        ]);
        p.grupo = grupo;
        return new Puesto(p);
    }
}


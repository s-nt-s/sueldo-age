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
}

class Nivel extends Item {
    /** @type {number} */
    get complemento() {
        return this._obj.complemento_destino;
    }
}

class Data {
    static eventDataContentLoaded = "DATAContentLoaded"

    #db;
    /** @type {Record<string, Fuente>} */
    #fuente;
    /** @type {Record<string, Grupo>} */
    #grupo;
    /** @type {Record<number, Nivel>} */
    #nivel;
    /** @type {min: number, max: number} */
    #especifico;

    constructor() {
        this.#db = new DBAge();
        this.#fuente = null;
        this.#grupo = null;
        this.#nivel = null;
        this.#especifico = null;
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
        to_obj("grupo", Grupo).then(o=>this.#grupo=o).finally(fire);
        to_obj("nivel", Nivel).then(o=>this.#nivel=o).finally(fire);
        this.#db.minmax("puesto.especifico").then(o=>this.#especifico=o).finally(fire);
    }
    get readyState() {
        if (this.#fuente == null) return "loading";
        if (this.#grupo == null) return "loading";
        if (this.#nivel == null) return "loading";
        if (this.#especifico == null) return "loading";
        return "complete";
    }
}


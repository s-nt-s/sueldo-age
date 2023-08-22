class Ingreso {
    #anual   = -1;
    #mensual = -1;
    #pagas   = -1;

    constructor({anual = null, mensual = null, pagas = null} = {}) {
        this.#anual = anual;
        this.#mensual = mensual;
        this.#pagas = pagas;
        if (this.#pagas != null) {
            if (this.#anual == null) this.#anual = this.#mensual * this.#pagas;
            if (this.#mensual == null) this.#mensual = this.#anual / this.#pagas;
        }
    }

    get anual()   {return this.#anual;}
    get mensual() {return this.#mensual;}
}

class Paga {
    #normal = new Ingreso();
    #extra  = new Ingreso();

    constructor({normal = new Ingreso(), extra = new Ingreso()}) {
        this.#normal = normal;
        this.#extra = extra;
    }

    get normal() {return this.#normal;}
    get extra()  {return this.#extra;}
    get anual()  {return this.#normal.anual + this.#extra.anual;}
}

class Nomina {
    constructor({
        base,
        extra,
        destino,
        especifico,
        productividad,
        muface,
        irpf,
        ss,
        mei
    }) {
        this.base = base;
        this.extra = extra;
        this.destino = destino;
        this.especifico = especifico;
        this.productividad = productividad;
        this.muface = muface;
        this.irpf = irpf;
        this.ss = ss;
        this.mei = mei;
    }

    get bruto() {
        const normal = new Ingreso({
            pagas: 12,
            mensual: (
                this.base.mensual + 
                this.destino.mensual + 
                this.especifico.mensual + 
                this.productividad.mensual
            )
        });
        const extra = new Ingreso({
            pagas: 2,
            mensual: (
                this.extra.mensual + 
                this.destino.mensual + 
                this.especifico.mensual
            )
        });

        return new Paga({
            normal: normal, 
            extra: extra
        });
    }

    get neto() {
        const normal = new Ingreso({
            pagas: 12,
            mensual: (
                this.bruto.normal.mensual * (1-this.irpf-this.ss-this.mei) +
                -this.muface +
                // la SS y MEI de la extra se paga mensualmente
                -(this.bruto.extra.anual/12)*(this.ss+this.mei)
            )
        });
        const extra = new Ingreso ({
            pagas: 2,
            mensual: (
                // solo se paga el irpf porque la SS y MEI de la extra
                // ya se han pagado durante el resto del año
                this.bruto.extra.mensual * (1-this.irpf) +
                -this.muface
            )
        });

        return new Paga({
            normal: normal, 
            extra: extra
        });
    }
}
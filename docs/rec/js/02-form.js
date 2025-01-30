class Form {
    get form() {
        return document.forms[0];
    }
    /** @type {HTMLParagraphElement} */
    get error() {
        return document.querySelector("#resultado p.error");
    }
    /** @type {HTMLDivElement} */
    get msg() {
        return document.querySelector("#resultado div.msg");
    }
    /** @type {HTMLAnchorElement} */
    get link() {
        return document.querySelector("#sueldo a");
    }
    /** @type {HTMLSelectElement} */
    get grupo() {
        return this.form.elements['grupo'];
    }
    /** @type {HTMLSelectElement} */
    get nivel() {
        return this.form.elements['nivel'];
    }
    /** @type {HTMLInputElement} */
    get especifico() {
        return this.form.elements['especifico'];
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
  
class MKQ {
  #qr = '';
  #Q = {}

  constructor(qr, skipVal) {
    this.#qr = qr ||
      window.location.search.substring(1) ||
      window.location.hash.substring(1);
    this.#Q = MKQ.parse(this.#qr, skipVal);
  }
  static parse(qr, skipVal) {
    if (qr==null || qr.length==0) return null;
    const _Q={};
    let k, v, pair;
    qr.split("&").forEach((item, i) => {
        pair = item.split('=');
        k = decodeURIComponent(pair[0]);
        v = decodeURIComponent(pair[1] || '');
        v = v.replace(/\++/g, " ").trim();
        if (pair.length==1 || v.length==0) {
          _Q[k]=true;
          return;
        }
        const _v = parseFloat(v);
        if (!Number.isNaN(_v)) v=_v;
        if (skipVal!=null) {
          if (Array.isArray(skipVal) && skipVal.includes(v)) return;
          if (skipVal==v) return;
        }
        _Q[k] = v;
    });
    console.log("Q", _Q);
    return _Q;
  }
  static toString(_Q) {
    if (_Q==null || Object.keys(_Q).length==0) return null;
    const N_QA={};
    const N_QB={};
    for (const [k, v] of Object.entries(_Q)) {
      if (Array.isArray(v)) N_QA[k]=v.join(" ");
      else N_QB[k]=v;
    }
    const new_qr = [N_QB, N_QA].flatMap((N) => {
      if (Object.keys(N).length==0) return [];
      return Object.entries(N).map(([k, v])=>{
        return encodeURIComponent(k) + "=" + (encodeURIComponent(v)).replace(/%20/g, '+')
      });
    }).join("&").trim();
    if (new_qr.length==0) return null;
    return new_qr;
  }
  toString() {
    return MKQ.toString(this.#Q);
  }
  redirect() {
    const new_qr = this.toString();
    if (new_qr==null || this.#qr==new_qr) return false;
    window.location.search="?"+new_qr;
    console.log("REDIRECT:\n   "+this.#qr+" -->\n   "+new_qr);
    return true;
  }
  get(k, spl) {
    if (arguments.length==0) return this.#Q;
    if (this.#Q==null) return null;
    let v=this.#Q[k];
    if (spl!=null && v!=null) {
      v = (""+v).split(spl).map(s => s.trim()).filter(s => s.length);
    }
    return v;
  }
  isEmpty() {
    return this.#Q==null || Object.keys(this.#Q).length==0;
  }
}

Q = new MKQ(null, 0);

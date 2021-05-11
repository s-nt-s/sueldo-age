function toQuery(obj) {
  var str = [];
  for(var p in obj)
     str.push(
       encodeURIComponent(p) + "=" +
       (encodeURIComponent(obj[p])).replace(/%20/g, '+')
     );
  return str.join("&");
}


class MKQ {
  constructor(qr, skipVal) {
    this.qr = qr ||
      window.location.search.substr(1) ||
      window.location.hash.substr(1);
    this.Q = MKQ.parse(this.qr, skipVal);
  }
  static parse(qr, skipVal) {
    if (qr==null || qr.length==0) return null;
    var _Q={};
    var k, v;
    qr.split("&").forEach((item, i) => {
        var pair = item.split('=');
        k = decodeURIComponent(pair[0]);
        v = decodeURIComponent(pair[1] || '');
        v = v.replace(/\++/g, " ").trim();
        if (pair.length==1 || v.length==0) {
          _Q[k]=true;
          return;
        }
        var _v = parseFloat(v, 10);
        if (!Number.isNaN(_v)) v=_v;
        if (skipVal!=null) {
          if (Array.isArray(skipVal) && skipVal.indexOf(v)>=0) return;
          if (skipVal==v) return;
        }
        _Q[k] = v;
    });
    console.log(_Q);
    return _Q;
  }
  static toString(_Q) {
    if (_Q==null || Object.keys(_Q).length==0) return null;
    var new_qr=[];
    var N_QA={};
    var N_QB={};
    for (const [k, v] of Object.entries(_Q)) {
      if (Array.isArray(v)) N_QA[k]=v.join(" ");
      else N_QB[k]=v;
    }
    [N_QB, N_QA].forEach(function (N) {
      if (Object.keys(N).length) new_qr.push(toQuery(N));
    });
    new_qr = new_qr.join("&").trim();
    if (new_qr.length==0) return null;
    return new_qr;
  }
  toString() {
    return MKQ.toString(this.Q);
  }
  redirect() {
    var new_qr = this.toString();
    if (new_qr==null || this.qr==new_qr) return false;
    window.location.search="?"+new_qr;
    console.log("REDIRECT:\n   "+this.qr+" -->\n   "+new_qr);
    return true;
  }
  get(k, spl) {
    if (this.Q==null) return null;
    var v=this.Q[k];
    if (spl!=null && v!=null) {
      v = (""+v).split(spl).map(function(s){
        return s.trim();
      }).filter(function(s){
        return s.length;
      })
    }
    return v;
  }
  isEmpty() {
    return this.Q==null || Object.keys(this.Q).length==0;
  }
}

Q = new MKQ(null, 0);

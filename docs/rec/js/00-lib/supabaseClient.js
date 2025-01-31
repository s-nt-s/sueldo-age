class DB {
  #db;
  #onerror

  constructor(onerror) {
    const { createClient } = supabase;
    this.#db = createClient(
      "https://yzdhmjrzdywlzbhmhmst.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZGhtanJ6ZHl3bHpiaG1obXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNzQ1NDIsImV4cCI6MjA1Mjk1MDU0Mn0.UJAf3qUL2bt5NTS-1koXUATbuLKMMBc5_1okDsmuGvc",
    );
    this.#onerror = onerror;
    this.get = asyncCache(this, this.get);
    this.get_one = asyncCache(this, this.get_one);
    this.select = asyncCache(this, this.select);
    this.minmax = asyncCache(this, this.minmax);
  }


  from(relation) {
    return this.#db.from(relation);
  }

  get_data(log, obj) {
    if (obj.error) {
      console.error(log, obj);
      if (this.#onerror) this.#onerror(obj.error);
      throw obj.error;
    }
    console.log(log+': '+obj.data.length+' resultados');
    return obj.data;
  }

  async get_one(table, id) {
    const r = await this.selectWhere(table, 'id', id);
    if (r.length == 1) return r[0];
    throw `${table}[id=${id}] devuelve ${r.length} resultados`;
  }

  async get(table, ...ids) {
    return await this.selectWhere(table, 'id', ...ids);
  }

  async selectWhere(table_field, where_field, ...arr) {
    let [table, field] = table_field.split(".");
    let prm = this.from(table)
    if (field==null) prm = prm.select();
    else prm = prm.select(field)
    if (arr.length == 1) prm = prm.eq(where_field, arr[0]);
    else if (arr.length>1) prm = prm.in(where_field, arr);
    const r = this.get_data(
      arr.length==0?table_field:`${table_field}[${where_field}=${arr}]`,
      await prm
    );
    if (field == null) return r;
    return r.map(i=>i[field]);
  }

  async all(table) {
    return this.get(table);
  }

  async minmax(table_field, where_field, ...arr) {
    let [t, f] = table_field.split(".");
    let where='';
    const getPrm = () => {
      let prm = this.from(t).select(f);
      if (where_field!=null && arr.length>0) {
        where=`[${where_field}=${arr}]`;
        if (arr.length == 1) prm = prm.eq(where_field, arr[0]);
        else if (arr.length>1) prm = prm.in(where_field, arr);
      }
      return prm;
    }
    const [
      prm1,
      prm2
    ] = await Promise.all([
      getPrm().order(f, { ascending: true }).limit(1),
      getPrm().order(f, { ascending: false }).limit(1)
    ]);

    /** @type {number} */
    const mn = this.get_data(
      `min(${table_field}${where})`,
      prm1
    )[0];

    /** @type {number} */
    const mx = this.get_data(
      `max(${table_field}${where})`,
      prm2
    )[0];
    return {
      min:mn==null?undefined:mn[f],
      max:mx==null?undefined:mx[f]
    };
  }
}

function cache(_this_, func) {
  const cacheMap = new Map();

  return async function (...args) {
    const key = args.length==1?args[0]:JSON.stringify(args);
    if (cacheMap.has(key)) return cacheMap.get(key);
    const result = await func.apply(_this_, args);
    cacheMap.set(key, result);
    return result;
  };
}


class DBAge {
  #db;
  #onerror

  constructor(onerror) {
    const { createClient } = supabase;
    this.#db = createClient(
      "https://yzdhmjrzdywlzbhmhmst.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZGhtanJ6ZHl3bHpiaG1obXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNzQ1NDIsImV4cCI6MjA1Mjk1MDU0Mn0.UJAf3qUL2bt5NTS-1koXUATbuLKMMBc5_1okDsmuGvc",
    );
    this.#onerror = onerror;
    this.get = cache(this, this.get);
    this.get_one = cache(this, this.get_one);
    this.select = cache(this, this.select);
    this.minmax = cache(this, this.minmax);
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
    const r = await this.get(table, id);
    if (r.length == 1) return r[0];
    throw `${table}[id=${id}] devuelve ${r.length} resultados`;
  }

  async get(table, ...ids) {
    let prm = this.from(table).select();
    if (ids.length == 1) prm = prm.eq('id', ids[0]);
    else if (ids.length>1) prm = prm.in('id', ids);
    return this.get_data(
      ids.length==0?table:`${table}[id=${ids}]`,
      await prm
    );
  }

  async all(table) {
    return this.get(table);
  }

  async select(table_field) {
    let [t, f] = table_field.split(".");
    let prm = this.from(t).select(f).order(f);
    return this.get_data(
      `${table_field}`,
      await prm
    ).map(e=>e[f]);
  }

  async minmax(table_field) {
    let [t, f] = table_field.split(".");

    const prm1 = this.from(t).select(f).order(f, { ascending: true }).limit(1);
    const prm2 = this.from(t).select(f).order(f, { ascending: false }).limit(1);

    /** @type {number} */
    const mn = this.get_data(
      `min(${table_field})`,
      await prm1
    )[0][f];

    /** @type {number} */
    const mx = this.get_data(
      `max(${table_field})`,
      await prm2
    )[0][f];
    return {
      min:mn,
      max:mx
    };
  }

}

const DB = new DBAge();
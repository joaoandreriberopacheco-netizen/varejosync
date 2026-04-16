import { ENTITY_TO_TABLE } from './entityTableMap';

function parseOrder(order) {
  if (order === undefined || order === null || order === '') {
    return { column: 'created_at', ascending: false };
  }
  const s = String(order);
  const ascending = !s.startsWith('-');
  let field = ascending ? s : s.slice(1);
  if (field === 'created_date') field = 'created_at';
  if (field === 'updated_date') field = 'updated_at';
  return { column: field, ascending };
}

function decorateRow(row, entityName) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  if ('created_at' in out && out.created_at != null) out.created_date = out.created_at;
  if ('updated_at' in out && out.updated_at != null) out.updated_date = out.updated_at;
  if (entityName === 'TargetFlare') {
    if ('flare_line' in out) out.line = out.flare_line;
    if ('flare_column' in out) out.column = out.flare_column;
  }
  if (entityName === 'PedidoVenda' && out.total != null && out.valor_total == null) {
    out.valor_total = out.total;
  }
  return out;
}

function prepareWritePayload(payload, entityName) {
  if (!payload || typeof payload !== 'object') return payload;
  const p = { ...payload };
  delete p.created_date;
  delete p.updated_date;
  if (entityName === 'TargetFlare') {
    if ('line' in p) {
      p.flare_line = p.line;
      delete p.line;
    }
    if ('column' in p) {
      p.flare_column = p.column;
      delete p.column;
    }
  }
  if (entityName === 'PedidoVenda' && p.valor_total != null && p.total == null) {
    p.total = p.valor_total;
  }
  delete p.valor_total;
  return p;
}

function applyFilters(query, where) {
  if (!where || typeof where !== 'object') return query;
  let q = query;
  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      q = q.in(key, val);
    } else {
      q = q.eq(key, val);
    }
  }
  return q;
}

function throwIfError(result, context) {
  if (result.error) {
    throw new Error(`[P38][supabase][${context}] ${result.error.message || result.error}`);
  }
}

function createEntityApi(supabase, entityName, table) {
  async function list(order, limit) {
    const { column, ascending } = parseOrder(order);
    let q = supabase.from(table).select('*').order(column, { ascending, nullsFirst: false });
    if (limit != null && Number.isFinite(Number(limit))) {
      q = q.limit(Number(limit));
    }
    const res = await q;
    throwIfError(res, `${entityName}.list`);
    return (res.data || []).map((row) => decorateRow(row, entityName));
  }

  async function filter(where, order, limit) {
    let q = supabase.from(table).select('*');
    q = applyFilters(q, where);
    if (order !== undefined && order !== null && order !== '') {
      const { column, ascending } = parseOrder(order);
      q = q.order(column, { ascending, nullsFirst: false });
    }
    if (limit != null && Number.isFinite(Number(limit))) {
      q = q.limit(Number(limit));
    }
    const res = await q;
    throwIfError(res, `${entityName}.filter`);
    return (res.data || []).map((row) => decorateRow(row, entityName));
  }

  async function get(id) {
    const res = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    throwIfError(res, `${entityName}.get`);
    return decorateRow(res.data, entityName);
  }

  async function create(payload) {
    const row = prepareWritePayload(payload, entityName);
    if (!row.id) {
      row.id = crypto.randomUUID();
    }
    const res = await supabase.from(table).insert(row).select('*').single();
    throwIfError(res, `${entityName}.create`);
    return decorateRow(res.data, entityName);
  }

  async function update(id, payload) {
    const row = prepareWritePayload(payload, entityName);
    delete row.id;
    const res = await supabase.from(table).update(row).eq('id', id).select('*').single();
    throwIfError(res, `${entityName}.update`);
    return decorateRow(res.data, entityName);
  }

  async function remove(id) {
    const res = await supabase.from(table).delete().eq('id', id);
    throwIfError(res, `${entityName}.delete`);
    return res.data;
  }

  async function bulkCreate(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const prepared = rows.map((r) => {
      const row = prepareWritePayload(r, entityName);
      if (!row.id) row.id = crypto.randomUUID();
      return row;
    });
    const res = await supabase.from(table).insert(prepared).select('*');
    throwIfError(res, `${entityName}.bulkCreate`);
    return (res.data || []).map((row) => decorateRow(row, entityName));
  }

  function subscribe(_callback) {
    if (import.meta.env.DEV) {
      console.debug(`[P38][supabase] ${entityName}.subscribe — realtime não ligado (usar Base44 ou canal postgres depois)`);
    }
    return () => {};
  }

  return {
    list,
    filter,
    get,
    create,
    update,
    delete: remove,
    bulkCreate,
    subscribe
  };
}

/**
 * Proxy em cima de base44.entities: rotas listadas em ENTITY_TO_TABLE vão para Supabase.
 */
export function createSupabaseEntityLayer(base44Entities, supabase) {
  return new Proxy(base44Entities, {
    get(target, prop) {
      const name = String(prop);
      const table = ENTITY_TO_TABLE[name];
      if (table) {
        return createEntityApi(supabase, name, table);
      }
      const orig = target[prop];
      return orig;
    }
  });
}

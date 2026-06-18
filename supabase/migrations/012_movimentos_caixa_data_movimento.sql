-- Data efetiva do movimento (retroativo); created_at continua sendo o instante do registro.
alter table public.movimentos_caixa
  add column if not exists data_movimento date;

create index if not exists idx_movimentos_caixa_data_movimento
  on public.movimentos_caixa (conta_id, data_movimento desc nulls last);

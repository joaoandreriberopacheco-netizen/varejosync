-- Guardrails de "id mãe" para LancamentoFinanceiro.
-- Regra:
-- 1) Todo lançamento deve ter grupo_lancamento_id preenchido.
-- 2) Se recorrente e sem grupo, tenta usar referencia_id (quando existir) como mãe.
-- 3) Se ainda assim não houver, usa o próprio id do lançamento.

alter table public.lancamento_financeiro
  add column if not exists grupo_lancamento_id text;

create index if not exists idx_lancamento_financeiro_grupo
  on public.lancamento_financeiro (grupo_lancamento_id);

create or replace function public.ensure_lancamento_grupo_id_mae()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.grupo_lancamento_id, '') = '' then
    if (
      coalesce(new.is_recorrente, false) = true
      or coalesce(new.frequencia_recorrencia, '') <> ''
    ) and coalesce(new.referencia_id, '') <> '' then
      new.grupo_lancamento_id := new.referencia_id;
    else
      new.grupo_lancamento_id := new.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lancamento_ensure_grupo_id_mae on public.lancamento_financeiro;
create trigger trg_lancamento_ensure_grupo_id_mae
before insert or update on public.lancamento_financeiro
for each row
execute function public.ensure_lancamento_grupo_id_mae();

-- Backfill: preencher históricos sem grupo.
update public.lancamento_financeiro
set grupo_lancamento_id = case
  when (
    coalesce(is_recorrente, false) = true
    or coalesce(frequencia_recorrencia, '') <> ''
  ) and coalesce(referencia_id, '') <> '' then referencia_id
  else id
end
where coalesce(grupo_lancamento_id, '') = '';


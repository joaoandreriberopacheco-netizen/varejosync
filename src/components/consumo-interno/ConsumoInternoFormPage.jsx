import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Plus, Search, X, Signature, Paperclip, Clock3, ChevronRight, Check
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// ── Mobile step indicator ──────────────────────────────────────────────────
function StepDots({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < step ? 'bg-gray-900 dark:bg-white w-5' : i === step ? 'bg-gray-400 dark:bg-gray-500 w-5' : 'bg-gray-200 dark:bg-gray-700 w-2'
          }`}
        />
      ))}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ── Item card ──────────────────────────────────────────────────────────────
function ItemCard({ item, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 shadow-sm dark:bg-gray-800">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{item.produto_nome}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {item.quantidade} {item.unidade_medida} · custo calc. {fmt(item.custo_unitario)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-base font-bold text-gray-800 dark:text-gray-200">{fmt(item.subtotal)}</span>
        <button type="button" onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:bg-gray-700 dark:text-gray-500">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── DESKTOP: vertical single-column full form ──────────────────────────────
function DesktopForm({ formData, setFormData, turnos, destinacoes, responsaveis, setNovoCadastro, totalAtual, onOpenSelector, currentUser, onOpenAssinatura, onSubmit, onBack, attachedCount, onFileChange }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-10">
      {/* Section: Dados */}
      <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <p className="mb-5 text-xl font-bold text-gray-900 dark:text-white">Dados do consumo</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Caixa ativo do dia">
            <Select value={formData.turno_caixa_id} onValueChange={(v) => setFormData((p) => ({ ...p, turno_caixa_id: v }))}>
              <SelectTrigger className="h-12 rounded-2xl border-0 bg-gray-100 text-sm shadow-sm dark:bg-gray-900">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {turnos.map((t) => <SelectItem key={t.id} value={t.id}>{t.conta_caixa_pdv_nome} · {t.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Destinação">
            <div className="flex items-stretch gap-2 min-w-0">
              <SearchableSelect
                items={destinacoes || []}
                value={formData.destinacao}
                onChange={(v) => setFormData((p) => ({ ...p, destinacao: v }))}
                placeholder="Buscar destino"
                onAddNew={(name) => setNovoCadastro({ tipo: 'destinacao', valor: name })}
                displayField="nome"
                idField="id"
              />
              <Button type="button" variant="ghost" onClick={() => setNovoCadastro({ tipo: 'destinacao', valor: '' })} className="h-12 w-12 shrink-0 rounded-2xl bg-gray-100 shadow-sm dark:bg-gray-900">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="Tags">
            <Input
              className="h-12 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900"
              placeholder="obra, manutenção..."
              onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))}
            />
          </Field>
          <Field label="Interveniente / quem recebeu">
            <div className="flex items-stretch gap-2 min-w-0">
              <SearchableSelect
                items={responsaveis || []}
                value={formData.responsavel_recebimento}
                onChange={(v) => setFormData((p) => ({ ...p, responsavel_recebimento: v }))}
                placeholder="Buscar interveniente"
                onAddNew={(name) => setNovoCadastro({ tipo: 'responsavel', valor: name })}
                displayField="nome"
                idField="id"
              />
              <Button type="button" variant="ghost" onClick={() => setNovoCadastro({ tipo: 'responsavel', valor: '' })} className="h-12 w-12 shrink-0 rounded-2xl bg-gray-100 shadow-sm dark:bg-gray-900">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </div>
        <Field label="Observações">
          <Textarea
            className="mt-3 min-h-[80px] rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900"
            value={formData.observacoes}
            onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
          />
        </Field>
      </div>

      {/* Section: Itens */}
      <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xl font-bold text-gray-900 dark:text-white">Itens</p>
          <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">{fmt(totalAtual)}</span>
        </div>
        <Button type="button" onClick={onOpenSelector} variant="outline" className="mb-4 h-12 w-full justify-start rounded-2xl border-0 bg-gray-100 text-sm text-gray-700 shadow-sm hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200">
          <Search className="mr-2 h-4 w-4" /> Adicionar item
        </Button>
        <div className="space-y-2">
          {formData.itens.map((item, i) => (
            <ItemCard key={i} item={item} onRemove={() => setFormData((p) => ({ ...p, itens: p.itens.filter((_, j) => j !== i) }))} />
          ))}
          {!formData.itens.length && (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-600">Nenhum item adicionado</p>
          )}
        </div>
      </div>

      {/* Section: Minuta */}
      <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <p className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Minuta</p>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onOpenAssinatura} className="h-14 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900">
            <Signature className="mr-2 h-4 w-4" />
            {formData.assinatura_recolhedor_nome ? `✓ ${formData.assinatura_recolhedor_nome}` : 'Coletar assinatura'}
          </Button>
          <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gray-100 text-sm text-gray-500 shadow-sm dark:bg-gray-900">
            <Paperclip className="h-4 w-4" />
            {attachedCount > 0 ? `${attachedCount} arquivo(s)` : 'Adicionar anexos'}
            <input id="consumo-anexo-input" type="file" multiple className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <div className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">
            <Clock3 className="h-3.5 w-3.5" /> Resumo da minuta
          </div>
          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <p><strong>Destinação:</strong> {formData.destinacao || '—'}</p>
            <p><strong>Interveniente:</strong> {formData.responsavel_recebimento || '—'}</p>
            <p><strong>Registrado por:</strong> {currentUser?.full_name || currentUser?.email || '—'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="h-14 flex-1 rounded-2xl border-0 bg-white text-base shadow-sm dark:bg-gray-800">
          Cancelar
        </Button>
        <Button type="button" onClick={onSubmit} className="h-14 flex-[2] rounded-2xl bg-gray-900 text-base text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900">
          Concluir
        </Button>
      </div>
    </div>
  );
}

// ── MOBILE: PDV-style step flow ────────────────────────────────────────────
function MobileForm({ step, setStep, formData, setFormData, turnos, destinacoes, responsaveis, setNovoCadastro, totalAtual, onOpenSelector, currentUser, onOpenAssinatura, onSubmit, onBack, attachedCount, onFileChange }) {

  // Step 0: Dados básicos
  if (step === 0) return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Field label="Caixa ativo do dia">
          <Select value={formData.turno_caixa_id} onValueChange={(v) => setFormData((p) => ({ ...p, turno_caixa_id: v }))}>
            <SelectTrigger className="h-14 rounded-2xl border-0 bg-gray-100 text-base shadow-sm dark:bg-gray-800">
              <SelectValue placeholder="Selecione o caixa" />
            </SelectTrigger>
            <SelectContent>
              {turnos.map((t) => <SelectItem key={t.id} value={t.id}>{t.conta_caixa_pdv_nome} · {t.numero}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Destinação">
          <div className="flex items-stretch gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                items={destinacoes || []}
                value={formData.destinacao}
                onChange={(v) => setFormData((p) => ({ ...p, destinacao: v }))}
                placeholder="Buscar destino"
                onAddNew={(name) => setNovoCadastro({ tipo: 'destinacao', valor: name })}
                displayField="nome"
                idField="id"
              />
            </div>
            <button type="button" onClick={() => setNovoCadastro({ tipo: 'destinacao', valor: '' })} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 shadow-sm dark:bg-gray-800">
              <Plus className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </Field>
        <Field label="Interveniente / quem recebeu">
          <div className="flex items-stretch gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                items={responsaveis || []}
                value={formData.responsavel_recebimento}
                onChange={(v) => setFormData((p) => ({ ...p, responsavel_recebimento: v }))}
                placeholder="Buscar interveniente"
                onAddNew={(name) => setNovoCadastro({ tipo: 'responsavel', valor: name })}
                displayField="nome"
                idField="id"
              />
            </div>
            <button type="button" onClick={() => setNovoCadastro({ tipo: 'responsavel', valor: '' })} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 shadow-sm dark:bg-gray-800">
              <Plus className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </Field>
        <Field label="Tags (opcional)">
          <Input className="h-14 rounded-2xl border-0 bg-gray-100 text-base shadow-sm dark:bg-gray-800" placeholder="obra, manutenção..." onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))} />
        </Field>
        <Field label="Observações (opcional)">
          <Textarea className="rounded-2xl border-0 bg-gray-100 text-base shadow-sm dark:bg-gray-800" value={formData.observacoes} onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))} />
        </Field>
      </div>
      <div className="shrink-0 border-t border-gray-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] dark:border-gray-800 dark:bg-gray-900">
        <button type="button" onClick={() => setStep(1)} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-lg font-semibold text-white shadow-sm dark:bg-white dark:text-gray-900">
          Próximo <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  // Step 1: Itens
  if (step === 1) return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <button type="button" onClick={() => {
          console.log('consumo:abrir-seletor-item');
          onOpenSelector();
        }} className="mb-5 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gray-100 text-base font-semibold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
          <Search className="h-5 w-5" /> Buscar e adicionar item
        </button>
        <div className="space-y-3">
          {formData.itens.map((item, i) => (
            <ItemCard key={i} item={item} onRemove={() => setFormData((p) => ({ ...p, itens: p.itens.filter((_, j) => j !== i) }))} />
          ))}
          {!formData.itens.length && (
            <div className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-400 dark:bg-gray-800 dark:text-gray-600">
              Nenhum item adicionado
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between px-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{formData.itens.length} item(ns)</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totalAtual)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setStep(0)} className="flex h-14 items-center justify-center rounded-2xl bg-gray-100 text-base font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Voltar
          </button>
          <button type="button" onClick={() => setStep(2)} className="flex h-14 items-center justify-center rounded-2xl bg-gray-900 text-base font-semibold text-white dark:bg-white dark:text-gray-900">
            Próximo <ChevronRight className="ml-1 h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // Step 2: Minuta
  if (step === 2) return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <button type="button" onClick={onOpenAssinatura} className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gray-100 text-base font-semibold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
          <Signature className="h-5 w-5" />
          {formData.assinatura_recolhedor_nome ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> {formData.assinatura_recolhedor_nome}</span>
          ) : 'Coletar assinatura'}
        </button>
        <label className="flex h-16 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-gray-100 text-base font-semibold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
          <Paperclip className="h-5 w-5" />
          {attachedCount > 0 ? `${attachedCount} arquivo(s) selecionado(s)` : 'Adicionar anexos'}
          <input id="consumo-anexo-input" type="file" multiple className="hidden" onChange={onFileChange} />
        </label>
        <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">
            <Clock3 className="h-3.5 w-3.5" /> Resumo
          </div>
          <div className="space-y-2 text-base text-gray-700 dark:text-gray-300">
            <p><span className="font-semibold">Destinação:</span> {formData.destinacao || '—'}</p>
            <p><span className="font-semibold">Interveniente:</span> {formData.responsavel_recebimento || '—'}</p>
            <p><span className="font-semibold">Total:</span> {fmt(totalAtual)}</p>
            <p><span className="font-semibold">Itens:</span> {formData.itens.length}</p>
            <p><span className="font-semibold">Registrado por:</span> {currentUser?.full_name || '—'}</p>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setStep(1)} className="flex h-16 items-center justify-center rounded-2xl bg-gray-100 text-base font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Voltar
          </button>
          <button type="button" onClick={onSubmit} className="flex h-16 items-center justify-center rounded-2xl bg-gray-900 text-base font-semibold text-white dark:bg-white dark:text-gray-900">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ── Main exported component ────────────────────────────────────────────────
export default function ConsumoInternoFormPage({
  onBack,
  formData, setFormData,
  turnos, destinacoes, responsaveis,
  setNovoCadastro,
  totalAtual,
  onOpenSelector,
  currentUser,
  onOpenAssinatura,
  onSubmit,
}) {
  const [mobileStep, setMobileStep] = useState(0);
  const [attachedCount, setAttachedCount] = useState(0);

  const stepLabels = ['Destino', 'Itens', 'Minuta'];

  const handleFileChange = (e) => {
    setAttachedCount(e.target.files?.length || 0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <p className="text-base font-bold text-gray-900 dark:text-white">Novo consumo interno</p>
          {/* Mobile step indicator */}
          <div className="flex items-center gap-2 md:hidden">
            <StepDots step={mobileStep} />
            <span className="text-xs text-gray-400">{stepLabels[mobileStep]}</span>
          </div>
        </div>
        {/* Desktop: show all step labels */}
        <div className="hidden items-center gap-1 md:flex">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className={`text-xs font-semibold ${i === mobileStep ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>{label}</span>
              {i < stepLabels.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-700" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {/* Desktop: vertical scroll */}
      <div className="hidden flex-1 overflow-y-auto p-6 md:block">
        <DesktopForm
          formData={formData}
          setFormData={setFormData}
          turnos={turnos}
          destinacoes={destinacoes}
          responsaveis={responsaveis}
          setNovoCadastro={setNovoCadastro}
          totalAtual={totalAtual}
          onOpenSelector={onOpenSelector}
          currentUser={currentUser}
          onOpenAssinatura={onOpenAssinatura}
          onSubmit={onSubmit}
          onBack={onBack}
          attachedCount={attachedCount}
          onFileChange={handleFileChange}
        />
      </div>

      {/* Mobile: step-based full height */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        <MobileForm
          step={mobileStep}
          setStep={setMobileStep}
          formData={formData}
          setFormData={setFormData}
          turnos={turnos}
          destinacoes={destinacoes}
          responsaveis={responsaveis}
          setNovoCadastro={setNovoCadastro}
          totalAtual={totalAtual}
          onOpenSelector={onOpenSelector}
          currentUser={currentUser}
          onOpenAssinatura={onOpenAssinatura}
          onSubmit={onSubmit}
          onBack={onBack}
          attachedCount={attachedCount}
          onFileChange={handleFileChange}
        />
      </div>
    </div>
  );
}
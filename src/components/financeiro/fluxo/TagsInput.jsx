import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag, ChevronDown, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Cache global de tags já usadas (compartilhadas entre instâncias)
let _tagsCache = null;

async function carregarTagsUsadas() {
  if (_tagsCache) return _tagsCache;
  try {
    const ls = await base44.entities.LancamentoFinanceiro.list('-updated_date', 200);
    const set = new Set();
    ls.forEach(l => (l.tags || []).forEach(t => t && set.add(t.toLowerCase().trim())));
    _tagsCache = [...set].sort();
    setTimeout(() => { _tagsCache = null; }, 60000); // expira em 1min
    return _tagsCache;
  } catch {
    return [];
  }
}

export default function TagsInput({ tags, onChange, disabled = false, defaultExpanded = false }) {
  const [input, setInput] = useState('');
  const [filtro, setFiltro] = useState('');
  const [todasTags, setTodasTags] = useState([]);
  const [expandido, setExpandido] = useState(defaultExpanded);

  useEffect(() => {
    carregarTagsUsadas().then(setTodasTags);
  }, []);

  const sugestoesFiltradas = useMemo(() => {
    const q = (filtro || input).trim().toLowerCase();
    return todasTags
      .filter(t => !tags.includes(t))
      .filter(t => !q || t.includes(q))
      .slice(0, 12);
  }, [filtro, input, todasTags, tags]);

  const addTag = (val) => {
    const tag = val.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
    setFiltro('');
    _tagsCache = null;
  };

  const removeTag = (t) => onChange(tags.filter(x => x !== t));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
    if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags[tags.length - 1]);
  };

  if (disabled) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags</p>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sem tags</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full p-4 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags</p>
          {tags.length > 0 && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tags.length}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`} />
      </button>

      {!expandido && tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className="px-2.5 py-1 rounded-full bg-primary dark:bg-muted text-xs text-white dark:text-foreground">{t}</span>
          ))}
        </div>
      )}

      {expandido && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/30">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary dark:bg-muted text-xs text-white dark:text-foreground">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoComplete="off"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar tags..."
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40"
            />
          </div>

          {sugestoesFiltradas.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {sugestoesFiltradas.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
            <input
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nova tag..."
              className="flex-1 min-w-[80px] h-9 px-3 rounded-xl bg-muted text-xs text-foreground/90 placeholder:text-muted-foreground outline-none"
            />
          </div>

          <p className="text-[0.6rem] text-muted-foreground">Enter ou vírgula para adicionar</p>
        </div>
      )}
    </div>
  );
}

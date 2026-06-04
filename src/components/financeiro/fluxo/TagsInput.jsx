import React, { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
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

export default function TagsInput({ tags, onChange }) {
  const [input, setInput] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [todasTags, setTodasTags] = useState([]);
  const [showSugestoes, setShowSugestoes] = useState(false);

  useEffect(() => {
    carregarTagsUsadas().then(setTodasTags);
  }, []);

  useEffect(() => {
    if (!input.trim()) { setSugestoes([]); return; }
    const q = input.trim().toLowerCase();
    const filtradas = todasTags.filter(t => t.includes(q) && !tags.includes(t));
    setSugestoes(filtradas.slice(0, 6));
  }, [input, todasTags, tags]);

  const addTag = (val) => {
    const tag = val.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
    setSugestoes([]);
    setShowSugestoes(false);
    // Invalidar cache para incluir nova tag
    _tagsCache = null;
  };

  const removeTag = (t) => onChange(tags.filter(x => x !== t));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
    if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags[tags.length - 1]);
    if (e.key === 'Escape') { setSugestoes([]); setShowSugestoes(false); }
  };

  // Tags mais usadas para exibir como atalhos rápidos quando input está vazio
  const tagsSugeridas = todasTags.filter(t => !tags.includes(t)).slice(0, 8);

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags</p>
      </div>

      {/* Tags selecionadas + input */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary dark:bg-muted text-xs text-white dark:text-foreground">
            {t}
            <button onClick={() => removeTag(t)} className="ml-0.5 hover:opacity-70">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input autoComplete="off"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSugestoes(true); }}
          onKeyDown={handleKey}
          onFocus={() => setShowSugestoes(true)}
          onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
          placeholder={tags.length === 0 ? 'Adicionar tag...' : '+'}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-foreground/90 placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Dropdown de sugestões filtradas pelo input */}
      {showSugestoes && sugestoes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {sugestoes.map(t => (
            <button
              key={t}
              onMouseDown={(e) => { e.preventDefault(); addTag(t); }}
              className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
            >
              + {t}
            </button>
          ))}
        </div>
      )}

      {/* Tags populares quando input vazio */}
      {!input && !showSugestoes && tagsSugeridas.length > 0 && (
        <div className="mt-2">
          <p className="text-[0.58rem] text-muted-foreground mb-1 uppercase tracking-wider">Tags recentes</p>
          <div className="flex flex-wrap gap-1">
            {tagsSugeridas.map(t => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[0.6rem] text-muted-foreground mt-1.5">Enter ou vírgula para adicionar</p>
    </div>
  );
}
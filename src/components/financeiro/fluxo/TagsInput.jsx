import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';

export default function TagsInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  const addTag = (val) => {
    const tag = val.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
  };

  const removeTag = (t) => onChange(tags.filter(x => x !== t));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
    if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags[tags.length - 1]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tags</p>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
            {t}
            <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-gray-900 dark:hover:text-white">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? 'Adicionar tag...' : '+'}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
        />
      </div>
      <p className="text-[0.6rem] text-gray-400 mt-1">Pressione Enter ou vírgula para adicionar</p>
    </div>
  );
}
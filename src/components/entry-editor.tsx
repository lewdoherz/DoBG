'use client';
import { useState, type FormEvent } from 'react';
import { Plus, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { Dialog } from './dialog';
import {
  entrySchema,
  emptyMetadata,
  emptyEdition,
  type EntryInput,
  type Metadata,
  type Edition,
} from '@/lib/model';
import { en } from '@/lib/strings';
export function EntryEditor({
  entry,
  onClose,
  onSaved,
  onDuplicate,
}: {
  entry?: EntryInput;
  onClose: () => void;
  onSaved: (id: string) => Promise<void>;
  onDuplicate: (id: string) => void;
}) {
  const [draft, setDraft] = useState<EntryInput>(
    entry || {
      metadata: { ...emptyMetadata(), title: '' },
      source: null,
      status: 'owned',
      edition: emptyEdition(),
      copies: [{ location: '', edition: emptyEdition() }],
      notes: '',
      pitch: '',
      tags: [],
      rating: null,
    },
  );
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [duplicate, setDuplicate] = useState<string>();
  const update = <K extends keyof EntryInput>(key: K, value: EntryInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const meta = <K extends keyof Metadata>(key: K, value: Metadata[K]) =>
    setDraft((d) => ({ ...d, metadata: { ...d.metadata, [key]: value } }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = entrySchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .slice(0, 3)
          .join('; '),
      );
      return;
    }
    setBusy(true);
    setError('');
    setDuplicate(undefined);
    try {
      const response = await fetch(entry?.id ? `/api/collection/${entry.id}` : '/api/collection', {
        method: entry?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) {
        setDuplicate(data.existingId);
        throw new Error(data.error);
      }
      await onSaved(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  const fields: [keyof Metadata, string, string][] = [
    ['minPlayers', 'Min players', '1'],
    ['maxPlayers', 'Max players', '1'],
    ['minMinutes', 'Min minutes', '1'],
    ['maxMinutes', 'Max minutes', '1'],
    ['age', 'Suggested age', '0'],
    ['complexity', 'Complexity · 1–5', '1'],
    ['year', 'Published year', '-5000'],
  ];
  return (
    <Dialog
      title={entry?.id ? 'Edit your game' : 'Make room for a good game'}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <form onSubmit={submit} className="editor">
        <p className="muted">
          A few details are enough to start. Leave anything you don’t know blank.
        </p>
        <div className="segmented status-control" aria-label="Collection status">
          {(['owned', 'wishlist'] as const).map((s) => (
            <button
              type="button"
              key={s}
              className={draft.status === s ? 'active' : ''}
              aria-pressed={draft.status === s}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  status: s,
                  copies:
                    s === 'wishlist'
                      ? []
                      : d.copies.length
                        ? d.copies
                        : [{ location: '', edition: d.edition }],
                }))
              }
            >
              {s === 'owned' ? 'On my shelf' : 'On my wishlist'}
            </button>
          ))}
        </div>
        <label>
          Game title <span className="required">*</span>
          <input
            required
            maxLength={240}
            value={draft.metadata.title}
            onChange={(e) => meta('title', e.target.value)}
            placeholder="English or 中文名称"
            autoFocus
          />
        </label>
        <label>
          Other names & aliases{' '}
          <TokenInput
            values={draft.metadata.aliases}
            onChange={(v) => meta('aliases', v)}
            placeholder="中文名, alternate title"
          />
        </label>
        <div className="form-row">
          <label>
            Type
            <select
              value={draft.metadata.kind}
              onChange={(e) => meta('kind', e.target.value as Metadata['kind'])}
            >
              <option value="unknown">Not recorded</option>
              <option value="base">Base game</option>
              <option value="expansion">Expansion</option>
            </select>
          </label>
          <label>
            Personal rating · 0–10
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={draft.rating ?? ''}
              onChange={(e) =>
                update('rating', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </label>
        </div>
        <details className="form-section" open>
          <summary>
            About the game <ChevronDown size={17} />
          </summary>
          <label>
            Description
            <textarea
              rows={3}
              value={draft.metadata.description}
              onChange={(e) => meta('description', e.target.value)}
            />
          </label>
          <label>
            Cover image URL
            <input
              type="url"
              value={draft.metadata.cover}
              placeholder="https://… (use art you are allowed to display)"
              onChange={(e) => meta('cover', e.target.value)}
            />
          </label>
          <div className="number-fields">
            {fields.map(([key, label, min]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={min}
                  max={
                    key === 'complexity' ? 5 : key === 'age' ? 99 : key === 'year' ? 9999 : 10000
                  }
                  step={key === 'complexity' ? '0.1' : '1'}
                  value={(draft.metadata[key] as number) ?? ''}
                  onChange={(e) =>
                    meta(key, (e.target.value === '' ? null : Number(e.target.value)) as never)
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Mechanics
            <TokenInput
              values={draft.metadata.mechanics}
              onChange={(v) => meta('mechanics', v)}
              placeholder="Deck building, worker placement"
            />
          </label>
          <label>
            Categories
            <TokenInput
              values={draft.metadata.categories}
              onChange={(v) => meta('categories', v)}
              placeholder="Strategy, adventure"
            />
          </label>
          <label>
            Base games
            <TokenInput
              values={draft.metadata.baseGames}
              onChange={(v) => meta('baseGames', v)}
              placeholder="Linked base game titles, if known"
            />
          </label>
          <label>
            Expansions
            <TokenInput
              values={draft.metadata.expansions}
              onChange={(v) => meta('expansions', v)}
              placeholder="Expansion titles, if known"
            />
          </label>
        </details>
        <section className="form-section">
          <h3>Edition</h3>
          <EditionFields
            edition={draft.edition}
            onChange={(value) =>
              setDraft((d) => ({
                ...d,
                edition: value,
                copies: d.copies.map((c, i) =>
                  i === 0 && c.edition.name === d.edition.name &&
                  c.edition.language === d.edition.language && c.edition.publisher === d.edition.publisher
                    ? { ...c, edition: value } : c,
                ),
              }))
            }
          />
          <p className="field-help">
            Edition information stays unknown unless recorded. Each physical copy can use a
            different edition.
          </p>
        </section>
        {draft.status === 'owned' && (
          <section className="form-section">
            <div className="section-heading">
              <h3>
                Physical copies <span className="count-pill">{draft.copies.length}</span>
              </h3>
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  update('copies', [...draft.copies, { location: '', edition: draft.edition }])
                }
              >
                <Plus size={16} /> Add a copy
              </button>
            </div>
            {draft.copies.map((copy, i) => (
              <fieldset className="copy-fields" key={i}>
                <legend>Copy {i + 1}</legend>
                <label>
                  Storage location
                  <input
                    value={copy.location}
                    placeholder="Living room · top shelf"
                    onChange={(e) =>
                      update(
                        'copies',
                        draft.copies.map((c, j) =>
                          i === j ? { ...c, location: e.target.value } : c,
                        ),
                      )
                    }
                  />
                </label>
                <EditionFields
                  edition={copy.edition}
                  onChange={(v) =>
                    update(
                      'copies',
                      draft.copies.map((c, j) => (i === j ? { ...c, edition: v } : c)),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-button danger"
                  disabled={draft.copies.length === 1}
                  onClick={() =>
                    update(
                      'copies',
                      draft.copies.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 size={15} /> Remove this copy
                </button>
              </fieldset>
            ))}
          </section>
        )}
        <section className="form-section">
          <h3>
            Your corner <span className="private-label">PRIVATE</span>
          </h3>
          <label>
            Tags
            <TokenInput
              values={draft.tags}
              onChange={(v) => update('tags', v)}
              placeholder="Family favorites, game night"
            />
          </label>
          <label>
            Private notes
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="House rules, memories, things to remember…"
            />
          </label>
          <label>
            Your short pitch
            <textarea
              rows={2}
              maxLength={500}
              value={draft.pitch}
              onChange={(e) => update('pitch', e.target.value)}
              placeholder="Why does this game deserve a spot at the table?"
            />
          </label>
          <p className="field-help">Nothing is public. Sharing is a later milestone.</p>
        </section>
        {draft.source && (
          <p className="source-note">
            Original metadata:{' '}
            <a href={draft.source.url} target="_blank" rel="noreferrer">
              BoardGameGeek
            </a>
            . Your edits are stored separately.
          </p>
        )}
        {error && (
          <div className="notice error" role="alert">
            <AlertCircle size={18} />
            <div>
              {error}
              {duplicate && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onDuplicate(duplicate)}
                >
                  Open existing game to update or add a copy →
                </button>
              )}
            </div>
          </div>
        )}
        <footer className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            {en.cancel}
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : entry?.id ? 'Save changes' : en.save}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
function TokenInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(values.join(', '));
  return (
    <input
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split(/[,，\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}
function EditionFields({
  edition,
  onChange,
}: {
  edition: Edition;
  onChange: (value: Edition) => void;
}) {
  return (
    <div className="edition-fields">
      {(['name', 'language', 'publisher'] as const).map((key) => (
        <label key={key}>
          {key === 'name' ? 'Edition name' : key === 'language' ? 'Language' : 'Publisher'}
          <input
            value={edition[key]}
            onChange={(e) => onChange({ ...edition, [key]: e.target.value })}
            placeholder={
              key === 'language'
                ? 'English / 简体中文'
                : key === 'name'
                  ? 'Not recorded'
                  : 'Not recorded'
            }
          />
        </label>
      ))}
    </div>
  );
}

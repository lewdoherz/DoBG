'use client';
import { useState, type FormEvent } from 'react';
import { Search, PenLine, ArrowRight, ArrowLeft, BookOpen, LoaderCircle } from 'lucide-react';
import { Dialog } from './dialog';
import { Cover } from './cover';
import { emptyEdition, type EntryInput, type Metadata } from '@/lib/model';
import { GameFacts } from './game-detail';
type Match = { id: string; title: string; year: number | null; kind: string };
type Candidate = { metadata: Metadata; source: EntryInput['source']; stale: boolean };
export function AddGame({
  onClose,
  onSelect,
  logo,
}: {
  onClose: () => void;
  onSelect: (entry?: EntryInput) => void;
  logo?: string;
}) {
  const [query, setQuery] = useState(''),
    [matches, setMatches] = useState<Match[] | null>(null),
    [candidate, setCandidate] = useState<Candidate | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false);
  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMatches(null);
    try {
      const r = await fetch(`/api/metadata?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMatches(data.matches);
      setStale(data.stale);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search is unavailable. Please add manually.');
    } finally {
      setBusy(false);
    }
  }
  async function inspect(id: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/metadata?id=${id}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setCandidate(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load game details.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={candidate ? 'A closer look' : 'Find your next shelf-mate'}
      onClose={onClose}
      wide
    >
      <div className="add-content">
        {candidate ? (
          <>
            <button className="text-button" onClick={() => setCandidate(null)}>
              <ArrowLeft size={16} /> Back to matches
            </button>
            <div className="candidate-layout">
              <Cover title={candidate.metadata.title} url={candidate.metadata.cover} large />
              <div>
                <span className="eyebrow">
                  {candidate.metadata.kind === 'expansion' ? 'EXPANSION' : 'BOARD GAME'} ·{' '}
                  {candidate.metadata.year || 'YEAR UNKNOWN'}
                </span>
                <h3 className="candidate-title">{candidate.metadata.title}</h3>
                <GameFacts metadata={candidate.metadata} />
              </div>
            </div>
            <p className="description">
              {candidate.metadata.description || 'No description available.'}
            </p>
            <p className="muted">
              Mechanics: {candidate.metadata.mechanics.join(', ') || 'Not recorded'}
              <br />
              Categories: {candidate.metadata.categories.join(', ') || 'Not recorded'}
            </p>
            {candidate.stale && (
              <div className="notice">Cached metadata · provider unavailable.</div>
            )}
            <button
              className="button primary full"
              onClick={() =>
                onSelect({
                  metadata: candidate.metadata,
                  source: candidate.source,
                  status: 'owned',
                  edition: emptyEdition(),
                  copies: [{ location: '', edition: emptyEdition() }],
                  notes: '',
                  pitch: '',
                  tags: [],
                  rating: null,
                })
              }
            >
              Choose this game <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Search BoardGameGeek by title, then check the match before adding it. Try an English
              or Chinese title.
            </p>
            <form className="provider-search" onSubmit={search}>
              <label className="sr-only" htmlFor="provider-query">
                Game title
              </label>
              <Search size={20} />
              <input
                id="provider-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
                maxLength={200}
                placeholder="A game you have in mind…"
                autoFocus
              />
              <button className="button primary" disabled={busy || !query.trim()}>
                {busy ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />} Search
              </button>
            </form>
            {busy && (
              <p className="loading-line" role="status">
                Checking the catalog… BGG requests may take a few seconds.
              </p>
            )}
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            {stale && (
              <div className="notice">Showing cached results while BGG is unavailable.</div>
            )}
            {matches && (
              <div className="search-matches">
                {matches.length ? (
                  <>
                    <p className="eyebrow">{matches.length} MATCHES · SELECT TO INSPECT</p>
                    {matches.map((m) => (
                      <button
                        className="search-match"
                        key={m.id}
                        disabled={busy}
                        onClick={() => inspect(m.id)}
                      >
                        <span className="match-icon">
                          <BookOpen size={21} />
                        </span>
                        <span>
                          <strong>{m.title}</strong>
                          <small>
                            {m.year || 'Year unknown'} ·{' '}
                            {m.kind === 'expansion' ? 'Expansion' : m.kind === 'base' ? 'Base game' : 'Type not recorded'}
                          </small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="empty-inline">
                    No matches. Try an alternate title or add your game manually.
                  </p>
                )}
              </div>
            )}
            <button className="manual-option" onClick={() => onSelect()}>
              <span className="match-icon">
                <PenLine size={22} />
              </span>
              <span>
                <strong>A special edition? A homemade classic?</strong>
                <small>Add a game manually. No catalog required.</small>
              </span>
              <ArrowRight size={19} />
            </button>
          </>
        )}
        <div className="provider-attribution">
          {logo && (
            <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer">
              <img src={logo} alt="Powered by BGG" />
            </a>
          )}
          <span>
            Catalog data, when available, from{' '}
            <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer">
              BoardGameGeek
            </a>
            . No barcode lookup. No sample results.
          </span>
        </div>
      </div>
    </Dialog>
  );
}

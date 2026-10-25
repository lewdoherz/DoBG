'use client';
import {
  Users,
  Clock,
  Gauge,
  Baby,
  ArrowLeft,
  Pencil,
  MapPin,
  Star,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Cover } from './cover';
import { en } from '@/lib/strings';
import type { Entry, Metadata } from '@/lib/model';
export function range(min: number | null, max: number | null, suffix = '') {
  return min !== null && max !== null
    ? `${min === max ? min : `${min}–${max}`}${suffix}`
    : min !== null
      ? `${min}+${suffix}`
      : max !== null
        ? `Up to ${max}${suffix}`
        : en.unknown;
}
export function GameFacts({ metadata: m }: { metadata: Metadata }) {
  return (
    <dl className="game-facts">
      <div>
        <dt>
          <Users size={17} /> Players
        </dt>
        <dd>{range(m.minPlayers, m.maxPlayers)}</dd>
      </div>
      <div>
        <dt>
          <Clock size={17} /> Play time
        </dt>
        <dd>{range(m.minMinutes, m.maxMinutes, ' min')}</dd>
      </div>
      <div>
        <dt>
          <Gauge size={17} /> Complexity
        </dt>
        <dd>{m.complexity === null ? en.unknown : `${m.complexity.toFixed(1)} / 5`}</dd>
      </div>
      <div>
        <dt>
          <Baby size={17} /> Suggested age
        </dt>
        <dd>{m.age === null ? en.unknown : `${m.age}+`}</dd>
      </div>
    </dl>
  );
}
export function GameDetail({
  entry,
  onEdit,
  onCopy,
  onDelete,
  offline,
  logo,
}: {
  entry: Entry;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  offline: boolean;
  logo?: string;
}) {
  const m = entry.metadata;
  return (
    <div className="detail-page">
      <Link className="text-button back-link" href="/">
        <ArrowLeft size={17} /> Back to your collection
      </Link>
      <div className="detail-hero">
        <Cover title={m.title} url={m.cover} large />
        <div className="detail-intro">
          <div className="detail-kicker">
            <span className={`status-badge ${entry.status}`}>
              {entry.status === 'owned' ? 'ON MY SHELF' : 'WISHLIST'}
            </span>
            <span>
              {m.kind === 'expansion' ? 'Expansion' : m.kind === 'base' ? 'Base game' : 'Type not recorded'}
              {m.year ? ` · ${m.year}` : ''}
            </span>
          </div>
          <h1>{m.title}</h1>
          {m.aliases.length > 0 && <p className="muted">{m.aliases.join(' · ')}</p>}
          <GameFacts metadata={m} />
          <div className="detail-actions">
            <button className="button primary" disabled={offline} onClick={onEdit}>
              <Pencil size={17} /> Edit game
            </button>
            <button className="button secondary" disabled={offline} onClick={onCopy}>
              <Plus size={17} /> {entry.status === 'wishlist' ? 'Mark as owned' : 'Add a copy'}
            </button>
          </div>
        </div>
      </div>
      <div className="detail-columns">
        <div>
          <section className="detail-section">
            <h2>The story in the box</h2>
            <p className="description">
              {m.description ||
                'No description recorded yet. Add one when you get to know this game.'}
            </p>
          </section>
          <section className="detail-section">
            <h2>A little more detail</h2>
            <dl className="metadata-list">
              {[
                ['Mechanics', m.mechanics],
                ['Categories', m.categories],
                ['Base games', m.baseGames],
                ['Expansions', m.expansions],
              ].map(([label, values]) => (
                <div key={label as string}>
                  <dt>{label}</dt>
                  <dd>
                    {(values as string[]).length ? (values as string[]).join(' · ') : en.unknown}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Edition</dt>
                <dd>{entry.edition.name || en.unknown}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{entry.edition.language || en.unknown}</dd>
              </div>
              <div>
                <dt>Publisher</dt>
                <dd>{entry.edition.publisher || en.unknown}</dd>
              </div>
            </dl>
          </section>
          {entry.source && (
            <section className="source-note">
              <a href={entry.source.url} target="_blank" rel="noreferrer">
                Metadata source: BoardGameGeek ↗
              </a>
              {logo && (
                <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer">
                  <img className="bgg-logo" src={logo} alt="Powered by BGG" />
                </a>
              )}
              <p>
                Source snapshot dated {new Date(entry.source.fetchedAt).toLocaleDateString()}. Your
                edits are separate from original provider data. Imported source records are not
                independently reverified.
              </p>
            </section>
          )}
        </div>
        <aside>
          <section className="personal-card">
            <div className="section-heading">
              <h2>Your corner</h2>
              <span className="private-label">PRIVATE</span>
            </div>
            <div className="personal-rating">
              <Star size={22} />
              <strong>{entry.rating ?? '—'}</strong>
              <span>/ 10 personal rating</span>
            </div>
            <h3>On your shelf</h3>
            {entry.copies.length ? (
              entry.copies.map((c, i) => (
                <div key={c.id || i} className="copy-detail">
                  <MapPin size={17} />
                  <div>
                    <strong>
                      Copy {i + 1} · {c.location || 'Location not recorded'}
                    </strong>
                    <small>
                      {[c.edition.name, c.edition.language, c.edition.publisher]
                        .filter(Boolean)
                        .join(' · ') || 'Edition not recorded'}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Still on the wishlist. Something to look forward to.</p>
            )}
            <h3>Private notes</h3>
            <p className="description">
              {entry.notes || 'A blank page for house rules and good memories.'}
            </p>
            {entry.pitch && (
              <>
                <h3>Your pitch</h3>
                <p className="description">{entry.pitch}</p>
              </>
            )}
            {entry.tags.length > 0 && (
              <div className="tags">
                {entry.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            )}
            <p className="field-help">Last updated {new Date(entry.updatedAt).toLocaleString()}</p>
          </section>
          <button
            className="text-button danger remove-button"
            disabled={offline}
            onClick={onDelete}
          >
            <Trash2 size={16} /> Remove from collection
          </button>
        </aside>
      </div>
    </div>
  );
}

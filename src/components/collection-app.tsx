'use client';
import { useState, useEffect, useRef, useMemo, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LibraryBig,
  Heart,
  Dices,
  Plus,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpRight,
  Download,
  Upload,
  LogOut,
  Users,
  Clock,
  Gauge,
  ShieldCheck,
  WifiOff,
  RefreshCw,
  X,
  BookOpen,
  Check,
  ChevronDown,
  LockKeyhole,
} from 'lucide-react';
import { AuthScreen } from './auth-screen';
import { Cover, ShelfIllustration } from './cover';
import { AddGame } from './add-game';
import { EntryEditor } from './entry-editor';
import { GameDetail, range } from './game-detail';
import { Dialog } from './dialog';
import { en } from '@/lib/strings';
import { authClient } from '@/lib/auth-client';
import { archiveSchema, matches, fits, type Entry, type EntryInput } from '@/lib/model';
type Snapshot = {
  entries: Entry[];
  user: { id: string; name: string; email: string };
  syncedAt: string;
};
type Tab = 'all' | 'owned' | 'wishlist' | 'play';
const CACHE = 'game-shelf.private-snapshot.v1';
export function CollectionApp({ gameId: routeGameId }: { gameId?: string }) {
  const router = useRouter();
  const [offlineRoute, setOfflineRoute] = useState<string | null>();
  const gameId = offlineRoute === undefined ? routeGameId : offlineRoute || undefined;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [offline, setOffline] = useState(false),
    [stale, setStale] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const [tab, setTab] = useState<Tab>('all'),
    [query, setQuery] = useState(''),
    [view, setView] = useState<'grid' | 'list'>('grid'),
    [filters, setFilters] = useState(false),
    [players, setPlayers] = useState(''),
    [minutes, setMinutes] = useState(''),
    [difficulty, setDifficulty] = useState(''),
    [tag, setTag] = useState(''),
    [language, setLanguage] = useState(''),
    [kind, setKind] = useState(''),
    [sort, setSort] = useState('recent');
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<{ entry?: EntryInput } | null>(null),
    [deleting, setDeleting] = useState<Entry | null>(null),
    [importing, setImporting] = useState<{ archive: unknown; count: number } | null>(null),
    [busy, setBusy] = useState(false),
    [logo, setLogo] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const requestEpoch = useRef(0);
  async function refresh() {
    const epoch = ++requestEpoch.current;
    setError('');
    try {
      const r = await fetch('/api/collection', { cache: 'no-store' });
      if (epoch !== requestEpoch.current) return;
      if (r.status === 401) {
        try {
          localStorage.removeItem(CACHE);
        } catch {}
        setSnapshot(null);
        setStale(false);
        return;
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (epoch !== requestEpoch.current) return;
      setSnapshot(data);
      setStale(false);
      setOffline(false);
      try {
        localStorage.setItem(CACHE, JSON.stringify(data));
      } catch {
        setToast('Your shelf is synced, but this browser could not save an offline snapshot.');
      }
    } catch (e) {
      if (epoch !== requestEpoch.current) return;
      setOffline(!navigator.onLine);
      setStale(true);
      try {
        const saved = localStorage.getItem(CACHE);
        if (saved) setSnapshot(JSON.parse(saved));
      } catch {
        /* Storage can be disabled by the browser. */
      }
      setError(
        e instanceof Error ? e.message : 'Could not reach your shelf. Check your connection.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const restoreRoute = () =>
      setOfflineRoute(window.location.pathname.match(/^\/game\/([^/]+)$/)?.[1] || null);
    if (!navigator.onLine) restoreRoute();
    window.addEventListener('popstate', restoreRoute);
    void refresh();
    const online = () => {
      void refresh();
    };
    const offline = () => setOffline(true);
    const focus = () => {
      if (navigator.onLine) void refresh();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CACHE && !event.newValue) {
        requestEpoch.current++;
        setSnapshot(null);
        setEditing(null);
        setAdding(false);
      }
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('focus', focus);
    window.addEventListener('storage', storage);
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => setToast('Offline app caching is unavailable in this browser.'));
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('focus', focus);
      window.removeEventListener('storage', storage);
      window.removeEventListener('popstate', restoreRoute);
    };
  }, []);
  useEffect(() => {
    if (snapshot && !offline)
      fetch('/api/metadata?status=1')
        .then((r) => r.json())
        .then((d) => setLogo(d.logo || undefined))
        .catch(() => {});
  }, [snapshot?.user.id, offline]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const entries = snapshot?.entries || [];
  const readonly = offline || stale;
  useEffect(() => {
    if (!readonly) return;
    // Keep cached game pages navigable without asking Next for unavailable RSC payloads.
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a');
      if (!anchor?.closest('#main')) return;
      const path = anchor.getAttribute('href');
      if (path !== '/' && !path?.startsWith('/game/')) return;
      event.preventDefault();
      event.stopPropagation();
      setOfflineRoute(path === '/' ? null : path.split('/')[2]);
      window.history.pushState({}, '', path);
      window.scrollTo(0, 0);
    };
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [readonly]);
  const owned = entries.filter((e) => e.status === 'owned').length,
    wish = entries.length - owned;
  const copyCount = entries.reduce((sum, entry) => sum + entry.copies.length, 0);
  const tags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort();
  const languages = Array.from(
    new Set(
      entries
        .flatMap((e) => [e.edition.language, ...e.copies.map((c) => c.edition.language)])
        .filter(Boolean),
    ),
  ).sort();
  const visible = useMemo(() => {
    const result = entries.filter(
      (e) =>
        matches(e, query) &&
        (tab === 'all' || tab === 'play' || e.status === tab) &&
        (!tag || e.tags.includes(tag)) &&
        (!language ||
          e.edition.language === language ||
          e.copies.some((c) => c.edition.language === language)) &&
        (!kind || e.metadata.kind === kind) &&
        (tab === 'play' || players || minutes || difficulty
          ? fits(
              e,
              Number(players) || undefined,
              Number(minutes) || undefined,
              Number(difficulty) || undefined,
            )
          : true),
    );
    if (sort === 'title') result.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
    if (sort === 'rating') result.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    return result;
  }, [entries, query, tab, tag, language, kind, players, minutes, difficulty, sort]);
  function navigateTab(next: Tab) {
    setTab(next);
    if (readonly) {
      setOfflineRoute(null);
      window.history.pushState({}, '', '/');
    } else if (gameId) router.push('/');
  }
  async function saved(id: string) {
    await refresh();
    setEditing(null);
    setToast('A good game, in its place. Changes saved.');
    router.push(`/game/${id}`);
  }
  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      requestEpoch.current++;
      try {
        localStorage.removeItem(CACHE);
      } catch {}
      setSnapshot(null);
      setEditing(null);
      setAdding(false);
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }
  async function exportCollection() {
    setBusy(true);
    try {
      const r = await fetch('/api/export');
      if (!r.ok) throw new Error('Export failed. Please sign in and retry.');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-shelf-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast(
        'Export downloaded. It includes your private notes and locations — store it safely.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }
  async function selectImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Choose a JSON export smaller than 5 MB.');
      const archive = archiveSchema.parse(JSON.parse(await file.text()));
      setImporting({ archive, count: archive.entries.length });
    } catch {
      setError(
        'This file is not a valid Game Shelf v1 export (limit: 5 MB, 2,000 entries). No data was changed.',
      );
    }
  }
  async function confirmImport() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importing?.archive),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await refresh();
      setImporting(null);
      setToast(`${data.imported} ${data.imported === 1 ? 'game' : 'games'} imported · ${data.skipped} existing games left unchanged.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }
  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/collection/${deleting.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error);
      await refresh();
      setDeleting(null);
      router.push('/');
      setToast('Game removed from your collection.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove game.');
    } finally {
      setBusy(false);
    }
  }
  function addCopy(entry: Entry) {
    setEditing({
      entry: {
        ...entry,
        status: 'owned',
        copies: [...entry.copies, { location: '', edition: entry.edition }],
      },
    });
  }
  const current = entries.find((e) => e.id === gameId);
  if (loading)
    return (
      <main className="loading-screen">
        <span className="brand-icon">
          <LibraryBig size={30} />
        </span>
        <h1>{en.loading}</h1>
        <div className="loading-dots" role="status" aria-label="Loading collection" />
      </main>
    );
  if (!snapshot)
    return (
      <>
        {error && (
          <div className="connection-error notice error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
            >
              Try again
            </button>
          </div>
        )}
        <AuthScreen onSignedIn={refresh} />
      </>
    );
  const activeFilters = !!(players || minutes || difficulty || tag || language || kind);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to collection
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <LibraryBig size={24} />
          </span>
          <span>
            game shelf<span className="brand-dot">.</span>
          </span>
        </Link>
        <span className="sidebar-label">YOUR LITTLE LIBRARY</span>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={tab === 'all' ? 'active' : ''} onClick={() => navigateTab('all')}>
            <LibraryBig size={20} />
            <span>{en.collection}</span>
            <b>{entries.length}</b>
          </button>
          <button className={tab === 'owned' ? 'active' : ''} onClick={() => navigateTab('owned')}>
            <BookOpen size={20} />
            <span>{en.owned}</span>
            <b>{owned}</b>
          </button>
          <button
            className={tab === 'wishlist' ? 'active' : ''}
            onClick={() => navigateTab('wishlist')}
          >
            <Heart size={20} />
            <span>{en.wishlist}</span>
            <b>{wish}</b>
          </button>
          <div className="nav-divider" />
          <button className={tab === 'play' ? 'active' : ''} onClick={() => navigateTab('play')}>
            <Dices size={20} />
            <span>{en.play}</span>
            <ArrowUpRight size={16} />
          </button>
        </nav>
        <div className="sidebar-note">
          <div className="tiny-dice">✦</div>
          <p>
            The best games
            <br />
            bring us together.
          </p>
          <span>MAKE ROOM FOR A LITTLE PLAY.</span>
        </div>
        <div className="sidebar-tools">
          <span className="sidebar-label">KEEP IT YOURS</span>
          <button disabled={readonly || busy} onClick={() => void exportCollection()}>
            <Download size={17} />
            {en.export}
          </button>
          <button disabled={readonly || busy} onClick={() => fileRef.current?.click()}>
            <Upload size={17} />
            {en.import}
          </button>
          <a href="/guide" className="text-button">
            Setup & privacy guide <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="user-block">
          <span className="avatar">{snapshot.user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{snapshot.user.name}</strong>
            <small>Your private library</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            disabled={offline || busy}
            onClick={() => void signOut()}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Your library <span>/</span>{' '}
            <strong>
              {gameId
                ? 'Game details'
                : tab === 'wishlist'
                  ? 'Wishlist'
                  : tab === 'play'
                    ? 'Find a game'
                    : 'Collection'}
            </strong>
          </div>
          <span className="privacy-indicator">
            <ShieldCheck size={15} />
            {en.private}
          </span>
          <button
            className="mobile-signout icon-button"
            aria-label="Export collection"
            disabled={readonly || busy}
            onClick={() => void exportCollection()}
          >
            <Download size={19} />
          </button>
          <button
            className="mobile-signout icon-button"
            aria-label="Sign out"
            disabled={offline || busy}
            onClick={() => void signOut()}
          >
            <LogOut size={19} />
          </button>
        </header>
        {(readonly || error) && (
          <div className={`connection-banner ${error && !readonly ? 'error' : ''}`} role="status">
            <WifiOff size={17} />
            <span>
              {readonly ? (offline ? en.offline : en.stale) : error}
              {readonly && ` · Saved ${new Date(snapshot.syncedAt).toLocaleString()}`}
            </span>
            <button className="text-button" disabled={offline} onClick={() => void refresh()}>
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}
        <main id="main" className="main-content">
          {gameId ? (
            current ? (
              <GameDetail
                entry={current}
                offline={readonly}
                logo={logo}
                onEdit={() => setEditing({ entry: current })}
                onCopy={() => addCopy(current)}
                onDelete={() => setDeleting(current)}
              />
            ) : (
              <section className="empty-state">
                <BookOpen size={40} />
                <h1>That game isn’t on this shelf.</h1>
                <p>It may have been removed, or belong to another collection.</p>
                <Link href="/" className="button primary">
                  Back to collection
                </Link>
              </section>
            )
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">
                    {tab === 'play' ? 'LET’S MAKE A NIGHT OF IT' : 'A HOME FOR EVERY GAME'}
                  </p>
                  <h1>
                    {tab === 'wishlist'
                      ? 'A little wishful thinking.'
                      : tab === 'play'
                        ? 'What’s coming to the table?'
                        : 'Your shelf. Your stories.'}
                  </h1>
                  <p>
                    {tab === 'wishlist'
                      ? 'Good things worth making room for.'
                      : tab === 'play'
                        ? 'A few details. The right game. A very good evening.'
                        : 'Old favorites, new adventures, and one more round.'}
                  </p>
                </div>
                <button
                  className="button primary add-button"
                  disabled={readonly}
                  onClick={() => setAdding(true)}
                >
                  <Plus size={19} />
                  {en.add}
                </button>
              </section>
              <section className="shelf-overview" aria-label="Collection overview">
                <div className="stats-group">
                  <div>
                    <span className="stat-icon">
                      <LibraryBig size={22} />
                    </span>
                    <span>
                      <strong>
                        {owned}
                        <small>{owned === 1 ? 'game' : 'games'}</small>
                      </strong>
                      <label>ON YOUR SHELF</label>
                    </span>
                  </div>
                  <div>
                    <span className="stat-icon wish-icon">
                      <Heart size={22} />
                    </span>
                    <span>
                      <strong>
                        {wish}
                        <small>to discover</small>
                      </strong>
                      <label>ON THE WISHLIST</label>
                    </span>
                  </div>
                  <div className="copy-stat">
                    <span className="stat-icon">
                      <BookOpen size={22} />
                    </span>
                    <span>
                      <strong>
                        {copyCount}
                        <small>{copyCount === 1 ? 'box' : 'boxes'}</small>
                      </strong>
                      <label>PHYSICAL COPIES</label>
                    </span>
                  </div>
                </div>
                <button className="play-callout" onClick={() => navigateTab('play')}>
                  <span className="callout-dice">
                    <Dices size={29} strokeWidth={1.5} />
                  </span>
                  <span>
                    <strong>A game for this moment.</strong>
                    <small>Find the right fit for your table</small>
                  </span>
                  <ArrowUpRight size={20} />
                </button>
              </section>
              <section className="collection-section" aria-label="Browse collection">
                <div className="collection-toolbar">
                  <div className="collection-tabs" role="group" aria-label="Collection status">
                    {(['all', 'owned', 'wishlist'] as const).map((t) => (
                      <button
                        className={tab === t || (tab === 'play' && t === 'owned') ? 'active' : ''}
                        key={t}
                        onClick={() => setTab(t)}
                        aria-pressed={tab === t}
                      >
                        <span>
                          {t === 'all' ? 'All games' : t === 'owned' ? 'Owned' : 'Wishlist'}
                        </span>
                        <small>{t === 'all' ? entries.length : t === 'owned' ? owned : wish}</small>
                      </button>
                    ))}
                  </div>
                  <div className="view-control segmented" aria-label="Display mode">
                    <button
                      className={view === 'grid' ? 'active' : ''}
                      aria-label={en.grid}
                      aria-pressed={view === 'grid'}
                      onClick={() => setView('grid')}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      className={view === 'list' ? 'active' : ''}
                      aria-label={en.list}
                      aria-pressed={view === 'list'}
                      onClick={() => setView('list')}
                    >
                      <List size={19} />
                    </button>
                  </div>
                </div>
                <div className="search-filter-row">
                  <label className="collection-search">
                    <Search size={19} />
                    <span className="sr-only">Search collection</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={en.search}
                    />
                    {query && (
                      <button aria-label="Clear search" onClick={() => setQuery('')}>
                        <X size={17} />
                      </button>
                    )}
                  </label>
                  <button
                    className={`button filter-button ${filters || activeFilters || tab === 'play' ? 'selected' : ''}`}
                    onClick={() => setFilters(!filters)}
                    aria-expanded={filters || tab === 'play'}
                  >
                    <SlidersHorizontal size={17} /> Filters
                    {activeFilters && <span className="filter-dot" />}
                    <ChevronDown size={14} />
                  </button>
                  <label className="sort-control">
                    <span className="sr-only">Sort collection</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="recent">Recently updated</option>
                      <option value="title">Title · A–Z</option>
                      <option value="rating">Highest rated</option>
                    </select>
                  </label>
                </div>
                {(filters || tab === 'play') && (
                  <div className="filter-panel">
                    <div className="filter-panel-heading">
                      <span>
                        <Dices size={18} /> Find your table’s perfect fit
                      </span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setPlayers('');
                          setMinutes('');
                          setDifficulty('');
                          setTag('');
                          setLanguage('');
                          setKind('');
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                    <div className="filter-fields">
                      <label>
                        Players
                        <select value={players} onChange={(e) => setPlayers(e.target.value)}>
                          <option value="">Any player count</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'player' : 'players'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Available time
                        <select value={minutes} onChange={(e) => setMinutes(e.target.value)}>
                          <option value="">Any duration</option>
                          {[15, 30, 45, 60, 90, 120, 180, 240].map((n) => (
                            <option key={n} value={n}>
                              Up to {n} minutes
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Complexity
                        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                          <option value="">Any difficulty</option>
                          <option value="2">Light · up to 2/5</option>
                          <option value="3">Medium · up to 3/5</option>
                          <option value="4">Thinky · up to 4/5</option>
                          <option value="5">Any recorded · up to 5/5</option>
                        </select>
                      </label>
                      <label>
                        Tag
                        <select value={tag} onChange={(e) => setTag(e.target.value)}>
                          <option value="">All tags</option>
                          {tags.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Language
                        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                          <option value="">All languages</option>
                          {languages.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Game type
                        <select value={kind} onChange={(e) => setKind(e.target.value)}>
                          <option value="">All game types</option>
                          <option value="base">Base games</option>
                          <option value="expansion">Expansions</option>
                          <option value="unknown">Type not recorded</option>
                        </select>
                      </label>
                    </div>
                    <p className="field-help">
                      Play-fit filters show owned games only. Unknown player counts, duration, or
                      complexity never count as a match for that filter.
                    </p>
                  </div>
                )}
                <div className="result-caption">
                  <span>
                    {visible.length} {visible.length === 1 ? 'game' : 'games'}
                    {activeFilters || query ? ' found' : ' in your collection'}
                  </span>
                  <span>
                    <span className="sync-dot" />
                    {readonly ? 'Saved on this device' : 'Synced to your account'}
                  </span>
                </div>
                {!entries.length ? (
                  <div className="empty-state first-game">
                    <ShelfIllustration />
                    <span className="eyebrow">THE BEGINNING OF SOMETHING GOOD</span>
                    <h2>{en.emptyTitle}</h2>
                    <p>{en.emptyBody}</p>
                    <button
                      className="button primary"
                      disabled={readonly}
                      onClick={() => setAdding(true)}
                    >
                      <Plus size={18} />
                      Add your first game
                    </button>
                    <span className="empty-footer">
                      <LockKeyhole size={14} />A private collection, made for you.
                    </span>
                  </div>
                ) : !visible.length ? (
                  <div className="empty-state">
                    <Search size={32} />
                    <h2>{en.noResults}</h2>
                    <p>{en.noResultsBody}</p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setQuery('');
                        setTab('all');
                        setPlayers('');
                        setMinutes('');
                        setDifficulty('');
                        setTag('');
                        setLanguage('');
                        setKind('');
                      }}
                    >
                      Show all games
                    </button>
                  </div>
                ) : (
                  <div className={`games-${view}`}>
                    {visible.map((entry) => (
                      <Link className="game-card" key={entry.id} href={`/game/${entry.id}`}>
                        <div className="card-cover-wrap">
                          <Cover
                            key={entry.metadata.cover}
                            title={entry.metadata.title}
                            url={entry.metadata.cover}
                          />
                          <span className={`status-badge ${entry.status}`}>
                            {entry.status === 'wishlist' ? (
                              <>
                                <Heart size={12} />
                                Wishlist
                              </>
                            ) : (
                              <>
                                <Check size={12} />
                                Owned
                              </>
                            )}
                          </span>
                          {entry.metadata.kind === 'expansion' && (
                            <span className="expansion-badge">EXPANSION</span>
                          )}
                        </div>
                        <div className="card-info">
                          <span className="card-category">
                            {entry.metadata.categories[0] ||
                              (entry.metadata.kind === 'expansion' ? 'EXPANSION' : 'BOARD GAME')}
                            {entry.metadata.year ? ` · ${entry.metadata.year}` : ''}
                          </span>
                          <h2>{entry.metadata.title}</h2>
                          {entry.metadata.aliases[0] && (
                            <p className="card-alias">{entry.metadata.aliases[0]}</p>
                          )}
                          <div className="card-facts">
                            <span title="Players">
                              <Users size={14} />
                              {range(entry.metadata.minPlayers, entry.metadata.maxPlayers) ===
                              'Not recorded'
                                ? '—'
                                : range(entry.metadata.minPlayers, entry.metadata.maxPlayers)}
                            </span>
                            <span title="Duration">
                              <Clock size={14} />
                              {entry.metadata.maxMinutes === null
                                ? '—'
                                : `${entry.metadata.maxMinutes}m`}
                            </span>
                            <span title="Complexity">
                              <Gauge size={14} />
                              {entry.metadata.complexity?.toFixed(1) || '—'}
                            </span>
                          </div>
                          <div className="card-bottom">
                            <span>{entry.edition.language || 'Language not recorded'}</span>
                            <span>
                              {entry.rating !== null ? (
                                `★ ${entry.rating}`
                              ) : (
                                <ArrowUpRight size={16} />
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
              <footer className="collection-footer">
                <span>Less organizing. More one-more-rounds.</span>
                <span>
                  Made for the love of the game <Dices size={15} />
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => navigateTab('all')}>
          <LibraryBig size={21} />
          Collection
        </button>
        <button
          className={tab === 'wishlist' ? 'active' : ''}
          onClick={() => navigateTab('wishlist')}
        >
          <Heart size={21} />
          Wishlist
        </button>
        <button
          className="mobile-add"
          disabled={readonly}
          onClick={() => setAdding(true)}
          aria-label="Add a game"
        >
          <Plus size={24} />
        </button>
        <button className={tab === 'play' ? 'active' : ''} onClick={() => navigateTab('play')}>
          <Dices size={21} />
          Find a game
        </button>
        <button disabled={readonly || busy} onClick={() => fileRef.current?.click()}>
          <Upload size={21} />
          Import
        </button>
      </nav>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Import collection JSON file"
        onChange={selectImport}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {adding && (
        <AddGame
          logo={logo}
          onClose={() => setAdding(false)}
          onSelect={(entry) => {
            setAdding(false);
            setEditing({ entry });
          }}
        />
      )}
      {editing && (
        <EntryEditor
          entry={editing.entry}
          onClose={() => setEditing(null)}
          onSaved={saved}
          onDuplicate={(id) => {
            setEditing(null);
            router.push(`/game/${id}`);
          }}
        />
      )}
      {importing && (
        <Dialog
          title="Bring your games home"
          onClose={() => {
            if (!busy) setImporting(null);
          }}
        >
          <div className="confirm-content">
            <Upload size={32} />
            <p>
              This export contains <strong>{importing.count} {importing.count === 1 ? 'game' : 'games'}</strong>. New games will be
              added; matching IDs or game identities will be skipped. Existing entries and notes
              will not be overwritten.
            </p>
            <p className="muted">
              Only import files you trust. Private notes, locations, editions, and copies are
              included. The whole file is validated before any change.
            </p>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <footer className="dialog-footer">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setImporting(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void confirmImport()}
              >
                {busy ? 'Importing…' : 'Import collection'}
              </button>
            </footer>
          </div>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Make a little room?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <div className="confirm-content">
            <p>
              Remove <strong>{deleting.metadata.title}</strong> and all its physical copies, private
              notes, and edition records? This cannot be undone. Export first if you want a backup.
            </p>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <footer className="dialog-footer">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Keep this game
              </button>
              <button
                className="button danger-button"
                disabled={busy}
                onClick={() => void confirmDelete()}
              >
                {busy ? 'Removing…' : 'Remove game'}
              </button>
            </footer>
          </div>
        </Dialog>
      )}
    </div>
  );
}

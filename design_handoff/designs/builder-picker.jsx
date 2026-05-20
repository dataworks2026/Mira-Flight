/* Side state A: Asset library picker
   The left rail expands to 760 px and shows the full asset library with filters.
   Map shows all asset pins with labels. Right rail collapses to a "pick to begin" prompt. */

const statusColor = (s) => s === 'overdue' ? T.red : s === 'due' ? T.amber : T.green;
const statusLabel = (s) => s === 'overdue' ? 'OVERDUE' : s === 'due' ? 'DUE' : 'OK';

const AssetThumb = ({ kind }) => (
  <div style={{ width: 56, height: 56, borderRadius: 8, background: '#0c111c', position: 'relative', overflow: 'hidden', border: `1px solid ${T.hairline}` }}>
    <svg width="100%" height="100%" viewBox="0 0 56 56">
      {kind === 'tank' && (<>
        <rect width="56" height="56" fill="#1a2030"/>
        <ellipse cx="28" cy="48" rx="22" ry="4" fill="#2a2820"/>
        <rect x="8" y="20" width="40" height="28" fill="#3a3a3a"/>
        <ellipse cx="28" cy="20" rx="20" ry="4" fill="#5a5a5a"/>
      </>)}
      {kind === 'flare' && (<>
        <rect width="56" height="56" fill="#1a2030"/>
        <rect x="24" y="10" width="8" height="38" fill="#3a3a3a"/>
        <polygon points="28,4 22,14 34,14" fill="#F59E0B" opacity="0.7"/>
      </>)}
      {kind === 'pipe' && (<>
        <rect width="56" height="56" fill="#1a2030"/>
        <rect x="4" y="22" width="48" height="6" fill="#3a3a3a"/>
        <rect x="4" y="32" width="48" height="6" fill="#3a3a3a"/>
        <rect x="10" y="14" width="4" height="34" fill="#2a2a2a"/>
        <rect x="42" y="14" width="4" height="34" fill="#2a2a2a"/>
      </>)}
      {kind === 'hex' && (<>
        <rect width="56" height="56" fill="#1a2030"/>
        <rect x="4" y="22" width="48" height="14" rx="7" fill="#3a3a3a"/>
        <circle cx="10" cy="29" r="3" fill="#1a1a1a"/>
        <circle cx="46" cy="29" r="3" fill="#1a1a1a"/>
      </>)}
      {kind === 'cooling' && (<>
        <rect width="56" height="56" fill="#1a2030"/>
        <polygon points="14,48 8,18 48,18 42,48" fill="#3a3a3a"/>
        <line x1="14" y1="32" x2="42" y2="32" stroke="#2a2a2a" strokeWidth="1"/>
      </>)}
      {kind === 'sub' && (<>
        <rect width="56" height="56" fill="#1a2030"/>
        <rect x="6" y="18" width="6" height="30" fill="#3a3a3a"/>
        <rect x="22" y="14" width="6" height="34" fill="#3a3a3a"/>
        <rect x="38" y="20" width="6" height="28" fill="#3a3a3a"/>
        <line x1="9" y1="20" x2="41" y2="20" stroke="#5a5a5a" strokeWidth="0.5"/>
        <line x1="9" y1="26" x2="41" y2="26" stroke="#5a5a5a" strokeWidth="0.5"/>
      </>)}
      {kind === 'home' && (<>
        <rect width="56" height="56" fill="#0e1828"/>
        <circle cx="28" cy="28" r="14" fill="none" stroke="#10B981" strokeWidth="2"/>
        <text x="28" y="33" textAnchor="middle" fill="#10B981" fontFamily="Roboto" fontSize="16" fontWeight="700">H</text>
      </>)}
    </svg>
  </div>
);

const AssetRow = ({ a }) => {
  const isSel = a.id === 'TANK-04';
  return (
    <div style={{
      padding: '12px 16px', borderBottom: `1px solid ${T.hairline2}`,
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      background: isSel ? 'rgba(0,212,255,0.08)' : 'transparent',
      borderLeft: isSel ? `3px solid ${T.cyan}` : '3px solid transparent',
    }}>
      <AssetThumb kind={ASSET_PINS.find(p => p.id === a.id)?.kind || 'tank'}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: T.ui, fontSize: 15, color: T.t1, fontWeight: 600 }}>{a.name}</span>
          <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>{a.id}</span>
        </div>
        <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 2 }}>{a.type} · {a.subtype} · {a.dims}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3 }}>Last inspected {a.last}</span>
          <div style={{
            padding: '2px 8px', borderRadius: 4,
            background: a.status === 'ok' ? 'rgba(16,185,129,0.14)' : a.status === 'due' ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.14)',
            border: `1px solid ${statusColor(a.status)}`,
            color: statusColor(a.status),
            fontFamily: T.ui, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          }}>{statusLabel(a.status)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>SUGGESTED</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {a.routines.map(r => (
            <span key={r} style={{ padding: '2px 6px', borderRadius: 4, background: T.card, border: `1px solid ${T.hairline}`, fontFamily: T.mono, fontSize: 10, color: T.t1, fontWeight: 500, letterSpacing: '0.08em' }}>{r}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const AssetLibraryPanel = () => {
  const sites = ['Refinery North', 'Refinery South'];
  return (
    <div style={{ width: 760, background: T.panel, borderRight: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>ASSET LIBRARY</span>
          <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t2 }}>{ASSETS.length} assets · 2 sites</span>
        </div>
        <div style={{ fontSize: 24, color: T.t1, fontWeight: 600, marginTop: 4, letterSpacing: '-0.01em' }}>Pick an asset to inspect</div>
      </div>

      {/* Search + filters */}
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: `1px solid ${T.hairline2}` }}>
        <div style={{ height: 40, padding: '0 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <MI name="search" size={18} color={T.t3}/>
          <span style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, flex: 1 }}>Search assets, IDs, last inspection…</span>
          <span style={{ padding: '2px 6px', borderRadius: 4, background: T.cardHi, color: T.t3, fontFamily: T.mono, fontSize: 10 }}>⌘K</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterChip label="All sites" active/>
          <FilterChip label="Refinery N"/>
          <FilterChip label="Refinery S"/>
          <div style={{ width: 1, height: 28, background: T.hairline, margin: '0 2px' }}/>
          <FilterChip label="Due" count={4} tone="amber"/>
          <FilterChip label="Overdue" tone="red"/>
          <FilterChip label="OK" count={5}/>
          <div style={{ width: 1, height: 28, background: T.hairline, margin: '0 2px' }}/>
          <FilterChip label="Tanks" count={5}/>
          <FilterChip label="Pipes" count={2}/>
          <FilterChip label="Other" count={5}/>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {sites.map(site => {
          const items = ASSETS.filter(a => a.site === site);
          return (
            <div key={site}>
              <div style={{ padding: '10px 18px 6px', display: 'flex', alignItems: 'baseline', background: T.panelHi, borderBottom: `1px solid ${T.hairline2}`, borderTop: `1px solid ${T.hairline2}` }}>
                <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, letterSpacing: '0.18em', fontWeight: 700 }}>{site.toUpperCase()}</span>
                <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>{items.length} assets</span>
              </div>
              {items.map(a => <AssetRow key={a.id} a={a}/>)}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.hairline}`, background: T.panelHi, display: 'flex', alignItems: 'center', gap: 12 }}>
        <MI name="info" size={18} color={T.t3}/>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t2 }}>Each asset stores its own geometry, routines, and prior captures. Add new in <span style={{ color: T.cyan, fontWeight: 600 }}>Asset settings</span>.</span>
      </div>
    </div>
  );
};

const FilterChip = ({ label, count, active, tone }) => {
  const fg = tone === 'red' ? T.red : tone === 'amber' ? T.amber : (active ? T.cyan : T.t2);
  return (
    <div style={{
      height: 28, padding: '0 10px', borderRadius: 6,
      background: active ? 'rgba(0,212,255,0.14)' : tone === 'red' ? 'rgba(239,68,68,0.08)' : tone === 'amber' ? 'rgba(245,158,11,0.08)' : T.card,
      border: `1px solid ${active ? T.cyan : tone === 'red' ? 'rgba(239,68,68,0.35)' : tone === 'amber' ? 'rgba(245,158,11,0.35)' : T.hairline}`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: T.ui, fontSize: 12, fontWeight: 600, color: fg, letterSpacing: '0.04em',
      cursor: 'pointer',
    }}>
      {label}
      {count != null && <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>{count}</span>}
    </div>
  );
};

window.AssetLibraryPanel = AssetLibraryPanel;

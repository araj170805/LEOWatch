import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Mission Control' },
  { to: '/conjunctions', label: 'Conjunctions' },
  { to: '/orbit-view', label: '3D Orbit' },
  { to: '/objects', label: 'Catalog' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/about', label: 'Reference' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { logout, isAuthenticated, user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = now.toUTCString().split(' ')[4];

  function handleLogout() {
    logout();
    navigate('/');
  }

  function handleSearch(e) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    if (/^\d{1,6}$/.test(q)) navigate(`/objects/${q}`);
    else navigate(`/objects?q=${encodeURIComponent(q)}`);
    setSearch('');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(0,240,255,0.15)] bg-[rgba(5,8,22,0.75)] backdrop-blur-2xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/30 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4 relative">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#a200ff] p-[1px] shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <div className="h-full w-full bg-[#050816] rounded-[11px] flex items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00f0ff] animate-pulse_dot" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-bold text-base tracking-[0.15em] uppercase text-white group-hover:text-[#00f0ff] transition-colors">
              LEO WATCH
            </span>
            <span className="font-mono text-[9px] text-[#00f0ff]/70 tracking-wider uppercase font-medium">
              Orbital Guardian SSA
            </span>
          </div>
        </NavLink>

        {/* Primary nav */}
        <nav className="hidden lg:flex items-center gap-1 mx-2">
          {NAV_ITEMS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  'px-3 py-1.5 rounded-full text-sm font-medium tracking-wide transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[#00f0ff] text-[#050816]'
                    : 'text-slate-300 hover:text-white hover:bg-[rgba(0,240,255,0.08)]',
                ].join(' ')
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <form onSubmit={handleSearch} className="hidden xl:block">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or NORAD ID…"
              className="w-44 bg-[rgba(0,240,255,0.04)] border border-[rgba(0,240,255,0.2)] rounded-xl text-xs px-3 py-2 text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-[#00f0ff] focus:w-52 transition-all"
            />
          </form>

          <div className="hidden md:flex items-center gap-2 border border-[rgba(0,240,255,0.2)] bg-[rgba(0,240,255,0.04)] rounded-xl px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            <span className="font-mono text-[11px] font-medium text-slate-300 tabular-nums tracking-wide">{utc} UTC</span>
          </div>

          {isAuthenticated ? (
            <>
              {user && (
                <div className="hidden md:flex flex-col items-end leading-tight mr-1">
                  <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                    {user.name || user.email}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[160px]">
                    {user.phone || user.email}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-xs font-semibold tracking-[0.15em] uppercase rounded-full px-4 py-2 transition-all duration-300 hover:scale-105 border border-[rgba(0,240,255,0.35)] text-[#00f0ff] bg-[rgba(0,240,255,0.06)]"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold tracking-[0.15em] uppercase rounded-full px-4 py-2 transition-all duration-300 hover:scale-105 border border-[rgba(0,240,255,0.35)] text-[#00f0ff] bg-[rgba(0,240,255,0.06)]"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

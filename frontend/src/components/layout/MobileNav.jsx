import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/dashboard', label: 'Dash', icon: '📊' },
  { to: '/conjunctions', label: 'Conjunctions', icon: '⚠️' },
  { to: '/orbit-view', label: '3D Orbit', icon: '🌐' },
  { to: '/objects', label: 'Catalog', icon: '🛰️' },
  { to: '/alerts', label: 'Alerts', icon: '🔔' },
];

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-panel/95 backdrop-blur-md">
      <ul className="grid grid-cols-5 py-1">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-mono transition-colors',
                  isActive ? 'text-track font-semibold' : 'text-faint hover:text-dim',
                ].join(' ')
              }
            >
              <span className="text-sm">{item.icon}</span>
              <span className="truncate max-w-[56px] text-center">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}


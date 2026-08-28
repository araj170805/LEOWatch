import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import MobileNav from './MobileNav.jsx';
import AssistantPanel from '../assistant/AssistantPanel.jsx';

export default function AppShell() {
  const location = useLocation();
  const isOrbitView = location.pathname === '/orbit-view';

  return (
    <div className="min-h-screen flex flex-col text-primary selection:bg-track selection:text-void" style={{ background: 'transparent' }}>
      <Navbar />
      <main className={`flex-1 ${isOrbitView ? 'p-0 relative overflow-hidden' : 'px-4 md:px-8 py-6 pb-24 md:pb-6'}`}>
        <div className={isOrbitView ? 'w-full h-full' : 'max-w-7xl mx-auto space-y-6'}>
          <Outlet />
        </div>
      </main>
      <AssistantPanel />
      <MobileNav />
    </div>
  );
}


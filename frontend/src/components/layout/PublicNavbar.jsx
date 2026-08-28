import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function PublicNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel/85 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 rounded-full bg-track animate-pulse_dot" />
          <span className="font-display text-base font-semibold tracking-wide text-primary">KAKSHA</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-dim">
          <a href="#features" className="hover:text-primary transition-colors">
            Features
          </a>
          <a href="#methodology" className="hover:text-primary transition-colors">
            Methodology
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="text-xs font-mono bg-track text-void px-3.5 py-1.5 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Enter Console →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-xs font-mono text-dim hover:text-primary transition-colors">
                Log In
              </Link>
              <Link
                to="/signup"
                className="text-xs font-mono border border-track/60 text-track px-3.5 py-1.5 rounded-full font-semibold hover:bg-track hover:text-void transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import SpaceBackground from './components/common/SpaceBackground.jsx';
import AppShell from './components/layout/AppShell.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import GuestGateModal from './components/auth/GuestGateModal.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Objects from './pages/Objects.jsx';
import ObjectDetail from './pages/ObjectDetail.jsx';
import Conjunctions from './pages/Conjunctions.jsx';
import OrbitView from './pages/OrbitView.jsx';
import Alerts from './pages/Alerts.jsx';
import About from './pages/About.jsx';
import History from './pages/History.jsx';
import { pageTransition } from './utils/motion.js';

function Page({ children }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen">
      <SpaceBackground />
      <GuestGateModal />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Landing /></Page>} />
            <Route path="/login" element={<Page><Login /></Page>} />
            <Route path="/signup" element={<Page><Signup /></Page>} />

            {/* Core Space Situational Awareness features are PUBLIC (guest mode).
                Sign-in is only required for personal / persistent features. */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
              <Route path="/objects" element={<Page><Objects /></Page>} />
              <Route path="/objects/:id" element={<Page><ObjectDetail /></Page>} />
              <Route path="/conjunctions" element={<Page><Conjunctions /></Page>} />
              <Route path="/orbit-view" element={<Page><OrbitView /></Page>} />
              <Route path="/alerts" element={<Page><Alerts /></Page>} />
              <Route path="/about" element={<Page><About /></Page>} />

              {/* Personal / persistent — account required */}
              <Route element={<ProtectedRoute />}>
                <Route path="/history" element={<Page><History /></Page>} />
              </Route>
            </Route>
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

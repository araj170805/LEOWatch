import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { TimeRangeProvider } from './context/TimeRangeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { MissionProvider } from './context/MissionContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TimeRangeProvider>
          <MissionProvider>
            <App />
          </MissionProvider>
        </TimeRangeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

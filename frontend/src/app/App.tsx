import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppDataBootstrap } from '../shared/components/AppDataBootstrap';
import PublicAboutPage from '../widgets/landing/PublicAboutPage';

import AppPage from './AppPage';

export default function App() {
  return (
    <AppDataBootstrap>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppPage />} />
          <Route path="/list" element={<Navigate to="/" replace />} />
          <Route path="/about" element={<PublicAboutPage />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>

    </AppDataBootstrap>
  );
}

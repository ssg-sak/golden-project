import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppDataBootstrap } from '../shared/components/AppDataBootstrap';
import { LandingPage } from '../widgets/landing/LandingPage';
import PublicAboutPage from '../widgets/landing/PublicAboutPage';

import AppPage from './AppPage';

export default function App() {
  return (
    <AppDataBootstrap>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppPage />} />
          <Route path="/list" element={<LandingPage />} />
          <Route path="/about" element={<PublicAboutPage />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppDataBootstrap>
  );
}

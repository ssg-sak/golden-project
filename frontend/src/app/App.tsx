import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppDataBootstrap } from '../shared/components/AppDataBootstrap';

const AppPage = lazy(() => import('./AppPage'));
const PublicAboutPage = lazy(() => import('../widgets/landing/PublicAboutPage'));

export default function App() {
  return (
    <AppDataBootstrap>
      <HashRouter>
        <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">화면을 불러오는 중입니다.</div>}>
          <Routes>
            <Route path="/" element={<AppPage />} />
            <Route path="/list" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<PublicAboutPage />} />
            <Route path="/map" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>

    </AppDataBootstrap>
  );
}

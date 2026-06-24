import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { startCleanupScheduler } from './db/cleanup';
import { ToastProvider, useToast } from './context/ToastContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LanguagePicker } from './components/LanguagePicker';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { JobPage } from './pages/JobPage';

// Everything except the two screens used on every visit is code-split: a
// trip to the photo/OCR screen pulls in Tesseract.js, scanning pulls in the
// ZXing fallback, and neither should slow down opening the app or a job.
const NewJobPage = lazy(() => import('./pages/NewJobPage').then((m) => ({ default: m.NewJobPage })));
const AddManualPage = lazy(() => import('./pages/AddManualPage').then((m) => ({ default: m.AddManualPage })));
const PasteTextPage = lazy(() => import('./pages/PasteTextPage').then((m) => ({ default: m.PasteTextPage })));
const PhotoOcrPage = lazy(() => import('./pages/PhotoOcrPage').then((m) => ({ default: m.PhotoOcrPage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })));
const ReferencePhotosPage = lazy(() =>
  import('./pages/ReferencePhotosPage').then((m) => ({ default: m.ReferencePhotosPage })),
);
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })));

function CleanupScheduler() {
  const showToast = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const stop = startCleanupScheduler({
      onPurge: (ids) => {
        if (ids.length > 0) showToast(t('toast.jobsPurged'));
      },
    });
    return stop;
  }, [showToast, t]);

  return null;
}

function AppRoutes() {
  const { lang, t } = useLanguage();

  if (!lang) return <LanguagePicker />;

  return (
    <ErrorBoundary message={t('common.appError')} reloadLabel={t('common.reload')}>
      <ToastProvider>
        <CleanupScheduler />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/jobs/new" element={<NewJobPage />} />
            <Route path="/jobs/:jobId" element={<JobPage />} />
            <Route path="/jobs/:jobId/add/manual" element={<AddManualPage />} />
            <Route path="/jobs/:jobId/add/paste" element={<PasteTextPage />} />
            <Route path="/jobs/:jobId/add/photo" element={<PhotoOcrPage />} />
            <Route path="/jobs/:jobId/review" element={<ReviewPage />} />
            <Route path="/jobs/:jobId/scan" element={<ScanPage />} />
            <Route path="/jobs/:jobId/photos" element={<ReferencePhotosPage />} />
            <Route path="/jobs/:jobId/report" element={<ReportPage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
}

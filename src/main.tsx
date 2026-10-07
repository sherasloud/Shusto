import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Global uncaught error listener to display error overlay instead of blank white screen
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection caught:', event.reason);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err: any) {
    console.error('Fatal boot error:', err);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; padding: 2rem; font-family: sans-serif; text-align: center;">
        <div style="background: white; border-radius: 24px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 400px; width: 100%; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0;">অ্যাপ লোড হতে সমস্যা হয়েছে</h2>
          <p style="color: #64748b; font-size: 14px;">${err?.message || 'একটি অপ্রত্যাশিত সমস্যা হয়েছে।'}</p>
          <button onclick="window.location.reload()" style="background: #0ea5e9; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 1rem;">
            পুনরায় চেষ্টা করুন
          </button>
        </div>
      </div>
    `;
  }
}

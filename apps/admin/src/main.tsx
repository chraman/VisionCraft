import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function AdminApp() {
  return <div>Admin Dashboard — Phase 2</div>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);

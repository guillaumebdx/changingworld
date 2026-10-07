import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/theme.css';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (nb, erreur) => {
        const status = (erreur as { status?: number }).status;
        if (status === 401 || status === 404) return false;
        return nb < 1;
      },
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

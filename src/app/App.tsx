import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';

export const App = () => (
  <AppProviders>
    <AppRouter />
  </AppProviders>
);

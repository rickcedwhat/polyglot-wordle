import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './components/ProctedRoute/ProtectedRoute';
import { GameLayout } from './layouts/GameLayout'; // Import the new layout
import { GamePage } from './pages/Game.page';
import { HomePage } from './pages/Home.page';
import { LoginPage } from './pages/Login.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // All nested routes will now use the GameLayout.
    element: <GameLayout />,
    children: [
      {
        path: '/game/:uuid',
        element: (
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}

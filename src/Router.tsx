import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './components/ProctedRoute/ProtectedRoute';
import { GenericLayout } from './layouts/GenericLayout';
import { SidebarLayout } from './layouts/SidebarLayout'; // Import the new layout

import { GamePage } from './pages/Game.page';
import { HomePage } from './pages/Home.page';
import { LoginPage } from './pages/Login.page';
import { ProfilePage } from './pages/Profile.page';

const router = createBrowserRouter([
  {
    element: <GenericLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <SidebarLayout />,
    children: [
      {
        path: '/game/:uuid',
        element: (
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/profile/:userId',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}

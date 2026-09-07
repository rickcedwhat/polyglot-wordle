import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './components/ProctedRoute/ProtectedRoute';
import { GenericLayout } from './layouts/GenericLayout';
import { SidebarLayout } from './layouts/SidebarLayout'; // Import the new layout

import { GamePage } from './pages/Game.page';
import { HomePage } from './pages/Home.page';
import { LoginPage } from './pages/Login.page';
import { ProfilePage } from './pages/Profile.page';
import { SandboxPage } from './pages/Sandbox.page';

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
      {
        path: '/sandbox',
        element: import.meta.env.DEV ? <SandboxPage /> : <Navigate to="/" replace />,
      },
      {
        path: '/dev',
        element: import.meta.env.DEV ? <SandboxPage /> : <Navigate to="/" replace />,
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

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './components/ProctedRoute/ProtectedRoute';
import { GenericLayout } from './layouts/GenericLayout';
import { HomeLayout } from './layouts/HomeLayout';
import { SidebarLayout } from './layouts/SidebarLayout'; // Import the new layout

import { ChallengesPage } from './pages/Challenges.page';
import { DictionariesPage } from './pages/Dictionaries.page';
import { FeedPage } from './pages/Feed.page';
import { GamePage } from './pages/Game.page';
import { HomePage } from './pages/Home.page';
import { LoginPage } from './pages/Login.page';
import { ProfilePage } from './pages/Profile.page';
import { SandboxPage } from './pages/Sandbox.page';

const router = createBrowserRouter([
  {
    element: <HomeLayout />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  {
    element: <GenericLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/dictionaries',
        element: import.meta.env.DEV ? <DictionariesPage /> : <Navigate to="/" replace />,
      },
    ],
  },
  {
    element: <SidebarLayout />,
    children: [
      {
        path: '/sandbox',
        element: import.meta.env.DEV ? <SandboxPage /> : <Navigate to="/" replace />,
      },
      {
        path: '/dev',
        element: import.meta.env.DEV ? <SandboxPage /> : <Navigate to="/" replace />,
      },
      {
        path: '/game/:languages/:uuid',
        element: (
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/game/:uuid',
        element: (
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/feed',
        element: (
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/challenges',
        element: (
          <ProtectedRoute>
            <ChallengesPage />
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

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GameLayout } from './layouts/GameLayout'; // Import the new layout
import { GamePage } from './pages/Game.page';
import { HomePage } from './pages/Home.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    // All nested routes will now use the GameLayout.
    element: <GameLayout />,
    children: [
      {
        path: '/game/:uuid',
        element: <GamePage />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}

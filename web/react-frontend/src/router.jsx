import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SinglePlayerApp from './SinglePlayerApp';

const router = createBrowserRouter([
  {
    path: '/',
    element: <SinglePlayerApp />,
  },
  {
    path: '/room/:roomId',
    element: <SinglePlayerApp />,
  },
]);

export default router;

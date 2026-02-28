import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Index from './pages';
import Tracks from './pages/Tracks';
import RunDetail from './pages/RunDetail';
import NotFound from './pages/404';
import ReactGA from 'react-ga4';
import {
  GOOGLE_ANALYTICS_TRACKING_ID,
  USE_GOOGLE_ANALYTICS,
} from './utils/const';
import '@/styles/index.scss';
import '@/styles/tailwind.css';
import { withOptionalGAPageTracking } from './utils/trackRoute';

if (USE_GOOGLE_ANALYTICS) {
  ReactGA.initialize(GOOGLE_ANALYTICS_TRACKING_ID);
}

const routes = createHashRouter(
  [
    {
      path: '/',
      element: withOptionalGAPageTracking(<Index />),
    },
    {
      path: '/tracks',
      element: withOptionalGAPageTracking(<Tracks />),
    },
    {
      path: '/run/:runId',
      element: withOptionalGAPageTracking(<RunDetail />),
    },
    {
      path: '*',
      element: withOptionalGAPageTracking(<NotFound />),
    },
  ]
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={routes} />
    </HelmetProvider>
  </React.StrictMode>
);

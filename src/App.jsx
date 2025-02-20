import ReactDOM from 'react-dom/client';
import React from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { ImagingDashboard } from './ImagingDashboard';
import { ImagingViewer } from './ImagingViewer';

const router = createHashRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/imaging", element: <ImagingDashboard /> },
  { path: "/viewer", element: <ImagingViewer /> },
]);
const App = () => 
  <RouterProvider router={router}/>
;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
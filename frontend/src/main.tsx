import ClassesEditor from './editor/ClassesEditor';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import Profile from './Profile';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/editor/classes" element={<ClassesEditor />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

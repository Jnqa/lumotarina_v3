import ClassesEditor from './editor/ClassesEditor';
import LoreMap from './LoreMap';
import Lore from './Lore';
import CharacterCreating from './CharacterCreating';
import CharacterCreatingClass from './CharacterCreatingClass';
import CharacterEdit from './CharacterEdit';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import Profile from './Profile';
import './index.css';
import './utils/toast.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/editor/classes" element={<ClassesEditor />} />
        <Route path="/lore" element={<Lore />} />
        <Route path="/lore/map" element={<LoreMap />} />
        <Route path="/character/create" element={<CharacterCreating />} />
        <Route path="/character/class" element={<CharacterCreatingClass />} />
        <Route path="/character/edit" element={<CharacterEdit />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

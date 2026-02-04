import ClassesEditor from './editor/ClassesEditor';
import LoreMap from './LoreMap';
import Lore from './Lore';
import CharacterCreating from './CharacterCreating';
import CharacterCreatingClass from './CharacterCreatingClass';
import CharacterEdit from './CharacterEdit';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import App from './App.tsx';
import Profile from './Profile';
import Intro from './Intro';
import MasterRoom from './MasterRoom';
import './index.css';
import './utils/toast.css';
import ClassPreview from './modules/ClassPreview';
import CharacterPreview from './modules/CharacterPreview';
import ClassPreviewSkills from './modules/ClassPreviewSkills';
import CharacterCreation from './creator/CharacterCreation';
import CharacterCreationClass from './creator/CharacterCreationClass';
import { Gallery } from './modules/Gallery';

const ClassPreviewPage = () => {
  const { classId } = useParams<{ classId: string }>();
  return <ClassPreview classId={classId || ''} />;
};

const CharacterPreviewPage = () => {
  const { userId, charId } = useParams<{ userId: string; charId: string }>();
  return <CharacterPreview userId={userId || ''} charId={charId || ''} />;
};

const ClassPreviewSkillsPage = () => {
  const { className } = useParams<{ className: string }>();
  return <ClassPreviewSkills className={className || ''} />;
};

const CharacterCreationPage = () => {
  return <CharacterCreation />;
};

const CharacterCreationClassPage = () => {
  return <CharacterCreationClass />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/master-room" element={<MasterRoom />} />
        <Route path="/editor/classes" element={<ClassesEditor />} />
        <Route path="/lore" element={<Lore />} />
        <Route path="/lore/map" element={<LoreMap />} />
        <Route path="/character/create" element={<CharacterCreating />} />
        <Route path="/creator/character" element={<CharacterCreationPage />} />
        <Route path="/creator/character/class" element={<CharacterCreationClassPage />} />
        <Route path="/character/class" element={<CharacterCreatingClass />} />
        <Route path="/character/edit" element={<CharacterEdit />} />
        <Route path="/character/module/AbilityMap/:userId/:charId" element={<CharacterPreviewPage />} />
        <Route path="/class/preview/:classId" element={<ClassPreviewPage />} />
        <Route path="/class/preview-skills/:className" element={<ClassPreviewSkillsPage />} />
        <Route path="/gallery" element={<Gallery />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

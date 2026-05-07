import ClassesEditor from './editor/ClassesEditor';
import LoreMap from './LoreMap';
import Lore from './Lore';
import CharacterCreating from './CharacterCreating';
import CharacterCreatingClass from './CharacterCreatingClass';
import CharacterEdit from './CharacterEdit';
import AdminPanel from './AdminPanel';
import Auth from './auth';
// using automatic JSX runtime; explicit React import removed
import * as React from 'react'
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import MainPage from './mainPage/mainPage';
import Intro from './Intro';
import MasterRoom from './MasterRoom';
import DM from './dm/dm';
import './index.css';
import './utils/toast.css';
import ClassPreview from './modules/ClassPreview';
import CharacterPreview from './modules/CharacterPreview';
import ClassPreviewSkills from './modules/ClassPreviewSkills';
import CharacterCreation from './creator/CharacterCreation';
import CharacterCreationClass from './creator/CharacterCreationClass';
import { Gallery } from './modules/Gallery';
import Rewind from './rewind/Rewind';
import MainLayout from './characterPage/layouts/MainLayout.tsx';
import CharacterPage from './characterPage/character/CharacterPage.tsx';
import CharacterPageEdit from './characterPage/character/CharacterPageEdit.tsx';
import NotesPage from './characterPage/notes/NotesPage.tsx';
import AbilitiesPage from './characterPage/abilities/AbilitiesPage.tsx';
import PowersPage from './characterPage/powers/PowersPage.tsx';
import InventoryPage from './characterPage/inventory/InventoryPage.tsx';

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
        <Route path="/" element={<MainPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/magic-link" element={<Auth />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/profile" element={<MainPage />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/rewind" element={<Rewind />} />
        <Route path="/master-room" element={<MasterRoom />} />
        <Route path="/dm" element={<DM />} />
        <Route path="/editor/classes" element={<ClassesEditor />} />
        <Route path="/lore" element={<Lore />} />
        <Route path="/lore/books/:bookId" element={<Lore />} />
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
        <Route path="/app/:userId/:charId" element={<MainLayout />}>
          <Route index element={<CharacterPage />} />           {/* default */}
          <Route path="character" element={<CharacterPage />} />
          <Route path="character/edit" element={<CharacterPageEdit />} />
          <Route path="edit" element={<CharacterPageEdit />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="powers" element={<PowersPage />} />
          <Route path="abilities" element={<AbilitiesPage />} />
          <Route path="notes" element={<NotesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

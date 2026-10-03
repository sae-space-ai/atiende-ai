import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import NewMission from './pages/NewMission';
import MissionDetail from './pages/MissionDetail';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('atiende_user') 
      ? JSON.parse(localStorage.getItem('atiende_user')!).name 
      : '';
  });

  useEffect(() => {
    if (!userName) {
      const user = { id: 'local-user', name: 'Usuario', email: '' };
      localStorage.setItem('atiende_user', JSON.stringify(user));
      setUserName('Usuario');
    }
  }, [userName]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout userName={userName} />}>
          <Route index element={<Dashboard />} />
          <Route path="nueva" element={<NewMission />} />
          <Route path="mision/:id" element={<MissionDetail />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import NewMission from './pages/NewMission';
import MissionDetail from './pages/MissionDetail';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { getOrCreateSpaceId } from './space';

function App() {
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Crear o recuperar el espacio anónimo
    const id = getOrCreateSpaceId();
    setSpaceId(id);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout spaceId={spaceId} />}>
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

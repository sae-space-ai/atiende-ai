import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Settings, Bell } from 'lucide-react';
import { getNotifications } from '../store';

import { signOut } from '../store';

interface LayoutProps {
  userName: string;
  onLogout?: () => void;
}

export default function Layout({ userName, onLogout }: LayoutProps) {
  const location = useLocation();
  const notifications = getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    signOut();
    if (onLogout) onLogout();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="font-bold text-xl text-gray-900">ATIENDE</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 inline mr-1.5" />
                  Panel
                </Link>
                <Link
                  to="/nueva"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/nueva') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 inline mr-1.5" />
                  Nueva misión
                </Link>
                <Link
                  to="/configuracion"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/configuracion') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="w-4 h-4 inline mr-1.5" />
                  Configuración
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-medium text-sm">{userName.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">{userName}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1 hidden sm:block"
                  title="Cerrar sesión"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden border-t border-gray-100 px-4 py-2 flex gap-2">
          <Link to="/" className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${isActive('/') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>
            Panel
          </Link>
          <Link to="/nueva" className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${isActive('/nueva') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>
            Nueva
          </Link>
          <Link to="/configuracion" className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${isActive('/configuracion') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>
            Config
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

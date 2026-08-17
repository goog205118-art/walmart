import React, { useState } from 'react';
import { LayoutDashboard, History, Settings, Bot, PlusCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import GraiForm from './components/GraiForm';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState(null);

  const handleNavigate = (tab) => {
    if (tab !== 'new') setEditingId(null);
    setActiveTab(tab);
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setActiveTab('new');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'new': return <GraiForm key={editingId || 'new'} onNavigate={handleNavigate} editId={editingId} />;
      case 'history': return <HistoryView onEdit={handleEdit} />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bot className="text-blue-600" />
            GRAI 复盘系统
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem active={activeTab === 'dashboard'} onClick={() => handleNavigate('dashboard')} icon={<LayoutDashboard size={20} />} text="大盘与分析" />
          <NavItem active={activeTab === 'new'} onClick={() => handleNavigate('new')} icon={<PlusCircle size={20} />} text={editingId ? '编辑复盘' : '新建复盘'} />
          <NavItem active={activeTab === 'history'} onClick={() => handleNavigate('history')} icon={<History size={20} />} text="历史归档" />
          <NavItem active={activeTab === 'settings'} onClick={() => handleNavigate('settings')} icon={<Settings size={20} />} text="AI与系统设置" />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

const NavItem = ({ active, icon, text, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
      active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {icon}
    {text}
  </button>
);

export default App;

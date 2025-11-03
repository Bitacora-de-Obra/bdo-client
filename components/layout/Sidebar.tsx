import React from 'react';
import {
    Squares2X2Icon,
    ClipboardDocumentListIcon,
    ChatBubbleLeftRightIcon,
    DocumentChartBarIcon,
    CalculatorIcon,
    CameraIcon,
    CalendarDaysIcon,
    DocumentArrowDownIcon,
    ListBulletIcon,
    XMarkIcon,
    ChartPieIcon,
    ShieldCheckIcon,
    MapIcon
} from '../icons/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
}

const navItems = [
    { id: 'summary', label: 'Resumen del Proyecto', icon: <Squares2X2Icon />, section: 'General' },
    { id: 'pending_tasks', label: 'Mis Pendientes', icon: <ListBulletIcon />, section: 'General' },
    { id: 'logbook', label: 'Bitácora de Obra', icon: <ClipboardDocumentListIcon />, section: 'Registros' },
    { id: 'drawings', label: 'Planos de Obra', icon: <MapIcon />, section: 'Registros' },
    { id: 'communications', label: 'Comunicaciones', icon: <ChatBubbleLeftRightIcon />, section: 'Registros' },
    { id: 'chat', label: 'Chat del Proyecto', icon: <ChatBubbleLeftRightIcon />, section: 'Herramientas' },
    { id: 'minutes', label: 'Actas de Comité', icon: <ClipboardDocumentListIcon />, section: 'Registros' },
    { id: 'work_progress', label: 'Avance de Obra', icon: <ChartPieIcon />, section: 'Seguimiento' },
    { id: 'photographic_progress', label: 'Avance Fotográfico', icon: <CameraIcon />, section: 'Seguimiento' },
    { id: 'planning', label: 'Cronograma', icon: <CalendarDaysIcon />, section: 'Seguimiento' },
    { id: 'costs', label: 'Costos Interventoría', icon: <CalculatorIcon />, section: 'Seguimiento', roles: [UserRole.SUPERVISOR, UserRole.ADMIN] },
    { id: 'weekly_reports', label: 'Informes Semanales', icon: <DocumentChartBarIcon />, section: 'Reportes' },
    { id: 'monthly_reports_obra', label: 'Informes Mensuales (Obra)', icon: <DocumentChartBarIcon />, section: 'Reportes' },
    { id: 'monthly_reports_interventoria', label: 'Informes Mensuales (Interv.)', icon: <DocumentChartBarIcon />, section: 'Reportes', roles: [UserRole.SUPERVISOR, UserRole.ADMIN] },
    { id: 'export_project', label: 'Exportar Expediente', icon: <DocumentArrowDownIcon />, section: 'Herramientas', appRoles: ['admin'] },
    { id: 'admin', label: 'Administración', icon: <ShieldCheckIcon />, section: 'Herramientas', appRoles: ['admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView }) => {
  const { user } = useAuth();
  
  const handleNavClick = (view: string) => {
    setCurrentView(view);
    if (window.innerWidth < 1024) { // lg breakpoint
        setIsSidebarOpen(false);
    }
  };
  
  const visibleNavItems = React.useMemo(() => {
    if (!user) return [];
    return navItems.filter(item => {
        const projectRoleMatch = !item.roles || item.roles.includes(user.projectRole);
        const appRoleMatch = !item.appRoles || item.appRoles.includes(user.appRole);
        return projectRoleMatch && appRoleMatch;
    });
  }, [user]);

  const NavLink: React.FC<{ item: typeof navItems[0] }> = ({ item }) => (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleNavClick(item.id);
        }}
        className={`flex items-center p-2 text-base font-normal rounded-lg transition duration-75 group ${
          currentView === item.id
            ? 'bg-brand-primary text-white'
            : 'text-gray-200 hover:bg-gray-700'
        }`}
      >
        {React.cloneElement(item.icon, { className: `w-6 h-6 transition duration-75 ${
          currentView === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
        }`})}
        <span className="ml-3">{item.label}</span>
      </a>
    </li>
  );

  const sections = [...new Set(visibleNavItems.map(item => item.section))];

  return (
    <>
        {/* Mobile overlay */}
        <div 
            className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
        ></div>
        
        <aside
            className={`fixed top-0 left-0 z-30 w-64 h-screen transition-transform transform bg-gray-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            aria-label="Sidebar"
        >
            <div className="h-full px-3 py-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <a href="#" className="flex items-center pl-2.5">
                        <img src="https://www.idu.gov.co/sites/default/files/2022-10/logo-bogota.png" className="h-8 mr-3" alt="Bogota Logo" />
                        <span className="self-center text-xl font-semibold whitespace-nowrap text-white">IDU</span>
                    </a>
                     <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-gray-400 hover:bg-gray-700 p-1.5 rounded-md lg:hidden"
                     >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav>
                  <ul className="space-y-2">
                      {sections.map(section => (
                          <React.Fragment key={section}>
                              <li className="px-2 pt-4 pb-2">
                                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{section}</span>
                              </li>
                              {visibleNavItems.filter(item => item.section === section).map(item => (
                                  <NavLink key={item.id} item={item} />
                              ))}
                          </React.Fragment>
                      ))}
                  </ul>
                </nav>
            </div>
        </aside>
    </>
  );
};

export default Sidebar;

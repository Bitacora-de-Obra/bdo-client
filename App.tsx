import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import ProjectDashboard from "./components/ProjectDashboard";
import CommunicationsDashboard from "./components/CommunicationsDashboard";
import MinutesDashboard from "./components/MinutesDashboard";
import CostDashboard from "./components/CostDashboard";
import WorkProgressDashboard from "./components/WorkProgressDashboard";
import PhotographicProgressDashboard from "./components/PhotographicProgressDashboard";
import PlanningDashboard from "./components/PlanningDashboard";
import ProjectSummaryDashboard from "./components/ProjectSummaryDashboard";
import { useApi } from "./src/hooks/useApi";
import WeeklyReportsDashboard from "./components/WeeklyReportsDashboard";
import MonthlyReportsDashboard from "./components/MonthlyReportsDashboard";
import PendingTasksDashboard from "./components/PendingTasksDashboard";
import ExportDashboard from "./components/ExportDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";
import LoginScreen from "./components/auth/LoginScreen";
import { ReportScope, Notification, User, LogEntry } from "./types";
import AdminDashboard from "./components/admin/AdminDashboard";
import DrawingsDashboard from "./components/DrawingsDashboard";
import ContractDocumentsDashboard from "./components/ContractDocumentsDashboard";
import { ChatbotWidget } from "./components/chatbot/ChatbotWidget";
import ThemeManager from "./components/ThemeManager";
import EntryFormModal from "./components/EntryFormModal";

// ... existing imports ...
import SignatureManagerModal from "./components/account/SignatureManagerModal";
import ProjectChat from "./components/chat/ProjectChat";
import api from "./src/services/api";
import { OfflineIndicator } from "./src/components/offline/OfflineIndicator";
import { PlusIcon } from "./components/icons/Icon";
import { usePermissions } from "./src/hooks/usePermissions";

type InitialItemToOpen = { type: "acta" | "logEntry" | "communication" | "drawing"; id: string };

const MainApp = () => {
  // Estado para sidebar móvil (solo para móviles)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Estado persistente para sidebar colapsado (desktop)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentView, setCurrentView] = useState("summary");
  const [initialItemToOpen, setInitialItemToOpen] =
    useState<InitialItemToOpen | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Global Entry Modal State
  const [isGlobalEntryModalOpen, setIsGlobalEntryModalOpen] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const { canEditContent } = usePermissions();
  
  const { data: projectDetails, isLoading: isProjectLoading } =
    useApi.projectDetails();
    
  const {
    data: contractModifications,
    isLoading: isModificationsLoading,
    retry: refetchContractModifications,
  } = useApi.contractModifications();

  // Need users for the global modal
  const { data: users } = useApi.users();

  const isLoading =
    isProjectLoading || (isModificationsLoading && !contractModifications);

  // Guardar estado del sidebar colapsado en localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      const incoming = (await api.notifications.getAll()) as Notification[];
      setNotifications((previous) => {
        const readStatus = new Map(previous.map((item) => [item.id, item.isRead]));
        return incoming.map((item) => ({
          ...item,
          isRead: readStatus.get(item.id) ?? item.isRead ?? false,
        }));
      });
    } catch (error) {
      console.error("Error al cargar las notificaciones:", error);
    }
  }, [user]);

  useEffect(() => {
    let intervalId: number | undefined;

    if (user) {
      refreshNotifications();
      intervalId = window.setInterval(() => {
        refreshNotifications();
      }, 60000);
    } else {
      setNotifications([]);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [user, refreshNotifications]);

  const handleNavigateAndOpen = (view: string, item: InitialItemToOpen) => {
    setInitialItemToOpen(item);
    setCurrentView(view);
  };

  const clearInitialItem = () => {
    setInitialItemToOpen(null);
  };

  const handleGlobalSaveEntry = async (
    newEntryData: Omit<
      LogEntry,
      | "id"
      | "folioNumber"
      | "createdAt"
      | "author"
      | "comments"
      | "history"
      | "updatedAt"
      | "attachments"
    >,
    files: File[]
  ) => {
    if (!user || !projectDetails) return;

    try {
      await api.logEntries.create(
        {
          ...newEntryData,
          authorId: user.id,
          projectId: projectDetails.id,
        },
        files
      );
      
      showToast({
         title: "Anotación creada",
         message: "La anotación se ha guardado exitosamente.",
         variant: "success"
      });
      setIsGlobalEntryModalOpen(false);
      
      // If we are currently in the logbook view, we might want to refresh it.
      // Since passing a refresh callback down the tree is complex here without context,
      // users will see the new entry if they navigate or refresh. 
      // Ideally, React Query or SWR would handle cache invalidation automatically.
      
    } catch (err: any) {
      showToast({
        title: "Error",
        message: err.message || "Error al guardar la anotación",
        variant: "error"
      });
    }
  };

  const renderContent = () => {
    if (isLoading || !projectDetails) {
      return (
        <div className="text-center p-8">Cargando datos del proyecto...</div>
      );
    }

    if (currentView === "admin" && user?.appRole !== "admin") {
      console.warn("Acceso no autorizado a la vista de administrador.");
      setCurrentView("summary");
      return (
        <ProjectSummaryDashboard
          project={projectDetails}
          contractModifications={contractModifications || []}
        />
      );
    }

    // Permitir acceso a exportar expediente para admin o entidades autorizadas (IDU, Interventoría)
    const isRestrictedEntity = user?.entity === "INTERVENTORIA" || user?.entity === "IDU";
    if (currentView === "export_project" && user?.appRole !== "admin" && !isRestrictedEntity) {
      console.warn("Acceso no autorizado a la exportación de expediente.");
      setCurrentView("summary");
      return (
        <ProjectSummaryDashboard
          project={projectDetails}
          contractModifications={contractModifications || []}
        />
      );
    }

    switch (currentView) {
      case "summary":
        return (
          <ProjectSummaryDashboard
            project={projectDetails}
            contractModifications={contractModifications || []}
          />
        );
      case "pending_tasks":
        return <PendingTasksDashboard onNavigate={handleNavigateAndOpen} />;
      case "logbook":
        return (
          <ProjectDashboard
            initialItemToOpen={initialItemToOpen}
            clearInitialItem={clearInitialItem}
          />
        );
      case "drawings":
        return <DrawingsDashboard project={projectDetails} />;
      case "work_progress":
        return (
          <WorkProgressDashboard
            project={projectDetails}
            contractModifications={contractModifications || []}
            onContractModificationsRefresh={refetchContractModifications}
            contractModificationsLoading={isModificationsLoading}
          />
        );
      case "photographic_progress":
        return <PhotographicProgressDashboard project={projectDetails} />;
      case "chat":
        return <ProjectChat />;
      case "planning":
        return <PlanningDashboard project={projectDetails} />;
      case "communications":
        return (
          <CommunicationsDashboard
            project={projectDetails}
            initialCommunicationId={
              initialItemToOpen?.type === "communication"
                ? initialItemToOpen.id
                : null
            }
            onClearInitialCommunication={clearInitialItem}
          />
        );
      case "minutes":
        return (
          <MinutesDashboard
            initialItemToOpen={initialItemToOpen}
            clearInitialItem={clearInitialItem}
          />
        );
      case "costs":
        return <CostDashboard project={projectDetails} />;
      case "weekly_reports":
        return (
          <WeeklyReportsDashboard
            project={projectDetails}
            reportScope={ReportScope.INTERVENTORIA}
          />
        );
      case "monthly_reports_obra":
        return (
          <MonthlyReportsDashboard
            project={projectDetails}
            reportScope={ReportScope.OBRA}
          />
        );
      case "monthly_reports_interventoria":
        return (
          <MonthlyReportsDashboard
            project={projectDetails}
            reportScope={ReportScope.INTERVENTORIA}
          />
        );
      case "export_project":
        return <ExportDashboard project={projectDetails} />;
      case "contract_documents":
        return <ContractDocumentsDashboard />;
      case "admin":
        return <AdminDashboard />;
      default:
        return (
          <ProjectSummaryDashboard
            project={projectDetails}
            contractModifications={contractModifications || []}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'}`}>
        <Header
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          notifications={notifications}
          setNotifications={setNotifications}
          onNotificationClick={(notification: Notification) =>
            handleNavigateAndOpen(notification.relatedView, {
              type: notification.relatedItemType,
              id: notification.relatedItemId,
            })
          }
          onOpenSignatureManager={() => setIsSignatureModalOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">{renderContent()}</div>
        </main>
        <SignatureManagerModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
        />
        
        {/* Global Create Entry FAB */}
        {canEditContent && projectDetails && (
          <button
             onClick={() => setIsGlobalEntryModalOpen(true)}
             className="fixed z-50 rounded-full shadow-lg bg-brand-primary text-white hover:bg-brand-secondary transition-all duration-200 flex items-center justify-center"
             style={{ 
               bottom: '90px', 
               right: '25px', 
               width: '50px', 
               height: '50px',
             }}
             title="Crear nueva anotación"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        )}
        
        {isGlobalEntryModalOpen && projectDetails && (
          <EntryFormModal
             isOpen={isGlobalEntryModalOpen}
             onClose={() => setIsGlobalEntryModalOpen(false)}
             onSave={handleGlobalSaveEntry}
             availableUsers={users || []}
             currentUser={user}
             projectStartDate={projectDetails.startDate}
             contractNumber={projectDetails.contractId}
          />
        )}
      </div>
    </div>
  );
};

const AppContent = () => {
  console.log("AppContent: Rendering...");
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    console.log("AppContent: Showing Loading...");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("AppContent: Not authenticated, showing LoginScreen...");
    return <LoginScreen />;
  }

  console.log("AppContent: Authenticated, showing MainApp...");
  
  // Ocultar chatbot para Interventoría e IDU
  const isRestrictedEntity = user?.entity === "INTERVENTORIA" || user?.entity === "IDU";

  return (
    <>
      <ThemeManager />
      <MainApp />
      {!isRestrictedEntity && <ChatbotWidget />}
      <OfflineIndicator />
    </>
  );
};

function App() {
  console.log("App: Rendering AuthProvider...");
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

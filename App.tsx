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
import { ToastProvider } from "./components/ui/ToastProvider";
import LoginScreen from "./components/auth/LoginScreen";
import { ReportScope, Notification, User } from "./types";
import AdminDashboard from "./components/admin/AdminDashboard";
import DrawingsDashboard from "./components/DrawingsDashboard";
import { ChatbotWidget } from "./components/chatbot/ChatbotWidget"; // <-- Añade esta línea
import SignatureManagerModal from "./components/account/SignatureManagerModal";
import ProjectChat from "./components/chat/ProjectChat";
import api from "./src/services/api";
import { OfflineIndicator } from "./src/components/offline/OfflineIndicator";

type InitialItemToOpen = { type: "acta" | "logEntry" | "communication"; id: string };

const MainApp = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("summary");
  const [initialItemToOpen, setInitialItemToOpen] =
    useState<InitialItemToOpen | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const { user } = useAuth();
  const { data: projectDetails, isLoading: isProjectLoading } =
    useApi.projectDetails();
  const {
    data: contractModifications,
    isLoading: isModificationsLoading,
    retry: refetchContractModifications,
  } = useApi.contractModifications();

  const isLoading =
    isProjectLoading || (isModificationsLoading && !contractModifications);

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

    if (currentView === "export_project" && user?.appRole !== "admin") {
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
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Header
          setIsSidebarOpen={setIsSidebarOpen}
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
      </div>
    </div>
  );
};

const AppContent = () => {
  console.log("AppContent: Rendering...");
  const { isAuthenticated, isLoading } = useAuth();

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
  return (
    <>
      <MainApp />
      <ChatbotWidget />
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

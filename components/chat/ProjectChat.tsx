import React, { useMemo } from "react";
import { CometChatConversationsWithMessages } from "@cometchat/chat-uikit-react";
import { useAuth } from "../../contexts/AuthContext";

const ProjectChat: React.FC = () => {
  const containerClass = useMemo(
    () => "w-full h-[calc(100vh-6rem)] min-h-[560px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
    []
  );

  const { user, isLoading, isChatReady } = useAuth();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Preparando el espacio de chat...
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Inicia sesión para acceder al chat del proyecto.
        </div>
      );
    }

    if (!isChatReady) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Conectando al chat del proyecto...
        </div>
      );
    }

    return (
      <div className="h-full">
        <CometChatConversationsWithMessages />
      </div>
    );
  };

  return (
    <div className="p-4 h-full">
      <div className={containerClass}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ProjectChat;

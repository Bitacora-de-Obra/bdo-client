import React from 'react';
import { Notification } from '../../types';
import NotificationItem from './NotificationItem';
import { BellIcon } from '../icons/Icon';

interface NotificationPanelProps {
    isOpen: boolean;
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, notifications, onNotificationClick }) => {
    if (!isOpen) return null;

    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Notificaciones</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {sortedNotifications.length > 0 ? (
                    <ul>
                        {sortedNotifications.map(notification => (
                            <NotificationItem 
                                key={notification.id}
                                notification={notification}
                                onNotificationClick={onNotificationClick}
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="text-center p-8 text-gray-500">
                        <BellIcon className="h-10 w-10 mx-auto text-gray-300"/>
                        <p className="mt-4 text-sm">No tienes notificaciones</p>
                    </div>
                )}
            </div>
             <div className="p-2 bg-gray-50 text-center text-sm">
                {/* Could add a "View All" link here later */}
             </div>
        </div>
    );
};

export default NotificationPanel;

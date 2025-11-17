import React from 'react';
import { Notification } from '../../types';
import { ClockIcon, ExclamationTriangleIcon } from '../icons/Icon';

interface NotificationItemProps {
    notification: Notification;
    onNotificationClick: (notification: Notification) => void;
}

const urgencyConfig = {
    overdue: {
        icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
        bgColor: 'bg-red-50'
    },
    due_soon: {
        icon: <ClockIcon className="h-6 w-6 text-yellow-500" />,
        bgColor: 'bg-yellow-50'
    },
    info: {
        icon: <ClockIcon className="h-6 w-6 text-blue-500" />,
        bgColor: 'bg-blue-50'
    }
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onNotificationClick }) => {

    const { icon, bgColor } = urgencyConfig[notification.urgency];

    // Simple time ago function
    const timeAgo = (dateStr: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `hace ${Math.floor(interval)} años`;
        interval = seconds / 2592000;
        if (interval > 1) return `hace ${Math.floor(interval)} meses`;
        interval = seconds / 86400;
        if (interval > 1) return `hace ${Math.floor(interval)} días`;
        interval = seconds / 3600;
        if (interval > 1) return `hace ${Math.floor(interval)} horas`;
        interval = seconds / 60;
        if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
        return `hace segundos`;
    };

    return (
        <li
            onClick={() => onNotificationClick(notification)}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? bgColor : ''}`}
        >
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">{icon}</div>
                <div className="flex-1">
                    <p className="text-sm text-gray-800">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.sourceDescription}</p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-400">
                    {timeAgo(notification.createdAt)}
                </div>
            </div>
        </li>
    );
};

export default NotificationItem;

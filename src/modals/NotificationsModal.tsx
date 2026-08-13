import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, update, db, serverTimestamp } from '../firebase';
import { NotificationItem } from '../types';
import { formatDate } from '../utils/helpers';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser) return;
      setLoading(true);

      try {
        const globalNotifRef = ref(db, 'notifications');
        const userNotifRef = ref(db, `users/${currentUser.uid}/notifications`);

        const [gSnap, uSnap] = await Promise.all([get(globalNotifRef), get(userNotifRef)]);

        let all: NotificationItem[] = [];
        if (gSnap.exists()) all.push(...(Object.values(gSnap.val()) as NotificationItem[]));
        if (uSnap.exists()) all.push(...(Object.values(uSnap.val()) as NotificationItem[]));

        all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setNotifications(all);

        // Mark as read
        await update(ref(db, `users/${currentUser.uid}`), {
          lastCheckedNotifications: serverTimestamp()
        });
      } catch (e) {
        console.error("Error loading notifications:", e);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && currentUser) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const lastChecked = userProfile?.lastCheckedNotifications || 0;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Notifications</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-accent"></div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notif, idx) => {
                const isUnread = (notif.timestamp || 0) > lastChecked;

                return (
                  <div key={notif.id || idx} className="notification-item">
                    {isUnread && <span className="unread-indicator"></span>}
                    {notif.imageUrl && (
                      <img src={notif.imageUrl} className="notification-item-img" alt="Notification" />
                    )}
                    <div className="notification-item-content">
                      <div className="notification-item-title">{notif.title || 'Notification'}</div>
                      <div className="notification-item-message">{notif.message || ''}</div>
                      <div className="notification-item-time">{formatDate(notif.timestamp)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-secondary py-5 m-0">No notifications yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

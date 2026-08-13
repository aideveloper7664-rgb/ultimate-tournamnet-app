import React from 'react';
import { useAuth } from '../context/AuthContext';

export const AppUpdateModal: React.FC = () => {
  const { appSettings } = useAuth();

  if (!appSettings.appUpdate?.isUpdateAvailable) return null;

  const updateMessage = appSettings.appUpdate.updateMessage || 'A new version of the app is available. Please update to continue.';
  const updateUrl = appSettings.appUpdate.updateUrl || '#';

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10050 }}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-box-arrow-in-down text-accent me-2"></i>New Update Available
            </h5>
          </div>
          <div className="modal-body">
            <p dangerouslySetInnerHTML={{ __html: updateMessage }}></p>
          </div>
          <div className="modal-footer">
            <a
              href={updateUrl}
              className="btn btn-custom btn-custom-primary w-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              Update Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

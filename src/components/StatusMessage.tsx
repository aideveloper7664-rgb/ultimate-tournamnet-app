import React from 'react';

interface StatusMessageProps {
  message?: string | null;
  type?: 'success' | 'danger' | 'warning' | 'info';
  onDismiss?: () => void;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  message,
  type = 'danger',
  onDismiss
}) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type} mt-3 d-flex justify-content-between align-items-center`} role="alert">
      <div>{message}</div>
      {onDismiss && (
        <button
          type="button"
          className="btn-close btn-close-white ms-2"
          onClick={onDismiss}
          aria-label="Close"
        ></button>
      )}
    </div>
  );
};

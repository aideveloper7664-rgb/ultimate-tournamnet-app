import React from 'react';

interface WithdrawMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: string) => void;
}

export const WithdrawMethodModal: React.FC<WithdrawMethodModalProps> = ({
  isOpen,
  onClose,
  onSelectMethod
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Select Withdrawal Method</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-6">
                <div
                  className="withdraw-method-option"
                  onClick={() => onSelectMethod('Phone Pay')}
                >
                  <img src="https://i.ibb.co/kFgvQdg/phonepay.png" alt="Phone Pay" />
                  <strong>Phone Pay</strong>
                </div>
              </div>
              <div className="col-6">
                <div
                  className="withdraw-method-option"
                  onClick={() => onSelectMethod('Paytm')}
                >
                  <img src="https://i.ibb.co/PZsfRfWk/paytm.png" alt="Paytm" />
                  <strong>Paytm</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

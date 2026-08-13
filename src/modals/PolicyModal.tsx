import React from 'react';
import { useAuth } from '../context/AuthContext';
import { copyToClipboard, shareReferral } from '../utils/helpers';

interface PolicyModalProps {
  isOpen: boolean;
  policyType: 'privacy' | 'terms' | 'refund' | 'fairPlay' | 'refer' | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  policyType,
  onClose
}) => {
  const { userProfile, appSettings } = useAuth();

  if (!isOpen || !policyType) return null;

  let title = '';
  let bodyContent: React.ReactNode = null;

  switch (policyType) {
    case 'privacy':
      title = 'Privacy Policy';
      bodyContent = (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {appSettings.policyPrivacy || 'Privacy Policy content not available.'}
        </div>
      );
      break;
    case 'terms':
      title = 'Terms and Conditions';
      bodyContent = (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {appSettings.policyTerms || 'Terms and Conditions content not available.'}
        </div>
      );
      break;
    case 'refund':
      title = 'Refund and Cancellation';
      bodyContent = (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {appSettings.policyRefund || 'Refund Policy content not available.'}
        </div>
      );
      break;
    case 'fairPlay':
      title = 'Fair Play Policy';
      bodyContent = (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {appSettings.policyFairPlay || 'Fair Play Policy content not available.'}
        </div>
      );
      break;
    case 'refer':
      title = 'Refer & Earn';
      const refCode = userProfile?.referralCode || 'N/A';
      const referralBonus = appSettings.referralBonus || 5;
      bodyContent = (
        <div className="text-center">
          <h4>Refer Friends!</h4>
          <p className="text-secondary">Share code & earn!</p>
          <div className="my-4 p-3" style={{ background: 'var(--primary-bg)', borderRadius: '8px' }}>
            <p className="small text-secondary mb-1">Your Code:</p>
            <h3 className="text-accent referral-code" id="referralCodeDisplay">
              {refCode}
            </h3>
            <div className="mt-3 d-flex justify-content-center gap-2">
              <button
                className="btn btn-sm btn-custom btn-custom-secondary copy-btn"
                onClick={() => copyToClipboard(refCode)}
              >
                <i className="bi bi-clipboard me-1"></i> Copy
              </button>
              <button
                className="btn btn-sm btn-custom btn-custom-secondary"
                id="shareReferralBtn"
                onClick={() => shareReferral(refCode, appSettings)}
              >
                <i className="bi bi-share-fill me-1"></i> Share
              </button>
            </div>
          </div>
          <p className="mt-3 small text-secondary">
            Get ₹ {referralBonus} when your friend joins using your code, and they get a signup bonus!
          </p>
        </div>
      );
      break;
  }

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ minHeight: '200px' }}>
            {bodyContent}
          </div>
        </div>
      </div>
    </div>
  );
};

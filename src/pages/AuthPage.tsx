import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  update,
  ref,
  db,
  auth
} from '../firebase';
import { useAuth } from '../context/AuthContext';
import { StatusMessage } from '../components/StatusMessage';

export const AuthPage: React.FC = () => {
  const { setTempReferralCode } = useAuth();
  const [formMode, setFormMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupGameUid, setSignupGameUid] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupReferralCode, setSignupReferralCode] = useState('');

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (err: any) {
      console.error("Login Error:", err);
      let m = 'Login failed.';
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          m = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          m = 'Invalid email format.';
          break;
        case 'auth/too-many-requests':
          m = 'Too many attempts. Reset pass or wait.';
          break;
        case 'auth/network-request-failed':
          m = 'Network error.';
          break;
        default:
          m = err.message || 'Login error.';
      }
      setErrorMessage(m);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPhone.trim() || !signupPassword) {
      setErrorMessage('Name, Email, Phone, and Password are required.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      if (signupReferralCode.trim()) {
        setTempReferralCode(signupReferralCode.trim());
      }
      const cred = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword);
      try {
        await update(ref(db, `users/${cred.user.uid}`), {
          displayName: signupName.trim(),
          phoneNumber: signupPhone.trim(),
          gameUid: signupGameUid.trim()
        });
      } catch (dbErr) {
        console.warn("Could not immediately update profile in DB after signup:", dbErr);
      }
    } catch (err: any) {
      console.error("Signup Error:", err);
      let m = 'Signup failed.';
      switch (err.code) {
        case 'auth/email-already-in-use':
          m = 'Email already registered.';
          break;
        case 'auth/weak-password':
          m = 'Password too weak.';
          break;
        case 'auth/invalid-email':
          m = 'Invalid email.';
          break;
        case 'auth/network-request-failed':
          m = 'Network error.';
          break;
        default:
          m = err.message || 'Signup error.';
      }
      setErrorMessage(m);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Please enter your email address to receive a password reset link.");
    if (!email) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      alert('Password reset email sent! Check your inbox/spam folder.');
    } catch (err: any) {
      console.error("Reset Pass Error:", err);
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearMessages();
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      setErrorMessage(`Google Sign-In failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="login-section" className="section active auth-page-wrapper">
      <div className="auth-container">
        {/* Animated Gaming Header Logo Banner */}
        <div className="auth-brand-header text-center mb-4">
          <div className="auth-logo-badge">
            <i className="bi bi-controller text-warning me-2 fs-3"></i>
            <span className="brand-text">ESPORTS ARENA</span>
          </div>
          <p className="auth-subtitle">Play, Compete & Win Real Rewards</p>
        </div>

        {/* Auth Card Container */}
        <div className="auth-card">
          {/* Top Mode Tabs */}
          <div className="auth-tab-row mb-4">
            <button
              className={`auth-tab-btn ${formMode === 'login' ? 'active' : ''}`}
              onClick={() => { clearMessages(); setFormMode('login'); }}
              type="button"
            >
              <i className="bi bi-box-arrow-in-right me-1"></i> Login
            </button>
            <button
              className={`auth-tab-btn ${formMode === 'signup' ? 'active' : ''}`}
              onClick={() => { clearMessages(); setFormMode('signup'); }}
              type="button"
            >
              <i className="bi bi-person-plus-fill me-1"></i> Sign Up
            </button>
          </div>

          <div className="auth-card-body">
            {formMode === 'login' && (
              <form onSubmit={handleLogin} id="emailLoginForm" className="auth-form-animated">
                <div className="form-group mb-3">
                  <label htmlFor="loginEmailInputEl" className="form-label auth-label">Email Address</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-envelope-fill"></i></span>
                    <input
                      type="text"
                      className="form-control auth-input"
                      id="loginEmailInputEl"
                      placeholder="Enter email address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-2">
                  <label htmlFor="loginPasswordInputEl" className="form-label auth-label">Password</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-lock-fill"></i></span>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      className="form-control auth-input"
                      id="loginPasswordInputEl"
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                    >
                      <i className={`bi bi-${showLoginPassword ? 'eye-slash-fill' : 'eye-fill'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="text-end mb-3">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}
                    className="auth-forgot-link"
                  >
                    Forgot Password?
                  </a>
                </div>

                <StatusMessage message={errorMessage} type="danger" onDismiss={() => setErrorMessage(null)} />
                <StatusMessage message={successMessage} type="success" onDismiss={() => setSuccessMessage(null)} />

                <div className="d-grid gap-2 mb-3 mt-3">
                  <button
                    type="submit"
                    className="btn auth-btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <i className="bi bi-lightning-charge-fill me-2"></i>
                    )}
                    Sign In
                  </button>
                </div>

                <div className="form-divider my-4">
                  <span>OR CONTINUE WITH</span>
                </div>

                {/* Google Login Option */}
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn auth-btn-google"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="google-svg-icon me-2" width="22" height="22" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>

                <div className="text-center mt-4">
                  <span className="text-muted small me-1">Don't have an account?</span>
                  <button
                    type="button"
                    className="auth-switch-btn"
                    onClick={() => { clearMessages(); setFormMode('signup'); }}
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {formMode === 'signup' && (
              <form onSubmit={handleSignup} id="emailSignupForm" className="auth-form-animated">
                <div className="form-group mb-3">
                  <label htmlFor="signupNameInputEl" className="form-label auth-label">Full Name</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-person-fill"></i></span>
                    <input
                      type="text"
                      className="form-control auth-input"
                      id="signupNameInputEl"
                      placeholder="Enter full name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="signupGameUidInputEl" className="form-label auth-label">
                    Game UID / Character ID <span className="text-warning small">(e.g. BGMI / Free Fire)</span>
                  </label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-controller text-warning"></i></span>
                    <input
                      type="text"
                      className="form-control auth-input"
                      id="signupGameUidInputEl"
                      placeholder="e.g. 5123498120"
                      value={signupGameUid}
                      onChange={(e) => setSignupGameUid(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="signupEmailInputEl" className="form-label auth-label">Email Address</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-envelope-fill"></i></span>
                    <input
                      type="email"
                      className="form-control auth-input"
                      id="signupEmailInputEl"
                      placeholder="name@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="signupPhoneInputEl" className="form-label auth-label">Phone Number</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-phone-fill"></i></span>
                    <input
                      type="tel"
                      className="form-control auth-input"
                      id="signupPhoneInputEl"
                      placeholder="Enter mobile number"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="signupPasswordInputEl" className="form-label auth-label">Password</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-shield-lock-fill"></i></span>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      className="form-control auth-input"
                      id="signupPasswordInputEl"
                      placeholder="Min 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      tabIndex={-1}
                    >
                      <i className={`bi bi-${showSignupPassword ? 'eye-slash-fill' : 'eye-fill'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="signupConfirmPasswordInputEl" className="form-label auth-label">Confirm Password</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-check-circle-fill"></i></span>
                    <input
                      type="password"
                      className="form-control auth-input"
                      id="signupConfirmPasswordInputEl"
                      placeholder="Confirm password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="signupReferralCodeInputEl" className="form-label auth-label">
                    Referral Code <span className="text-warning small">(Get Bonus Cash)</span>
                  </label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon"><i className="bi bi-gift-fill text-warning"></i></span>
                    <input
                      type="text"
                      className="form-control auth-input"
                      id="signupReferralCodeInputEl"
                      placeholder="Enter referral code (Optional)"
                      value={signupReferralCode}
                      onChange={(e) => setSignupReferralCode(e.target.value)}
                    />
                  </div>
                </div>

                <StatusMessage message={errorMessage} type="danger" onDismiss={() => setErrorMessage(null)} />

                <div className="d-grid gap-2 mb-3 mt-4">
                  <button
                    type="submit"
                    className="btn auth-btn-accent"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <i className="bi bi-rocket-takeoff-fill me-2"></i>
                    )}
                    Register Account
                  </button>
                </div>

                <div className="text-center mt-3">
                  <span className="text-muted small me-1">Already registered?</span>
                  <button
                    type="button"
                    className="auth-switch-btn"
                    onClick={() => { clearMessages(); setFormMode('login'); }}
                  >
                    Log In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};


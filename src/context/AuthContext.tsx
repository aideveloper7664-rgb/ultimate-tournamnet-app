import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  db,
  recordTransaction,
  signOut,
  ref,
  get,
  set,
  update,
  onValue,
  off,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
  push
} from '../firebase';
import { UserProfile, AppSettings } from '../types';
import { generateReferralCode } from '../utils/helpers';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  loading: boolean;
  currentSection: string;
  navigationStack: string[];
  selectedGameId: string | null;
  selectedGameName: string | null;
  unreadNotificationsCount: number;
  themeMode: 'dark' | 'light';
  toggleTheme: () => void;
  tempReferralCode: string | null;
  setTempReferralCode: (code: string | null) => void;
  showSection: (sectionId: string, isBackAction?: boolean) => void;
  setSelectedGame: (gameId: string | null, gameName?: string | null) => void;
  reloadUserProfile: () => Promise<void>;
  reloadAppSettings: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    minWithdraw: 50,
    signupBonus: 10,
    referralBonus: 5,
    transferFeePercent: 10,
    supportContact: '9389660753',
    developerContact: '9848988740',
    upiDetails: '9848988740',
    qrCodeUrl: 'https://i.ibb.co/j9P6NzXp/IMG-20250822-120255.jpg'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSection, setCurrentSection] = useState<string>('login-section');
  const [navigationStack, setNavigationStack] = useState<string[]>(['login-section']);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [tempReferralCode, setTempReferralCode] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app_theme_mode');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    if (themeMode === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('app_theme_mode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const applyTheme = (theme?: Record<string, string>) => {
    if (!theme) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme)) {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      }
    }
  };

  const reloadAppSettings = async () => {
    try {
      const settingsRef = ref(db, 'settings');
      const snapshot = await get(settingsRef);
      if (snapshot.exists()) {
        const val = snapshot.val() as AppSettings;
        setAppSettings(prev => ({ ...prev, ...val }));
        if (val.theme) applyTheme(val.theme);
      }
    } catch (e) {
      console.error("Settings load failed:", e);
    }
  };

  const setSelectedGame = (gameId: string | null, gameName: string | null = null) => {
    setSelectedGameId(gameId);
    setSelectedGameName(gameName);
  };

  const showSection = (sectionId: string, isBackAction = false) => {
    const protectedSections = [
      'home-section',
      'my-contests-section',
      'wallet-section',
      'earnings-section',
      'profile-section',
      'tournaments-section',
      'recharge-section',
      'leaderboard-section'
    ];
    const isLoggedIn = !!auth.currentUser;

    if (protectedSections.includes(sectionId) && !isLoggedIn) {
      setCurrentSection('login-section');
      setNavigationStack(['login-section']);
      return;
    }

    if (sectionId === 'login-section' && isLoggedIn) {
      setCurrentSection('home-section');
      setNavigationStack(['home-section']);
      return;
    }

    if (!isBackAction) {
      setNavigationStack(prev => {
        if (prev[prev.length - 1] !== sectionId) {
          return [...prev, sectionId];
        }
        return prev;
      });
    }

    setCurrentSection(sectionId);
    window.scrollTo(0, 0);
  };

  const reloadUserProfile = async () => {
    if (!currentUser) return;
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUserProfile(snapshot.val());
      }
    } catch (e) {
      console.warn("Error reloading profile:", e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setCurrentSection('login-section');
      setNavigationStack(['login-section']);
    } catch (e) {
      console.error("Sign Out Error:", e);
    }
  };

  // Realtime user profile listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const initAuth = async () => {
      await reloadAppSettings();

      onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          const userRef = ref(db, `users/${user.uid}`);
          try {
            let snapshot = null;
            try {
              snapshot = await get(userRef);
            } catch (snapErr) {
              console.warn("Profile fetch from DB failed or permission denied:", snapErr);
            }

            if (snapshot && snapshot.exists()) {
              const prof = snapshot.val();
              setUserProfile(prof);
              try {
                await update(userRef, { lastLogin: serverTimestamp() });
              } catch (uErr) {
                console.warn("Updating lastLogin failed:", uErr);
              }
            } else {
              // Create new user profile
              const signupBonus = appSettings.signupBonus ?? 10;
              const displayName = user.displayName || user.email?.split('@')[0] || `User${user.uid.substring(0, 5)}`;

              const newUserProfile: UserProfile = {
                uid: user.uid,
                displayName: displayName,
                email: user.email || null,
                phoneNumber: user.phoneNumber || null,
                photoURL: user.photoURL || null,
                balance: signupBonus,
                winningCash: 0,
                bonusCash: signupBonus,
                totalMatches: 0,
                wonMatches: 0,
                totalEarnings: 0,
                referralEarnings: 0,
                createdAt: serverTimestamp(),
                referralCode: generateReferralCode(),
                joinedTournaments: {},
                isAdmin: false,
                lastCheckedNotifications: Date.now(),
                lastLogin: serverTimestamp()
              };

              if (tempReferralCode) {
                try {
                  const q = query(ref(db, 'users'), orderByChild('referralCode'), equalTo(tempReferralCode));
                  const referrerSnapshot = await get(q);
                  if (referrerSnapshot.exists()) {
                    const referrerData = referrerSnapshot.val();
                    const referrerId = Object.keys(referrerData)[0];
                    const referrerProfile = referrerData[referrerId];
                    try {
                      const pendingReferralRef = push(ref(db, 'pendingReferrals'));
                      await set(pendingReferralRef, {
                        referrerUid: referrerId,
                        referrerEmail: referrerProfile.email || 'N/A',
                        referredUid: user.uid,
                        referredEmail: user.email || 'N/A',
                        status: 'pending',
                        timestamp: serverTimestamp()
                      });
                    } catch (pErr) {
                      console.warn("Pending referral write error:", pErr);
                    }
                    newUserProfile.referredBy = referrerId;
                  }
                } catch (refErr) {
                  console.warn("Referral query error or permission denied:", refErr);
                }
              }

              // Always update local React state first so UI works immediately
              setUserProfile(newUserProfile);

              try {
                await set(userRef, newUserProfile);
                if (signupBonus > 0) {
                  await recordTransaction(user.uid, 'signup_bonus', signupBonus, 'Welcome Bonus');
                }
              } catch (setErr) {
                console.warn("Profile save to DB error:", setErr);
              }
            }

            // Set up realtime listener safely
            try {
              const profileListener = onValue(
                userRef,
                (s) => {
                  if (s.exists()) {
                    setUserProfile(s.val());
                  }
                },
                (listenerError) => {
                  console.warn("Realtime profile listener permission error:", listenerError);
                }
              );
              unsubscribeProfile = () => off(userRef, 'value', profileListener);
            } catch (lErr) {
              console.warn("Setting profile listener error:", lErr);
            }

            showSection('home-section');
          } catch (err) {
            console.error("Profile handling error:", err);
            // Guarantee userProfile is set so user is never stuck
            if (!userProfile) {
              const fallbackProfile: UserProfile = {
                uid: user.uid,
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email || null,
                phoneNumber: user.phoneNumber || null,
                photoURL: user.photoURL || null,
                balance: 10,
                winningCash: 0,
                bonusCash: 10,
                totalMatches: 0,
                wonMatches: 0,
                totalEarnings: 0,
                referralEarnings: 0,
                createdAt: serverTimestamp(),
                referralCode: generateReferralCode(),
                joinedTournaments: {},
                isAdmin: false,
                lastCheckedNotifications: Date.now(),
                lastLogin: serverTimestamp()
              };
              setUserProfile(fallbackProfile);
            }
            showSection('home-section');
          }
        } else {
          setUserProfile(null);
          showSection('login-section');
        }
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Calculate unread notifications count
  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      return;
    }

    const globalNotifRef = ref(db, 'notifications');
    const userNotifRef = ref(db, `users/${currentUser.uid}/notifications`);

    const checkNotifications = async () => {
      try {
        const [gSnap, uSnap] = await Promise.all([get(globalNotifRef), get(userNotifRef)]);
        let all: any[] = [];
        if (gSnap.exists()) all.push(...Object.values(gSnap.val()));
        if (uSnap.exists()) all.push(...Object.values(uSnap.val()));

        const lastChecked = userProfile?.lastCheckedNotifications || 0;
        const unread = all.filter(item => (item.timestamp || 0) > lastChecked).length;
        setUnreadNotificationsCount(unread);
      } catch (e) {
        console.error("Error calculating unread notifications:", e);
      }
    };

    checkNotifications();
  }, [currentUser, userProfile?.lastCheckedNotifications]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        appSettings,
        loading,
        currentSection,
        navigationStack,
        selectedGameId,
        selectedGameName,
        unreadNotificationsCount,
        themeMode,
        toggleTheme,
        tempReferralCode,
        setTempReferralCode,
        showSection,
        setSelectedGame,
        reloadUserProfile,
        reloadAppSettings,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

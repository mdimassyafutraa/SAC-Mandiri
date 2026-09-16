import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';

const AuthContext = createContext();

const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 jam
const ACTIVITY_UPDATE_INTERVAL = 60 * 1000; // 1 menit

// ======================================================
// GENERATE DEVICE ID
// ======================================================

function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');

  if (!deviceId) {
    if (crypto?.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    localStorage.setItem('device_id', deviceId);
  }

  return deviceId;
}

// ======================================================
// GENERATE SESSION TOKEN
// ======================================================

function generateSessionToken() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({ children }) {
  // ====================================================
  // USER
  // ====================================================

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');

      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Gagal membaca user:', error);

      return null;
    }
  });

  // ====================================================
  // SESSION TOKEN
  // ====================================================

  const [sessionToken, setSessionToken] = useState(() => {
    return localStorage.getItem('session_token');
  });

  // ====================================================
  // REFS
  // ====================================================

  const inactivityTimerRef = useRef(null);

  const lastActivityUpdateRef = useRef(0);

  const logoutInProgressRef = useRef(false);

  // ====================================================
  // CLEAR INACTIVITY TIMER
  // ====================================================

  function clearInactivityTimer() {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);

      inactivityTimerRef.current = null;
    }
  }

  // ====================================================
  // LOGIN
  // ====================================================

  async function login(data) {
    try {
      if (!data?.id) {
        return {
          success: false,
          code: 'INVALID_USER',
          message: 'Data user tidak valid.',
        };
      }

      const deviceId = getDeviceId();

      const newSessionToken = generateSessionToken();

      // ================================================
      // CLAIM SESSION
      // ================================================

      const { data: sessionResult, error } = await supabase.rpc('claim_login_session', {
        p_user_id: data.id,
        p_device_id: deviceId,
        p_session_token: newSessionToken,
      });

      if (error) {
        console.error('Gagal membuat session:', error);

        return {
          success: false,
          code: 'SESSION_ERROR',
          message: 'Tidak dapat membuat sesi login. Silakan coba lagi.',
        };
      }

      // ================================================
      // CEK HASIL SESSION
      // ================================================

      if (!sessionResult || sessionResult.success !== true) {
        if (sessionResult?.code === 'ACCOUNT_ALREADY_ACTIVE') {
          return {
            success: false,
            code: 'ACCOUNT_ALREADY_ACTIVE',
            message: 'Akun ini sedang digunakan pada perangkat lain.',
          };
        }

        return {
          success: false,
          code: 'LOGIN_FAILED',
          message: 'Login tidak dapat dilakukan.',
        };
      }

      // ================================================
      // SIMPAN USER
      // ================================================

      setUser(data);
      setSessionToken(newSessionToken);

      localStorage.setItem('user', JSON.stringify(data));

      localStorage.setItem('session_token', newSessionToken);

      // ================================================
      // RESET ACTIVITY
      // ================================================

      lastActivityUpdateRef.current = Date.now();

      logoutInProgressRef.current = false;

      return {
        success: true,
        code: 'LOGIN_SUCCESS',
        user: data,
      };
    } catch (error) {
      console.error('Login error:', error);

      return {
        success: false,
        code: 'LOGIN_ERROR',
        message: 'Terjadi kesalahan saat login.',
      };
    }
  }

  // ====================================================
  // LOGOUT
  // ====================================================

  async function logout(reason = null) {
    // Hindari logout bersamaan berkali-kali
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;

    try {
      const currentUser = user;

      const currentSessionToken = sessionToken || localStorage.getItem('session_token');

      // ================================================
      // HAPUS SESSION DARI DATABASE
      // ================================================

      if (currentUser?.id && currentSessionToken) {
        const { error } = await supabase.rpc('logout_session', {
          p_user_id: currentUser.id,
          p_session_token: currentSessionToken,
        });

        if (error) {
          console.error('Gagal menghapus active session:', error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ================================================
      // BERSIHKAN SESSION LOCAL
      // ================================================

      setUser(null);
      setSessionToken(null);

      localStorage.removeItem('user');
      localStorage.removeItem('session_token');

      // ================================================
      // HAPUS TIMER
      // ================================================

      clearInactivityTimer();

      // ================================================
      // RESET ACTIVITY
      // ================================================

      lastActivityUpdateRef.current = 0;

      // ================================================
      // EVENT SESSION EXPIRED
      // ================================================

      if (reason === 'inactivity') {
        window.dispatchEvent(new Event('session-expired'));
      }

      logoutInProgressRef.current = false;
    }
  }

  // ====================================================
  // UPDATE AKTIVITAS KE SUPABASE
  // ====================================================

  async function updateActivity() {
    const currentUser = user;

    const currentSessionToken = sessionToken || localStorage.getItem('session_token');

    if (!currentUser?.id || !currentSessionToken) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('update_session_activity', {
        p_user_id: currentUser.id,
        p_session_token: currentSessionToken,
      });

      if (error) {
        console.error('Gagal update aktivitas:', error);

        return;
      }

      // ==============================================
      // SESSION SUDAH TIDAK VALID
      // ==============================================

      if (data !== true) {
        await logout('inactivity');
      }
    } catch (error) {
      console.error('Activity update error:', error);
    }
  }

  // ====================================================
  // RESET TIMER INAKTIVITAS
  // ====================================================

  function resetInactivityTimer() {
    clearInactivityTimer();

    inactivityTimerRef.current = setTimeout(async () => {
      console.log('User tidak aktif selama 1 jam. Logout otomatis.');

      await logout('inactivity');
    }, INACTIVITY_LIMIT);
  }

  // ====================================================
  // DETEKSI AKTIVITAS USER
  // ====================================================

  useEffect(() => {
    if (!user || !sessionToken) {
      clearInactivityTimer();

      return;
    }

    const handleActivity = () => {
      const now = Date.now();

      // ==============================================
      // RESET TIMER LOGOUT
      // ==============================================

      resetInactivityTimer();

      // ==============================================
      // UPDATE DATABASE MAKSIMAL 1X / MENIT
      // ==============================================

      if (now - lastActivityUpdateRef.current >= ACTIVITY_UPDATE_INTERVAL) {
        lastActivityUpdateRef.current = now;

        updateActivity();
      }
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'mousedown'];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // ==============================================
    // MULAI TIMER
    // ==============================================

    resetInactivityTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      clearInactivityTimer();
    };
  }, [user, sessionToken]);

  // ====================================================
  // CEK SESSION SAAT APLIKASI DIBUKA / REFRESH
  // ====================================================

  useEffect(() => {
    async function validateSession() {
      if (!user || !sessionToken) {
        return;
      }

      try {
        const { data, error } = await supabase.from('active_sessions').select('id, user_id, device_id, session_token, last_activity').eq('user_id', user.id).eq('session_token', sessionToken).maybeSingle();

        if (error) {
          console.error('Gagal memeriksa session:', error);

          return;
        }

        // ==============================================
        // SESSION TIDAK DITEMUKAN
        // ==============================================

        if (!data) {
          await logout('inactivity');

          return;
        }

        // ==============================================
        // CEK WAKTU AKTIVITAS
        // ==============================================

        const lastActivity = new Date(data.last_activity).getTime();

        const inactiveTime = Date.now() - lastActivity;

        if (inactiveTime >= INACTIVITY_LIMIT) {
          await logout('inactivity');

          return;
        }

        // ==============================================
        // SINKRONKAN TIMER
        // ==============================================

        const remainingTime = INACTIVITY_LIMIT - inactiveTime;

        clearInactivityTimer();

        inactivityTimerRef.current = setTimeout(async () => {
          await logout('inactivity');
        }, remainingTime);

        lastActivityUpdateRef.current = Date.now();
      } catch (error) {
        console.error('Validate session error:', error);
      }
    }

    validateSession();
  }, [user, sessionToken]);

  // ====================================================
  // CONTEXT
  // ====================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        sessionToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ======================================================
// USE AUTH
// ======================================================

export function useAuth() {
  return useContext(AuthContext);
}

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');

      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Gagal membaca user:', error);

      return null;
    }
  });

  async function login(data) {
    try {
      if (!data?.id) {
        return {
          success: false,
          code: 'INVALID_USER',
          message: 'Data user tidak valid.',
        };
      }

      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));

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

  function logout() {
    setUser(null);
    localStorage.removeItem('user');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  // ==========================================
  // SIDEBAR RESPONSIVE
  // ==========================================

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ==========================================
  // LOCK BODY SCROLL SAAT SIDEBAR MOBILE
  // ==========================================

  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // ==========================================
  // SESSION EXPIRED
  // ==========================================

  useEffect(() => {
    function handleSessionExpired() {
      Swal.fire({
        icon: 'warning',
        title: 'Sesi Berakhir',
        text: 'Anda tidak melakukan aktivitas selama 1 jam. Silakan login kembali.',
        confirmButtonColor: '#133A6D',
        confirmButtonText: 'Login Kembali',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        navigate('/', { replace: true });
      });
    }

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Navbar */}
      <Navbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />

      {/* Main Content */}
      <main
        className="
          pt-16
          md:ml-64
          min-h-screen
        "
      >
        <div
          className="
            p-4
            sm:p-5
            lg:p-6
          "
        >
          {children}
        </div>
      </main>
    </div>
  );
}

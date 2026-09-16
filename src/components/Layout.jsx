import { useEffect, useState } from 'react';

import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

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

  return (
    <div className="min-h-screen bg-slate-50">
      
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      
      <Navbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />

      
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

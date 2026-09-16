import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, X, ListOrdered, LogOut, Settings } from 'lucide-react';

import Swal from 'sweetalert2';

import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();

  const role = user?.role;

  const menuItems = [];
  if (role === 'security') {
    menuItems.push({
      label: 'Dashboard',
      path: '/security',
      icon: ShieldCheck,
    });
  }
  if (role === 'admin') {
    menuItems.push(
      {
        label: 'Dashboard',
        path: '/admin',
        icon: LayoutDashboard,
      },
      {
        label: 'Seluruh Antrian',
        path: '/admin/queues',
        icon: ListOrdered,
      },
    );
  }

  async function handleLogout() {
    const result = await Swal.fire({
      title: 'Konfirmasi Logout',
      text: 'Apakah Anda yakin ingin keluar dari sistem?',
      icon: 'warning',

      showCancelButton: true,

      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',

      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',

      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      logout();
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil Logout',
        text: 'Anda telah keluar dari sistem.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Logout error:', error);

      Swal.fire({
        icon: 'error',
        title: 'Logout Gagal',
        text: 'Terjadi kesalahan saat keluar dari sistem.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#2563eb',
      });
    }
  }

  const roleLabel = {
    security: 'Security',
    admin: 'Administrator',
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`
          fixed
          inset-0
          z-40

          bg-slate-950/50
          backdrop-blur-sm

          md:hidden

          transition-opacity
          duration-300

          ${open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
        `}
      />

      <aside
        className={`
          fixed
          top-0
          left-0
          bottom-0
          z-50

          w-64

          text-white

          flex
          flex-col

          overflow-hidden

          bg-[#123b78]

          shadow-[8px_0_30px_rgba(15,53,109,0.22)]

          transition-transform
          duration-300
          ease-in-out

          ${open ? 'translate-x-0' : '-translate-x-full'}

          md:translate-x-0
        `}
      >
        <div
          className="
            absolute
            -top-24
            -right-24

            w-56
            h-56

            rounded-full

            bg-blue-400/10

            blur-2xl

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            bottom-20
            -left-24

            w-48
            h-48

            rounded-full

            bg-yellow-300/5

            blur-3xl

            pointer-events-none
          "
        />

        <div
          className="
            relative
            z-10

            h-16

            px-5

            flex
            items-center
            justify-between

            border-b
            border-white/10

            shrink-0
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                w-10
                h-10

                flex
                items-center
                justify-center

                overflow-hidden
                shrink-0
              "
            >
              <img
                src={logo}
                alt="Bank Mandiri"
                className="
                  w-full
                  h-full
                  object-contain

                  drop-shadow-[0_3px_8px_rgba(0,0,0,0.15)]
                "
              />
            </div>

            <div>
              <h2
                className="
                  text-sm
                  font-black
                  tracking-wide
                  text-white
                "
              >
                Bedebis
              </h2>

              <p
                className="
                  text-[10px]
                  text-blue-200/80
                "
              >
                Sistem Antrian Cabang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              md:hidden

              w-9
              h-9

              rounded-xl

              flex
              items-center
              justify-center

              text-blue-100

              hover:bg-white/10
              hover:text-white

              transition
            "
            aria-label="Tutup menu"
          >
            <X size={21} />
          </button>
        </div>

        <div
          className="
            relative
            z-10

            px-4
            py-5

            border-b
            border-white/10
          "
        >
          <div
            className="
              rounded-2xl

              bg-white/8

              border
              border-white/10

              p-3.5

              shadow-inner
            "
          >
            <p
              className="
                text-[10px]

                uppercase
                tracking-widest

                text-blue-200/70

                font-semibold
              "
            >
              Login sebagai
            </p>

            <p
              className="
                text-sm

                font-bold

                mt-1

                text-white

                truncate
              "
            >
              {user?.username || '-'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span
                className="
                  w-1.5
                  h-1.5

                  rounded-full

                  bg-emerald-400

                  shadow-[0_0_8px_rgba(52,211,153,0.7)]
                "
              />

              <span
                className="
                  text-[10px]

                  text-blue-100

                  font-semibold

                  uppercase
                "
              >
                {roleLabel[role] || role || '-'}
              </span>
            </div>
          </div>
        </div>

        <nav
          className="
            relative
            z-10

            flex-1

            px-3
            py-5

            overflow-y-auto
          "
        >
          <p
            className="
              px-3
              mb-3

              text-[10px]

              uppercase
              tracking-[0.18em]

              text-blue-200/60

              font-bold
            "
          >
            Menu Utama
          </p>

          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  end={item.path === '/admin'}
                  className={({ isActive }) => `
                    group

                    relative

                    flex
                    items-center
                    gap-3

                    px-3.5
                    py-3

                    rounded-xl

                    text-sm
                    font-semibold

                    transition-all
                    duration-200

                    ${
                      isActive
                        ? `
                          bg-blue-500/20

                          text-white

                          shadow-[0_5px_18px_rgba(0,0,0,0.12)]

                          border
                          border-white/10
                        `
                        : `
                          text-blue-100/80

                          hover:bg-white/[0.07]
                          hover:text-white

                          border
                          border-transparent
                        `
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="
                            absolute
                            left-0
                            top-1/2

                            -translate-y-1/2

                            w-1
                            h-6

                            rounded-r-full

                            bg-yellow-400

                            shadow-[0_0_10px_rgba(250,204,21,0.45)]
                          "
                        />
                      )}

                      <div
                        className={`
                          w-9
                          h-9

                          rounded-lg

                          flex
                          items-center
                          justify-center

                          transition

                          ${
                            isActive
                              ? `
                                bg-white/10
                                text-yellow-300
                              `
                              : `
                                bg-white/4
                                text-blue-200/70

                                group-hover:bg-white/10
                                group-hover:text-white
                              `
                          }
                        `}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>

                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div
          className="
            relative
            z-10

            px-4
            py-4

            border-t
            border-white/10

            shrink-0
          "
        >
          <button
            type="button"
            onClick={handleLogout}
            className="
              group

              w-full

              mb-4

              flex
              items-center
              justify-center
              gap-2

              px-4
              py-2.5

              rounded-xl

              bg-white/[0.07]

              border
              border-white/10

              text-blue-100

              text-sm
              font-semibold

              hover:bg-yellow-400/15
              hover:border-yellow-300/20
              hover:text-yellow-200

              active:scale-[0.98]

              transition-all
              duration-200
            "
          >
            <LogOut
              size={17}
              className="
                transition-transform
                group-hover:-translate-x-0.5
              "
            />

            <span>Logout</span>
          </button>

          <div
            className="
              flex
              items-center
              gap-2

              text-blue-200/50
            "
          >
            <Settings size={14} />

            <span className="text-[10px]">Sistem Antrian v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

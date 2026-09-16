import { Menu, X, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick, sidebarOpen }) {
  const { user } = useAuth();

  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
        z-40
        h-16
        bg-white
        border-b
        border-slate-200
        shadow-sm

        flex
        items-center
        justify-between

        px-4
        sm:px-5
        md:ml-64
      "
    >
      <div className="flex items-center min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="
            md:hidden
            w-10
            h-10
            rounded-xl
            flex
            items-center
            justify-center

            text-slate-700
            hover:bg-slate-100
            active:bg-slate-200

            transition
            shrink-0
          "
          aria-label={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={23} /> : <Menu size={23} />}
        </button>

        <div className="ml-2 sm:ml-3 min-w-0">
          <h1
            className="
    md:hidden
    font-black
    text-blue-900
    text-lg
    tracking-wide
  "
          >
            SAC
          </h1>

          <h1
            className="
    hidden
    md:block
    font-bold
    text-blue-900
    text-sm
    md:text-base
    lg:text-lg
    truncate
  "
          >
            Sistem Antrian Cabang
          </h1>

          <p className="hidden sm:block text-[11px] text-slate-400 truncate">Tanjung Enim</p>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          gap-2
          sm:gap-3
          shrink-0
        "
      >
        <div
          className="
            hidden
            sm:flex
            items-center
            gap-2
            max-w-40
            md:max-w-55
          "
        >
          <div
            className="
              w-9
              h-9
              rounded-full
              bg-blue-100
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            <UserCircle size={21} className="text-blue-800" />
          </div>

          <div className="min-w-0">
            <p
              className="
                text-sm
                font-semibold
                text-slate-700
                truncate
              "
            >
              {user?.username || 'User'}
            </p>

            <p
              className="
                text-[10px]
                uppercase
                font-semibold
                text-slate-400
              "
            >
              {user?.role || 'Petugas'}
            </p>
          </div>
        </div>

        <span
          className="
            sm:hidden
            max-w-22.5
            text-xs
            font-semibold
            text-slate-700
            truncate
          "
        >
          {user?.username || 'User'}
        </span>
      </div>
    </header>
  );
}

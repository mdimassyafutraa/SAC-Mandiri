import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import Swal from 'sweetalert2';

import { Eye, EyeOff, LockKeyhole, UserRound, ArrowRight } from 'lucide-react';

import logo from '../../assets/logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user?.role === 'security') {
      navigate('/security', { replace: true });
    }
  }, [user, navigate]);
  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Silakan masukkan username dan password.',
        confirmButtonColor: '#133A6D',
        confirmButtonText: 'Mengerti',
      });

      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.from('users').select('*').eq('username', username.trim()).eq('password', password).single();

      if (error || !data) {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: 'Username atau password yang Anda masukkan salah.',
          confirmButtonColor: '#133A6D',
          confirmButtonText: 'Coba Lagi',
        });

        return;
      }

      if (!['admin', 'security'].includes(data.role)) {
        await Swal.fire({
          icon: 'error',
          title: 'Role Tidak Dikenali',
          text: 'Akun ini bukan akun admin atau security.',
          confirmButtonColor: '#133A6D',
          confirmButtonText: 'Mengerti',
        });
        return;
      }

      const loginResult = await login(data);

      if (!loginResult?.success) {
        await Swal.fire({
          icon: 'error',
          title: 'Login Tidak Berhasil',
          text: loginResult?.message || 'Login tidak dapat dilakukan. Silakan coba lagi.',
          confirmButtonColor: '#133A6D',
          confirmButtonText: 'Coba Lagi',
        });

        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: `Selamat datang, ${data.username}.`,
        timer: 1200,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      if (data.role === 'security') {
        navigate('/security');
      } else if (data.role === 'admin') {
        navigate('/admin');
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Role Tidak Dikenali',
          text: 'Akun Anda belum memiliki role yang valid.',
          confirmButtonColor: '#133A6D',
          confirmButtonText: 'OK',
        });
      }
    } catch (err) {
      console.error('Login Error:', err);

      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Tidak dapat terhubung ke server. Silakan coba lagi.',
        confirmButtonColor: '#133A6D',
        confirmButtonText: 'Coba Lagi',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-0 sm:p-3 md:p-5 lg:p-8 xl:p-10">
      <div
        className="
          relative
          w-full
          max-w-7xl
          bg-white
          overflow-hidden
          shadow-2xl

          min-h-screen

          sm:min-h-162.5
          sm:max-h-none
          sm:rounded-2xl

          md:rounded-3xl

          lg:min-h-162.5

          xl:min-h-175
        "
      >
        <div className="flex flex-col lg:flex-row min-h-screen sm:min-h-162.5 lg:min-h-162.5 xl:min-h-175">
          <section
            className="
              relative
              w-full
              lg:w-1/2

              flex
              items-center
              justify-center

              px-5
              py-10

              sm:px-8
              sm:py-12

              md:px-12

              lg:px-12
              xl:px-16
            "
          >
            <div
              className="
                absolute
                -top-32
                -right-32
                w-72
                h-72
                rounded-full
                bg-blue-50
                pointer-events-none
                lg:hidden
              "
            />

            <div
              className="
                absolute
                -bottom-40
                -left-40
                w-80
                h-80
                rounded-full
                bg-slate-50
                pointer-events-none
                lg:hidden
              "
            />

            <div
              className="
                relative
                z-10

                w-full
                max-w-md
              "
              data-aos="fade-right"
              data-aos-duration="900"
            >
              <div className="mb-8 sm:mb-10" data-aos="zoom-in" data-aos-duration="700">
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-12
                      h-12

                      sm:w-14
                      sm:h-14

                      flex
                      items-center
                      justify-center

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
                      "
                    />
                  </div>

                  <div className="min-w-0">
                    <h1
                      className="
                        text-base
                        sm:text-lg
                        md:text-xl

                        font-extrabold
                        text-[#133A6D]

                        tracking-tight

                        truncate
                      "
                    >
                      BANK MANDIRI TANJUNG ENIM
                    </h1>

                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Sistem Antrian Nasabah</p>
                  </div>
                </div>
              </div>

              <div className="mb-7 sm:mb-8" data-aos="fade-up" data-aos-delay="150">
                <p
                  className="
                    text-xs
                    sm:text-sm

                    font-bold
                    text-[#133A6D]

                    tracking-wide

                    mb-2
                  "
                >
                  SELAMAT DATANG
                </p>

                <h2
                  className="
                    text-2xl
                    sm:text-3xl
                    md:text-4xl

                    font-extrabold
                    text-slate-800

                    tracking-tight
                    leading-tight
                  "
                >
                  Masuk ke Sistem
                </h2>

                <p
                  className="
                    mt-3

                    text-sm
                    sm:text-base

                    text-slate-500
                    leading-relaxed

                    max-w-md
                  "
                >
                  Silakan masuk menggunakan akun petugas yang telah terdaftar.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div data-aos="fade-up" data-aos-delay="250">
                  <label
                    htmlFor="username"
                    className="
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                      mb-2
                    "
                  >
                    Username
                  </label>

                  <div className="relative group">
                    <UserRound
                      size={19}
                      strokeWidth={1.8}
                      className="
                        absolute
                        left-4
                        top-1/2
                        -translate-y-1/2

                        text-slate-400

                        transition-colors
                        duration-200

                        group-focus-within:text-[#133A6D]

                        pointer-events-none
                      "
                    />

                    <input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      disabled={loading}
                      className="
                        w-full

                        h-13
                        sm:h-14

                        pl-12
                        pr-4

                        rounded-xl

                        bg-slate-50

                        border
                        border-slate-200

                        text-sm
                        sm:text-base

                        text-slate-800

                        placeholder:text-slate-400

                        outline-none

                        transition-all
                        duration-200

                        focus:bg-white

                        focus:border-[#133A6D]

                        focus:ring-4
                        focus:ring-blue-100

                        hover:border-slate-300

                        disabled:opacity-60
                        disabled:cursor-not-allowed
                      "
                    />
                  </div>
                </div>

                <div data-aos="fade-up" data-aos-delay="350">
                  <label
                    htmlFor="password"
                    className="
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                      mb-2
                    "
                  >
                    Password
                  </label>

                  <div className="relative group">
                    <LockKeyhole
                      size={19}
                      strokeWidth={1.8}
                      className="
                        absolute
                        left-4
                        top-1/2
                        -translate-y-1/2

                        text-slate-400

                        transition-colors
                        duration-200

                        group-focus-within:text-[#133A6D]

                        pointer-events-none
                      "
                    />

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading}
                      className="
                        w-full

                        h-13
                        sm:h-14

                        pl-12
                        pr-12

                        rounded-xl

                        bg-slate-50

                        border
                        border-slate-200

                        text-sm
                        sm:text-base

                        text-slate-800

                        placeholder:text-slate-400

                        outline-none

                        transition-all
                        duration-200

                        focus:bg-white

                        focus:border-[#133A6D]

                        focus:ring-4
                        focus:ring-blue-100

                        hover:border-slate-300

                        disabled:opacity-60
                        disabled:cursor-not-allowed
                      "
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2

                        flex
                        items-center
                        justify-center

                        w-8
                        h-8

                        rounded-lg

                        text-slate-400

                        hover:text-[#133A6D]
                        hover:bg-blue-50

                        transition-all
                        duration-200

                        disabled:opacity-50
                      "
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <div data-aos="fade-up" data-aos-delay="450">
                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      group

                      relative

                      w-full

                      h-13
                      sm:h-14

                      rounded-xl

                      bg-[#133A6D]

                      hover:bg-[#0d2f59]

                      text-white

                      font-bold

                      text-sm
                      sm:text-base

                      flex
                      items-center
                      justify-center

                      gap-3

                      overflow-hidden

                      transition-all
                      duration-300

                      shadow-lg
                      shadow-blue-900/20

                      hover:shadow-xl
                      hover:shadow-blue-900/25

                      hover:-translate-y-0.5

                      active:translate-y-0

                      disabled:opacity-70
                      disabled:cursor-not-allowed
                      disabled:hover:translate-y-0
                    "
                  >
                    <span
                      className="
                        absolute
                        inset-0

                        -translate-x-full

                        bg-gradient-to-r
                        from-transparent
                        via-white/10
                        to-transparent

                        group-hover:translate-x-full

                        transition-transform
                        duration-700
                      "
                    />

                    {loading ? (
                      <>
                        <span
                          className="
                            relative
                            w-5
                            h-5

                            border-2
                            border-white/30
                            border-t-white

                            rounded-full

                            animate-spin
                          "
                        />

                        <span className="relative">Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative">Masuk ke Sistem</span>

                        <ArrowRight
                          size={19}
                          className="
                            relative

                            transition-transform
                            duration-300

                            group-hover:translate-x-1
                          "
                        />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div
                className="
                  mt-8
                  sm:mt-10

                  pt-5
                  sm:pt-6

                  border-t
                  border-slate-100
                "
                data-aos="fade-up"
                data-aos-delay="550"
              >
                <p
                  className="
                    text-center

                    text-[11px]
                    sm:text-xs

                    text-slate-400
                  "
                >
                  Sistem Internal Antrian Nasabah
                </p>

                <div className="flex justify-center items-center gap-2 mt-2.5">
                  <div
                    className="
                      w-5
                      sm:w-6

                      h-1

                      rounded-full

                      bg-[#133A6D]
                    "
                  />

                  <div
                    className="
                      w-2.5
                      sm:w-3

                      h-1

                      rounded-full

                      bg-[#F5B726]
                    "
                  />

                  <div
                    className="
                      w-5
                      sm:w-6

                      h-1

                      rounded-full

                      bg-[#133A6D]
                    "
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            className="
              hidden

              lg:flex

              lg:w-1/2

              relative

              overflow-hidden

              bg-[#133A6D]

              items-center
              justify-center

              p-10
              xl:p-12
            "
          >
            <div
              className="
                absolute

                -top-32
                -right-32

                w-80
                h-80

                xl:w-96
                xl:h-96

                rounded-full

                bg-white/5

                animate-float-slow

                pointer-events-none
              "
            />

            <div
              className="
                absolute

                -bottom-40
                -left-40

                w-96
                h-96

                xl:w-125
                xl:h-125

                rounded-full

                bg-white/5

                animate-float-reverse

                pointer-events-none
              "
            />

            <div
              className="
                absolute

                top-[18%]
                right-[12%]

                w-4
                h-4

                rounded-full

                bg-[#F5B726]

                opacity-80

                animate-pulse

                pointer-events-none
              "
            />

            <div
              className="
                absolute

                bottom-[18%]
                right-[20%]

                w-2
                h-2

                rounded-full

                bg-white/50

                animate-pulse

                pointer-events-none
              "
            />

            <div
              className="
                absolute

                top-0
                right-0

                w-1.5
                xl:w-2

                h-full

                bg-[#F5B726]
              "
            />

            <div
              className="
                relative
                z-10

                w-full
                max-w-lg
              "
              data-aos="fade-left"
              data-aos-duration="1000"
            >
              <div
                className="
                  w-20
                  h-20

                  xl:w-24
                  xl:h-24

                  mb-6
                  xl:mb-8

                  flex
                  items-center
                  justify-center

                  animate-float-slow
                "
                data-aos="zoom-in"
                data-aos-duration="1000"
              >
                <img
                  src={logo}
                  alt="Bank Mandiri"
                  className="
                    w-full
                    h-full

                    object-contain

                    drop-shadow-2xl
                  "
                />
              </div>

              <p
                className="
                  text-[#F5B726]

                  text-xs
                  xl:text-sm

                  font-bold

                  tracking-[0.15em]
                  xl:tracking-[0.2em]

                  mb-3
                  xl:mb-4
                "
                data-aos="fade-up"
                data-aos-delay="100"
              >
                BANK MANDIRI TANJUNG ENIM
              </p>

              <h2
                className="
                  text-3xl
                  xl:text-5xl

                  font-extrabold

                  text-white

                  leading-tight

                  tracking-tight
                "
                data-aos="fade-up"
                data-aos-delay="200"
              >
                Pelayanan Lebih
                <br />
                <span className="text-[#F5B726]">Cepat & Teratur.</span>
              </h2>

              <p
                className="
                  mt-5
                  xl:mt-6

                  text-sm
                  xl:text-base

                  text-blue-100

                  leading-relaxed

                  max-w-md
                "
                data-aos="fade-up"
                data-aos-delay="300"
              >
                Sistem manajemen antrian nasabah untuk membantu petugas memberikan pelayanan yang lebih efektif, terorganisir, dan nyaman.
              </p>

              <div
                className="
                  mt-8
                  xl:mt-10

                  grid
                  grid-cols-2

                  gap-3
                  xl:gap-4
                "
              >
                <div
                  className="
                    rounded-2xl

                    bg-white/10

                    border
                    border-white/10

                    backdrop-blur-sm

                    p-4
                    xl:p-5

                    transition-all
                    duration-300

                    hover:bg-white/15

                    hover:-translate-y-1

                    hover:shadow-xl
                    hover:shadow-black/10
                  "
                  data-aos="fade-up"
                  data-aos-delay="400"
                >
                  <div
                    className="
                      text-xl
                      xl:text-2xl

                      font-extrabold

                      text-white
                    "
                  >
                    01
                  </div>

                  <p
                    className="
                      mt-1.5
                      xl:mt-2

                      text-xs
                      xl:text-sm

                      text-blue-100
                    "
                  >
                    Ambil Nomor Antrian
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl

                    bg-white/10

                    border
                    border-white/10

                    backdrop-blur-sm

                    p-4
                    xl:p-5

                    transition-all
                    duration-300

                    hover:bg-white/15

                    hover:-translate-y-1

                    hover:shadow-xl
                    hover:shadow-black/10
                  "
                  data-aos="fade-up"
                  data-aos-delay="500"
                >
                  <div
                    className="
                      text-xl
                      xl:text-2xl

                      font-extrabold

                      text-white
                    "
                  >
                    02
                  </div>

                  <p
                    className="
                      mt-1.5
                      xl:mt-2

                      text-xs
                      xl:text-sm

                      text-blue-100
                    "
                  >
                    Pelayanan Terarah
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-6
                  xl:mt-8

                  flex
                  items-center

                  gap-3

                  text-xs
                  xl:text-sm

                  text-blue-100
                "
                data-aos="fade-up"
                data-aos-delay="600"
              >
                <div
                  className="
                    relative

                    w-2
                    h-2

                    rounded-full

                    bg-[#F5B726]
                  "
                >
                  <span
                    className="
                      absolute
                      inset-0

                      rounded-full

                      bg-[#F5B726]

                      animate-ping

                      opacity-75
                    "
                  />
                </div>

                <span>Sistem Internal Petugas</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { UserRound, Users, Clock3, Ticket, RefreshCw, CheckCircle2, Timer, Activity } from 'lucide-react';
import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

const TIME_ZONE = 'Asia/Jakarta';

export default function SecurityDashboard() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [queue, setQueue] = useState(null);

  const [servingQueues, setServingQueues] = useState([]);
  const [waitingQueues, setWaitingQueues] = useState([]);
  const [csUsers, setCsUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Waktu sekarang untuk countdown
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    AOS.init({
      duration: 600,
      once: true,
    });
  }, []);

  // ============================================
  // TIMER COUNTDOWN
  // ============================================

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================
  // HELPER TIMEZONE
  // ============================================

  function parseQueueDate(date) {
    if (!date) return null;

    const value = String(date);

    // Kalau sudah memiliki timezone
    if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
      const parsed = new Date(value);

      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // Kalau timestamp tanpa timezone,
    // anggap sebagai WIB
    const parsed = new Date(`${value}+07:00`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatTime(date) {
    const parsed = parseQueueDate(date);

    if (!parsed) return '-';

    return parsed.toLocaleTimeString('id-ID', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function formatShortTime(date) {
    const parsed = parseQueueDate(date);

    if (!parsed) return '-';

    return parsed.toLocaleTimeString('id-ID', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(date) {
    const parsed = parseQueueDate(date);

    if (!parsed) return '-';

    return parsed.toLocaleDateString('id-ID', {
      timeZone: TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // ============================================
  // TANGGAL HARI INI
  // ============================================

  const todayStart = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((x) => x.type === 'year')?.value;
    const month = parts.find((x) => x.type === 'month')?.value;
    const day = parts.find((x) => x.type === 'day')?.value;

    return new Date(`${year}-${month}-${day}T00:00:00+07:00`).toISOString();
  }, []);

  // ============================================
  // LOAD DATA CS
  // ============================================

  async function loadCSUsers() {
    const { data, error } = await supabase.from('users').select('id, username, role').eq('role', 'cs').order('username', {
      ascending: true,
    });

    if (error) {
      console.error('Gagal mengambil data CS:', error);
      return;
    }

    setCsUsers(data || []);
  }

  // ============================================
  // LOAD ANTRIAN
  // ============================================

  async function loadQueues() {
    setLoadingData(true);

    const { data, error } = await supabase.from('queues').select('*').gte('created_at', todayStart).order('created_at', {
      ascending: true,
    });

    if (error) {
      console.error('Gagal mengambil data antrian:', error);
      setLoadingData(false);
      return;
    }

    const queues = data || [];

    const waiting = queues.filter((item) => item.status === 'waiting');

    const serving = queues.filter((item) => item.status === 'serving');

    setWaitingQueues(waiting);
    setServingQueues(serving);

    setLoadingData(false);
  }

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    loadCSUsers();
    loadQueues();
  }, [todayStart]);

  // ============================================
  // REALTIME
  // ============================================

  useEffect(() => {
    const channel = supabase
      .channel('security-queues-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queues',
        },
        () => {
          loadQueues();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [todayStart]);

  // ============================================
  // CARI NAMA CS
  // ============================================

  function getCSName(csId) {
    if (!csId) return '-';

    const cs = csUsers.find((item) => String(item.id) === String(csId));

    return cs?.username || '-';
  }

  // ============================================
  // GENERATE NOMOR ANTRIAN
  // ============================================

  async function generateQueueNumber() {
    const { data, error } = await supabase
      .from('queues')
      .select('queue_number, created_at')
      .gte('created_at', todayStart)
      .order('created_at', {
        ascending: false,
      })
      .limit(1);

    if (error) {
      console.error('Gagal mendapatkan nomor antrian terakhir:', error);

      throw error;
    }

    if (!data || data.length === 0) {
      return 'A001';
    }

    const lastNumber = data[0].queue_number;

    const match = String(lastNumber).match(/(\d+)$/);

    if (!match) {
      return 'A001';
    }

    const number = Number(match[1]) + 1;

    return `A${String(number).padStart(3, '0')}`;
  }

  // ============================================
  // CEK JAM OPERASIONAL
  // 08:00 - 15:00 WIB
  // ============================================

  // PROSES DEVELOP ///

  // function isBankOpen() {
  //   const formatter = new Intl.DateTimeFormat('en-GB', {
  //     timeZone: TIME_ZONE,
  //     hour: '2-digit',
  //     minute: '2-digit',
  //     hour12: false,
  //   });

  //   const parts = formatter.formatToParts(new Date());

  //   const hour = Number(parts.find((x) => x.type === 'hour')?.value);

  //   const minute = Number(parts.find((x) => x.type === 'minute')?.value);

  //   const totalMinutes = hour * 60 + minute;

  //   return totalMinutes >= 8 * 60 && totalMinutes < 15 * 60;
  // }

  // ============================================
  // TAMBAH ANTRIAN
  // ============================================

  async function createQueue(e) {
    e.preventDefault();

    const customerName = name.trim();

    if (!customerName) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama nasabah belum diisi',
        text: 'Silakan masukkan nama nasabah terlebih dahulu.',
        confirmButtonColor: '#0b57d0',
      });

      return;
    }

    // PROSES DEVELOP /////////

    // if (!isBankOpen()) {
    //   Swal.fire({
    //     icon: 'info',
    //     title: 'Layanan antrian ditutup',
    //     text: 'Pengambilan nomor antrian hanya dapat dilakukan pada pukul 08:00 - 15:00 WIB.',
    //     confirmButtonColor: '#0b57d0',
    //   });

    //   return;
    // }

    try {
      setLoading(true);

      const queueNumber = await generateQueueNumber();

      const { data, error } = await supabase
        .from('queues')
        .insert({
          queue_number: queueNumber,
          customer_name: customerName,
          status: 'waiting',
          security_id: user?.id || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setQueue(data);
      setName('');

      await loadQueues();

      Swal.fire({
        icon: 'success',
        title: 'Nomor Antrian Berhasil',
        html: `
          <div style="font-size:16px">
            Nasabah <b>${customerName}</b>
            mendapatkan nomor antrian
            <div style="
              font-size:42px;
              font-weight:800;
              margin-top:12px;
              color:#0b57d0;
            ">
              ${queueNumber}
            </div>
          </div>
        `,
        confirmButtonColor: '#0b57d0',
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Gagal membuat antrian',
        text: error?.message || 'Terjadi kesalahan saat membuat nomor antrian.',
        confirmButtonColor: '#0b57d0',
      });
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // COUNTDOWN
  // ============================================

  function getRemainingSeconds(item) {
    if (!item?.started_at || !item?.estimated_time) {
      return null;
    }

    const startedAt = parseQueueDate(item.started_at);

    if (!startedAt) {
      return null;
    }

    const totalMilliseconds = Number(item.estimated_time) * 60 * 1000;

    if (totalMilliseconds <= 0) {
      return null;
    }

    const finishTime = startedAt.getTime() + totalMilliseconds;

    const remainingMilliseconds = Math.max(0, finishTime - now.getTime());

    return Math.floor(remainingMilliseconds / 1000);
  }

  // ============================================
  // PROGRESS BAR
  // ============================================

  function getServiceProgress(item) {
    if (!item?.started_at || !item?.estimated_time) {
      return 0;
    }

    const startedAt = parseQueueDate(item.started_at);

    if (!startedAt) {
      return 0;
    }

    const totalMilliseconds = Number(item.estimated_time) * 60 * 1000;

    if (totalMilliseconds <= 0) {
      return 0;
    }

    const elapsedMilliseconds = now.getTime() - startedAt.getTime();

    const progress = (elapsedMilliseconds / totalMilliseconds) * 100;

    return Math.min(100, Math.max(0, progress));
  }

  // ============================================
  // FORMAT COUNTDOWN
  // ============================================

  function formatCountdown(seconds) {
    if (seconds === null || seconds === undefined) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  // ============================================
  // STATISTIK
  // ============================================

  const waitingCount = waitingQueues.length;

  const servingCount = servingQueues.length;

  const totalToday = waitingQueues.length + servingQueues.length + 0;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* ========================================
          HEADER
      ======================================== */}

      <div
        data-aos="fade-down"
        className="
          rounded-3xl
          bg-gradient-to-r
          from-[#0b3b78]
          via-[#1253a3]
          to-[#0b3b78]
          p-6
          md:p-8
          text-white
          shadow-lg
          relative
          overflow-hidden
        "
      >
        <div
          className="
          absolute
          -right-16
          -top-16
          w-48
          h-48
          rounded-full
          bg-white/10
        "
        />

        <div
          className="
          absolute
          -bottom-20
          right-20
          w-56
          h-56
          rounded-full
          bg-[#ffd400]/10
        "
        />

        <div className="relative z-10">
          <div
            className="
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-4
          "
          >
            <div>
              <p
                className="
                text-blue-100
                text-sm
                mb-1
              "
              >
                Sistem Antrian Customer Service
              </p>

              <h1
                className="
                text-2xl
                md:text-3xl
                font-bold
              "
              >
                Dashboard Security
              </h1>

              <p
                className="
                text-blue-100
                mt-2
              "
              >
                Kelola nomor antrian nasabah dengan mudah dan cepat.
              </p>
            </div>

            <div
              className="
              bg-white/10
              backdrop-blur-md
              border
              border-white/20
              rounded-2xl
              px-5
              py-3
              flex
              items-center
              gap-3
            "
            >
              <Clock3 size={22} />

              <div>
                <p
                  className="
      text-xs
      text-blue-100
    "
                >
                  Waktu Sekarang
                </p>

                <p
                  className="
      font-semibold
      tabular-nums
    "
                >
                  {new Date().toLocaleTimeString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}{' '}
                  WIB
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          STATISTIK
      ======================================== */}

      <div
        className="
        grid
        grid-cols-2
        lg:grid-cols-3
        gap-4
      "
      >
        {/* Menunggu */}
        <div
          data-aos="fade-up"
          className="
            bg-white
            rounded-2xl
            p-5
            shadow-sm
            border
            border-slate-100
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
          "
          >
            <div>
              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Menunggu
              </p>

              <p
                className="
                text-3xl
                font-bold
                text-slate-800
                mt-1
              "
              >
                {waitingCount}
              </p>
            </div>

            <div
              className="
              w-11
              h-11
              rounded-xl
              bg-blue-50
              text-blue-600
              flex
              items-center
              justify-center
            "
            >
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* Sedang Dilayani */}
        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="
            bg-white
            rounded-2xl
            p-5
            shadow-sm
            border
            border-slate-100
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
          "
          >
            <div>
              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Sedang Dilayani
              </p>

              <p
                className="
                text-3xl
                font-bold
                text-slate-800
                mt-1
              "
              >
                {servingCount}
              </p>
            </div>

            <div
              className="
              w-11
              h-11
              rounded-xl
              bg-amber-50
              text-amber-600
              flex
              items-center
              justify-center
            "
            >
              <Activity size={22} />
            </div>
          </div>
        </div>

        {/* CS */}
        <div
          data-aos="fade-up"
          data-aos-delay="200"
          className="
            bg-white
            rounded-2xl
            p-5
            shadow-sm
            border
            border-slate-100
            col-span-2
            lg:col-span-1
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
          "
          >
            <div>
              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Customer Service
              </p>

              <p
                className="
                text-3xl
                font-bold
                text-slate-800
                mt-1
              "
              >
                {csUsers.length}
              </p>
            </div>

            <div
              className="
              w-11
              h-11
              rounded-xl
              bg-yellow-50
              text-yellow-600
              flex
              items-center
              justify-center
            "
            >
              <UserRound size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          INPUT NOMOR ANTRIAN
      ======================================== */}

      <div
        data-aos="fade-up"
        className="
          bg-white
          rounded-3xl
          shadow-sm
          border
          border-slate-100
          p-5
          md:p-7
        "
      >
        <div
          className="
          flex
          items-center
          gap-3
          mb-5
        "
        >
          <div
            className="
            w-11
            h-11
            rounded-xl
            bg-blue-50
            text-blue-600
            flex
            items-center
            justify-center
          "
          >
            <Ticket size={23} />
          </div>

          <div>
            <h2
              className="
              text-lg
              md:text-xl
              font-bold
              text-slate-800
            "
            >
              Ambil Nomor Antrian
            </h2>

            <p
              className="
              text-sm
              text-slate-500
            "
            >
              Masukkan nama nasabah untuk mendapatkan nomor antrian.
            </p>
          </div>
        </div>

        <form
          onSubmit={createQueue}
          className="
            flex
            flex-col
            md:flex-row
            gap-3
          "
        >
          <div
            className="
            relative
            flex-1
          "
          >
            <UserRound
              size={20}
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama nasabah"
              className="
                w-full
                h-12
                pl-12
                pr-4
                rounded-xl
                border
                border-slate-200
                outline-none
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
                transition
              "
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              h-12
              px-6
              rounded-xl
              bg-[#0b57d0]
              hover:bg-[#0848ae]
              text-white
              font-semibold
              flex
              items-center
              justify-center
              gap-2
              transition
              disabled:opacity-60
              disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Ticket size={18} />
                Ambil Nomor
              </>
            )}
          </button>
        </form>

        {/* NOMOR TERAKHIR */}
        {queue && (
          <div
            data-aos="zoom-in"
            className="
              mt-5
              rounded-2xl
              bg-gradient-to-r
              from-blue-50
              to-yellow-50
              border
              border-blue-100
              p-5
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Nomor antrian terbaru
              </p>

              <p
                className="
                text-slate-800
                font-semibold
                mt-1
              "
              >
                {queue.customer_name}
              </p>
            </div>

            <div
              className="
              text-4xl
              font-black
              text-[#0b57d0]
            "
            >
              {queue.queue_number}
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          MOBILE
      ======================================== */}

      <div
        className="
        grid
        grid-cols-1
        gap-6
        lg:hidden
      "
      >
        {/* SEDANG DILAYANI */}
        <div
          data-aos="fade-up"
          className="
            bg-white
            rounded-3xl
            shadow-sm
            border
            border-slate-100
            p-5
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
            mb-5
          "
          >
            <div>
              <h2
                className="
                text-lg
                font-bold
                text-slate-800
              "
              >
                Sedang Dilayani
              </h2>

              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Monitoring pelayanan CS
              </p>
            </div>

            <Activity size={22} className="text-blue-600" />
          </div>

          {servingQueues.length === 0 ? (
            <div
              className="
              py-10
              text-center
              text-slate-400
            "
            >
              <Timer
                size={35}
                className="
                  mx-auto
                  mb-3
                "
              />

              <p>Belum ada nasabah yang sedang dilayani.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {servingQueues.map((item) => {
                const remaining = getRemainingSeconds(item);

                const progress = getServiceProgress(item);

                const isExpired = remaining === 0;

                return (
                  <div
                    key={item.id}
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      p-4
                      bg-slate-50/50
                    "
                  >
                    {/* QUEUE */}
                    <div
                      className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                    >
                      <div>
                        <div
                          className="
                          text-2xl
                          font-black
                          text-[#0b57d0]
                        "
                        >
                          {item.queue_number}
                        </div>

                        <p
                          className="
                          font-semibold
                          text-slate-800
                        "
                        >
                          {item.customer_name}
                        </p>
                      </div>

                      <div
                        className="
                        text-right
                      "
                      >
                        <p
                          className="
                          text-xs
                          text-slate-500
                        "
                        >
                          Sisa Waktu
                        </p>

                        <p
                          className={`
                            text-2xl
                            font-black
                            ${isExpired ? 'text-amber-600' : 'text-blue-700'}
                          `}
                        >
                          {formatCountdown(remaining)}
                        </p>
                      </div>
                    </div>

                    {/* PROGRESS */}
                    <div className="mt-5">
                      <div
                        className="
                        flex
                        items-center
                        justify-between
                        text-xs
                        mb-2
                      "
                      >
                        <span
                          className="
                          text-slate-500
                        "
                        >
                          Progress pelayanan
                        </span>

                        <span
                          className="
                          font-bold
                          text-slate-700
                        "
                        >
                          {Math.round(progress)}%
                        </span>
                      </div>

                      <div
                        className="
                        h-3
                        rounded-full
                        bg-slate-200
                        overflow-hidden
                      "
                      >
                        <div
                          className={`
                            h-full
                            rounded-full
                            transition-all
                            duration-500
                            ${isExpired ? 'bg-amber-500' : 'bg-blue-600'}
                          `}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* INFO */}
                    <div
                      className="
                      mt-4
                      grid
                      grid-cols-2
                      gap-3
                      text-sm
                    "
                    >
                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          CS
                        </p>

                        <p
                          className="
                          font-semibold
                          text-slate-700
                        "
                        >
                          {getCSName(item.cs_id)}
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          Mulai
                        </p>

                        <p
                          className="
                          font-semibold
                          text-slate-700
                        "
                        >
                          {formatShortTime(item.started_at)}
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          Estimasi
                        </p>

                        <p
                          className="
                          font-semibold
                          text-slate-700
                        "
                        >
                          {item.estimated_time} menit
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          Status
                        </p>

                        <span
                          className="
                          inline-flex
                          items-center
                          gap-1
                          px-2
                          py-1
                          mt-1
                          rounded-full
                          bg-amber-50
                          text-amber-700
                          text-xs
                          font-semibold
                        "
                        >
                          <Activity size={12} />
                          Dilayani
                        </span>
                      </div>
                    </div>

                    {isExpired && (
                      <div
                        className="
                        mt-4
                        flex
                        items-center
                        gap-2
                        rounded-xl
                        bg-amber-50
                        text-amber-700
                        px-3
                        py-2
                        text-sm
                        font-semibold
                      "
                      >
                        <Clock3 size={16} />
                        Waktu pelayanan habis
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* QUEUE HARI INI */}
        <div
          data-aos="fade-up"
          className="
            bg-white
            rounded-3xl
            shadow-sm
            border
            border-slate-100
            p-5
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
            mb-5
          "
          >
            <div>
              <h2
                className="
                text-lg
                font-bold
                text-slate-800
              "
              >
                Antrian Hari Ini
              </h2>

              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Daftar nasabah yang menunggu
              </p>
            </div>

            <span
              className="
              px-3
              py-1
              rounded-full
              bg-blue-50
              text-blue-700
              text-sm
              font-bold
            "
            >
              {waitingQueues.length}
            </span>
          </div>

          {loadingData ? (
            <div
              className="
              py-10
              text-center
              text-slate-400
            "
            >
              Memuat data...
            </div>
          ) : waitingQueues.length === 0 ? (
            <div
              className="
              py-10
              text-center
              text-slate-400
            "
            >
              Tidak ada antrian menunggu.
            </div>
          ) : (
            <div
              className="
              space-y-2
              max-h-[430px]
              overflow-y-auto
              pr-1
            "
            >
              {waitingQueues.map((item) => (
                <div
                  key={item.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    p-3
                    rounded-xl
                    border
                    border-slate-100
                    hover:bg-slate-50
                    transition
                  "
                >
                  <div
                    className="
                    flex
                    items-center
                    gap-3
                  "
                  >
                    <div
                      className="
                      w-12
                      h-12
                      rounded-xl
                      bg-blue-50
                      text-blue-700
                      flex
                      items-center
                      justify-center
                      font-black
                    "
                    >
                      {item.queue_number}
                    </div>

                    <div>
                      <p
                        className="
                        font-semibold
                        text-slate-800
                      "
                      >
                        {item.customer_name}
                      </p>

                      <p
                        className="
                        text-xs
                        text-slate-400
                      "
                      >
                        {formatShortTime(item.created_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                    px-2
                    py-1
                    rounded-full
                    bg-blue-50
                    text-blue-600
                    text-xs
                    font-semibold
                  "
                  >
                    Menunggu
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          DESKTOP
      ======================================== */}

      <div
        className="
        hidden
        lg:grid
        lg:grid-cols-2
        gap-6
      "
      >
        {/* ANTRIAN HARI INI */}
        <div
          data-aos="fade-up"
          className="
            bg-white
            rounded-3xl
            shadow-sm
            border
            border-slate-100
            p-6
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
            mb-5
          "
          >
            <div>
              <h2
                className="
                text-xl
                font-bold
                text-slate-800
              "
              >
                Antrian Hari Ini
              </h2>

              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Nasabah yang sedang menunggu
              </p>
            </div>

            <span
              className="
              px-3
              py-1
              rounded-full
              bg-blue-50
              text-blue-700
              font-bold
            "
            >
              {waitingQueues.length}
            </span>
          </div>

          {loadingData ? (
            <div
              className="
              py-10
              text-center
              text-slate-400
            "
            >
              Memuat data...
            </div>
          ) : waitingQueues.length === 0 ? (
            <div
              className="
              py-10
              text-center
              text-slate-400
            "
            >
              Tidak ada antrian menunggu.
            </div>
          ) : (
            <div
              className="
              space-y-2
              max-h-[430px]
              overflow-y-auto
              pr-2
            "
            >
              {waitingQueues.map((item) => (
                <div
                  key={item.id}
                  className="
                    flex
                    items-center
                    justify-between
                    p-3
                    rounded-xl
                    border
                    border-slate-100
                    hover:bg-slate-50
                    transition
                  "
                >
                  <div
                    className="
                    flex
                    items-center
                    gap-3
                  "
                  >
                    <div
                      className="
                      w-12
                      h-12
                      rounded-xl
                      bg-blue-50
                      text-blue-700
                      flex
                      items-center
                      justify-center
                      font-black
                    "
                    >
                      {item.queue_number}
                    </div>

                    <div>
                      <p
                        className="
                        font-semibold
                        text-slate-800
                      "
                      >
                        {item.customer_name}
                      </p>

                      <p
                        className="
                        text-xs
                        text-slate-400
                      "
                      >
                        Diambil pukul {formatTime(item.created_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                    px-3
                    py-1
                    rounded-full
                    bg-blue-50
                    text-blue-600
                    text-xs
                    font-semibold
                  "
                  >
                    Menunggu
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEDANG DILAYANI */}
        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="
            bg-white
            rounded-3xl
            shadow-sm
            border
            border-slate-100
            p-6
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
            mb-5
          "
          >
            <div>
              <h2
                className="
                text-xl
                font-bold
                text-slate-800
              "
              >
                Sedang Dilayani
              </h2>

              <p
                className="
                text-sm
                text-slate-500
              "
              >
                Monitoring pelayanan Customer Service
              </p>
            </div>

            <Activity size={23} className="text-blue-600" />
          </div>

          {servingQueues.length === 0 ? (
            <div
              className="
              py-10
              text-center
              text-slate-400
            "
            >
              <Timer
                size={38}
                className="
                  mx-auto
                  mb-3
                "
              />

              <p>Belum ada nasabah yang sedang dilayani.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {servingQueues.map((item) => {
                const remaining = getRemainingSeconds(item);

                const progress = getServiceProgress(item);

                const isExpired = remaining === 0;

                return (
                  <div
                    key={item.id}
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      p-5
                      bg-slate-50/50
                    "
                  >
                    {/* HEADER */}
                    <div
                      className="
                      flex
                      items-start
                      justify-between
                      gap-4
                    "
                    >
                      <div
                        className="
                        flex
                        items-center
                        gap-4
                      "
                      >
                        <div
                          className="
                          w-16
                          h-16
                          rounded-2xl
                          bg-blue-50
                          text-blue-700
                          flex
                          items-center
                          justify-center
                          text-xl
                          font-black
                        "
                        >
                          {item.queue_number}
                        </div>

                        <div>
                          <p
                            className="
                            font-bold
                            text-slate-800
                          "
                          >
                            {item.customer_name}
                          </p>

                          <p
                            className="
                            text-sm
                            text-slate-500
                            mt-1
                          "
                          >
                            CS:{' '}
                            <span
                              className="
                              font-semibold
                              text-slate-700
                            "
                            >
                              {getCSName(item.cs_id)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* COUNTDOWN */}
                      <div
                        className="
                        text-right
                      "
                      >
                        <p
                          className="
                          text-xs
                          text-slate-400
                          uppercase
                          tracking-wide
                        "
                        >
                          Sisa Waktu
                        </p>

                        <p
                          className={`
                            text-3xl
                            font-black
                            tracking-tight
                            ${isExpired ? 'text-amber-600' : 'text-blue-700'}
                          `}
                        >
                          {formatCountdown(remaining)}
                        </p>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="mt-6">
                      <div
                        className="
                        flex
                        justify-between
                        items-center
                        mb-2
                      "
                      >
                        <span
                          className="
                          text-xs
                          font-medium
                          text-slate-500
                        "
                        >
                          Progress pelayanan
                        </span>

                        <span
                          className="
                          text-xs
                          font-bold
                          text-slate-700
                        "
                        >
                          {Math.round(progress)}%
                        </span>
                      </div>

                      <div
                        className="
                        h-3
                        rounded-full
                        bg-slate-200
                        overflow-hidden
                      "
                      >
                        <div
                          className={`
                            h-full
                            rounded-full
                            transition-all
                            duration-500
                            ${isExpired ? 'bg-amber-500' : 'bg-blue-600'}
                          `}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* DETAIL */}
                    <div
                      className="
                      grid
                      grid-cols-3
                      gap-4
                      mt-5
                    "
                    >
                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          Mulai Dilayani
                        </p>

                        <p
                          className="
                          text-sm
                          font-semibold
                          text-slate-700
                          mt-1
                        "
                        >
                          {formatTime(item.started_at)}
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          Estimasi
                        </p>

                        <p
                          className="
                          text-sm
                          font-semibold
                          text-slate-700
                          mt-1
                        "
                        >
                          {item.estimated_time} menit
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                          text-xs
                          text-slate-400
                        "
                        >
                          Status
                        </p>

                        <span
                          className="
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          mt-1
                          rounded-full
                          bg-amber-50
                          text-amber-700
                          text-xs
                          font-semibold
                        "
                        >
                          <Activity size={12} />
                          Dilayani
                        </span>
                      </div>
                    </div>

                    {/* WAKTU HABIS */}
                    {isExpired && (
                      <div
                        className="
                        mt-5
                        flex
                        items-center
                        gap-2
                        rounded-xl
                        bg-amber-50
                        border
                        border-amber-100
                        text-amber-700
                        px-4
                        py-3
                        text-sm
                        font-semibold
                      "
                      >
                        <Clock3 size={18} />
                        Waktu pelayanan sudah habis.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          FOOTER
      ======================================== */}

      <div
        className="
        text-center
        text-xs
        text-slate-400
        pb-3
      "
      >
        SAC-Mandiri • Sistem Antrian Customer Service
      </div>
    </div>
  );
}

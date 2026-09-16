import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { Ticket, Clock3, UserRound, PlayCircle, CheckCircle2, Users, RefreshCw, Timer, CircleCheck, AlertCircle, LoaderCircle } from 'lucide-react';

export default function CSDashboard() {
  const { user } = useAuth();

  // =========================================================
  // STATE
  // =========================================================

  const [queues, setQueues] = useState([]);

  const [current, setCurrent] = useState(null);

  const [estimate, setEstimate] = useState('');

  const [loadingQueues, setLoadingQueues] = useState(true);

  const [takingQueue, setTakingQueue] = useState(false);

  const [savingEstimate, setSavingEstimate] = useState(false);

  const [finishing, setFinishing] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [now, setNow] = useState(new Date());

  // =========================================================
  // AOS
  // =========================================================

  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50,
    });

    const handleResize = () => {
      AOS.refresh();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // =========================================================
  // CLOCK
  // =========================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData(showLoading = true) {
    try {
      if (showLoading) {
        setLoadingQueues(true);
      }

      // -----------------------------------------------------
      // 1. Ambil antrean yang masih menunggu
      // -----------------------------------------------------

      const { data: waitingData, error: waitingError } = await supabase.from('queues').select('*').eq('status', 'waiting').order('created_at', {
        ascending: true,
      });

      if (waitingError) {
        console.error('Gagal mengambil antrean:', waitingError);

        setQueues([]);
      } else {
        setQueues(waitingData || []);
      }

      // -----------------------------------------------------
      // 2. Ambil pelayanan aktif milik CS yang login
      // -----------------------------------------------------

      if (user?.id) {
        const { data: servingData, error: servingError } = await supabase
          .from('queues')
          .select('*')
          .eq('status', 'serving')
          .eq('cs_id', user.id)
          .order('started_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (servingError) {
          console.error('Gagal mengambil pelayanan aktif:', servingError);

          setCurrent(null);
        } else if (servingData) {
          setCurrent(servingData);

          // Jika sudah ada estimasi di database,
          // masukkan kembali ke input.
          if (servingData.estimated_time !== null && servingData.estimated_time !== undefined) {
            setEstimate(String(servingData.estimated_time));
          } else {
            setEstimate('');
          }
        } else {
          setCurrent(null);
          setEstimate('');
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoadingQueues(false);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    if (!user?.id) return;

    loadData();
  }, [user?.id]);

  // =========================================================
  // REALTIME
  // =========================================================

  useEffect(() => {
    const channel = supabase
      .channel(`cs-queue-change-${user?.id || 'unknown'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queues',
        },
        () => {
          loadData(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // =========================================================
  // REFRESH
  // =========================================================

  async function handleRefresh() {
    setRefreshing(true);

    await loadData(false);

    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }

  // =========================================================
  // TAKE QUEUE
  // =========================================================

  async function takeQueue(queue) {
    if (takingQueue) return;

    // -------------------------------------------------------
    // Pastikan CS belum sedang melayani nasabah lain
    // -------------------------------------------------------

    if (current) {
      Swal.fire({
        icon: 'warning',
        title: 'Masih Ada Pelayanan Aktif',
        text: `Selesaikan antrian ${current.queue_number} terlebih dahulu.`,
        confirmButtonColor: '#0b3b91',
      });

      return;
    }

    // -------------------------------------------------------
    // Konfirmasi
    // -------------------------------------------------------

    const result = await Swal.fire({
      icon: 'question',
      title: 'Layani Nasabah?',
      html: `
        <div style="margin-top:8px">
          <div style="
            font-size:32px;
            font-weight:800;
            color:#0b3b91;
          ">
            ${queue.queue_number}
          </div>

          <div style="
            font-size:16px;
            font-weight:600;
            margin-top:5px;
          ">
            ${queue.customer_name}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Ya, Layani',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0b3b91',
      cancelButtonColor: '#94a3b8',
    });

    if (!result.isConfirmed) {
      return;
    }

    setTakingQueue(true);

    try {
      // -----------------------------------------------------
      // Update antrean
      // -----------------------------------------------------

      const startedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('queues')
        .update({
          status: 'serving',
          cs_id: user.id,
          started_at: startedAt,
        })
        .eq('id', queue.id)
        .eq('status', 'waiting')
        .select()
        .single();

      if (error) {
        console.error('Gagal mengambil antrean:', error);

        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengambil Antrian',
          text: error.message || 'Antrian mungkin sudah diambil oleh CS lain.',
          confirmButtonColor: '#0b3b91',
        });

        await loadData(false);

        return;
      }

      // -----------------------------------------------------
      // Set current
      // -----------------------------------------------------

      setCurrent(data);

      setEstimate('');

      // Refresh waiting list
      await loadData(false);

      Swal.fire({
        icon: 'success',
        title: 'Antrian Berhasil Diambil',
        html: `
          <div style="margin-top:8px">
            <div style="
              font-size:32px;
              font-weight:800;
              color:#0b3b91;
            ">
              ${data.queue_number}
            </div>

            <div style="
              font-size:15px;
              font-weight:600;
              margin-top:4px;
            ">
              ${data.customer_name}
            </div>

            <div style="
              font-size:13px;
              color:#64748b;
              margin-top:8px;
            ">
              Silakan masukkan estimasi waktu pelayanan.
            </div>
          </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#0b3b91',
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Silakan coba kembali.',
        confirmButtonColor: '#0b3b91',
      });
    } finally {
      setTakingQueue(false);
    }
  }

  // =========================================================
  // SAVE ESTIMATE
  // =========================================================

  async function saveEstimate() {
    if (savingEstimate) return;

    if (!current) {
      Swal.fire({
        icon: 'warning',
        title: 'Belum Ada Nasabah',
        text: 'Silakan ambil antrian terlebih dahulu.',
        confirmButtonColor: '#0b3b91',
      });

      return;
    }

    const value = Number(estimate);

    // -------------------------------------------------------
    // Validasi
    // -------------------------------------------------------

    if (!estimate || Number.isNaN(value)) {
      Swal.fire({
        icon: 'warning',
        title: 'Estimasi Belum Diisi',
        text: 'Masukkan estimasi waktu pelayanan.',
        confirmButtonColor: '#0b3b91',
      });

      return;
    }

    if (value <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Estimasi Tidak Valid',
        text: 'Estimasi harus lebih dari 0 menit.',
        confirmButtonColor: '#0b3b91',
      });

      return;
    }

    if (value > 180) {
      Swal.fire({
        icon: 'warning',
        title: 'Estimasi Terlalu Lama',
        text: 'Estimasi maksimal adalah 180 menit.',
        confirmButtonColor: '#0b3b91',
      });

      return;
    }

    setSavingEstimate(true);

    try {
      const { data, error } = await supabase
        .from('queues')
        .update({
          estimated_time: value,
        })
        .eq('id', current.id)
        .eq('status', 'serving')
        .select()
        .single();

      if (error) {
        console.error('Gagal menyimpan estimasi:', error);

        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: error.message,
          confirmButtonColor: '#0b3b91',
        });

        return;
      }

      // -----------------------------------------------------
      // Update current
      // -----------------------------------------------------

      setCurrent(data);

      setEstimate(String(value));

      Swal.fire({
        icon: 'success',
        title: 'Estimasi Tersimpan',
        text: `Estimasi pelayanan ${value} menit.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Estimasi gagal disimpan.',
        confirmButtonColor: '#0b3b91',
      });
    } finally {
      setSavingEstimate(false);
    }
  }

  // =========================================================
  // FINISH
  // =========================================================

  async function finish() {
    if (finishing) return;

    if (!current) {
      return;
    }

    // -------------------------------------------------------
    // Estimasi wajib sudah disimpan
    // -------------------------------------------------------

    if (current.estimated_time === null || current.estimated_time === undefined) {
      Swal.fire({
        icon: 'warning',
        title: 'Estimasi Belum Disimpan',
        text: 'Simpan estimasi pelayanan terlebih dahulu.',
        confirmButtonColor: '#0b3b91',
      });

      return;
    }

    // -------------------------------------------------------
    // Konfirmasi
    // -------------------------------------------------------

    const result = await Swal.fire({
      icon: 'question',
      title: 'Selesaikan Pelayanan?',
      html: `
        <div style="margin-top:8px">
          <div style="
            font-size:28px;
            font-weight:800;
            color:#0b3b91;
          ">
            ${current.queue_number}
          </div>

          <div style="
            font-size:15px;
            font-weight:600;
            margin-top:4px;
          ">
            ${current.customer_name}
          </div>

          <div style="
            font-size:13px;
            color:#64748b;
            margin-top:8px;
          ">
            Pastikan pelayanan nasabah sudah selesai.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Ya, Selesai',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#94a3b8',
    });

    if (!result.isConfirmed) {
      return;
    }

    setFinishing(true);

    try {
      const finishedAt = new Date().toISOString();

      const { error } = await supabase
        .from('queues')
        .update({
          status: 'done',
          finished_at: finishedAt,
        })
        .eq('id', current.id)
        .eq('status', 'serving');

      if (error) {
        console.error('Gagal menyelesaikan pelayanan:', error);

        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyelesaikan',
          text: error.message,
          confirmButtonColor: '#0b3b91',
        });

        return;
      }

      // -----------------------------------------------------
      // Reset current
      // -----------------------------------------------------

      setCurrent(null);

      setEstimate('');

      await loadData(false);

      Swal.fire({
        icon: 'success',
        title: 'Pelayanan Selesai',
        text: 'Nasabah berhasil diselesaikan.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Pelayanan gagal diselesaikan.',
        confirmButtonColor: '#0b3b91',
      });
    } finally {
      setFinishing(false);
    }
  }

  // =========================================================
  // TIME FUNCTIONS
  // =========================================================

  function getRemainingSeconds() {
    if (!current || !current.started_at || !current.estimated_time) {
      return null;
    }

    const startedAt = new Date(current.started_at).getTime();

    const totalMilliseconds = Number(current.estimated_time) * 60 * 1000;

    const finishTime = startedAt + totalMilliseconds;

    const remaining = Math.max(0, finishTime - now.getTime());

    return Math.floor(remaining / 1000);
  }

  function formatCountdown(seconds) {
    if (seconds === null) {
      return '--:--';
    }

    const safeSeconds = Math.max(0, seconds);

    const minutes = Math.floor(safeSeconds / 60);

    const secondsLeft = safeSeconds % 60;

    return String(minutes).padStart(2, '0') + ':' + String(secondsLeft).padStart(2, '0');
  }

  function getProgress() {
    if (!current || !current.started_at || !current.estimated_time) {
      return 0;
    }

    const startedAt = new Date(current.started_at).getTime();

    const totalMilliseconds = Number(current.estimated_time) * 60 * 1000;

    const elapsed = now.getTime() - startedAt;

    const progress = (elapsed / totalMilliseconds) * 100;

    return Math.min(100, Math.max(0, progress));
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function formatQueueTime(date) {
    return new Date(date).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // =========================================================
  // CALCULATED DATA
  // =========================================================

  const remaining = getRemainingSeconds();

  const progress = getProgress();

  const hasEstimate = current?.estimated_time !== null && current?.estimated_time !== undefined;

  const isAlmostDone = remaining !== null && remaining > 0 && remaining <= 60;

  const isOvertime = current && hasEstimate && remaining === 0;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        data-aos="fade-down"
        className="
          relative
          overflow-hidden
          rounded-3xl
          bg-blue-900
          px-5
          py-6
          md:px-8
          md:py-8
          shadow-xl
        "
      >
        {/* Decorative circles */}

        <div
          className="
          absolute
          -right-16
          -top-16
          w-48
          h-48
          rounded-full
        "
        />

        <div
          className="
          absolute
          -left-20
          -bottom-20
          w-56
          h-56
          rounded-full
          bg-blue-500/20
        "
        />

        <div
          className="
          relative
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-5
        "
        >
          {/* Title */}

          <div className="flex items-center gap-4">
            <div
              className="
              w-14
              h-14
              md:w-16
              md:h-16
              rounded-2xl
              bg-blue-200
              flex
              items-center
              justify-center
              shadow-lg
              shrink-0
            "
            >
              <UserRound size={30} className="text-blue-900" />
            </div>

            <div>
              <p
                className="
                text-blue-200
                text-sm
              "
              >
                SAC
              </p>

              <h1
                className="
                text-2xl
                md:text-3xl
                font-black
                text-white
              "
              >
                Dashboard CS
              </h1>

              <p
                className="
                text-blue-100
                text-sm
                mt-1
              "
              >
                Kelola Antrian Nasabah
              </p>
            </div>
          </div>

          {/* User */}

          <div
            className="
            flex
            items-center
            justify-between
            md:justify-end
            gap-4
          "
          >
            <div
              className="
              text-left
              md:text-right
            "
            >
              <p
                className="
                text-blue-200
                text-xs
              "
              >
                Petugas
              </p>

              <p
                className="
                text-white
                font-bold
              "
              >
                {user?.username || '-'}
              </p>

              <p
                className="
                text-blue-200
                text-xs
                mt-1
              "
              >
                {formatTime(now)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="
                w-11
                h-11
                rounded-xl
                bg-white/10
                hover:bg-white/20
                text-white
                flex
                items-center
                justify-center
                transition
              "
              title="Refresh"
            >
              <RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <div
        className="
        grid
        grid-cols-2
        lg:grid-cols-3
        gap-4
        mt-6
      "
      >
        {/* Waiting */}

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
                Antrian Menunggu
              </p>

              <h2
                className="
                text-3xl
                font-black
                text-blue-900
                mt-1
              "
              >
                {queues.length}
              </h2>

              <p
                className="
                text-xs
                text-slate-400
                mt-1
              "
              >
                Nasabah
              </p>
            </div>

            <div
              className="
              w-12
              h-12
              rounded-xl
              bg-yellow-100
              flex
              items-center
              justify-center
            "
            >
              <Users size={23} className="text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Current */}

        <div
          data-aos="fade-up"
          data-aos-delay="150"
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
                Pelayanan Aktif
              </p>

              <h2
                className="
                text-2xl
                md:text-3xl
                font-black
                text-blue-900
                mt-1
              "
              >
                {current ? current.queue_number : '-'}
              </h2>

              <p
                className="
                text-xs
                text-slate-400
                mt-1
              "
              >
                {current ? current.customer_name : 'Belum ada'}
              </p>
            </div>

            <div
              className="
              w-12
              h-12
              rounded-xl
              bg-blue-100
              flex
              items-center
              justify-center
            "
            >
              <Ticket size={23} className="text-blue-700" />
            </div>
          </div>
        </div>

        {/* Status */}

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
                Status CS
              </p>

              <h2
                className={`
                text-xl
                md:text-2xl
                font-black
                mt-1
                ${current ? 'text-green-600' : 'text-slate-700'}
              `}
              >
                {current ? 'Sedang Melayani' : 'Siap Melayani'}
              </h2>

              <p
                className="
                text-xs
                text-slate-400
                mt-1
              "
              >
                {current ? '1 pelayanan aktif' : 'Belum mengambil nasabah'}
              </p>
            </div>

            <div
              className={`
              w-12
              h-12
              rounded-xl
              flex
              items-center
              justify-center
              ${current ? 'bg-green-100' : 'bg-slate-100'}
            `}
            >
              {current ? <CircleCheck size={23} className="text-green-600" /> : <UserRound size={23} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div
        className="
        grid
        grid-cols-1
        xl:grid-cols-5
        gap-6
        mt-7
      "
      >
        {/* =================================================
            WAITING QUEUES
        ================================================== */}

        <section
          data-aos="fade-right"
          className="
            xl:col-span-3
            bg-white
            rounded-2xl
            shadow-sm
            border
            border-slate-100
            overflow-hidden
          "
        >
          {/* Header */}

          <div
            className="
            px-5
            py-5
            border-b
            border-slate-100
          "
          >
            <div
              className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-3
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
                  w-11
                  h-11
                  rounded-xl
                  bg-yellow-100
                  flex
                  items-center
                  justify-center
                "
                >
                  <Clock3 size={23} className="text-yellow-600" />
                </div>

                <div>
                  <h2
                    className="
                    font-black
                    text-slate-800
                  "
                  >
                    Antrian Menunggu
                  </h2>

                  <p
                    className="
                    text-xs
                    text-slate-500
                    mt-1
                  "
                  >
                    Pilih nasabah untuk dilayani
                  </p>
                </div>
              </div>

              <div
                className="
                px-3
                py-1.5
                rounded-full
                bg-yellow-100
                text-yellow-700
                text-xs
                font-bold
                w-fit
              "
              >
                {queues.length} Nasabah
              </div>
            </div>
          </div>

          {/* Queue List */}

          <div className="p-5">
            {loadingQueues ? (
              <div
                className="
                py-12
                text-center
              "
              >
                <LoaderCircle
                  size={35}
                  className="
                    mx-auto
                    text-blue-900
                    animate-spin
                  "
                />

                <p
                  className="
                  text-sm
                  text-slate-500
                  mt-3
                "
                >
                  Memuat antrean...
                </p>
              </div>
            ) : queues.length === 0 ? (
              <div
                className="
                py-12
                text-center
              "
              >
                <CheckCircle2
                  size={45}
                  className="
                    mx-auto
                    text-green-400
                  "
                />

                <p
                  className="
                  font-bold
                  text-slate-700
                  mt-3
                "
                >
                  Tidak ada antrean
                </p>

                <p
                  className="
                  text-sm
                  text-slate-400
                  mt-1
                "
                >
                  Semua nasabah sudah diproses.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queues.map((q, index) => (
                  <div
                    key={q.id}
                    className="
                        group
                        border
                        border-slate-100
                        rounded-2xl
                        p-4
                        hover:border-blue-200
                        hover:bg-blue-50/30
                        transition
                      "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        sm:flex-row
                        sm:items-center
                        gap-4
                      "
                    >
                      {/* Number */}

                      <div
                        className="
                          flex
                          items-center
                          gap-3
                          flex-1
                          min-w-0
                        "
                      >
                        <div
                          className="
                            w-9
                            h-9
                            rounded-lg
                            bg-slate-100
                            flex
                            items-center
                            justify-center
                            text-xs
                            font-black
                            text-slate-500
                            shrink-0
                          "
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div
                            className="
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <p
                              className="
                                text-2xl
                                font-black
                                text-blue-900
                              "
                            >
                              {q.queue_number}
                            </p>

                            <span
                              className="
                                hidden
                                sm:inline-flex
                                items-center
                                gap-1
                                px-2
                                py-1
                                rounded-full
                                bg-yellow-50
                                text-yellow-700
                                text-[10px]
                                font-bold
                              "
                            >
                              <Clock3 size={10} />
                              Menunggu
                            </span>
                          </div>

                          <p
                            className="
                              font-semibold
                              text-slate-800
                              truncate
                            "
                          >
                            {q.customer_name}
                          </p>

                          <p
                            className="
                              text-xs
                              text-slate-400
                              mt-0.5
                            "
                          >
                            Masuk {q.created_at ? formatQueueTime(q.created_at) : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Button */}

                      <button
                        type="button"
                        onClick={() => takeQueue(q)}
                        disabled={!!current || takingQueue}
                        className="
                            w-full
                            sm:w-auto
                            px-5
                            py-3
                            rounded-xl
                            bg-blue-900
                            hover:bg-blue-800
                            disabled:bg-slate-300
                            disabled:cursor-not-allowed
                            text-white
                            font-bold
                            flex
                            items-center
                            justify-center
                            gap-2
                            transition
                            shrink-0
                          "
                      >
                        {takingQueue ? <LoaderCircle size={18} className="animate-spin" /> : <PlayCircle size={18} />}

                        {current ? 'Sedang Melayani' : 'Layani'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            ACTIVE SERVICE
        ================================================== */}

        <section
          data-aos="fade-left"
          className="
            xl:col-span-2
            bg-white
            rounded-2xl
            shadow-sm
            border
            border-slate-100
            overflow-hidden
            h-fit
          "
        >
          {/* Header */}

          <div
            className="
            px-5
            py-5
            border-b
            border-slate-100
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
                w-11
                h-11
                rounded-xl
                bg-blue-100
                flex
                items-center
                justify-center
              "
              >
                <Timer size={23} className="text-blue-700" />
              </div>

              <div>
                <h2
                  className="
                  font-black
                  text-slate-800
                "
                >
                  Pelayanan Aktif
                </h2>

                <p
                  className="
                  text-xs
                  text-slate-500
                  mt-1
                "
                >
                  Kelola nasabah yang sedang dilayani
                </p>
              </div>
            </div>
          </div>

          {/* Content */}

          <div className="p-5">
            {!current ? (
              <div
                className="
                py-10
                text-center
              "
              >
                <div
                  className="
                  w-16
                  h-16
                  mx-auto
                  rounded-2xl
                  bg-slate-100
                  flex
                  items-center
                  justify-center
                "
                >
                  <UserRound size={30} className="text-slate-300" />
                </div>

                <h3
                  className="
                  font-bold
                  text-slate-700
                  mt-4
                "
                >
                  Belum Ada Pelayanan
                </h3>

                <p
                  className="
                  text-sm
                  text-slate-400
                  mt-1
                "
                >
                  Silakan pilih nasabah dari daftar antrean.
                </p>
              </div>
            ) : (
              <div>
                {/* Queue Identity */}

                <div
                  className="
                  rounded-2xl
                  bg-blue-900
                  p-5
                  text-center
                  relative
                  overflow-hidden
                "
                >
                  <div
                    className="
                    absolute
                    -right-8
                    -top-8
                    w-24
                    h-24
                    rounded-full
                    bg-white/10
                  "
                  />

                  <div
                    className="
                    relative
                  "
                  >
                    <p
                      className="
                      text-blue-200
                      text-xs
                      uppercase
                      tracking-wider
                      font-semibold
                    "
                    >
                      Sedang Melayani
                    </p>

                    <h2
                      className="
                      text-5xl
                      md:text-6xl
                      font-black
                      text-white
                      mt-1
                    "
                    >
                      {current.queue_number}
                    </h2>

                    <p
                      className="
                      text-white
                      font-bold
                      text-lg
                      mt-2
                    "
                    >
                      {current.customer_name}
                    </p>
                  </div>
                </div>

                {/* Countdown */}

                {hasEstimate && (
                  <div
                    className={`
                    mt-5
                    rounded-2xl
                    p-5
                    text-center
                    ${isOvertime ? 'bg-red-50' : isAlmostDone ? 'bg-orange-50' : 'bg-slate-50'}
                  `}
                  >
                    <div
                      className="
                      flex
                      items-center
                      justify-center
                      gap-2
                    "
                    >
                      <Clock3 size={18} className={isOvertime || isAlmostDone ? 'text-red-500' : 'text-blue-700'} />

                      <span
                        className="
                        text-xs
                        uppercase
                        tracking-wider
                        font-bold
                        text-slate-500
                      "
                      >
                        {isOvertime ? 'Estimasi Habis' : 'Sisa Waktu'}
                      </span>
                    </div>

                    <div
                      className={`
                      text-4xl
                      md:text-5xl
                      font-black
                      mt-2
                      ${isOvertime ? 'text-red-600' : isAlmostDone ? 'text-orange-600' : 'text-blue-900'}
                    `}
                    >
                      {formatCountdown(remaining)}
                    </div>

                    {isOvertime && (
                      <div
                        className="
                        flex
                        items-center
                        justify-center
                        gap-1.5
                        text-red-600
                        text-xs
                        font-bold
                        mt-2
                      "
                      >
                        <AlertCircle size={14} />
                        Waktu estimasi telah habis
                      </div>
                    )}
                  </div>
                )}

                {/* Estimate */}

                <div className="mt-5">
                  <label
                    className="
                    block
                    text-sm
                    font-bold
                    text-slate-700
                    mb-2
                  "
                  >
                    Estimasi Waktu Pelayanan
                  </label>

                  <div
                    className="
                    relative
                  "
                  >
                    <Timer
                      size={18}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={estimate}
                      onChange={(e) => setEstimate(e.target.value)}
                      placeholder="Contoh: 10"
                      className="
                        w-full
                        border
                        border-slate-200
                        rounded-xl
                        pl-10
                        pr-20
                        py-3.5
                        outline-none
                        focus:border-blue-900
                        focus:ring-2
                        focus:ring-blue-900/10
                        transition
                      "
                    />

                    <span
                      className="
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-sm
                      text-slate-400
                      font-semibold
                    "
                    >
                      menit
                    </span>
                  </div>

                  <p
                    className="
                    text-xs
                    text-slate-400
                    mt-2
                  "
                  >
                    Masukkan perkiraan lama pelayanan nasabah.
                  </p>
                </div>

                {/* Progress */}

                {hasEstimate && (
                  <div className="mt-5">
                    <div
                      className="
                      flex
                      items-center
                      justify-between
                      mb-2
                    "
                    >
                      <span
                        className="
                        text-xs
                        font-semibold
                        text-slate-500
                      "
                      >
                        Progress pelayanan
                      </span>

                      <span
                        className="
                        text-xs
                        font-black
                        text-blue-900
                      "
                      >
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <div
                      className="
                      h-2.5
                      bg-slate-100
                      rounded-full
                      overflow-hidden
                    "
                    >
                      <div
                        className={`
                          h-full
                          rounded-full
                          transition-all
                          duration-1000
                          ${isOvertime || isAlmostDone ? 'bg-red-500' : 'bg-blue-900'}
                        `}
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Started */}

                <div
                  className="
                  flex
                  items-center
                  justify-between
                  mt-5
                  pt-4
                  border-t
                  border-slate-100
                "
                >
                  <div
                    className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    text-slate-500
                  "
                  >
                    <PlayCircle size={14} />
                    Mulai pelayanan
                  </div>

                  <span
                    className="
                    text-xs
                    font-bold
                    text-slate-700
                  "
                  >
                    {current.started_at ? formatQueueTime(current.started_at) : '-'}
                  </span>
                </div>

                {/* Buttons */}

                <div
                  className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-3
                  mt-5
                "
                >
                  <button
                    type="button"
                    onClick={saveEstimate}
                    disabled={savingEstimate || !estimate}
                    className="
                      py-3.5
                      rounded-xl
                      bg-yellow-400
                      hover:bg-yellow-300
                      disabled:bg-slate-200
                      disabled:text-slate-400
                      disabled:cursor-not-allowed
                      text-blue-900
                      font-bold
                      flex
                      items-center
                      justify-center
                      gap-2
                      transition
                    "
                  >
                    {savingEstimate ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}

                    {savingEstimate ? 'Menyimpan...' : hasEstimate ? 'Perbarui Estimasi' : 'Simpan Estimasi'}
                  </button>

                  <button
                    type="button"
                    onClick={finish}
                    disabled={finishing || !hasEstimate}
                    className="
                      py-3.5
                      rounded-xl
                      bg-green-600
                      hover:bg-green-500
                      disabled:bg-slate-200
                      disabled:text-slate-400
                      disabled:cursor-not-allowed
                      text-white
                      font-bold
                      flex
                      items-center
                      justify-center
                      gap-2
                      transition
                    "
                  >
                    {finishing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}

                    {finishing ? 'Menyelesaikan...' : 'Selesai'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =====================================================
          FOOTER INFO
      ====================================================== */}

      <div
        data-aos="fade-up"
        className="
          mt-6
          mb-4
          rounded-2xl
          bg-blue-50
          border
          border-blue-100
          p-4
        "
      >
        <div
          className="
          flex
          items-start
          gap-3
        "
        >
          <AlertCircle
            size={18}
            className="
              text-blue-700
              mt-0.5
              shrink-0
            "
          />

          <div>
            <p
              className="
              text-sm
              font-bold
              text-blue-900
            "
            >
              Informasi Pelayanan
            </p>

            <p
              className="
              text-xs
              text-blue-700
              mt-1
              leading-relaxed
            "
            >
              Setelah mengambil nasabah, masukkan estimasi waktu pelayanan. Data pelayanan akan diperbarui secara otomatis dan dapat dipantau oleh Security secara real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

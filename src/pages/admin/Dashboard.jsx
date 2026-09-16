import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Activity, Users, Clock, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, CalendarDays, TrendingUp } from 'lucide-react';

import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';

const TIME_ZONE = 'Asia/Jakarta';
const ITEMS_PER_PAGE = 10;

function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const result = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      result[part.type] = part.value;
    }
  });

  return result;
}

function getTodayKey() {
  const { year, month, day } = getJakartaDateParts();

  return `${year}-${month}-${day}`;
}

function getDateKey(date) {
  if (!date) return null;

  const { year, month, day } = getJakartaDateParts(new Date(date));

  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('id-ID', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date) {
  if (!date) return '-';

  return new Date(date).toLocaleTimeString('id-ID', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getJakartaHour(date) {
  if (!date) return null;

  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(date)),
  );
}

function getMonthKey(date) {
  if (!date) return null;

  const { year, month } = getJakartaDateParts(new Date(date));

  return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
  if (!monthKey) return '';

  const [year, month] = monthKey.split('-');

  return new Date(`${year}-${month}-01T00:00:00+07:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

function getCurrentMonthKey() {
  const { year, month } = getJakartaDateParts();

  return `${year}-${month}`;
}

function getLast7Days() {
  const result = [];

  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    result.push(date);
  }

  return result;
}

function getDaysInMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);

  return new Date(year, month, 0).getDate();
}

function getMonthDates(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = new Date(year, month, 0).getDate();

  const dates = [];

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`);

    dates.push(date);
  }

  return dates;
}

function StatCard({ title, value, subtitle, icon: Icon, iconClass = 'bg-blue-100 text-blue-700' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md" data-aos="fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-2 text-3xl font-bold text-slate-800">{value}</h3>

          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    waiting: {
      text: 'Menunggu',
      className: 'bg-amber-100 text-amber-700',
    },
    serving: {
      text: 'Dilayani',
      className: 'bg-blue-100 text-blue-700',
    },
    done: {
      text: 'Selesai',
      className: 'bg-emerald-100 text-emerald-700',
    },
  };

  const current = config[status] || {
    text: status || '-',
    className: 'bg-slate-100 text-slate-600',
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${current.className}`}>{current.text}</span>;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [queues, setQueues] = useState([]);
  const [csUsers, setCsUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [period, setPeriod] = useState('day');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    AOS.init({
      duration: 600,
      once: true,
    });
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-dashboard-queues')
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
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      await Promise.all([loadQueues(), loadCSUsers()]);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Data',
        text: error.message || 'Terjadi kesalahan.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadQueues() {
    const { data, error } = await supabase.from('queues').select('*').order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('loadQueues:', error);
      return;
    }

    setQueues(data || []);
  }

  async function loadCSUsers() {
    const { data, error } = await supabase.from('users').select('id, username, role').eq('role', 'cs').order('username', {
      ascending: true,
    });

    if (error) {
      console.error('loadCSUsers:', error);
      return;
    }

    setCsUsers(data || []);
  }

  async function refreshData() {
    setRefreshing(true);

    await Promise.all([loadQueues(), loadCSUsers()]);

    setRefreshing(false);

    Swal.fire({
      icon: 'success',
      title: 'Data diperbarui',
      timer: 1200,
      showConfirmButton: false,
    });
  }

  const csMap = useMemo(() => {
    const map = {};

    csUsers.forEach((cs) => {
      map[cs.id] = cs.username;
    });

    return map;
  }, [csUsers]);

  const todayKey = getTodayKey();

  const todayQueues = useMemo(() => {
    return queues.filter((queue) => {
      return getDateKey(queue.created_at) === todayKey;
    });
  }, [queues, todayKey]);

  const waitingCount = useMemo(() => {
    return todayQueues.filter((q) => q.status === 'waiting').length;
  }, [todayQueues]);

  const servingCount = useMemo(() => {
    return todayQueues.filter((q) => q.status === 'serving').length;
  }, [todayQueues]);

  const doneCount = useMemo(() => {
    return todayQueues.filter((q) => q.status === 'done').length;
  }, [todayQueues]);

  const totalToday = todayQueues.length;

  const totalSelectedMonth = useMemo(() => {
    return queues.filter((queue) => {
      return getMonthKey(queue.created_at) === selectedMonth;
    }).length;
  }, [queues, selectedMonth]);

  const chartData = useMemo(() => {
    if (period === 'day') {
      const hours = [];

      for (let hour = 8; hour <= 14; hour++) {
        const count = todayQueues.filter((queue) => {
          const queueHour = getJakartaHour(queue.created_at);

          return queueHour === hour;
        }).length;

        hours.push({
          label: `${String(hour).padStart(2, '0')}:00`,
          count,
        });
      }

      return hours;
    }

    if (period === 'week') {
      return getLast7Days().map((date) => {
        const key = getDateKey(date);

        const count = queues.filter((queue) => {
          return getDateKey(queue.created_at) === key;
        }).length;

        return {
          label: date.toLocaleDateString('id-ID', {
            timeZone: TIME_ZONE,
            day: '2-digit',
            month: 'short',
          }),
          count,
        };
      });
    }

    return getMonthDates(selectedMonth).map((date) => {
      const key = getDateKey(date);

      const count = queues.filter((queue) => {
        return getDateKey(queue.created_at) === key;
      }).length;

      return {
        label: date.toLocaleDateString('id-ID', {
          timeZone: TIME_ZONE,
          day: '2-digit',
        }),
        count,
      };
    });
  }, [period, todayQueues, queues, selectedMonth]);

  const monitoringQueues = useMemo(() => {
    return [...todayQueues].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [todayQueues]);

  const totalPages = Math.max(1, Math.ceil(monitoringQueues.length / ITEMS_PER_PAGE));

  const paginatedQueues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return monitoringQueues.slice(start, start + ITEMS_PER_PAGE);
  }, [monitoringQueues, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [period, selectedMonth]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function getTotalCardValue() {
    if (period === 'month') {
      return totalSelectedMonth;
    }

    return queues.length;
  }

  function getTotalCardSubtitle() {
    if (period === 'month') {
      return `Total ${getMonthLabel(selectedMonth)}`;
    }

    return 'Seluruh data antrean';
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

          <p className="mt-4 text-sm text-slate-500">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-aos="fade-down">
        <div>
          <p className="text-sm font-medium text-blue-700">Administrator</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-800">Dashboard Monitoring</h1>

          <p className="mt-1 text-sm text-slate-500">Monitoring sistem antrian Bank Mandiri Tanjung Enim</p>
        </div>

        <button
          onClick={refreshData}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b78] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d2f62] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />

          {refreshing ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Hari Ini" value={totalToday} subtitle={formatDate(new Date())} icon={Activity} iconClass="bg-blue-100 text-blue-700" />

        <StatCard title="Menunggu" value={waitingCount} subtitle="Antrean belum dilayani" icon={Clock} iconClass="bg-amber-100 text-amber-700" />

        <StatCard title="Sedang Dilayani" value={servingCount} subtitle="Antrean sedang diproses" icon={Users} iconClass="bg-indigo-100 text-indigo-700" />

        <StatCard title="Selesai Hari Ini" value={doneCount} subtitle="Antrean telah selesai" icon={CheckCircle2} iconClass="bg-emerald-100 text-emerald-700" />
      </div>

      {/* TOTAL ALL */}
      <div className="rounded-2xl bg-gradient-to-r from-[#123b78] via-[#0f356d] to-[#092b5c] p-6 text-white shadow-lg" data-aos="fade-up">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-blue-100">{period === 'month' ? 'Total Antrean Bulan Dipilih' : 'Total Seluruh Antrean'}</p>

            <h2 className="mt-2 text-4xl font-bold">{getTotalCardValue()}</h2>

            <p className="mt-1 text-sm text-blue-100">{getTotalCardSubtitle()}</p>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <TrendingUp size={27} />
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Grafik Antrean</h2>

            <p className="mt-1 text-sm text-slate-500">Klik titik grafik untuk melihat jumlah antrean.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button onClick={() => setPeriod('day')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${period === 'day' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Hari
              </button>

              <button onClick={() => setPeriod('week')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${period === 'week' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Minggu
              </button>

              <button onClick={() => setPeriod('month')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${period === 'month' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Bulan
              </button>
            </div>

            {period === 'month' && (
              <div className="relative">
                <CalendarDays size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
          </div>
        </div>

        <div className="h-[330px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: -10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                  }}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 12,
                  }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  formatter={(value) => [`${value} antrean`, 'Jumlah']}
                  labelFormatter={(label) => `Waktu: ${label}`}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#123b78"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    fill: '#ffffff',
                  }}
                  activeDot={{
                    r: 7,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">Belum ada data grafik.</div>
          )}
        </div>
      </div>

      {/* MONITORING */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-aos="fade-up">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Monitoring Antrean Hari Ini</h2>

            <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{monitoringQueues.length} data</span>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">No</th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Nomor</th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Nasabah</th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Waktu Masuk</th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">CS</th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Estimasi</th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>

            <tbody>
              {paginatedQueues.length > 0 ? (
                paginatedQueues.map((queue, index) => (
                  <tr key={queue.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-blue-700">{queue.queue_number}</span>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{queue.customer_name}</td>

                    <td className="px-5 py-4 text-sm text-slate-500">{formatTime(queue.created_at)}</td>

                    <td className="px-5 py-4 text-sm text-slate-500">{queue.cs_id ? csMap[queue.cs_id] || '-' : '-'}</td>

                    <td className="px-5 py-4 text-sm text-slate-500">{queue.estimated_time ? `${queue.estimated_time} menit` : '-'}</td>

                    <td className="px-5 py-4">
                      <StatusBadge status={queue.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-400">
                    Belum ada antrean hari ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE */}
        <div className="divide-y divide-slate-100 md:hidden">
          {paginatedQueues.length > 0 ? (
            paginatedQueues.map((queue, index) => (
              <div key={queue.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">#{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</p>

                    <p className="mt-1 text-xl font-bold text-blue-700">{queue.queue_number}</p>
                  </div>

                  <StatusBadge status={queue.status} />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">Nasabah</span>

                    <span className="text-right text-sm font-medium text-slate-700">{queue.customer_name}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">Waktu</span>

                    <span className="text-sm text-slate-600">{formatTime(queue.created_at)}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">CS</span>

                    <span className="text-sm text-slate-600">{queue.cs_id ? csMap[queue.cs_id] || '-' : '-'}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">Estimasi</span>

                    <span className="text-sm text-slate-600">{queue.estimated_time ? `${queue.estimated_time} menit` : '-'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-400">Belum ada antrean hari ini.</div>
          )}
        </div>

        {/* PAGINATION */}
        {monitoringQueues.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, monitoringQueues.length)}</span> dari <span className="font-semibold text-slate-700">{monitoringQueues.length}</span> data
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="min-w-[80px] text-center text-sm font-medium text-slate-600">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { formatDate, formatTime, getDateKey, getJakartaDateParts, getMonthKey, getWeekRange } from '../../utils/date';

import { Search, RefreshCw, ChevronLeft, ChevronRight, Filter, CalendarDays } from 'lucide-react';

import Swal from 'sweetalert2';

const ITEMS_PER_PAGE = 10;

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

export default function AllQueues() {
  const [queues, setQueues] = useState([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  async function loadQueues() {
    setLoading(true);

    const { data, error } = await supabase.from('queues').select('*').order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Data',
        text: error.message,
      });
    } else {
      setQueues(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadQueues();

    const channel = supabase.channel('admin-all-queues').on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, loadQueues).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function refreshData() {
    setRefreshing(true);

    try {
      await loadQueues();
    } catch (error) {
      console.error('Gagal memperbarui antrean:', error);
      Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: error.message || 'Terjadi kesalahan.' });
    } finally {
      setRefreshing(false);
    }
  }

  const filteredQueues = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const today = new Date();

    const todayKey = getDateKey(today);

    const todayParts = getJakartaDateParts(today);

    const currentMonth = `${todayParts.year}-${String(todayParts.month).padStart(2, '0')}`;

    const currentYear = String(todayParts.year);

    const weekRange = getWeekRange(today);

    return queues.filter((queue) => {

      const matchesSearch =
        !keyword ||
        String(queue.queue_number || '')
          .toLowerCase()
          .includes(keyword) ||
        String(queue.customer_name || '')
          .toLowerCase()
          .includes(keyword);

      const matchesStatus = statusFilter === 'all' || queue.status === statusFilter;

      const queueDateKey = getDateKey(queue.created_at);

      const queueMonth = getMonthKey(queue.created_at);

      const queueYear = queueMonth?.split('-')[0];

      let matchesPeriod = true;
      if (periodFilter === 'all') {
        matchesPeriod = true;
      }
      if (periodFilter === 'today') {
        matchesPeriod = queueDateKey === todayKey;
      }
      if (periodFilter === 'week') {
        matchesPeriod = queueDateKey >= weekRange.start && queueDateKey <= weekRange.end;
      }
      if (periodFilter === 'month') {
        matchesPeriod = queueMonth === currentMonth;
      }
      if (periodFilter === 'year') {
        matchesPeriod = queueYear === currentYear;
      }
      if (periodFilter === 'custom-month') {
        matchesPeriod = selectedMonth && queueMonth === selectedMonth;
      }
      if (periodFilter === 'custom-year') {
        matchesPeriod = selectedYear && queueYear === selectedYear;
      }

      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [queues, search, statusFilter, periodFilter, selectedMonth, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredQueues.length / ITEMS_PER_PAGE));

  const paginatedQueues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredQueues.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQueues, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, periodFilter, selectedMonth, selectedYear]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const yearOptions = useMemo(() => {
    const years = new Set();

    queues.forEach((queue) => {
      if (!queue.created_at) return;

      const dateParts = getJakartaDateParts(queue.created_at);

      if (!dateParts) return;

      years.add(dateParts.year);
    });
    const currentYear = getJakartaDateParts().year;

    years.add(currentYear);

    return [...years].sort((a, b) => b - a);
  }, [queues]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

          <p className="mt-4 text-sm text-slate-500">Memuat seluruh antrean...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-aos="fade-down">
        <div>
          <p className="text-sm font-medium text-blue-700">Data Antrean</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-800">Seluruh Antrean</h1>

          <p className="mt-1 text-sm text-slate-500">Riwayat seluruh antrean yang tersimpan di sistem.</p>
        </div>

        <button onClick={refreshData} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b78] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2f62] disabled:opacity-60">
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-aos="fade-up">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          

          <div className="relative lg:col-span-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor antrean atau nama nasabah..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          

          <div className="relative">
            <Filter size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm outline-none focus:border-blue-500">
              <option value="all">Semua Status</option>

              <option value="waiting">Menunggu</option>

              <option value="serving">Dilayani</option>

              <option value="done">Selesai</option>
            </select>
          </div>

          

          <div className="relative">
            <CalendarDays size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);

                if (e.target.value !== 'custom-month') {
                  setSelectedMonth('');
                }

                if (e.target.value !== 'custom-year') {
                  setSelectedYear('');
                }
              }}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">Semua Waktu</option>

              <option value="today">Hari Ini</option>

              <option value="week">Minggu Ini</option>

              <option value="month">Bulan Ini</option>

              <option value="year">Tahun Ini</option>

              <option value="custom-month">Pilih Bulan</option>

              <option value="custom-year">Pilih Tahun</option>
            </select>
          </div>
        </div>

        

        {periodFilter === 'custom-month' && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-slate-600">Pilih Bulan:</label>

            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
        )}

        

        {periodFilter === 'custom-year' && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-slate-600">Pilih Tahun:</label>

            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Pilih Tahun</option>

              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-aos="fade-up">
        

        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold text-slate-800">Data Antrean</h2>

            <p className="mt-1 text-xs text-slate-500">{filteredQueues.length} data ditemukan</p>
          </div>
        </div>

        

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">No</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Nomor</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Nasabah</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Tanggal</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Waktu Masuk</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Status</th>
              </tr>
            </thead>

            <tbody>
              {paginatedQueues.length > 0 ? (
                paginatedQueues.map((queue, index) => (
                  <tr key={queue.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>

                    <td className="px-5 py-4 font-bold text-blue-700">{queue.queue_number}</td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{queue.customer_name}</td>

                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(queue.created_at)}</td>

                    <td className="px-5 py-4 text-sm text-slate-500">{formatTime(queue.created_at)}</td>

                    <td className="px-5 py-4">
                      <StatusBadge status={queue.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-sm text-slate-400">
                    Tidak ada data yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        

        <div className="divide-y divide-slate-100 md:hidden">
          {paginatedQueues.length > 0 ? (
            paginatedQueues.map((queue, index) => (
              <div key={queue.id} className="p-5">
                <div className="flex items-start justify-between">
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

                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Tanggal</span>

                    <span className="text-sm text-slate-600">{formatDate(queue.created_at)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Waktu</span>

                    <span className="text-sm text-slate-600">{formatTime(queue.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-slate-400">Tidak ada data.</div>
          )}
        </div>

        

        {filteredQueues.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Halaman {currentPage} dari {totalPages}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="px-2 text-sm text-slate-600">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
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

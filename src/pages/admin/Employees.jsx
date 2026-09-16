import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

import { Users, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';

import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';

function RoleBadge({ role }) {
  const config = {
    security: {
      text: 'Security',
      className: 'bg-amber-100 text-amber-700',
    },
    cs: {
      text: 'Customer Service',
      className: 'bg-blue-100 text-blue-700',
    },
    admin: {
      text: 'Admin',
      className: 'bg-purple-100 text-purple-700',
    },
  };

  const current = config[role] || {
    text: role || '-',
    className: 'bg-slate-100 text-slate-600',
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${current.className}`}>{current.text}</span>;
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 600,
      once: true,
    });

    loadEmployees();

    const channel = supabase
      .channel('admin-employees')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        () => {
          loadEmployees();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadEmployees() {
    setLoading(true);

    const { data, error } = await supabase
      .from('users')
      .select('id, username, role')
      .order('role', {
        ascending: true,
      })
      .order('username', {
        ascending: true,
      });

    if (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Pegawai',
        text: error.message,
      });
    } else {
      setEmployees(data || []);
    }

    setLoading(false);
  }

  async function refreshData() {
    setRefreshing(true);

    await loadEmployees();

    setRefreshing(false);
  }

  const securityCount = employees.filter((employee) => employee.role === 'security').length;

  const csCount = employees.filter((employee) => employee.role === 'cs').length;

  const adminCount = employees.filter((employee) => employee.role === 'admin').length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

          <p className="mt-4 text-sm text-slate-500">Memuat data pegawai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-aos="fade-down">
        <div>
          <p className="text-sm font-medium text-blue-700">Manajemen Pengguna</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-800">Pegawai</h1>

          <p className="mt-1 text-sm text-slate-500">Daftar akun pegawai yang dapat mengakses sistem.</p>
        </div>

        <button onClick={refreshData} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b78] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2f62] disabled:opacity-60">
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ShieldCheck size={21} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Security</p>

              <p className="text-2xl font-bold text-slate-800">{securityCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <UserRound size={21} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Customer Service</p>

              <p className="text-2xl font-bold text-slate-800">{csCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Users size={21} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Admin</p>

              <p className="text-2xl font-bold text-slate-800">{adminCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-aos="fade-up">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-bold text-slate-800">Daftar Pegawai</h2>

          <p className="mt-1 text-xs text-slate-500">Total {employees.length} akun</p>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">No</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Username</th>

                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Role</th>
              </tr>
            </thead>

            <tbody>
              {employees.length > 0 ? (
                employees.map((employee, index) => (
                  <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-500">{index + 1}</td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                          <UserRound size={17} />
                        </div>

                        <span className="text-sm font-semibold text-slate-700">{employee.username}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <RoleBadge role={employee.role} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-5 py-12 text-center text-sm text-slate-400">
                    Belum ada data pegawai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE */}
        <div className="divide-y divide-slate-100 md:hidden">
          {employees.length > 0 ? (
            employees.map((employee, index) => (
              <div key={employee.id} className="flex items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <UserRound size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">#{index + 1}</p>

                    <p className="text-sm font-semibold text-slate-700">{employee.username}</p>
                  </div>
                </div>

                <RoleBadge role={employee.role} />
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-slate-400">Belum ada data pegawai.</div>
          )}
        </div>
      </div>
    </div>
  );
}

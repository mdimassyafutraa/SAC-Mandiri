import { useEffect, useState } from 'react';
import { CheckCircle2, Phone, RefreshCw, Ticket, UserRound } from 'lucide-react';
import Swal from 'sweetalert2';

import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatTime, getJakartaStartIso } from '../../utils/date';

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [queues, setQueues] = useState([]);
  const [calledQueue, setCalledQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [callingId, setCallingId] = useState(null);
  const [finishing, setFinishing] = useState(false);

  async function loadQueues() {
    setLoading(true);

    try {
      const { data, error } = await supabase.from('queues').select('*').gte('created_at', getJakartaStartIso()).order('created_at', { ascending: true });

      if (error) throw error;

      const loadedQueues = data || [];
      setQueues(loadedQueues);
      setCalledQueue(loadedQueues.find((queue) => queue.status === 'serving') || null);
    } catch (error) {
      console.error('Gagal mengambil antrean:', error);
      Swal.fire({ icon: 'error', title: 'Gagal Memuat Antrean', text: error.message || 'Terjadi kesalahan saat memuat antrean.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueues();

    const channel = supabase.channel('security-queues-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, loadQueues).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function generateQueueNumber() {
    const { data, error } = await supabase.from('queues').select('queue_number').gte('created_at', getJakartaStartIso()).order('created_at', { ascending: false }).limit(1);

    if (error) throw error;

    const match = String(data?.[0]?.queue_number || '').match(/(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `A${String(nextNumber).padStart(3, '0')}`;
  }

  async function createQueue(event) {
    event.preventDefault();
    const customerName = name.trim();

    if (!customerName) {
      Swal.fire({ icon: 'warning', title: 'Nama Belum Diisi', text: 'Masukkan nama nasabah terlebih dahulu.' });
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('queues')
        .insert({
          queue_number: await generateQueueNumber(),
          customer_name: customerName,
          status: 'waiting',
          security_id: user?.id || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setName('');
      await loadQueues();
      Swal.fire({ icon: 'success', title: 'Nomor Berhasil Diambil', text: `${data.queue_number} untuk ${data.customer_name}`, confirmButtonColor: '#0b57d0' });
    } catch (error) {
      console.error('Gagal membuat antrean:', error);
      Swal.fire({ icon: 'error', title: 'Gagal Mengambil Nomor', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function callQueue(queue) {
    if (calledQueue && calledQueue.id !== queue.id) {
      Swal.fire({ icon: 'warning', title: 'Masih Ada Nasabah Dipanggil', text: `Selesaikan panggilan ${calledQueue.queue_number} terlebih dahulu.` });
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Panggil Nasabah?',
      text: `${queue.queue_number} - ${queue.customer_name}`,
      showCancelButton: true,
      confirmButtonText: 'Panggil',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0b57d0',
    });

    if (!confirmation.isConfirmed) return;

    setCallingId(queue.id);

    try {
      const { data, error } = await supabase
        .from('queues')
        .update({ status: 'serving', started_at: new Date().toISOString(), security_id: user?.id || null })
        .eq('id', queue.id)
        .eq('status', 'waiting')
        .select()
        .single();

      if (error) {
        Swal.fire({ icon: 'error', title: 'Gagal Memanggil', text: 'Antrean mungkin sudah dipanggil petugas lain.' });
        await loadQueues();
        return;
      }

      setCalledQueue(data);
      await loadQueues();
      Swal.fire({ icon: 'success', title: 'Nasabah Dipanggil', text: `${data.queue_number} - ${data.customer_name}`, timer: 1800, showConfirmButton: false });
    } catch (error) {
      console.error('Gagal memanggil nasabah:', error);
      Swal.fire({ icon: 'error', title: 'Gagal Memanggil', text: error.message || 'Terjadi kesalahan saat memanggil nasabah.' });
      await loadQueues();
    } finally {
      setCallingId(null);
    }
  }

  async function finishQueue() {
    if (!calledQueue || finishing) return;

    setFinishing(true);

    try {
      const { error } = await supabase.from('queues').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', calledQueue.id).eq('status', 'serving');

      if (error) throw error;

      setCalledQueue(null);
      await loadQueues();
    } catch (error) {
      console.error('Gagal menyelesaikan antrean:', error);
      Swal.fire({ icon: 'error', title: 'Gagal Menyelesaikan', text: error.message || 'Terjadi kesalahan saat menyelesaikan antrean.' });
    } finally {
      setFinishing(false);
    }
  }

  const waitingQueues = queues.filter((queue) => queue.status === 'waiting');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Bedebis</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">Antrean Nasabah</h1>
        </div>
        <div className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:block">Petugas Security</div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border-2 border-blue-100 bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.10)] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-50" />
        <div className="relative">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Ticket size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Mulai dari sini</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">Ambil Nomor Antrian</h2>
                <p className="mt-1 text-sm text-slate-500">Masukkan nama nasabah untuk membuat antrean baru.</p>
              </div>
            </div>
          </div>
          <form onSubmit={createQueue} className="space-y-4">
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
              <UserRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama lengkap nasabah"
                autoComplete="off"
                maxLength={80}
                className="h-14 w-full bg-transparent pl-12 pr-16 text-base font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                aria-label="Nama lengkap nasabah"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums text-slate-400">{name.length}/80</span>
            </div>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <RefreshCw size={19} className="animate-spin" /> : <Ticket size={19} className="transition-transform group-hover:scale-110" />} {saving ? 'Membuat Nomor...' : 'Ambil Nomor Sekarang'}
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-slate-400">Tekan Enter setelah nama nasabah diisi</p>
        </div>
      </section>

      {calledQueue && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 size={22} />
            <div>
              <p className="text-sm font-semibold">Sedang Dipanggil</p>
              <p className="text-xl font-black">
                {calledQueue.queue_number} - {calledQueue.customer_name}
              </p>
            </div>
            <button onClick={finishQueue} disabled={finishing} className="ml-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {finishing ? 'Menyimpan...' : 'Selesai'}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold text-slate-800">Antrian Menunggu</h2>
            <p className="text-sm text-slate-500">{waitingQueues.length} nasabah</p>
          </div>
          <button onClick={loadQueues} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Refresh antrean">
            <RefreshCw size={18} />
          </button>
        </div>
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-400">Memuat antrean...</p>
        ) : waitingQueues.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">Tidak ada antrean menunggu.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {waitingQueues.map((queue) => (
              <div key={queue.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-14 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700">{queue.queue_number}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{queue.customer_name}</p>
                    <p className="text-xs text-slate-400">Diambil pukul {formatTime(queue.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => callQueue(queue)}
                  disabled={callingId !== null || calledQueue !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Phone size={16} /> Panggil
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

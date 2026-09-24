// Node 24+: use the production verification path. Default is read-only.
import { verifyWahaSession, deliverWhatsApp } from '../lib/whatsapp-provider.ts';
try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--send') || args.length > 1) throw new Error('Gunakan tanpa opsi untuk verifikasi, atau --send untuk satu pesan uji.');
  const env = { ...process.env, WHATSAPP_PROVIDER: 'waha' };
  if (!args.includes('--send')) {
    await verifyWahaSession(env);
    console.log('Identitas bot WAHA terverifikasi. Tidak ada pesan yang dikirim.');
  } else {
    if (!process.env.WAHA_TEST_RECIPIENT) throw new Error('Isi WAHA_TEST_RECIPIENT untuk mengirim satu pesan uji.');
    await deliverWhatsApp(env, process.env.WAHA_TEST_RECIPIENT, 'Uji coba SIBUKTAMU: koneksi notifikasi WhatsApp ke admin. Pesan ini tidak berisi data tamu.');
    console.log('Satu pesan uji diterima WAHA. Konfirmasikan penerimaan pada HP admin.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Uji WAHA gagal.');
  process.exitCode = 1;
}

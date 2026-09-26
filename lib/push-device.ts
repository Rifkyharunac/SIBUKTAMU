/** Reconcile a browser subscription with the current server key before saving it. */
export async function syncPushSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
  save: (subscription: PushSubscriptionJSON) => Promise<unknown>,
  create = false,
) {
  const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const current = subscription.options.applicationServerKey;
    const matches = current && current.byteLength === key.byteLength && new Uint8Array(current).every((byte, index) => byte === key[index]);
    const expired = subscription.expirationTime !== null && subscription.expirationTime <= Date.now();
    if (!matches || expired) {
      if (!await subscription.unsubscribe()) throw new Error('Langganan lama belum dapat diperbarui. Coba kembali.');
      subscription = null;
      create = true;
    }
  }
  if (!subscription && create) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  if (subscription) await save(subscription.toJSON());
  return subscription;
}

export async function readyAdminWorker() {
  await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/', updateViaCache: 'none' });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Aplikasi belum siap. Muat ulang lalu coba kembali.')), 10000); }),
    ]);
  } finally { clearTimeout(timeout); }
}

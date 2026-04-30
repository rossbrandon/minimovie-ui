import { toast } from '@components/starwind/toast/toast-manager';

export async function checkAndShowAchievementToast(): Promise<void> {
  let names: string[] = [];
  try {
    const res = await fetch('/api/achievements/unseen');
    if (!res.ok) return;
    const data = await res.json();
    names = (data.achievements || []).map((a: { name: string }) => a.name);
  } catch {
    return;
  }

  if (names.length === 0) return;

  const message =
    names.length === 1
      ? `Badge earned: ${names[0]}`
      : `${names.length} new badges earned!`;
  const description =
    names.length > 1 ? names.join(', ') : 'Tap to view your badges.';

  const toastId = toast.success(message, { description, duration: 10000 });

  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-toast-id="${toastId}"]`);
    if (el) {
      (el as HTMLElement).style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-slot="toast-close"]'))
          return;
        window.location.href = '/profile/stats';
      });
    }
  });

  fetch('/api/achievements/seen', { method: 'PATCH' }).catch(() => {});
}

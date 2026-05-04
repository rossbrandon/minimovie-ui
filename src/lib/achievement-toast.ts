import { toast } from '@components/starwind/toast/toast-manager';

import { fetchUnseenAchievements, markAchievementsSeen } from './user-api';

async function checkAndShowAchievementToast(): Promise<void> {
  let names: string[] = [];
  try {
    const data = await fetchUnseenAchievements();
    names = data.achievements.map((a) => a.name);
  } catch {
    return;
  }

  if (names.length === 0) {
    return;
  }

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

  markAchievementsSeen().catch(() => {});
}

export { checkAndShowAchievementToast };

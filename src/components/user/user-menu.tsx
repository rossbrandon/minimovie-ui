import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/solid';
import { checkAndShowAchievementToast } from '@lib/achievement-toast';
import { clearAuthMarker, isMarkedAuthed } from '@lib/auth-marker';
import { fetchSession } from '@lib/user-api';
import {
  IconBookmark,
  IconChartBar,
  IconLogout,
  IconUser,
} from '@tabler/icons-solidjs';
import { type Component, createEffect, createResource, Show } from 'solid-js';

const PROTECTED_PREFIXES = ['/profile', '/watchlist'];

const loadSession = async () => {
  const data = await fetchSession();
  if (!data) {
    // Session is gone: clear the marker cookie
    clearAuthMarker();
  }
  return data;
};

const logout = (): void => {
  const path = window.location.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/auth/logout';

  if (!isProtected) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'returnTo';
    input.value = path;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
};

const UserMenu: Component = () => {
  if (!isMarkedAuthed()) {
    return null;
  }

  const [session] = createResource(loadSession);

  // Once the session resolves, preload the avatar image. The dropdown stays
  // hidden until *this* resolves so the trigger never paints with a fallback
  // glyph and then swap-flickers to the loaded image.
  const [ready] = createResource(session, async (s) => {
    if (!s.user.avatarUrl) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(true);
      img.src = s.user.avatarUrl!;
    });
  });

  // Fire the achievement toast once when the session loads with unseen badges
  createEffect(() => {
    const s = session();
    if (!s || s.unseenAchievementCount === 0) {
      return;
    }
    if (document.body.dataset.achievementShown === 'true') {
      return;
    }
    document.body.dataset.achievementShown = 'true';
    checkAndShowAchievementToast();
  });

  // Hold off rendering until the session AND avatar image are both ready —
  // the Astro skeleton stays visible the whole time. This guarantees a single
  // skeleton-to-avatar transition with no intermediate "?" flash.
  return (
    <Show when={ready() && session()}>
      {(s) => {
        const givenName = () => s().user.givenName;
        const avatarUrl = () => s().user.avatarUrl;
        const initial = () => (givenName()?.charAt(0) ?? '?').toUpperCase();

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              class="focus-visible:outline-foreground inline-flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="User menu"
            >
              <Avatar size="sm">
                <Show when={avatarUrl()}>
                  <AvatarImage
                    src={avatarUrl()!}
                    alt={givenName() ?? 'User avatar'}
                  />
                </Show>
                <AvatarFallback class="bg-amber-500 text-white">
                  {initial()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="min-w-50" placement="bottom-end">
              <DropdownMenuLabel>{givenName() || 'Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem as="a" href="/watchlist">
                <IconBookmark /> My Watchlist
              </DropdownMenuItem>
              <DropdownMenuItem as="a" href="/profile/stats">
                <IconChartBar /> Stats &amp; Badges
              </DropdownMenuItem>
              <DropdownMenuItem as="a" href="/profile">
                <IconUser /> Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout}>
                <IconLogout /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }}
    </Show>
  );
};

export { UserMenu };

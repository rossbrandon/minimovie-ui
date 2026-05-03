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

  const avatarUrl = () => session()?.user.avatarUrl ?? null;
  const givenName = () => session()?.user.givenName ?? null;
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
};

export { UserMenu };

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/solid';
import { clearAuthMarker, isMarkedAuthed } from '@lib/auth-marker';
import { fetchSession } from '@lib/user-api';
import {
  IconBookmark,
  IconChartBar,
  IconLogout,
  IconUser,
} from '@tabler/icons-solidjs';
import { type Component, createSignal, onMount, Show } from 'solid-js';

const PROTECTED_PREFIXES = ['/profile', '/watchlist'];
const USER_DATA_CACHE_KEY = 'mm_user_data_v1';

interface UserDataCache {
  givenName: string | null;
  avatarUrl: string | null;
}

const readCachedUserData = (): UserDataCache | null => {
  try {
    const raw = sessionStorage.getItem(USER_DATA_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserDataCache) : null;
  } catch {
    return null;
  }
};

const writeCachedUserData = (data: UserDataCache | null): void => {
  try {
    if (data) {
      sessionStorage.setItem(USER_DATA_CACHE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(USER_DATA_CACHE_KEY);
    }
  } catch {
    // Storage unavailable (private mode, quota); degrade silently.
  }
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

  const [userData, setUserData] = createSignal<UserDataCache | undefined>(
    readCachedUserData() ?? undefined
  );

  onMount(async () => {
    // Cache hit: trust session for the lifetime of the tab
    if (readCachedUserData()) {
      return;
    }

    try {
      const session = await fetchSession();
      if (!session) {
        clearAuthMarker();
        writeCachedUserData(null);
        return;
      }

      const next: UserDataCache = {
        givenName: session.user.givenName,
        avatarUrl: session.user.avatarUrl,
      };
      setUserData(next);
      writeCachedUserData(next);
    } catch {
      // Network failure: keep whatever cached user data we have
    }
  });

  return (
    <Show when={userData()}>
      {(data) => {
        const initial = () =>
          (data().givenName?.charAt(0) ?? '?').toUpperCase();

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              class="focus-visible:outline-foreground hover:bg-foreground/15 data-[expanded]:bg-foreground/15 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="User menu"
            >
              <Avatar size="sm">
                <Show when={data().avatarUrl}>
                  <AvatarImage
                    src={data().avatarUrl!}
                    alt={data().givenName ?? 'User avatar'}
                  />
                </Show>
                <AvatarFallback class="bg-amber-500 text-white">
                  {initial()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="min-w-50" placement="bottom-end">
              <DropdownMenuItem as="a" href="/watchlist" class="font-medium">
                {data().givenName || 'Account'}
              </DropdownMenuItem>
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

/// <reference path="../.astro/types.d.ts" />

interface MiniMovieUser {
  id: string;
  username: string | null;
  givenName: string | null;
  avatarUrl: string | null;
}

declare namespace App {
  interface Locals {
    user: MiniMovieUser | null;
    unseenAchievementCount: number;
    timezone: string | null;
  }
}

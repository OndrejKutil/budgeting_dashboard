import type { ProfileData } from '@/lib/api/types';

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export function getProfileAvatarUrl(profile: ProfileData | null | undefined): string | undefined {
  const metadata = profile?.user_metadata;
  const directUrl = firstString(
    metadata?.avatar_url,
    metadata?.picture,
    metadata?.photo_url,
  );

  if (directUrl) return directUrl;

  return profile?.identities
    ?.map((identity) => identity.identity_data)
    .map((identityData) => firstString(
      identityData?.avatar_url,
      identityData?.picture,
      identityData?.photo_url,
    ))
    .find(Boolean);
}

// Central affiliate/referral layer. Every outbound booking link passes through
// monetise(), which injects partner IDs when the matching env var is configured.
// No IDs configured → links pass through unchanged, so this is safe to ship
// before any affiliate program is approved.
//
// All vars are NEXT_PUBLIC_ because links are built client-side (inlined at build
// time — redeploy after changing them in Vercel).
//
// Program → env var → where to sign up: see MONETISATION.md at the repo root.

const env = (v: string | undefined) => (v || '').trim();

export const AFFILIATE_IDS = {
  // Booking.com Affiliate Partner Programme — "aid" (affiliate id)
  bookingAid: env(process.env.NEXT_PUBLIC_BOOKING_AID),
  // Agoda Partners — "cid" (channel id)
  agodaCid: env(process.env.NEXT_PUBLIC_AGODA_CID),
  // Expedia Group Affiliate Program (Partnerize) — "camref" click ref
  expediaCamref: env(process.env.NEXT_PUBLIC_EXPEDIA_CAMREF),
  // Hotels.com via the same Partnerize program — its own camref
  hotelsComCamref: env(process.env.NEXT_PUBLIC_HOTELSCOM_CAMREF),
  // Kiwi.com (Tequila) affiliate — "affilid"
  kiwiAffilid: env(process.env.NEXT_PUBLIC_KIWI_AFFILID),
  // Skyscanner Partner Network — "associateid"
  skyscannerAssociateId: env(process.env.NEXT_PUBLIC_SKYSCANNER_ASSOCIATEID),
};

const setParam = (url: URL, key: string, value: string) => {
  if (value) url.searchParams.set(key, value);
  return url.toString();
};

/**
 * Inject the configured affiliate ID for the link's destination.
 * Unknown hosts and unconfigured programs return the URL unchanged.
 */
export function monetise(rawUrl: string): string {
  if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host.endsWith('booking.com')) return setParam(url, 'aid', AFFILIATE_IDS.bookingAid);
    if (host.endsWith('agoda.com')) return setParam(url, 'cid', AFFILIATE_IDS.agodaCid);
    if (host.endsWith('kiwi.com')) return setParam(url, 'affilid', AFFILIATE_IDS.kiwiAffilid);
    if (host.includes('skyscanner')) return setParam(url, 'associateid', AFFILIATE_IDS.skyscannerAssociateId);

    // Expedia/Hotels.com run on Partnerize: the tracked link wraps the destination.
    if (host.endsWith('expedia.com') && AFFILIATE_IDS.expediaCamref) {
      return `https://prf.hn/click/camref:${AFFILIATE_IDS.expediaCamref}/destination:${encodeURIComponent(rawUrl)}`;
    }
    if (host.endsWith('hotels.com') && AFFILIATE_IDS.hotelsComCamref) {
      return `https://prf.hn/click/camref:${AFFILIATE_IDS.hotelsComCamref}/destination:${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

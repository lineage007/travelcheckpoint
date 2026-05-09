import { NextRequest, NextResponse } from 'next/server';
import { addDaysToIsoDate, clampInt, safeIsoDate } from '@/lib/travel-utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get('city') || 'London').trim().slice(0, 80);
  const checkin = safeIsoDate(searchParams.get('checkin'), 7);
  const checkout = safeIsoDate(searchParams.get('checkout'), 10);
  const normalizedCheckout = checkout <= checkin ? addDaysToIsoDate(checkin, 3) : checkout;
  const adults = String(clampInt(searchParams.get('adults'), 2, 1, 9));

  const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${normalizedCheckout}&group_adults=${adults}`;
  const expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${checkin}&endDate=${normalizedCheckout}&adults=${adults}`;
  const agodaUrl = `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${checkin}&checkOut=${normalizedCheckout}`;
  const airbnbUrl = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${checkin}&checkout=${normalizedCheckout}&adults=${adults}`;
  const hotelsUrl = `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(city)}&q-check-in=${checkin}&q-check-out=${normalizedCheckout}&q-rooms=1&q-room-0-adults=${adults}`;

  return NextResponse.json({
    deepLinks: {
      booking: { url: bookingUrl, name: 'Booking.com', color: '#003580' },
      expedia: { url: expediaUrl, name: 'Expedia', color: '#00355F' },
      agoda: { url: agodaUrl, name: 'Agoda', color: '#5392F9' },
      airbnb: { url: airbnbUrl, name: 'Airbnb', color: '#FF5A5F' },
      hotels: { url: hotelsUrl, name: 'Hotels.com', color: '#D32F2F' },
    },
    city,
    checkin,
    checkout: normalizedCheckout,
  });
}

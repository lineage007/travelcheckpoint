import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'London';
  const checkin = searchParams.get('checkin') || '';
  const checkout = searchParams.get('checkout') || '';
  const adults = searchParams.get('adults') || '2';

  const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}`;
  const expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${checkin}&endDate=${checkout}&adults=${adults}`;
  const agodaUrl = `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${checkin}&checkOut=${checkout}`;
  const airbnbUrl = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${checkin}&checkout=${checkout}&adults=${adults}`;
  const hotelsUrl = `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(city)}&q-check-in=${checkin}&q-check-out=${checkout}&q-rooms=1&q-room-0-adults=${adults}`;

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
    checkout,
  });
}

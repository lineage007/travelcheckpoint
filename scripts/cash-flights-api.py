#!/usr/bin/env python3
"""Local cash flight search API using fast-flights (Google Flights)"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
from fast_flights import FlightData, Passengers, get_flights

class FlightHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        if parsed.path != '/search':
            self.send_response(404)
            self.end_headers()
            return
        
        origin = params.get('origin', ['DXB'])[0]
        destination = params.get('destination', ['LHR'])[0]
        date = params.get('date', ['2026-04-05'])[0]
        cabin = params.get('cabin', ['business'])[0]
        adults = int(params.get('adults', ['1'])[0])
        
        try:
            result = get_flights(
                flight_data=[FlightData(date=date, from_airport=origin, to_airport=destination)],
                trip="one-way",
                passengers=Passengers(adults=adults),
                seat=cabin,
                fetch_mode="fallback"
            )
            
            flights = []
            for f in result.flights:
                price_str = f.price.replace('\xa0', ' ').strip() if f.price else ''
                flights.append({
                    'name': f.name or '',
                    'departure': f.departure or '',
                    'arrival': f.arrival or '',
                    'duration': f.duration or '',
                    'stops': f.stops or 'Unknown',
                    'price': price_str,
                    'is_best': f.is_best,
                    'delay': f.delay,
                    'arrival_time_ahead': f.arrival_time_ahead or '',
                })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'query': {'origin': origin, 'destination': destination, 'date': date, 'cabin': cabin, 'adults': adults},
                'flights': flights,
                'count': len(flights),
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def log_message(self, format, *args):
        print(f"[cash-flights] {args[0]}")

if __name__ == '__main__':
    port = 7340
    server = HTTPServer(('127.0.0.1', port), FlightHandler)
    print(f"Cash flights API running on http://127.0.0.1:{port}/search")
    server.serve_forever()

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';

const PASSPORTS = [
  { code: 'TR', name: 'Turkey' }, { code: 'AU', name: 'Australia' }, { code: 'AE', name: 'UAE' },
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }, { code: 'IN', name: 'India' }, { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' }, { code: 'MY', name: 'Malaysia' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'CA', name: 'Canada' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'QA', name: 'Qatar' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' }, { code: 'EG', name: 'Egypt' }, { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' }, { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' }, { code: 'NL', name: 'Netherlands' },
];

const HOME_AIRPORTS = [
  { code: 'DXB', name: 'Dubai' }, { code: 'AUH', name: 'Abu Dhabi' }, { code: 'SYD', name: 'Sydney' },
  { code: 'MEL', name: 'Melbourne' }, { code: 'LHR', name: 'London' }, { code: 'JFK', name: 'New York' },
  { code: 'SIN', name: 'Singapore' }, { code: 'IST', name: 'Istanbul' }, { code: 'DOH', name: 'Doha' },
  { code: 'CDG', name: 'Paris' }, { code: 'FRA', name: 'Frankfurt' }, { code: 'LAX', name: 'Los Angeles' },
  { code: 'BKK', name: 'Bangkok' }, { code: 'KUL', name: 'Kuala Lumpur' }, { code: 'NRT', name: 'Tokyo' },
  { code: 'HKG', name: 'Hong Kong' }, { code: 'DEL', name: 'Delhi' }, { code: 'BOM', name: 'Mumbai' },
];

const LOYALTY_PROGRAMS = [
  { id: 'emirates', name: 'Emirates Skywards', type: 'airline' },
  { id: 'etihad', name: 'Etihad Guest', type: 'airline' },
  { id: 'qantas', name: 'Qantas Frequent Flyer', type: 'airline' },
  { id: 'singapore', name: 'KrisFlyer', type: 'airline' },
  { id: 'british', name: 'BA Executive Club', type: 'airline' },
  { id: 'turkish', name: 'Miles&Smiles', type: 'airline' },
  { id: 'united', name: 'United MileagePlus', type: 'airline' },
  { id: 'american', name: 'AAdvantage', type: 'airline' },
  { id: 'delta', name: 'Delta SkyMiles', type: 'airline' },
  { id: 'hilton', name: 'Hilton Honors', type: 'hotel' },
  { id: 'marriott', name: 'Marriott Bonvoy', type: 'hotel' },
  { id: 'ihg', name: 'IHG One Rewards', type: 'hotel' },
  { id: 'hyatt', name: 'World of Hyatt', type: 'hotel' },
  { id: 'amex', name: 'Amex Membership Rewards', type: 'card' },
  { id: 'chase', name: 'Chase Ultimate Rewards', type: 'card' },
  { id: 'citi', name: 'Citi ThankYou', type: 'card' },
];

const COLORS = { bg: '#FAFAF7', card: '#F5F3EE', border: '#E8E3DB', accent: '#0D7C72', text: '#1A1714', sub: '#9C958C' };

export default function SettingsPage() {
  const router = useRouter();
  const [passport, setPassport] = useState('TR');
  const [homeAirport, setHomeAirport] = useState('DXB');
  const [cabin, setCabin] = useState('business');
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPassport(localStorage.getItem('tc_passport') || 'TR');
    setHomeAirport(localStorage.getItem('tc_home_airport') || 'DXB');
    setCabin(localStorage.getItem('tc_cabin') || 'business');
    setLoyaltyPrograms(JSON.parse(localStorage.getItem('tc_loyalty') || '[]'));
  }, []);

  const save = () => {
    localStorage.setItem('tc_passport', passport);
    localStorage.setItem('tc_home_airport', homeAirport);
    localStorage.setItem('tc_cabin', cabin);
    localStorage.setItem('tc_loyalty', JSON.stringify(loyaltyPrograms));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleLoyalty = (id: string) => {
    setLoyaltyPrograms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const selectStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.text, width: '100%', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.sub }}><ArrowLeft size={20} /></button>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 600, color: COLORS.text }}>Settings</span>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Passport */}
        <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <label style={{ fontFamily: "'DM Sans'", fontSize: '12px', fontWeight: 600, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Passport Country</label>
          <select value={passport} onChange={e => setPassport(e.target.value)} style={selectStyle}>
            {PASSPORTS.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
          </select>
          <p style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub, marginTop: '6px' }}>Used for visa requirement checks on every search</p>
        </div>

        {/* Home Airport */}
        <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <label style={{ fontFamily: "'DM Sans'", fontSize: '12px', fontWeight: 600, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Home Airport</label>
          <select value={homeAirport} onChange={e => setHomeAirport(e.target.value)} style={selectStyle}>
            {HOME_AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
          </select>
          <p style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub, marginTop: '6px' }}>Default origin when you don&apos;t specify one</p>
        </div>

        {/* Cabin Class */}
        <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <label style={{ fontFamily: "'DM Sans'", fontSize: '12px', fontWeight: 600, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Preferred Cabin</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['economy', 'business', 'first'].map(c => (
              <button key={c} onClick={() => setCabin(c)} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${cabin === c ? COLORS.accent : COLORS.border}`,
                background: cabin === c ? COLORS.accent + '10' : '#fff', color: cabin === c ? COLORS.accent : COLORS.text,
                fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Loyalty Programs */}
        <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <label style={{ fontFamily: "'DM Sans'", fontSize: '12px', fontWeight: 600, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>Loyalty Programs</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {LOYALTY_PROGRAMS.map(p => {
              const active = loyaltyPrograms.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggleLoyalty(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
                  border: 'none', background: active ? COLORS.accent + '08' : 'transparent', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: '4px', border: `2px solid ${active ? COLORS.accent : COLORS.border}`, background: active ? COLORS.accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <Check size={12} color="#fff" />}
                  </div>
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '13px', color: COLORS.text, fontWeight: active ? 600 : 400 }}>{p.name}</span>
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '10px', color: COLORS.sub, marginLeft: 'auto', textTransform: 'uppercase' }}>{p.type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button onClick={save} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: COLORS.accent, color: '#fff',
          fontFamily: "'DM Sans'", fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          {saved ? '✓ Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

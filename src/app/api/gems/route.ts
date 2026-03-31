import { NextRequest, NextResponse } from 'next/server';

type Gem = { name: string; desc: string; type: 'nature' | 'museum' | 'food' | 'architecture' | 'history' | 'adventure' };

const GEMS: Record<string, Gem[]> = {
  LHR: [
    { name: 'Dennis Severs\' House', desc: 'A frozen-in-time 18th-century silk weaver\'s home in Spitalfields', type: 'history' },
    { name: 'Leighton House Museum', desc: 'A Victorian painter\'s palace with an Arab Hall covered in Islamic tiles', type: 'museum' },
    { name: 'Postman\'s Park', desc: 'Tiny park with a memorial wall to everyday heroes who died saving others', type: 'history' },
    { name: 'God\'s Own Junkyard', desc: 'A warehouse of neon signs in Walthamstow — surreal light art', type: 'museum' },
  ],
  CDG: [
    { name: 'Musée de la Chasse et de la Nature', desc: 'The weirdest museum in Paris — taxidermy meets contemporary art', type: 'museum' },
    { name: 'Petite Ceinture', desc: 'An abandoned railway line circling Paris, now a secret urban trail', type: 'adventure' },
    { name: 'Le Bouillon Chartier', desc: '1896 workers\' canteen still serving €12 three-course French meals', type: 'food' },
  ],
  NRT: [
    { name: 'Omoide Yokocho', desc: 'Tiny post-war alley of yakitori bars under Shinjuku Station', type: 'food' },
    { name: 'Shimokitazawa', desc: 'Tokyo\'s vintage and second-hand neighbourhood with tiny live houses', type: 'architecture' },
    { name: 'Todoroki Valley', desc: 'A hidden ravine in the middle of suburban Tokyo with a waterfall', type: 'nature' },
    { name: 'Yanaka Ginza', desc: 'A 1950s shopping street that survived modernization — cats everywhere', type: 'food' },
  ],
  DPS: [
    { name: 'Tirta Gangga Water Palace', desc: 'A serene royal water garden with stepping stones across fish ponds', type: 'architecture' },
    { name: 'Sekumpul Waterfall', desc: 'Bali\'s most beautiful waterfall — a jungle trek to reach it', type: 'nature' },
    { name: 'Jatiluwih Rice Terraces', desc: 'UNESCO rice paddies without the Tegallalang crowds', type: 'nature' },
  ],
  IST: [
    { name: 'Basilica Cistern', desc: 'An underground Roman reservoir with 336 marble columns', type: 'history' },
    { name: 'Balat District', desc: 'Colourful Ottoman-era streets — Istanbul\'s most photogenic neighbourhood', type: 'architecture' },
    { name: 'Karaköy Güllüoğlu', desc: 'The best baklava in Istanbul — a multi-generational family bakery', type: 'food' },
  ],
  BKK: [
    { name: 'Talat Noi', desc: 'Bangkok\'s oldest Chinatown — crumbling shophouses and street art', type: 'architecture' },
    { name: 'Bang Krachao', desc: 'The "Green Lung" — a jungle island in the middle of Bangkok', type: 'nature' },
    { name: 'Jay Fai', desc: 'The only Michelin-starred street food vendor in the world', type: 'food' },
  ],
  SIN: [
    { name: 'Haw Par Villa', desc: 'A psychedelic theme park of Chinese mythology scenes from the 1930s', type: 'museum' },
    { name: 'Henderson Waves', desc: 'A wave-shaped bridge 36m above the forest canopy', type: 'architecture' },
    { name: 'Tekka Centre', desc: 'Singapore\'s most authentic hawker centre — Little India', type: 'food' },
  ],
  JFK: [
    { name: 'The Whispering Gallery', desc: 'A tile arch in Grand Central where whispers travel 30 feet', type: 'architecture' },
    { name: 'City Hall Station', desc: 'An abandoned 1904 subway station you can glimpse from the 6 train', type: 'history' },
    { name: 'The Cloisters', desc: 'A medieval European monastery rebuilt in upper Manhattan', type: 'museum' },
  ],
  SYD: [
    { name: 'Wendy\'s Secret Garden', desc: 'A hidden harbourside garden built by one woman over 25 years', type: 'nature' },
    { name: 'Mary\'s Underground', desc: 'A speakeasy burger bar beneath a CBD tower — best burgers in Sydney', type: 'food' },
    { name: 'Cockatoo Island', desc: 'An abandoned shipyard turned camping + art space in the harbour', type: 'history' },
  ],
  MLE: [
    { name: 'Vaadhoo Island', desc: 'Bioluminescent plankton that makes the beach glow blue at night', type: 'nature' },
    { name: 'Malé Fish Market', desc: 'The chaotic heart of Maldivian commerce — tuna piled to the ceiling', type: 'food' },
  ],
  FCO: [
    { name: 'Aventine Keyhole', desc: 'Look through a door on Aventine Hill to see St Peter\'s dome framed by hedges', type: 'architecture' },
    { name: 'Quartiere Coppedè', desc: 'A surreal Art Nouveau neighbourhood hidden in Rome', type: 'architecture' },
    { name: 'Trapizzino', desc: 'Roman street food revolution — pizza pockets with traditional fillings', type: 'food' },
  ],
  BCN: [
    { name: 'Hospital de Sant Pau', desc: 'An Art Nouveau hospital more beautiful than most cathedrals', type: 'architecture' },
    { name: 'Bunkers del Carmel', desc: 'Civil War bunkers with the best 360° view of Barcelona — no tourists', type: 'history' },
  ],
  DXB: [
    { name: 'Al Fahidi Historical District', desc: 'Wind tower courtyard houses from the 1800s in the middle of modern Dubai', type: 'history' },
    { name: 'Alserkal Avenue', desc: 'An industrial warehouse district converted into Dubai\'s art scene', type: 'museum' },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dest = (searchParams.get('destination') || '').toUpperCase();
  const gems = GEMS[dest];
  if (!gems) return NextResponse.json({ gems: [], destination: dest, note: 'No hidden gems data for this destination yet' });
  return NextResponse.json({ gems, destination: dest, count: gems.length });
}

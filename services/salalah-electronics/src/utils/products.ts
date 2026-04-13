export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  emoji: string;
  image: string;
  description: string;
}

// --- SVG illustrations for each product ---

const frankincenseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="fg1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B8860B"/>
      <stop offset="100%" stop-color="#DAA520"/>
    </linearGradient>
    <linearGradient id="fg2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#DAA520" stop-opacity="0"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
  </defs>
  <!-- Base burner -->
  <ellipse cx="100" cy="160" rx="50" ry="12" fill="#8B6914" opacity="0.3"/>
  <path d="M65 155 Q65 130 70 120 L130 120 Q135 130 135 155 Z" fill="url(#fg1)" stroke="#8B6914" stroke-width="1.5"/>
  <ellipse cx="100" cy="120" rx="30" ry="8" fill="#DAA520" stroke="#8B6914" stroke-width="1"/>
  <rect x="88" y="145" width="24" height="12" rx="3" fill="#8B6914" opacity="0.4"/>
  <!-- Lid with holes -->
  <path d="M75 120 Q75 100 100 90 Q125 100 125 120" fill="url(#fg1)" stroke="#8B6914" stroke-width="1.5"/>
  <circle cx="95" cy="107" r="2" fill="#8B6914" opacity="0.5"/>
  <circle cx="105" cy="105" r="2" fill="#8B6914" opacity="0.5"/>
  <circle cx="100" cy="112" r="2" fill="#8B6914" opacity="0.5"/>
  <!-- Smoke wisps -->
  <path d="M100 90 Q95 75 100 60 Q105 45 98 30" fill="none" stroke="#DAA520" stroke-width="2" opacity="0.5" stroke-linecap="round"/>
  <path d="M105 88 Q112 70 108 55 Q104 40 110 25" fill="none" stroke="#E8C547" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
  <path d="M94 89 Q88 72 92 58 Q96 44 90 32" fill="none" stroke="#C9A83A" stroke-width="1.5" opacity="0.35" stroke-linecap="round"/>
</svg>`;

const khanjarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="kg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C0C0C0"/>
      <stop offset="50%" stop-color="#E8E8E8"/>
      <stop offset="100%" stop-color="#A0A0A0"/>
    </linearGradient>
    <linearGradient id="kg2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B6914"/>
      <stop offset="100%" stop-color="#DAA520"/>
    </linearGradient>
  </defs>
  <!-- Sheath -->
  <path d="M85 70 Q83 90 78 120 Q72 150 90 170" fill="none" stroke="url(#kg2)" stroke-width="6" stroke-linecap="round"/>
  <path d="M85 70 Q87 90 92 120 Q98 150 90 170" fill="none" stroke="url(#kg2)" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  <!-- Blade (curved) -->
  <path d="M105 55 Q115 80 120 110 Q125 140 115 165" fill="url(#kg1)" stroke="#808080" stroke-width="1"/>
  <path d="M105 55 Q110 80 113 110 Q116 140 115 165" fill="none" stroke="#D0D0D0" stroke-width="0.5" opacity="0.6"/>
  <!-- Handle -->
  <rect x="96" y="38" width="18" height="22" rx="4" fill="url(#kg2)" stroke="#8B6914" stroke-width="1"/>
  <!-- Handle ornament -->
  <circle cx="105" cy="49" r="3" fill="#DAA520" stroke="#8B6914" stroke-width="0.5"/>
  <line x1="99" y1="43" x2="111" y2="43" stroke="#DAA520" stroke-width="1"/>
  <line x1="99" y1="55" x2="111" y2="55" stroke="#DAA520" stroke-width="1"/>
  <!-- Pommel -->
  <path d="M100 38 Q105 30 110 38" fill="url(#kg2)" stroke="#8B6914" stroke-width="1"/>
  <!-- Guard -->
  <ellipse cx="105" cy="60" rx="14" ry="4" fill="#A0A0A0" stroke="#808080" stroke-width="1"/>
</svg>`;

const coffeeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#CD7F32"/>
      <stop offset="50%" stop-color="#D4943A"/>
      <stop offset="100%" stop-color="#B87333"/>
    </linearGradient>
  </defs>
  <!-- Shadow -->
  <ellipse cx="100" cy="170" rx="45" ry="10" fill="#B87333" opacity="0.2"/>
  <!-- Dallah body -->
  <path d="M75 90 Q70 120 72 145 Q74 160 100 165 Q126 160 128 145 Q130 120 125 90 Z" fill="url(#cg1)" stroke="#8B6508" stroke-width="1.5"/>
  <!-- Neck -->
  <path d="M88 90 Q88 75 90 65 L110 65 Q112 75 112 90" fill="url(#cg1)" stroke="#8B6508" stroke-width="1.5"/>
  <!-- Lid -->
  <ellipse cx="100" cy="65" rx="12" ry="4" fill="#D4943A" stroke="#8B6508" stroke-width="1"/>
  <!-- Finial -->
  <path d="M100 65 L100 50" stroke="#8B6508" stroke-width="2" stroke-linecap="round"/>
  <circle cx="100" cy="47" r="4" fill="#D4943A" stroke="#8B6508" stroke-width="1"/>
  <!-- Spout -->
  <path d="M125 95 Q140 85 145 75 Q148 68 145 65" fill="none" stroke="#8B6508" stroke-width="3" stroke-linecap="round"/>
  <!-- Handle -->
  <path d="M88 80 Q60 90 58 120 Q56 140 72 150" fill="none" stroke="#8B6508" stroke-width="3" stroke-linecap="round"/>
  <!-- Decorative band -->
  <path d="M76 110 Q100 115 124 110" fill="none" stroke="#DAA520" stroke-width="1.5"/>
  <path d="M74 130 Q100 135 126 130" fill="none" stroke="#DAA520" stroke-width="1.5"/>
  <!-- Steam -->
  <path d="M140 65 Q138 55 142 45" fill="none" stroke="#CD7F32" stroke-width="1" opacity="0.4" stroke-linecap="round"/>
  <path d="M145 62 Q147 50 143 40" fill="none" stroke="#CD7F32" stroke-width="1" opacity="0.3" stroke-linecap="round"/>
</svg>`;

const honeySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="hg1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F0C040"/>
      <stop offset="100%" stop-color="#D4940A"/>
    </linearGradient>
    <linearGradient id="hg2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E8D5B0"/>
      <stop offset="100%" stop-color="#C8B090"/>
    </linearGradient>
  </defs>
  <!-- Shadow -->
  <ellipse cx="100" cy="172" rx="38" ry="8" fill="#D4940A" opacity="0.2"/>
  <!-- Jar body -->
  <path d="M68 80 Q65 100 65 130 Q65 165 100 168 Q135 165 135 130 Q135 100 132 80 Z" fill="url(#hg1)" stroke="#B8860B" stroke-width="1.5"/>
  <!-- Honey level highlight -->
  <path d="M72 100 Q100 105 128 100 Q130 130 100 135 Q70 130 72 100 Z" fill="#E8B828" opacity="0.4"/>
  <!-- Jar neck -->
  <rect x="78" y="68" width="44" height="15" rx="3" fill="url(#hg2)" stroke="#B8860B" stroke-width="1"/>
  <!-- Lid / cloth cover -->
  <path d="M72 68 Q100 58 128 68" fill="none" stroke="#B8860B" stroke-width="1.5"/>
  <ellipse cx="100" cy="65" rx="28" ry="8" fill="url(#hg2)" stroke="#B8860B" stroke-width="1"/>
  <!-- Tie string -->
  <path d="M76 72 Q100 78 124 72" fill="none" stroke="#8B6508" stroke-width="1.5"/>
  <!-- Honey drip -->
  <path d="M120 100 Q122 110 121 118 Q120 124 118 126" fill="none" stroke="#D4940A" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
  <circle cx="118" cy="128" r="3" fill="#D4940A" opacity="0.7"/>
  <!-- Label area -->
  <rect x="82" y="115" width="36" height="28" rx="4" fill="#FFF8E0" stroke="#B8860B" stroke-width="0.8" opacity="0.8"/>
  <text x="100" y="133" font-family="serif" font-size="8" fill="#8B6508" text-anchor="middle" font-weight="bold">HONEY</text>
</svg>`;

const datesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="dg1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#DAA520"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
    <linearGradient id="dg2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8B4513"/>
      <stop offset="100%" stop-color="#5C3010"/>
    </linearGradient>
  </defs>
  <!-- Shadow -->
  <ellipse cx="100" cy="168" rx="48" ry="10" fill="#8B6914" opacity="0.2"/>
  <!-- Box base -->
  <path d="M55 75 L55 155 Q55 162 62 162 L138 162 Q145 162 145 155 L145 75 Z" fill="url(#dg1)" stroke="#8B6508" stroke-width="1.5"/>
  <!-- Box lid (open, tilted back) -->
  <path d="M55 75 L55 58 Q55 52 62 52 L138 52 Q145 52 145 58 L145 75 Z" fill="#E8C547" stroke="#8B6508" stroke-width="1.5"/>
  <!-- Box dividers -->
  <line x1="85" y1="80" x2="85" y2="158" stroke="#8B6508" stroke-width="0.8" opacity="0.5"/>
  <line x1="115" y1="80" x2="115" y2="158" stroke="#8B6508" stroke-width="0.8" opacity="0.5"/>
  <line x1="58" y1="118" x2="142" y2="118" stroke="#8B6508" stroke-width="0.8" opacity="0.5"/>
  <!-- Dates (oval shapes in compartments) -->
  <ellipse cx="70" cy="98" rx="10" ry="7" fill="url(#dg2)"/>
  <ellipse cx="100" cy="96" rx="10" ry="7" fill="url(#dg2)"/>
  <ellipse cx="130" cy="98" rx="10" ry="7" fill="#6B3410"/>
  <ellipse cx="70" cy="138" rx="10" ry="7" fill="#6B3410"/>
  <ellipse cx="100" cy="136" rx="10" ry="7" fill="url(#dg2)"/>
  <ellipse cx="130" cy="138" rx="10" ry="7" fill="url(#dg2)"/>
  <!-- Date highlights -->
  <ellipse cx="68" cy="96" rx="4" ry="2" fill="#A0622A" opacity="0.4"/>
  <ellipse cx="98" cy="94" rx="4" ry="2" fill="#A0622A" opacity="0.4"/>
  <ellipse cx="128" cy="96" rx="4" ry="2" fill="#8B5A2B" opacity="0.4"/>
  <!-- Decorative border on lid -->
  <rect x="65" y="56" width="70" height="3" rx="1" fill="#DAA520" opacity="0.6"/>
  <rect x="65" y="68" width="70" height="3" rx="1" fill="#DAA520" opacity="0.6"/>
</svg>`;

const bukhoorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B0000"/>
      <stop offset="50%" stop-color="#A52A2A"/>
      <stop offset="100%" stop-color="#CD5C5C"/>
    </linearGradient>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#DAA520"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
  </defs>
  <!-- Shadow -->
  <ellipse cx="100" cy="172" rx="40" ry="10" fill="#8B0000" opacity="0.2"/>
  <!-- Base pedestal -->
  <path d="M78 165 L72 155 Q70 152 74 150 L126 150 Q130 152 128 155 L122 165 Z" fill="url(#bg2)" stroke="#8B6508" stroke-width="1"/>
  <!-- Stem -->
  <rect x="94" y="130" width="12" height="22" rx="2" fill="url(#bg2)" stroke="#8B6508" stroke-width="1"/>
  <!-- Bowl -->
  <path d="M68 130 Q65 110 70 95 Q80 80 100 78 Q120 80 130 95 Q135 110 132 130 Z" fill="url(#bg1)" stroke="#7A0000" stroke-width="1.5"/>
  <!-- Bowl rim -->
  <ellipse cx="100" cy="130" rx="32" ry="8" fill="#CD5C5C" stroke="#7A0000" stroke-width="1"/>
  <!-- Ornamental patterns on bowl -->
  <path d="M75 105 Q100 100 125 105" fill="none" stroke="#DAA520" stroke-width="1.5"/>
  <path d="M73 115 Q100 110 127 115" fill="none" stroke="#DAA520" stroke-width="1.5"/>
  <circle cx="88" cy="95" r="2.5" fill="#DAA520" opacity="0.7"/>
  <circle cx="100" cy="92" r="2.5" fill="#DAA520" opacity="0.7"/>
  <circle cx="112" cy="95" r="2.5" fill="#DAA520" opacity="0.7"/>
  <!-- Smoke wisps -->
  <path d="M95 78 Q90 60 95 42 Q100 28 93 18" fill="none" stroke="#CD5C5C" stroke-width="2" opacity="0.35" stroke-linecap="round"/>
  <path d="M105 76 Q112 55 107 38 Q102 24 108 12" fill="none" stroke="#A52A2A" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
  <path d="M100 77 Q98 58 102 40 Q106 25 100 15" fill="none" stroke="#DAA520" stroke-width="1.5" opacity="0.25" stroke-linecap="round"/>
</svg>`;

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PRODUCTS: Product[] = [
  {
    id: 'frankincense-set',
    name: 'Omani Frankincense Gift Set',
    nameAr: '\u0645\u062C\u0645\u0648\u0639\u0629 \u0647\u062F\u0627\u064A\u0627 \u0627\u0644\u0644\u0628\u0627\u0646 \u0627\u0644\u0639\u0645\u0627\u0646\u064A',
    price: 12.5,
    emoji: '\u{1F56F}\uFE0F',
    image: svgToDataUri(frankincenseSvg),
    description: 'Premium Dhofar frankincense with traditional burner',
  },
  {
    id: 'khanjar-display',
    name: 'Khanjar Display Stand',
    nameAr: '\u062D\u0627\u0645\u0644 \u0639\u0631\u0636 \u0627\u0644\u062E\u0646\u062C\u0631',
    price: 85.0,
    emoji: '\u{1F5E1}\uFE0F',
    image: svgToDataUri(khanjarSvg),
    description: 'Handcrafted silver khanjar with wooden display',
  },
  {
    id: 'coffee-set',
    name: 'Omani Coffee Set with Dallah',
    nameAr: '\u0637\u0642\u0645 \u0627\u0644\u0642\u0647\u0648\u0629 \u0627\u0644\u0639\u0645\u0627\u0646\u064A\u0629 \u0645\u0639 \u0627\u0644\u062F\u0644\u0629',
    price: 45.0,
    emoji: '\u2615',
    image: svgToDataUri(coffeeSvg),
    description: 'Traditional brass dallah with 6 finjan cups',
  },
  {
    id: 'dhofar-honey',
    name: 'Dhofar Honey Premium (1kg)',
    nameAr: '\u0639\u0633\u0644 \u0638\u0641\u0627\u0631 \u0627\u0644\u0641\u0627\u062E\u0631',
    price: 28.0,
    emoji: '\u{1F36F}',
    image: svgToDataUri(honeySvg),
    description: 'Pure wild honey from the Dhofar mountains',
  },
  {
    id: 'dates-box',
    name: 'Muscat Dates Premium Box',
    nameAr: '\u062A\u0645\u0648\u0631 \u0645\u0633\u0642\u0637 \u0627\u0644\u0641\u0627\u062E\u0631\u0629',
    price: 18.5,
    emoji: '\u{1F334}',
    image: svgToDataUri(datesSvg),
    description: 'Assorted Omani dates in luxury gift packaging',
  },
  {
    id: 'bukhoor-set',
    name: 'Bukhoor Burner Set',
    nameAr: '\u0645\u062C\u0645\u0648\u0639\u0629 \u0645\u0628\u062E\u0631\u0629 \u0627\u0644\u0628\u062E\u0648\u0631',
    price: 35.0,
    emoji: '\u{1F525}',
    image: svgToDataUri(bukhoorSvg),
    description: 'Electric bukhoor burner with premium oud chips',
  },
];

/**
 * Format an OMR amount with exactly 3 decimal places.
 */
export function formatOMR(amount: number): string {
  return `OMR ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

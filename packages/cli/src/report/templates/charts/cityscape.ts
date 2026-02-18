/** カバーページ用の街並みシルエットSVG */

/** 街並みシルエットSVGを生成（パステルカラーの装飾） */
export function renderCityscapeSvg(): string {
  return `<svg viewBox="0 0 600 120" width="100%" height="120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d1fae5"/>
      <stop offset="50%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#ede9fe"/>
    </linearGradient>
  </defs>

  <rect width="600" height="120" fill="url(#sky)" rx="0"/>

  <!-- 雲 -->
  <ellipse cx="90" cy="30" rx="30" ry="12" fill="white" opacity="0.6"/>
  <ellipse cx="110" cy="26" rx="22" ry="10" fill="white" opacity="0.5"/>
  <ellipse cx="450" cy="22" rx="26" ry="10" fill="white" opacity="0.5"/>
  <ellipse cx="470" cy="18" rx="20" ry="8" fill="white" opacity="0.4"/>

  <!-- 木（左） -->
  <rect x="40" y="75" width="6" height="25" rx="2" fill="#92400e" opacity="0.5"/>
  <ellipse cx="43" cy="68" rx="16" ry="18" fill="#10b981" opacity="0.4"/>
  <rect x="80" y="80" width="5" height="20" rx="2" fill="#92400e" opacity="0.4"/>
  <ellipse cx="82" cy="74" rx="12" ry="14" fill="#10b981" opacity="0.35"/>

  <!-- ビル群（左） -->
  <rect x="110" y="50" width="28" height="50" rx="2" fill="#0ea5e9" opacity="0.25"/>
  <rect x="115" y="56" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
  <rect x="125" y="56" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
  <rect x="115" y="66" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
  <rect x="125" y="66" width="6" height="6" rx="1" fill="white" opacity="0.5"/>

  <rect x="145" y="38" width="24" height="62" rx="2" fill="#8b5cf6" opacity="0.2"/>
  <rect x="150" y="44" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="158" y="44" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="150" y="54" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="158" y="54" width="5" height="5" rx="1" fill="white" opacity="0.4"/>

  <rect x="176" y="55" width="30" height="45" rx="2" fill="#f43f5e" opacity="0.18"/>
  <rect x="182" y="62" width="6" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="192" y="62" width="6" height="5" rx="1" fill="white" opacity="0.4"/>

  <!-- 中央の家・マンション -->
  <rect x="230" y="60" width="34" height="40" rx="3" fill="#10b981" opacity="0.3"/>
  <rect x="236" y="66" width="7" height="7" rx="1" fill="white" opacity="0.5"/>
  <rect x="249" y="66" width="7" height="7" rx="1" fill="white" opacity="0.5"/>
  <rect x="241" y="82" width="12" height="18" rx="2" fill="#065f46" opacity="0.3"/>

  <rect x="275" y="45" width="26" height="55" rx="2" fill="#0ea5e9" opacity="0.22"/>
  <rect x="280" y="50" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="289" y="50" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="280" y="60" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="289" y="60" width="5" height="5" rx="1" fill="white" opacity="0.4"/>

  <rect x="310" y="36" width="22" height="64" rx="2" fill="#f59e0b" opacity="0.2"/>
  <rect x="314" y="42" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="314" y="52" width="5" height="5" rx="1" fill="white" opacity="0.4"/>

  <!-- ビル群（右） -->
  <rect x="345" y="52" width="32" height="48" rx="2" fill="#8b5cf6" opacity="0.22"/>
  <rect x="350" y="58" width="6" height="6" rx="1" fill="white" opacity="0.45"/>
  <rect x="362" y="58" width="6" height="6" rx="1" fill="white" opacity="0.45"/>
  <rect x="350" y="68" width="6" height="6" rx="1" fill="white" opacity="0.45"/>
  <rect x="362" y="68" width="6" height="6" rx="1" fill="white" opacity="0.45"/>

  <rect x="385" y="42" width="24" height="58" rx="2" fill="#f43f5e" opacity="0.2"/>
  <rect x="390" y="48" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
  <rect x="398" y="48" width="5" height="5" rx="1" fill="white" opacity="0.4"/>

  <rect x="418" y="56" width="28" height="44" rx="2" fill="#10b981" opacity="0.25"/>
  <rect x="423" y="62" width="6" height="6" rx="1" fill="white" opacity="0.4"/>
  <rect x="433" y="62" width="6" height="6" rx="1" fill="white" opacity="0.4"/>

  <!-- 木（右） -->
  <rect x="470" y="78" width="5" height="22" rx="2" fill="#92400e" opacity="0.45"/>
  <ellipse cx="472" cy="72" rx="14" ry="16" fill="#10b981" opacity="0.38"/>
  <rect x="510" y="82" width="5" height="18" rx="2" fill="#92400e" opacity="0.4"/>
  <ellipse cx="512" cy="76" rx="11" ry="13" fill="#10b981" opacity="0.3"/>

  <!-- 地面 -->
  <rect x="0" y="100" width="600" height="20" fill="#10b981" opacity="0.12" rx="0"/>
</svg>`;
}

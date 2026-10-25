import { cropSVG } from "./crops.js";
const svg = (body) =>
  `<svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
export const art = {
  bubble: svg(
    `<g transform="translate(83 17) rotate(-6 120 110)">${Array.from(
      { length: 22 },
      (_, i) => {
        const row = Math.floor(i / 6),
          col = i % 6,
          c = ["#edaa95", "#aed18f", "#a4cbe4", "#c8a9dc"][
            (Math.floor(col / 2) + Math.floor(row / 2)) & 3
          ];
        return `<circle cx="${22 + col * 36 + (row % 2) * 12}" cy="${20 + row * 32}" r="17" fill="${c}"/><circle cx="${17 + col * 36 + (row % 2) * 12}" cy="${14 + row * 32}" r="4" fill="#ffffff55"/>`;
      },
    ).join(
      "",
    )}<path d="m118 192 25-66" stroke="#e0ead099" stroke-width="3" stroke-dasharray="4 8"/><circle cx="118" cy="192" r="17" fill="#aed18f"/><path d="M95 213h46" stroke="#729690" stroke-width="10" stroke-linecap="round"/></g><path d="m334 134 5 12 12 5-12 5-5 12-5-12-12-5 12-5" fill="#eee4aa"/>`,
  ),
  pinball: svg(
    `<g transform="translate(115 8) rotate(9 85 110)"><rect width="170" height="227" rx="27" fill="#302e4c" stroke="#8d7caa" stroke-width="6"/>${[
      [55, 65],
      [117, 65],
      [86, 112],
    ]
      .map(
        ([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="21" fill="${["#d1afe1", "#acd0dd", "#edb8a1"][i]}"/><circle cx="${x - 4}" cy="${y - 5}" r="9" fill="#ffffff33"/>`,
      )
      .join(
        "",
      )}<path d="m25 142 23 30m97-30-23 30M45 188l29 12m51-12-29 12" stroke="#d8c5e9" stroke-width="12" stroke-linecap="round"/><circle cx="102" cy="160" r="8" fill="#f2f0df"/><path d="m105 173 10 23" stroke="#f2f0df88" stroke-width="2" stroke-dasharray="4 4"/></g><path d="m64 56 4 11 11 4-11 4-4 11-4-11-11-4 11-4" fill="#e4d8f1"/>`,
  ),
  meteor: svg(
    `<g fill="#b4c7db">${Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 83 + 21) % 400}" cy="${(i * 47 + 11) % 240}" r="${i % 4 === 0 ? 2 : 1}"/>`).join("")}</g><circle cx="330" cy="61" r="34" fill="#3f5877"/><path d="M300 57q32 25 59 2" stroke="#58728e" stroke-width="7"/><g transform="translate(187 156) rotate(8)"><path d="m0-40 33 62-23-10L0 26l-10-14-23 10Z" fill="#c6e6a4"/><ellipse cy="-5" rx="8" ry="17" fill="#36597a"/><path d="m-8 28 8 31 8-31" fill="#ebc48c"/></g><g fill="#e4a595"><path d="m88 47-20 35 20-7 20 7Z"/><path d="m263 34-20 35 20-7 20 7Z"/></g><g stroke="#d3e9ab" stroke-width="5" stroke-linecap="round"><path d="M180 91V76m23 12V73"/></g><path d="m79 145 19-11 22 10-3 27-26 6-19-19Z" fill="#a89891"/>`,
  ),
  harvest: svg(
    `<g transform="translate(77 19) rotate(-6 124 103)"><rect width="247" height="205" rx="18" fill="#38563c"/>${Array.from({ length: 12 }, (_, i) => `<g transform="translate(${10 + (i % 4) * 59},${10 + Math.floor(i / 4) * 62})"><rect width="51" height="54" rx="9" fill="${i < 3 ? "#6c8346" : "#4a6845"}"/>${cropSVG(i < 3 ? 0 : i % 5).replace("<svg ", '<svg width="49" height="50" y="2" x="1" ')}</g>`).join("")}</g><path d="m45 62 4 10 10 4-10 4-4 10-4-10-10-4 10-4" fill="#e5edb2"/>`,
  ),
  traffic: svg(
    `<path d="m128 0 145 0 73 240H54Z" fill="#d8c7a5"/><path d="m135 0 131 0 68 240H66Z" fill="#46535a"/><path d="m177 0-14 240m59-240 17 240" stroke="#eee7c5" stroke-width="3" stroke-dasharray="15 18"/><g transform="translate(179 133) rotate(-4 24 39)"><rect x="-5" y="10" width="58" height="57" rx="6" fill="#243837"/><rect width="48" height="80" rx="12" fill="#cbe39d"/><rect x="8" y="22" width="32" height="32" rx="7" fill="#36555a"/><path d="M7 8h9m16 0h9" stroke="#fff0bc" stroke-width="5"/></g><g transform="translate(247 48) scale(.72)"><rect x="-5" y="10" width="58" height="57" rx="6" fill="#243837"/><rect width="48" height="80" rx="12" fill="#e8b297"/><rect x="8" y="22" width="32" height="32" rx="7" fill="#36555a"/></g><g fill="#f5dd91" stroke="#a98b4d" stroke-width="2"><ellipse cx="140" cy="96" rx="9" ry="12"/><ellipse cx="145" cy="58" rx="7" ry="9"/></g>`,
  ),
  moto: svg(
    `<circle cx="329" cy="48" r="24" fill="#f5e4af"/><path d="M0 155Q50 50 108 142Q174 52 245 143Q320 49 400 124V240H0Z" fill="#8fa99a"/><path d="M0 222Q68 119 151 182T281 161T400 165V240H0Z" fill="#547b58"/><path d="M0 222Q68 119 151 182T281 161T400 165" stroke="#d4ddb1" stroke-width="7"/><g transform="translate(204 125) rotate(-15)"><g fill="#2b4349" stroke="#d7e4cc" stroke-width="5"><circle cx="-35" cy="21" r="22"/><circle cx="39" cy="21" r="22"/></g><path d="M-35 21-14-12 15 21h-50m21-33h42l11 33m-11-33-5-17h-12" stroke="#d5ec9f" stroke-width="8" stroke-linejoin="round"/><path d="m-7-19 10-25 22 17m-32 8 15 25-10 11" stroke="#365d75" stroke-width="12" stroke-linecap="round"/><circle cx="9" cy="-62" r="15" fill="#f2c4a1"/><path d="M-6-64a15 15 0 0 1 30 0h-30" fill="#eeb87f"/><path d="M19-64h13" stroke="#eeb87f" stroke-width="5"/></g>`,
  ),

  rally: svg(
    `<path d="M108 57h184q60 0 60 63t-60 63H108q-60 0-60-63t60-63Z" stroke="#d9d9bd" stroke-width="56"/><path d="M108 57h184q60 0 60 63t-60 63H108q-60 0-60-63t60-63Z" stroke="#465159" stroke-width="47"/><path d="M108 57h184q60 0 60 63t-60 63H108q-60 0-60-63t60-63Z" stroke="#e1dfb7" stroke-width="2" stroke-dasharray="9 12"/><g transform="translate(245 33) rotate(8 31 21)"><rect x="7" y="-4" width="12" height="50" rx="3" fill="#263733"/><rect x="43" y="-4" width="12" height="50" rx="3" fill="#263733"/><rect width="63" height="42" rx="12" fill="#f1cb7e"/><rect x="21" y="6" width="23" height="30" rx="6" fill="#37626b"/><path d="M52 9v7m0 11v6" stroke="#fff1c6" stroke-width="5"/></g><path d="m159 101 4 11 11 4-11 4-4 11-4-11-11-4 11-4" fill="#b8d496"/>`,
  ),
  defense: svg(
    `<path d="M-10 162h102V78h116v84h102v-40h100" stroke="#c9b68d" stroke-width="34" stroke-linejoin="round"/><g fill="#173c31"><rect x="112" y="105" width="52" height="52" rx="11"/><rect x="229" y="67" width="52" height="52" rx="11"/><rect x="265" y="183" width="52" height="45" rx="11"/></g><circle cx="138" cy="131" r="18" fill="#c7e68f"/><path d="M138 131v-27" stroke="#456144" stroke-width="10"/><circle cx="255" cy="93" r="18" fill="#f0bd86"/><path d="m255 93 19 17" stroke="#795a3c" stroke-width="12"/><circle cx="291" cy="204" r="15" fill="#a4d4e9"/><path d="M291 204v-22" stroke="#517a89" stroke-width="7"/><g fill="#e7a58b"><rect x="38" y="151" width="23" height="23" rx="6"/><rect x="80" y="100" width="23" height="23" rx="6"/><rect x="155" y="67" width="23" height="23" rx="6"/></g><g fill="#344d3c"><circle cx="45" cy="160" r="2"/><circle cx="53" cy="160" r="2"/><circle cx="87" cy="109" r="2"/><circle cx="95" cy="109" r="2"/></g>`,
  ),
  golf: svg(
    `<g transform="translate(77 22) rotate(-8 122 94)"><rect width="246" height="188" rx="18" fill="#295b48"/><rect x="10" y="10" width="226" height="168" rx="11" stroke="#acd08c" stroke-width="3"/><path d="M139 56v80" stroke="#173d35" stroke-width="15" stroke-linecap="round"/><path d="m55 139 46-100 94 0" stroke="#d5ebac" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 10"/><circle cx="55" cy="139" r="9" fill="#fff4d9"/><circle cx="195" cy="41" r="11" fill="#142f29"/><path d="M195 41V5l25 9-25 8" stroke="#f2be9a" stroke-width="3" stroke-linejoin="round"/></g><path d="m351 167 3 9 9 3-9 3-3 9-3-9-9-3 9-3" fill="#436f58"/>`,
  ),
  words: svg(
    `<g transform="translate(105 23) rotate(7 96 96)"><rect width="190" height="195" rx="14" fill="#a39d7f"/>${"RIVERPLANTKOALAMOONSCLOUD"
      .split("")
      .map(
        (letter, i) =>
          `<rect x="${8 + (i % 5) * 35}" y="${10 + Math.floor(i / 5) * 36}" width="30" height="31" rx="5" fill="${i < 5 ? "#b9d292" : "#f3edd9"}"/><text x="${23 + (i % 5) * 35}" y="${32 + Math.floor(i / 5) * 36}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="19" fill="#425345">${letter}</text>`,
      )
      .join(
        "",
      )}</g><path d="m63 67 3 9 9 3-9 3-3 9-3-9-9-3 9-3" fill="#87946c"/>`,
  ),
  stack: svg(
    `<path d="M0 215q75-97 150 0 100-108 250 0" fill="#858baa"/><g>${[180, 180, 162, 150, 131, 118].map((w, i) => `<rect x="${200 - w / 2}" y="${192 - i * 25}" width="${w}" height="23" rx="4" fill="${["#ddd5ec", "#c2b3df", "#b4bfe1", "#b2d2cd", "#d2dcae", "#efd7a5"][i]}"/><path d="M${203 - w / 2} ${195 - i * 25}h${w - 6}" stroke="#fff6" stroke-width="3"/>`).join("")}</g><rect x="226" y="22" width="118" height="23" rx="4" fill="#efd7a5"/><path d="m67 64 4 11 11 4-11 4-4 11-4-11-11-4 11-4" fill="#676c93"/>`,
  ),
  blocks: svg(
    `<g transform="translate(100 22) rotate(-7 100 100)"><rect width="200" height="200" rx="16" fill="#284f4c"/>${Array.from({ length: 36 }, (_, i) => `<rect x="${10 + (i % 6) * 30}" y="${10 + Math.floor(i / 6) * 30}" width="25" height="25" rx="5" fill="${[0, 1, 6, 12, 13, 14, 20, 26, 27, 28, 32, 33, 34, 35].includes(i) ? "#d3ee9a" : [4, 5, 10, 11, 17, 23].includes(i) ? "#f2c080" : "#37645d"}"/>`).join("")}</g><path d="m331 57 4 11 11 4-11 4-4 11-4-11-11-4 11-4" fill="#38665d"/>`,
  ),
  mines: svg(
    `<g transform="translate(102 23) rotate(8 100 100)"><rect width="196" height="196" rx="16" fill="#987c51"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${10 + (i % 4) * 45}" y="${10 + Math.floor(i / 4) * 45}" width="39" height="39" rx="6" fill="${[0, 1, 4, 5, 8].includes(i) ? "#f8e9c6" : "#b99c6c"}"/>`).join("")}<g fill="#4d7564" font-size="24" font-weight="800" text-anchor="middle" font-family="Arial,sans-serif"><text x="75" y="85">1</text><text x="30" y="130">1</text></g><path d="M117 128V65m0 0h29l-9 13 9 13h-29" stroke="#744d38" stroke-width="6" stroke-linejoin="round"/><path d="M106 131h22" stroke="#744d38" stroke-width="6" stroke-linecap="round"/></g><circle cx="64" cy="70" r="4" fill="#987c51"/>`,
  ),
  dash: svg(
    `<circle cx="325" cy="45" r="19" fill="#eaddb7"/><circle cx="333" cy="39" r="18" fill="#29414a"/><path d="M0 194q74-134 150 0 90-156 170 0 46-78 80 0" fill="#385b54"/><path d="M0 203h400" stroke="#9abc6d" stroke-width="4"/><path d="M0 219h400" stroke="#63805a" stroke-width="3" stroke-dasharray="12 23"/><g transform="translate(131 97) rotate(-9)"><rect x="7" y="-20" width="13" height="36" rx="6" fill="#d1ef91"/><rect x="32" y="-29" width="13" height="42" rx="6" fill="#d1ef91"/><rect width="56" height="68" rx="17" fill="#c7f36b"/><rect x="30" y="19" width="7" height="9" rx="3" fill="#294139"/><rect x="46" y="23" width="5" height="7" rx="2" fill="#294139"/><path d="M32 45h13" stroke="#749450" stroke-width="4"/><rect x="4" y="59" width="17" height="12" rx="5" fill="#a3ca61"/><rect x="34" y="59" width="17" height="12" rx="5" fill="#a3ca61"/></g><rect x="278" y="163" width="32" height="38" rx="5" fill="#e79b85"/><path d="m248 93 4 11 11 4-11 4-4 11-4-11-11-4 11-4" fill="#f4d783"/><circle cx="48" cy="44" r="2" fill="#a0b6a2"/><circle cx="102" cy="69" r="2" fill="#a0b6a2"/>`,
  ),
  2048: svg(
    `<g transform="translate(93 19) rotate(-8 110 100)"><rect width="214" height="210" rx="19" fill="#43331e" fill-opacity=".2"/>${[2, 4, 8, 16, 32, 64, 128, 256, 2048].map((v, i) => `<rect x="${10 + (i % 3) * 67}" y="${9 + Math.floor(i / 3) * 65}" width="60" height="58" rx="10" fill="${["#fff1ca", "#ffe3a2", "#ffc46d", "#ffac5e", "#e58748", "#a85a37", "#704130", "#55362a", "#fff6da"][i]}"/><text x="${40 + (i % 3) * 67}" y="${45 + Math.floor(i / 3) * 65}" text-anchor="middle" fill="${i > 3 && i < 8 ? "#fff3d3" : "#503725"}" font-family="Arial,sans-serif" font-weight="800" font-size="${v > 999 ? 18 : 25}">${v}</text>`).join("")}</g><path d="m335 53 3 10 10 3-10 3-3 10-3-10-10-3 10-3ZM61 156l3 7 7 3-7 3-3 7-3-7-7-3 7-3" fill="#684726"/>`,
  ),
  memory: svg(
    `<g transform="translate(100 34) rotate(-12 70 85)"><rect width="119" height="164" rx="16" fill="#493676" opacity=".25"/><rect x="-7" y="-8" width="119" height="164" rx="16" fill="#eee5ff"/><path d="m52 37 11 27 29 3-22 19 6 29-24-15-25 15 7-29-22-19 29-3z" fill="#a086df"/></g><g transform="translate(208 49) rotate(13 55 80)"><rect width="119" height="164" rx="16" fill="#493676" opacity=".25"/><rect x="-6" y="-8" width="119" height="164" rx="16" fill="#7860b5"/><path d="m53 34 12 28 29 3-23 19 7 30-25-16-25 16 7-30-23-19 29-3z" fill="#ddd0f7"/></g><circle cx="65" cy="77" r="5" fill="#7860b5"/><path d="m335 44 3 9 9 3-9 3-3 9-3-9-9-3 9-3" fill="#7860b5"/>`,
  ),
  snake: svg(
    `<g stroke="#244b3d" stroke-opacity=".1">${Array.from({ length: 10 }, (_, i) => `<path d="M${i * 40} 0v240M0 ${i * 40}h400"/>`).join("")}</g><path d="M97 165h61v-49h88V69h45" stroke="#2e674b" stroke-width="35" stroke-linejoin="round" stroke-linecap="round"/><rect x="270" y="48" width="49" height="43" rx="16" fill="#234d39"/><circle cx="302" cy="59" r="4" fill="#dcf5a4"/><path d="M319 70h15m-2-5 6 5-6 5" stroke="#d77d64" stroke-width="3"/><circle cx="96" cy="73" r="15" fill="#ef815d"/><path d="M96 57q3-13 13-10" stroke="#2e674b" stroke-width="4" stroke-linecap="round"/><path d="m335 177 3 9 9 3-9 3-3 9-3-9-9-3 9-3" fill="#4f8053"/>`,
  ),
  reaction: svg(
    `<circle cx="200" cy="120" r="88" stroke="#6b3e35" stroke-opacity=".13" stroke-width="2"/><circle cx="200" cy="120" r="66" stroke="#6b3e35" stroke-opacity=".2" stroke-width="2"/><circle cx="200" cy="120" r="43" fill="#fff0dc"/><path d="m207 45-53 82h40l-9 66 60-87h-42z" fill="#9d4a39" stroke="#9d4a39" stroke-linejoin="round" stroke-width="5"/><path d="m94 47 8 9m197 128 8 9M78 139H65m257-57 12-6" stroke="#9d4a39" stroke-width="4" stroke-linecap="round"/>`,
  ),
  tictactoe: svg(
    `<g transform="translate(107 25) rotate(-8 90 90)" stroke-width="8" stroke-linecap="round"><path d="M60 0v180m60-180v180M0 60h180M0 120h180" stroke="#397a89" stroke-opacity=".45"/><g stroke="#235966"><path d="m12 13 31 31m0-31L12 44m61 29 31 31m0-31L73 104m61 29 31 31m0-31-31 31"/><circle cx="150" cy="30" r="17"/><circle cx="30" cy="90" r="17"/><circle cx="90" cy="150" r="17"/></g></g><path d="m338 72 3 9 9 3-9 3-3 9-3-9-9-3 9-3" fill="#397a89"/>`,
  ),
  breaker: svg(
    `<g transform="translate(65 38)">${Array.from({ length: 15 }, (_, i) => `<rect x="${(i % 5) * 56}" y="${Math.floor(i / 5) * 26}" width="49" height="19" rx="5" fill="${["#ffd88b", "#f5a574", "#e37c64"][Math.floor(i / 5)]}" opacity="${i === 12 ? 0 : 1}"/>`).join("")}</g><path d="m178 120 38 44 35-26" stroke="#ffe9cb" stroke-opacity=".45" stroke-width="3" stroke-dasharray="5 7"/><circle cx="251" cy="138" r="10" fill="#fff3da"/><rect x="178" y="190" width="91" height="13" rx="6.5" fill="#ffd88b"/><circle cx="63" cy="177" r="3" fill="#ffd88b"/><circle cx="343" cy="157" r="4" fill="#ffd88b"/>`,
  ),
};

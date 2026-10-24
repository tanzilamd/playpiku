const svg = (body) =>
  `<svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
export const art = {
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

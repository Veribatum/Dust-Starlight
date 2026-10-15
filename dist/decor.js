export function stationBadge(id){
  const paths={
    juniper:'<circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="28"/><path d="M50 8v30m0 24v30M8 50h30m24 0h30M20 20l21 21m18 18 21 21m0-60L59 41M41 59 20 80"/><circle cx="50" cy="50" r="11"/>',
    bellwether:'<circle cx="28" cy="50" r="24"/><circle cx="72" cy="50" r="24"/><circle cx="28" cy="50" r="18"/><circle cx="72" cy="50" r="18"/><path d="M28 26v48m44-48v48M6 50h88M43 18h14v64H43Z"/>',
    cinder:'<path d="M15 20v65m70-65v65M15 25h70M15 78h70M27 25v53m46-53v53M8 38h27v14H8Zm57 0h27v14H65ZM8 60h27v14H8Zm57 0h27v14H65Z"/><path d="M43 15h14v71H43Z"/>',
    hush:'<path d="M46 5h8v90h-8ZM19 25l21 13-21 13Zm62 0L60 38l21 13ZM19 59l21 13-21 13Zm62 0L60 72l21 13ZM8 48h29v12H8Zm55 0h29v12H63Z"/>',
    crown:'<path d="M47 3h6v87h-6ZM20 40h60M10 58h80M30 28h40"/><ellipse cx="50" cy="58" rx="40" ry="11"/><ellipse cx="50" cy="38" rx="28" ry="8"/><path d="M22 35V18h6v21m44-3V14h6v25M15 56V34h6v24m60-2V28h6v30M40 81h20v10H40Z"/>',
    deadlight:'<path d="m50 19 23 7 13 22-9 25-22 12-27-13-9-27 15-18Z"/><path d="M17 17l22 20m28 29 19 18m0-68L65 36M36 65 14 84M7 50h27m36 0h23M50 5v30m0 33v27M7 22h15v11H7Zm72 49h16v14H79Z"/>'
  };
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4">${paths[id]||paths.juniper}</g></svg>`;
}

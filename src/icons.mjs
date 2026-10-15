export const paths = {
 arrow:'<path d="M7 17 17 7M6 7h11v11"/>', right:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 wave:'<path d="M4 10v4m4-8v12m4-16v20m4-16v12m4-8v4"/>',
 play:'<path d="m9 5 11 7-11 7Z"/>', aperture:'<circle cx="12" cy="12" r="9"/><path d="m9 4 9 15M4 10h17M7 20 16 4"/>',
 moon:'<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 shield:'<path d="m12 3 8 4v6c0 5-8 8-8 8S4 18 4 13V7Z"/><path d="m8 12 3 3 5-6"/>', mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
 sparkle:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>', grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 sliders:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>', check:'<path d="m5 12 4 4L19 6"/>', headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>', pause:'<path d="M9 5v14M15 5v14"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', link:'<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>'
};
export const icon = (name,cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.sparkle}</svg>`;
export const mark = '<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M8 27V9h6l8 12V9h6v18h-6L14 15v12Z" fill="currentColor"/><path d="m28 2 1.5 4.5L34 8l-4.5 1.5L28 14l-1.5-4.5L22 8l4.5-1.5Z" fill="#d4f63d"/></svg>';

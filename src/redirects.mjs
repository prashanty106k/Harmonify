import {apps} from './data.mjs';
export const legacyRedirects=Object.fromEntries(apps.flatMap(app=>(app.aliases||[]).flatMap(alias=>['','privacy-policy/','terms/'].map(suffix=>[`/${alias}/${suffix}`,`/${app.slug}/${suffix}`]))));

import {site} from './data.mjs';

const escapeAttribute=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function searchMetadata(route){
  if(route!=='/')return '';
  const organizationId=site.domain+'/#organization';
  const graph={
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'Organization','@id':organizationId,name:site.name,url:site.domain+'/',email:site.email},
      {'@type':'WebSite','@id':site.domain+'/#website',name:site.name,url:site.domain+'/',publisher:{'@id':organizationId},inLanguage:'en'},
    ],
  };
  const verification=site.googleSiteVerification.trim();
  return (verification?`<meta name="google-site-verification" content="${escapeAttribute(verification)}">`:'')+
    `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g,'\\u003c')}</script>`;
}

export function renderSitemap(routes){
  const urls=[...new Set(routes)].map(route=>{
    const url=site.domain+route;
    return `  <url>\n    <loc>${escapeAttribute(url)}</loc>\n    <lastmod>${site.lastModified}</lastmod>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function renderRobots(){
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.domain}/sitemap.xml\n`;
}

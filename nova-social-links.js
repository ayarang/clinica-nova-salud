/* Clínica Nova Salud · Redes sociales v7.6.3
   Iconos para compartir la DEMOSTRACIÓN ACADÉMICA, sin inventar perfiles oficiales. */
(function () {
  'use strict';
  const footer = document.querySelector('footer#contacto');
  if (!footer) return;
  // Si el pie de página ya contiene los iconos en HTML, solo activamos copiar.
  // Así siguen visibles incluso cuando un JavaScript no carga.
  const staticSection = document.getElementById('novaSocialSection');
  if (staticSection) {
    const copyButton = staticSection.querySelector('.nova-social-copy');
    if(copyButton) copyButton.addEventListener('click', async function(){
      const url='https://ayarang.github.io/clinica-nova-salud/';
      try {
        await navigator.clipboard.writeText(url);
        copyButton.textContent='✓ Copiado';
      } catch (_) {
        const field=document.createElement('textarea');field.value=url;
        field.style.position='fixed';field.style.opacity='0';
        document.body.append(field);field.select();
        const success=document.execCommand('copy');field.remove();
        copyButton.textContent=success?'✓ Copiado':'Copia desde tu navegador';
      }
      setTimeout(function(){copyButton.textContent='⧉ Copiar enlace';},1900);
    });
    return;
  }

  const pageUrl = 'https://ayarang.github.io/clinica-nova-salud/';
  const shareText = 'Conoce Clínica Nova Salud, una demostración académica de gestión clínica.';
  const enc = encodeURIComponent;
  const links = [
    {id:'facebook', title:'Compartir en Facebook', icon:'f',
      href:'https://www.facebook.com/sharer/sharer.php?u='+enc(pageUrl)},
    {id:'twitter', title:'Compartir en X (Twitter)', icon:'𝕏',
      href:'https://twitter.com/intent/tweet?text='+enc(shareText)+'&url='+enc(pageUrl)},
    {id:'linkedin', title:'Compartir en LinkedIn', icon:'in',
      href:'https://www.linkedin.com/sharing/share-offsite/?url='+enc(pageUrl)},
    {id:'whatsapp', title:'Compartir por WhatsApp', icon:'☏',
      href:'https://api.whatsapp.com/send?text='+enc(shareText+' '+pageUrl)},
    {id:'telegram', title:'Compartir por Telegram', icon:'➤',
      href:'https://t.me/share/url?url='+enc(pageUrl)+'&text='+enc(shareText)}
  ];
  const pending = [
    {id:'instagram', title:'Instagram · sin perfil oficial', icon:'◎'},
    {id:'tiktok', title:'TikTok · sin perfil oficial', icon:'♪'},
    {id:'youtube', title:'YouTube · sin perfil oficial', icon:'▶'}
  ];
  const style = document.createElement('style');
  style.id = 'novaSocialStyles';
  style.textContent = [
    '#novaSocialSection{margin-top:20px;padding-top:21px;border-top:1px solid #dce9ef;',
    'display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}',
    '#novaSocialSection .nova-social-intro{display:flex;flex-direction:column;gap:4px;max-width:390px}',
    '#novaSocialSection .nova-social-intro strong{color:#173b57;font-size:.97rem;letter-spacing:-.01em}',
    '#novaSocialSection .nova-social-intro small{font-size:.76rem;color:#607c8e;line-height:1.5}',
    '#novaSocialSection .nova-social-links{display:flex;align-items:center;gap:9px;flex-wrap:wrap}',
    '#novaSocialSection .nova-social-link{width:43px;height:43px;border-radius:13px;display:inline-flex;',
    'align-items:center;justify-content:center;background:#f0f7fb;color:#1d5f79;border:1px solid #d9e8ef;',
    'font:900 18px system-ui;text-decoration:none;transition:transform .17s,background .17s,color .17s;',
    'box-shadow:0 3px 9px rgba(26,73,105,.035)}',
    '#novaSocialSection .nova-social-link:hover,#novaSocialSection .nova-social-link:focus-visible{',
    'transform:translateY(-2px);outline:2px solid #b5dbe9;outline-offset:2px}',
    '#novaSocialSection a[data-network="facebook"]:hover{background:#1877f2;color:white;border-color:#1877f2}',
    '#novaSocialSection a[data-network="twitter"]:hover{background:#18232e;color:white;border-color:#18232e}',
    '#novaSocialSection a[data-network="linkedin"]:hover{background:#0a66c2;color:white;border-color:#0a66c2}',
    '#novaSocialSection a[data-network="whatsapp"]:hover{background:#128c60;color:white;border-color:#128c60}',
    '#novaSocialSection a[data-network="telegram"]:hover{background:#229ed9;color:white;border-color:#229ed9}',
    '#novaSocialSection .nova-social-link.is-pending{cursor:default;opacity:.57;background:#f7f9fa;',
    'color:#6c8290;box-shadow:none}',
    '#novaSocialSection .nova-social-link.is-pending:hover{transform:none;outline:0}',
    '#novaSocialSection .nova-social-copy{width:auto;gap:6px;padding:0 13px;font-size:12px;',
    'font-weight:750;cursor:pointer;color:#365a70}',
    '#novaSocialSection .nova-social-copy:hover{background:#e5f5fa}',
    '#novaSocialSection .nova-social-symbol{line-height:1}',
    '#novaSocialSection .nova-social-disclaimer{width:100%;margin:0;font-size:.74rem;',
    'line-height:1.5;color:#708797}',
    '@media(max-width:600px){#novaSocialSection{align-items:flex-start;gap:13px}',
    '#novaSocialSection .nova-social-links{gap:7px}',
    '#novaSocialSection .nova-social-link{width:40px;height:40px;border-radius:12px}',
    '#novaSocialSection .nova-social-copy{padding:0 11px;width:auto}}'
  ].join('');

  const area = document.createElement('div');
  area.className = 'container';
  area.id = 'novaSocialSection';
  const intro = document.createElement('div');
  intro.className = 'nova-social-intro';
  intro.innerHTML = '<strong>🌐 Comparte Nova Salud</strong><small>Presenta nuestro proyecto académico en tus redes favoritas.</small>';

  const icons = document.createElement('nav');
  icons.className = 'nova-social-links';
  icons.setAttribute('aria-label', 'Compartir Nova Salud en redes sociales');
  links.forEach(function(item) {
    const a = document.createElement('a');
    a.className = 'nova-social-link';
    a.dataset.network = item.id;
    a.href = item.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = item.title;
    a.setAttribute('aria-label', item.title);
    a.innerHTML = '<span class="nova-social-symbol" aria-hidden="true">'+item.icon+'</span>';
    icons.append(a);
  });
  pending.forEach(function(item) {
    const span = document.createElement('span');
    span.className = 'nova-social-link is-pending';
    span.title = item.title;
    span.setAttribute('aria-label', item.title);
    span.innerHTML = '<span class="nova-social-symbol" aria-hidden="true">'+item.icon+'</span>';
    icons.append(span);
  });
  const copy = document.createElement('button');
  copy.className = 'nova-social-link nova-social-copy';
  copy.type = 'button';
  copy.title = 'Copiar enlace a Nova Salud';
  copy.textContent = '⧉ Copiar enlace';
  copy.addEventListener('click', async function() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      copy.textContent = '✓ Copiado';
      setTimeout(function(){copy.textContent='⧉ Copiar enlace';},1800);
    } catch (_) {
      const input = document.createElement('textarea');
      input.value=pageUrl; input.style.position='fixed';input.style.opacity='0';
      document.body.append(input); input.select();
      const ok = document.execCommand('copy');
      input.remove();
      copy.textContent = ok ? '✓ Copiado' : 'Copia el enlace del navegador';
      setTimeout(function(){copy.textContent='⧉ Copiar enlace';},2000);
    }
  });
  icons.append(copy);
  const disclaimer = document.createElement('p');
  disclaimer.className = 'nova-social-disclaimer';
  disclaimer.textContent = 'Facebook, X, LinkedIn, WhatsApp y Telegram comparten esta web. Instagram, TikTok y YouTube son iconos ilustrativos: Nova Salud no tiene perfiles oficiales vinculados.';
  area.append(intro,icons,disclaimer);
  footer.append(area);
  document.head.append(style);
})();
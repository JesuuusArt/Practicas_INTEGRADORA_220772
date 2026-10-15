/* ============================================================================
   Práctica 06 — Interacción: clic en un recuadro (nodo) del diagrama de Archify
   => se abre una ventana con la IMAGEN del sketch de esa pantalla.
   Imágenes: ./sketches/sketch1.jpg ... ./sketches/sketch16.jpg
   Estudiante: Jesus Alejandro Artiaga Morales (220772) · UTXJ
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Ficha de cada pantalla (Catálogo Práctica 06) ---- */
  var CATALOG = {
    'scr-01': { code: 'SCR-01', name: 'Splash & Onboarding de Bienvenida', role: 'compartida', category: 'Onboarding', goal: 'Transmitir propuesta de valor e identidad de marca.', trigger: 'Tap en "Registrarte gratis" o "Iniciar sesión".', api: 'GET /v1/system/client-config' },
    'scr-02': { code: 'SCR-02', name: 'Login y Registro Unificado', role: 'compartida', category: 'Seguridad', goal: 'Acceso rápido vía SSO (Apple, Google) o credenciales seguras.', trigger: 'Submit con credenciales válidas / SSO exitoso.', api: 'POST /v1/auth/token' },
    'scr-03': { code: 'SCR-03', name: 'Selector de Rol / Hub de Modo', role: 'compartida', category: 'Gateway', goal: 'Bifurcación entre experiencia de oyente y panel de creador.', trigger: 'Tap en "Modo Oyente" o "Modo Creador".', api: 'POST /v1/me/context-switch' },
    'scr-04': { code: 'SCR-04', name: 'Ajustes y Configuración Global', role: 'compartida', category: 'Ajustes', goal: 'Configurar streaming de audio HiFi, descargas y privacidad.', trigger: 'Tap en selector de calidad o cerrar sesión.', api: 'GET /v1/me/settings' },
    'scr-05': { code: 'SCR-05', name: 'Home Feed Personalizado', role: 'oyente', category: 'Feed', goal: 'Presentar mixes diarios, accesos rápidos y podcasts recientes.', trigger: 'Tap en tarjeta de playlist o mini-player.', api: 'GET /v1/browse/featured-playlists' },
    'scr-06': { code: 'SCR-06', name: 'Explorar y Búsqueda Inteligente', role: 'oyente', category: 'Búsqueda', goal: 'Búsqueda por texto, voz o cuadrícula cromática de géneros.', trigger: 'Escribir búsqueda o tap en género Pop/Rock.', api: 'GET /v1/search' },
    'scr-07': { code: 'SCR-07', name: 'Detalle de Playlist y Álbum', role: 'oyente', category: 'Catálogo', goal: 'Cabecera inmersiva, tracks ordenados y botón de shuffle play.', trigger: 'Tap en canción o botón verde Shuffle Play.', api: 'GET /v1/playlists/{id}' },
    'scr-08': { code: 'SCR-08', name: 'Reproductor Full (Now Playing)', role: 'oyente', category: 'Playback', goal: 'Visualización de Canvas en bucle, scrubber, letra y Connect.', trigger: 'Tap en corazón (Like) o swipe de letras.', api: 'PUT /v1/me/player/play' },
    'scr-09': { code: 'SCR-09', name: 'Tu Biblioteca Musical', role: 'oyente', category: 'Colección', goal: 'Centralizar canciones favoritas (Liked Songs), playlists y filtros.', trigger: 'Tap en banner de DJ IA o playlist favorita.', api: 'GET /v1/me/tracks' },
    'scr-10': { code: 'SCR-10', name: 'DJ IA & Descubrimiento Semanal', role: 'oyente', category: 'Curaduría IA', goal: 'Radio personalizada con voz sintética reactiva del DJ X de Spotify.', trigger: 'Tap en botón flotante DJ para cambiar de vibra.', api: 'POST /v1/ai-dj/next-vibe' },
    'scr-11': { code: 'SCR-11', name: 'Live Dashboard de Artista', role: 'creador', category: 'Analytics', goal: 'Monitorear oyentes activos ahora mismo y streams acumulados hoy.', trigger: 'Tap en pestaña "Música" o gráfica semanal.', api: 'GET /v1/artists/{id}/live-listeners' },
    'scr-12': { code: 'SCR-12', name: 'Catálogo y Discografía', role: 'creador', category: 'Gestión', goal: 'Administrar singles, álbumes y estado de pitching editorial.', trigger: 'Tap en canción "Ecos en la Niebla" o Canvas.', api: 'GET /v1/artists/{id}/catalog' },
    'scr-13': { code: 'SCR-13', name: 'Métricas y Desempeño de Track', role: 'creador', category: 'Métricas', goal: 'Curva de retención por segundo y demografía por país.', trigger: 'Tap en botón "Editar Perfil Artístico".', api: 'GET /v1/artists/{id}/tracks/{id}' },
    'scr-14': { code: 'SCR-14', name: 'Editor de Perfil de Artista', role: 'creador', category: 'Perfil', goal: 'Actualizar cabecera (Header Image), biografía y Artist Pick.', trigger: 'Tap en "Subir Canvas para Artist Pick".', api: 'PUT /v1/artists/{id}/profile' },
    'scr-15': { code: 'SCR-15', name: 'Subida y Preview de Canvas Visual', role: 'creador', category: 'Contenido', goal: 'Recortar y previsualizar video vertical 9:16 de 8s en bucle.', trigger: 'Tap en "Publicar Canvas en Spotify Mobile".', api: 'POST /v1/canvas/upload' },
    'scr-16': { code: 'SCR-16', name: 'Centro de Hitos y Audiencia', role: 'creador', category: 'Comunidad', goal: 'Celebrar 1M de streams y compartir tarjeta en redes sociales.', trigger: 'Tap en "Compartir tarjeta con fans".', api: 'GET /v1/artists/{id}/milestones' }
  };

  var ROLE_LABEL = { oyente: 'Rol 1 · Oyente', creador: 'Rol 2 · Creador', compartida: 'Compartida' };

  function metaFor(id) {
    if (CATALOG[id]) return CATALOG[id];
    var m = /^scr-(\d+)$/.exec(id || '');
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return { code: 'SCR-' + (n < 10 ? '0' + n : n), name: 'Pantalla ' + n, role: 'compartida', category: '', goal: '', trigger: '', api: '' };
  }

  function sketchSrc(id) {
    var m = /^scr-(\d+)$/.exec(id || '');
    if (!m) return null;
    return 'sketches/sketch' + parseInt(m[1], 10) + '.jpg';
  }

  /* ---- Construir el modal una sola vez ---- */
  var modal = document.createElement('div');
  modal.className = 'sp-sketch-modal';
  modal.setAttribute('hidden', '');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'sp-sketch-title');
  modal.innerHTML =
    '<div class="sp-sketch-backdrop" data-close></div>' +
    '<div class="sp-sketch-card">' +
      '<div class="sp-sketch-head">' +
        '<span class="sp-sketch-code" id="sp-sketch-code">SCR-00</span>' +
        '<div class="sp-sketch-titles">' +
          '<h2 id="sp-sketch-title">Pantalla</h2>' +
          '<p id="sp-sketch-sub">Práctica 06 · Spotify UX</p>' +
        '</div>' +
        '<span class="sp-role-chip" id="sp-sketch-role" data-role="compartida">Compartida</span>' +
        '<button class="sp-sketch-close" type="button" aria-label="Cerrar" data-close>&times;</button>' +
      '</div>' +
      '<div class="sp-sketch-body">' +
        '<figure class="sp-sketch-figure">' +
          '<img id="sp-sketch-img" alt="Sketch de la pantalla" />' +
          '<figcaption id="sp-sketch-caption"></figcaption>' +
        '</figure>' +
        '<div class="sp-meta-grid">' +
          '<div class="sp-meta"><h4>Objetivo UX</h4><p id="sp-meta-goal">—</p></div>' +
          '<div class="sp-meta"><h4>Disparador</h4><p id="sp-meta-trigger">—</p></div>' +
          '<div class="sp-meta"><h4>Endpoint Spotify</h4><p><code id="sp-meta-api">—</code></p></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  var img = modal.querySelector('#sp-sketch-img');
  var elCode = modal.querySelector('#sp-sketch-code');
  var elTitle = modal.querySelector('#sp-sketch-title');
  var elSub = modal.querySelector('#sp-sketch-sub');
  var elRole = modal.querySelector('#sp-sketch-role');
  var elCaption = modal.querySelector('#sp-sketch-caption');
  var elGoal = modal.querySelector('#sp-meta-goal');
  var elTrigger = modal.querySelector('#sp-meta-trigger');
  var elApi = modal.querySelector('#sp-meta-api');

  function open(id) {
    var m = metaFor(id);
    var src = sketchSrc(id);
    if (!m || !src) return;

    elCode.textContent = m.code;
    elTitle.textContent = m.name;
    elSub.textContent = (m.category ? m.category + ' · ' : '') + (ROLE_LABEL[m.role] || '');
    elRole.textContent = ROLE_LABEL[m.role] || 'Compartida';
    elRole.setAttribute('data-role', m.role);
    elGoal.textContent = m.goal || '—';
    elTrigger.textContent = m.trigger || '—';
    elApi.textContent = m.api || '—';
    elCaption.textContent = m.code + ' · ' + m.name + ' — sketch (imagen)';

    img.classList.add('sp-loading');
    img.alt = 'Sketch ' + m.code + ' · ' + m.name;
    img.onload = function () { img.classList.remove('sp-loading'); };
    img.onerror = function () {
      img.classList.remove('sp-loading');
      elCaption.textContent = 'No se encontró la imagen: ' + src;
    };
    img.src = src;

    modal.removeAttribute('hidden');
    document.documentElement.style.overflow = 'hidden';
    if (history.replaceState) history.replaceState(null, '', '#sketch=' + id);
  }

  function close() {
    modal.setAttribute('hidden', '');
    document.documentElement.style.overflow = '';
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---- Deep-link: #sketch=scr-08 abre directamente ese sketch ---- */
  function idFromHash() {
    var m = /(?:^|&)sketch=(scr-\d+)/.exec((location.hash || '').replace(/^#/, ''));
    return m ? m[1] : null;
  }

  /* ---- Delegación de clic (fase de captura para asegurar el disparo) ---- */
  document.addEventListener('click', function (ev) {
    var closer = ev.target.closest && ev.target.closest('[data-close]');
    if (closer) { ev.preventDefault(); close(); return; }

    var nodeEl = ev.target.closest && ev.target.closest('[data-node-id]');
    if (nodeEl) {
      var id = nodeEl.getAttribute('data-node-id');
      if (sketchSrc(id)) {
        ev.preventDefault();
        open(id);
      }
    }
  }, true);

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !modal.hasAttribute('hidden')) { close(); return; }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.closest) {
      var nodeEl = ev.target.closest('[data-node-id]');
      if (nodeEl && sketchSrc(nodeEl.getAttribute('data-node-id'))) {
        ev.preventDefault();
        open(nodeEl.getAttribute('data-node-id'));
      }
    }
  });

  /* ---- Marcar nodos que tienen sketch + hint flotante ---- */
  function decorate() {
    var nodes = document.querySelectorAll('svg [data-node-id]');
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-node-id');
      if (sketchSrc(id)) {
        nodes[i].classList.add('sp-has-sketch');
        nodes[i].setAttribute('title', 'Ver sketch de ' + ((metaFor(id) || {}).code || id));
      }
    }

    if (!document.querySelector('.sp-sketch-hint')) {
      var hint = document.createElement('div');
      hint.className = 'sp-sketch-hint';
      hint.innerHTML = '<span class="sp-dot"></span> Haz clic en un recuadro del diagrama para ver su sketch';
      document.body.appendChild(hint);
      var hide = function () { hint.setAttribute('data-hide', 'true'); };
      document.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('[data-node-id]')) hide();
      }, true);
      setTimeout(hide, 12000);
    }
  }

  function boot() {
    decorate();
    var id = idFromHash();
    if (id) open(id);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('hashchange', function () {
    var id = idFromHash();
    if (id && modal.hasAttribute('hidden')) open(id);
    else if (!id && !modal.hasAttribute('hidden')) close();
  });
})();

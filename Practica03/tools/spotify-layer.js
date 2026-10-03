/* ============================================================
   CAPA SPOTIFY — runtime de la ficha ampliada
   Se inyecta al final del <body> del HTML de Archify.
   No modifica el SVG, por lo que las exportaciones PNG/SVG/WebM
   y el modo embed siguen produciendo el diagrama puro.
   ============================================================ */
(function () {
  'use strict';

  var dataEl = document.getElementById('spotify-canvas-detail');
  var overlay = document.getElementById('scx-overlay');
  var sheet = document.getElementById('scx-sheet');
  var svg = document.querySelector('.diagram-container svg');
  if (!dataEl || !overlay || !sheet || !svg) return;

  var DATA;
  try {
    DATA = JSON.parse(dataEl.textContent);
  } catch (_) {
    return;
  }

  var NODES = DATA.bloques || {};
  var CARDS = DATA.tarjetas || [];
  var RELATIONS = DATA.relaciones || {};
  var PALETTE = DATA.paleta || {};
  var ORDER = Object.keys(NODES).sort(function (a, b) {
    return (NODES[a].numero || 0) - (NODES[b].numero || 0);
  });

  var el = {
    badge: document.getElementById('scx-num'),
    title: document.getElementById('scx-title'),
    sub: document.getElementById('scx-sub'),
    tag: document.getElementById('scx-tag'),
    desc: document.getElementById('scx-desc'),
    items: document.getElementById('scx-items'),
    aporta: document.getElementById('scx-aporta'),
    riesgos: document.getElementById('scx-riesgos'),
    rel: document.getElementById('scx-rel'),
    index: document.getElementById('scx-index'),
    readings: document.getElementById('scx-readings'),
    pos: document.getElementById('scx-pos'),
    prev: document.getElementById('scx-prev'),
    next: document.getElementById('scx-next'),
    close: document.getElementById('scx-close')
  };

  var current = null;
  var lastTrigger = null;

  /* ---------- helpers ---------- */

  function setText(node, value) {
    if (node) node.textContent = value == null ? '' : String(value);
  }

  function setList(node, items) {
    if (!node) return;
    node.textContent = '';
    (items || []).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = String(item);
      node.appendChild(li);
    });
  }

  function makeChip(kind, id, numero, titulo, corto) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'scx-chip';
    chip.setAttribute('data-id', id);
    chip.setAttribute('data-kind', kind);
    chip.setAttribute('aria-current', 'false');
    chip.title = titulo;
    chip.setAttribute('aria-label', 'Abrir ficha ampliada: ' + titulo);

    var num = document.createElement('span');
    num.className = 'scx-chip-num';
    num.textContent = numero;

    var name = document.createElement('span');
    name.textContent = corto || titulo;

    chip.appendChild(num);
    chip.appendChild(name);
    return chip;
  }

  /* ---------- relaciones del lienzo ---------- */

  function renderRelations(id) {
    var host = el.rel;
    if (!host) return;
    host.textContent = '';
    var group = RELATIONS[id];
    var rows = []
      .concat((group && group.entrantes) || [])
      .concat((group && group.salientes) || []);
    if (!rows.length) {
      var empty = document.createElement('p');
      empty.className = 'scx-rel-empty';
      empty.textContent = 'Este bloque no tiene conexiones directas con otros.';
      host.appendChild(empty);
      return;
    }
    rows.forEach(function (entry) {
      var row = document.createElement('div');
      row.className = 'scx-rel-item';
      row.setAttribute('data-dir', entry.dir);

      var dir = document.createElement('span');
      dir.className = 'scx-rel-dir';
      dir.textContent = entry.dir === 'in' ? 'Recibe de' : 'Entrega a';

      var target = document.createElement('span');
      target.className = 'scx-rel-target';
      target.textContent = entry.title;

      var label = document.createElement('span');
      label.className = 'scx-rel-label';
      label.textContent = entry.label ? entry.label : '';

      row.appendChild(dir);
      row.appendChild(target);
      row.appendChild(label);
      host.appendChild(row);
    });
  }

  /* ---------- pintado ---------- */

  function applyAccent(id) {
    var accent = PALETTE[id] || {};
    if (accent.stroke) sheet.style.setProperty('--scx-node-stroke', accent.stroke);
    if (accent.fill) sheet.style.setProperty('--scx-node-fill', accent.fill);
  }

  function syncChips() {
    var chips = document.querySelectorAll('.scx-chip, .scx-reading');
    for (var i = 0; i < chips.length; i += 1) {
      var on = chips[i].getAttribute('data-id') === current;
      chips[i].setAttribute('aria-current', on ? 'true' : 'false');
    }
  }

  function paintNode(id) {
    var node = NODES[id];
    if (!node) return;
    setText(el.badge, node.numero);
    setText(el.title, node.titulo);
    setText(el.sub, node.subtitulo);
    setText(el.tag, node.tag);
    setText(el.desc, node.descripcion);
    setList(el.items, node.elementos);
    setList(el.aporta, node.aporta);
    setList(el.riesgos, node.riesgos);
    renderRelations(id);
    applyAccent(id);
    setText(el.pos, node.numero + ' / ' + ORDER.length);
  }

  function paintCard(id) {
    var card = null;
    for (var i = 0; i < CARDS.length; i += 1) {
      if (CARDS[i].id === id) card = CARDS[i];
    }
    if (!card) return;
    setText(el.badge, card.numero);
    setText(el.title, card.titulo);
    setText(el.sub, card.subtitulo);
    setText(el.tag, 'Ficha ampliada · ' + card.id);
    setText(el.desc, card.descripcion);
    setList(el.items, card.elementos);
    setList(el.aporta, card.aporta);
    setList(el.riesgos, card.riesgos);
    renderRelations(card.id);
    applyAccent(card.id);
    setText(el.pos, card.numero + ' / ' + CARDS.length);
  }

  /* ---------- apertura y cierre ---------- */

  function open(kind, id, trigger) {
    if (kind === 'node') {
      if (!NODES[id]) return;
      current = id;
      paintNode(id);
    } else {
      if (!id) return;
      current = id;
      paintCard(id);
    }
    lastTrigger = trigger || null;
    overlay.removeAttribute('hidden');
    document.documentElement.setAttribute('data-scx-open', 'true');
    syncChips();
    if (el.close) el.close.focus();
  }

  function close() {
    if (overlay.hasAttribute('hidden')) return;
    overlay.setAttribute('hidden', '');
    document.documentElement.removeAttribute('data-scx-open');
    syncChips();
    var target = lastTrigger;
    lastTrigger = null;
    if (target && typeof target.focus === 'function') target.focus();
  }

  function isOpen() {
    return !overlay.hasAttribute('hidden');
  }

  function step(delta) {
    if (!current) return;
    var pos = ORDER.indexOf(current);
    if (pos < 0) return;
    var id = ORDER[(pos + delta + ORDER.length) % ORDER.length];
    current = id;
    paintNode(id);
    syncChips();
  }

  function isEditable(target) {
    var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!(target && target.isContentEditable);
  }

  /* ---------- eventos ---------- */

  svg.addEventListener('click', function (event) {
    if (isOpen()) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (isEditable(event.target)) return;
    if (svg.hasAttribute('data-route-picking') || svg.hasAttribute('data-route-active')) return;
    var group = event.target.closest ? event.target.closest('[data-node-id]') : null;
    if (!group) return;
    var id = group.getAttribute('data-node-id');
    if (!NODES[id]) return;
    open('node', id, group);
  }, true);

  svg.addEventListener('keydown', function (event) {
    if (isOpen()) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    var group = event.target.closest ? event.target.closest('[data-node-id]') : null;
    if (!group) return;
    var id = group.getAttribute('data-node-id');
    if (!NODES[id]) return;
    event.preventDefault();
    open('node', id, group);
  }, true);

  /* El indice vive dentro de la ficha (overlay) y no en el flujo de la pagina.
     Motivo tecnico: Archify.readerLayout mide unicamente .header,
     .guided-views y .cards para encajar el SVG en la ventana; un bloque mas
     en el flujo queda fuera de ese presupuesto, settleOverflow() reduce el
     ancho, measure() lo restaura y el lazo no converge. Como overlay, la
     ficha no altera el alto del documento. */
  function onChipClick(event) {
    var chip = event.target.closest ? event.target.closest('.scx-chip, .scx-reading') : null;
    if (!chip) return;
    var id = chip.getAttribute('data-id');
    if (chip.getAttribute('data-kind') === 'card') {
      open('card', id, chip);
      return;
    }
    if (!NODES[id]) return;
    current = id;
    paintNode(id);
    syncChips();
  }

  el.index.addEventListener('click', onChipClick);

  ORDER.forEach(function (id) {
    el.index.appendChild(makeChip('node', id, NODES[id].numero, NODES[id].titulo, NODES[id].corto));
  });

  if (el.readings && CARDS.length) {
    el.readings.textContent = '';
    CARDS.forEach(function (card) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scx-reading';
      btn.setAttribute('data-id', card.id);
      btn.setAttribute('data-kind', 'card');
      btn.setAttribute('aria-current', 'false');

      var name = document.createElement('span');
      name.className = 'scx-reading-name';
      name.textContent = card.titulo;

      var desc = document.createElement('span');
      desc.className = 'scx-reading-desc';
      desc.textContent = card.subtitulo || '';

      btn.appendChild(name);
      btn.appendChild(desc);
      el.readings.appendChild(btn);
    });
    el.readings.addEventListener('click', onChipClick);
  }

  /* ---------- controles ---------- */

  el.prev.addEventListener('click', function () { step(-1); });
  el.next.addEventListener('click', function () { step(1); });
  el.close.addEventListener('click', close);

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', function (event) {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'Tab') {
      var focusable = sheet.querySelectorAll('button:not(:disabled)');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }, true);
})();
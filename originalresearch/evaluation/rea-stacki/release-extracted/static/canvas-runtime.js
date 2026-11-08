// Canvas Runtime - injected into the preview iframe
// Communicates with the editor via postMessage
(function() {
  'use strict';

  let selectedId = null;
  let hoveredId = null;
  let isDragging = false;

  // Find the smallest element under a point
  function elementAtPoint(x, y) {
    const all = document.querySelectorAll('[data-eid]');
    let best = null;
    let bestArea = Infinity;

    all.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const area = rect.width * rect.height;
        if (area < bestArea) {
          best = el;
          bestArea = area;
        }
      }
    });

    return best;
  }

  // Get rect relative to viewport
  function getRect(el) {
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      right: r.right
    };
  }

  // Send message to parent editor
  function send(type, data) {
    window.parent.postMessage({ source: 'canvas-runtime', type, ...data }, '*');
  }

  // Mouse move - hover detection
  document.addEventListener('mousemove', function(e) {
    if (isDragging) return;

    const el = elementAtPoint(e.clientX, e.clientY);
    const eid = el ? el.getAttribute('data-eid') : null;

    if (eid !== hoveredId) {
      hoveredId = eid;
      send('hover', {
        elementId: eid,
        rect: el ? getRect(el) : null
      });
    }
  });

  // Mouse leave
  document.addEventListener('mouseleave', function() {
    hoveredId = null;
    send('hover', { elementId: null, rect: null });
  });

  // Click - selection
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = elementAtPoint(e.clientX, e.clientY);
    const eid = el ? el.getAttribute('data-eid') : null;

    if (eid) {
      selectedId = eid;
      send('select', {
        elementId: eid,
        rect: getRect(el)
      });
    }
  });

  // Double-click - enable text editing
  document.addEventListener('dblclick', function(e) {
    const el = elementAtPoint(e.clientX, e.clientY);
    if (!el) return;

    const eid = el.getAttribute('data-eid');
    const tag = el.tagName.toLowerCase();

    // Only allow text editing on text-bearing elements
    const textTags = ['h1','h2','h3','h4','h5','h6','p','span','a','button','label','li','summary','blockquote','code','pre','td','th','dt','dd','figcaption'];
    if (textTags.includes(tag) && el.children.length === 0) {
      send('dblclick', { elementId: eid });
    }
  });

  // Drag and drop support
  document.addEventListener('mousedown', function(e) {
    const el = elementAtPoint(e.clientX, e.clientY);
    if (!el) return;

    const eid = el.getAttribute('data-eid');
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev) {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);

      if (dx + dy > 5 && !isDragging) {
        isDragging = true;
        send('drag-start', { elementId: eid });
      }

      if (isDragging) {
        const target = elementAtPoint(ev.clientX, ev.clientY);
        if (target && target !== el) {
          const targetEid = target.getAttribute('data-eid');
          const rect = target.getBoundingClientRect();
          const relY = ev.clientY - rect.top;
          const position = relY < rect.height * 0.33 ? 'before'
            : relY > rect.height * 0.67 ? 'after'
            : 'inside';

          send('drag-over', {
            targetId: targetEid,
            position,
            rect: getRect(target)
          });
        }
      }
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      if (isDragging) {
        const target = elementAtPoint(ev.clientX, ev.clientY);
        if (target && target !== el) {
          const targetEid = target.getAttribute('data-eid');
          const rect = target.getBoundingClientRect();
          const relY = ev.clientY - rect.top;
          const position = relY < rect.height * 0.33 ? 'before'
            : relY > rect.height * 0.67 ? 'after'
            : 'inside';

          send('drop', {
            sourceId: eid,
            targetId: targetEid,
            position
          });
        }
        send('drag-end', {});
        isDragging = false;
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Scroll reporting
  let scrollTimer = null;
  document.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      send('scroll', {
        x: window.scrollX || document.documentElement.scrollLeft,
        y: window.scrollY || document.documentElement.scrollTop
      });
    }, 50);
  }, true);

  // Respond to highlight commands from editor
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== 'canvas-editor') return;

    switch (e.data.type) {
      case 'highlight': {
        const el = document.querySelector(`[data-eid="${e.data.elementId}"]`);
        if (el) {
          send('highlight-rect', {
            elementId: e.data.elementId,
            rect: getRect(el)
          });
        }
        break;
      }
      case 'scroll-to': {
        const el = document.querySelector(`[data-eid="${e.data.elementId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
      case 'get-all-rects': {
        const rects = {};
        document.querySelectorAll('[data-eid]').forEach(el => {
          rects[el.getAttribute('data-eid')] = getRect(el);
        });
        send('all-rects', { rects });
        break;
      }
    }
  });

  // Notify editor that runtime is ready
  send('ready', {});
})();

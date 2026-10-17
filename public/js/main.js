/* Smart Campus Admin — tiện ích dùng chung cho mọi trang */
(function () {
  'use strict';
  var root = document.documentElement;
  var SC = {};

  /* ---------- Theme ---------- */
  SC.isDark = function () { return root.classList.contains('dark'); };
  SC.setTheme = function (dark) {
    root.classList.add('theme-transition');
    setTimeout(function () { root.classList.remove('theme-transition'); }, 450);
    root.classList.toggle('dark', dark);
    try { localStorage.setItem('sc-theme', dark ? 'dark' : 'light'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark: dark } }));
  };

  /* ---------- Icons ---------- */
  SC.icons = function () { if (window.lucide) window.lucide.createIcons(); };

  /* ---------- Tiện ích ---------- */
  SC.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  SC.debounce = function (fn, ms) {
    var t;
    return function () { var a = arguments, ctx = this; clearTimeout(t); t = setTimeout(function () { fn.apply(ctx, a); }, ms || 300); };
  };
  SC.formatDate = function (d) {
    if (!d) return '—';
    var x = new Date(d);
    return x.toLocaleDateString('vi-VN') + ' ' + x.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };
  SC.timeAgo = function (d) {
    if (!d) return 'Chưa đăng nhập';
    var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'Vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    if (s < 7 * 86400) return Math.floor(s / 86400) + ' ngày trước';
    return new Date(d).toLocaleDateString('vi-VN');
  };
  var GRADS = [
    ['#6366f1', '#8b5cf6'], ['#06b6d4', '#3b82f6'], ['#10b981', '#06b6d4'],
    ['#f59e0b', '#f43f5e'], ['#ec4899', '#8b5cf6'], ['#14b8a6', '#6366f1']
  ];
  SC.hash = function (s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  SC.avatar = function (name, size) {
    var g = GRADS[SC.hash(name) % GRADS.length];
    var parts = String(name || '?').trim().split(/\s+/);
    var ini = (parts[parts.length - 1].charAt(0) + (parts.length > 1 ? parts[0].charAt(0) : '')).toUpperCase();
    return '<span class="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 ' + (size || 'h-10 w-10 text-sm') +
      '" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')">' + SC.esc(ini) + '</span>';
  };
  SC.accent = function (key) { var g = GRADS[SC.hash(key) % GRADS.length]; return 'linear-gradient(180deg,' + g[0] + ',' + g[1] + ')'; };
  SC.genPassword = function (len) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    var out = '';
    var buf = new Uint32Array(len || 10);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < buf.length; i++) out += chars[buf[i] % chars.length];
    return out;
  };
  SC.countUp = function (el, to, ms) {
    var start = null, dur = ms || 900;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('vi-VN');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  /* ---------- Làm sạch HTML (chỉ giữ thẻ định dạng cơ bản) ---------- */
  var ALLOWED = ['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'P', 'BR', 'H3', 'H4', 'BLOCKQUOTE', 'DIV'];
  var DROP = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'];
  SC.sanitizeHtml = function (html) {
    var doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    (function clean(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1) { ch.remove(); return; }
        if (DROP.indexOf(ch.tagName) !== -1) { ch.remove(); return; }
        clean(ch);
        if (ALLOWED.indexOf(ch.tagName) === -1) {
          var kids = Array.prototype.slice.call(ch.childNodes);
          kids.forEach(function (k) { ch.parentNode.insertBefore(k, ch); });
          ch.remove();
        } else {
          Array.prototype.slice.call(ch.attributes).forEach(function (a) { ch.removeAttribute(a.name); });
        }
      });
    })(doc.body);
    return doc.body.innerHTML;
  };
  SC.stripHtml = function (html) {
    var d = document.createElement('div');
    d.innerHTML = SC.sanitizeHtml(html);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  };

  /* ---------- API ---------- */
  SC.api = function (url, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.status === 401 && url.indexOf('/api/auth/login') !== 0) {
          window.location.href = '/login';
          throw new Error((data && data.message) || 'Phiên đăng nhập đã hết hạn');
        }
        if (!res.ok) throw new Error((data && data.message) || 'Đã xảy ra lỗi (' + res.status + ')');
        return data;
      });
    });
  };

  /* ---------- Toast & hộp thoại xác nhận (SweetAlert2) ---------- */
  SC.toast = function (type, message) {
    if (!window.Swal) { alert(message); return; }
    var dark = SC.isDark();
    Swal.fire({
      toast: true, position: 'top-end', icon: type, title: message,
      showConfirmButton: false, timer: 3200, timerProgressBar: true,
      background: dark ? '#161a2b' : '#ffffff', color: dark ? '#e8ebf5' : '#0f172a',
      didOpen: function (t) {
        t.addEventListener('mouseenter', Swal.stopTimer);
        t.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
  };
  SC.confirm = function (opts) {
    var dark = SC.isDark();
    return Swal.fire({
      title: opts.title, text: opts.text, icon: opts.icon || 'warning',
      showCancelButton: true, confirmButtonText: opts.confirmText || 'Xác nhận', cancelButtonText: 'Hủy',
      confirmButtonColor: opts.danger ? '#e11d48' : '#6366f1', cancelButtonColor: '#64748b', reverseButtons: true,
      background: dark ? '#131728' : '#ffffff', color: dark ? '#e8ebf5' : '#0f172a'
    }).then(function (r) { return r.isConfirmed; });
  };

  /* ---------- Modal ---------- */
  SC.openModal = function (id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    var first = m.querySelector('input:not([type=hidden]), select, textarea');
    if (first) setTimeout(function () { first.focus(); }, 250);
  };
  SC.closeModal = function (id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('open');
    if (!document.querySelector('.modal.open')) document.body.style.overflow = '';
  };
  document.addEventListener('click', function (e) {
    var closer = e.target.closest('[data-close-modal]');
    if (closer) { var m = closer.closest('.modal'); if (m) SC.closeModal(m.id); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(function (m) { SC.closeModal(m.id); });
      root.classList.remove('sb-open');
    }
  });

  /* ---------- Màu biểu đồ theo theme ---------- */
  SC.chartTheme = function () {
    var d = SC.isDark();
    return {
      text: d ? '#9aa4c4' : '#64748b',
      grid: d ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)',
      tooltipBg: d ? '#0b0e1b' : '#0f172a',
      surface: d ? '#131728' : '#ffffff'
    };
  };

  /* ---------- Khởi tạo chung ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { SC.setTheme(!SC.isDark()); });
    });

    document.querySelectorAll('[data-sidebar-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (window.matchMedia('(min-width: 1024px)').matches) {
          var c = root.classList.toggle('sb-collapsed');
          try { localStorage.setItem('sc-sidebar', c ? 'collapsed' : 'open'); } catch (e) {}
        } else {
          root.classList.toggle('sb-open');
        }
      });
    });
    var overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', function () { root.classList.remove('sb-open'); });

    document.querySelectorAll('[data-logout]').forEach(function (b) {
      b.addEventListener('click', function () {
        SC.confirm({ title: 'Đăng xuất?', text: 'Bạn sẽ cần đăng nhập lại để tiếp tục quản trị.', icon: 'question', confirmText: 'Đăng xuất' }).then(function (ok) {
          if (!ok) return;
          SC.api('/api/auth/logout', { method: 'POST' }).finally(function () { window.location.href = '/login'; });
        });
      });
    });

    SC.icons();
  });

  window.SC = SC;
})();

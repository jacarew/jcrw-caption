(() => {
  const $ = (id) => document.getElementById(id);
  const setup = $('setup');
  const caption = $('caption');
  const status = $('status');
  const phoneIp = $('phoneIp');
  const pin = $('pin');
  let ws = null;
  let clearTimer = 0;
  let hdmiShown = false;

  phoneIp.value = localStorage.getItem('jcrw.phoneIp') || '';
  pin.value = '';

  function setStatus(text) { status.textContent = text; }

  function cssColor(value) {
    let number = Number(value) >>> 0;
    const alpha = (number >>> 24) / 255;
    const red = (number >>> 16) & 255;
    const green = (number >>> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
  }

  function showCaption(message) {
    const style = message.style || {};
    caption.textContent = message.speaker ? `${message.speaker}: ${message.text || ''}` : (message.text || '');
    caption.style.color = cssColor(style.textColor ?? 0xffffffff);
    caption.style.backgroundColor = cssColor(style.backgroundColor ?? 0xff000000);
    caption.style.fontSize = `${Math.max(2, Math.min(8, Number(style.textSize || 14) * 0.25))}vh`;
    const manualBox = !!style.brushManualBox;
    const widthPct = Math.max(30, Math.min(96, Number(style.widthPercent || 86)));
    const heightPct = Math.max(5, Math.min(40, Number(style.heightPercent || 18)));

    caption.style.boxSizing = 'border-box';
    caption.style.alignItems = 'center';
    caption.style.justifyContent = 'center';
    caption.style.textAlign = 'center';

    if (manualBox) {
      caption.style.width = `${widthPct}%`;
      caption.style.maxWidth = `${widthPct}%`;
      caption.style.height = `${heightPct}vh`;
      caption.style.minHeight = '0px';
    } else {
      caption.style.width = 'fit-content';
      caption.style.maxWidth = `${widthPct}%`;
      caption.style.height = 'auto';
      caption.style.minHeight = '0px';
    }

    caption.style.left = `${Math.max(2, Math.min(98, Number(message.x ?? .5) * 100))}%`;
    caption.style.top = `${Math.max(2, Math.min(98, Number(message.y ?? .86) * 100))}%`;
    caption.style.bottom = 'auto';
    caption.style.transform = 'translate(-50%, -50%)';

    const bgStyle = String(style.backgroundStyle || 'solid');
    if (bgStyle.startsWith('brush_') && phoneIp.value) {
      const brushUrl = `http://${phoneIp.value}:43823/brush/${bgStyle}.png`;
      caption.style.webkitMaskImage = `url("${brushUrl}")`;
      caption.style.maskImage = `url("${brushUrl}")`;
      caption.style.webkitMaskSize = '100% 100%';
      caption.style.maskSize = '100% 100%';
      caption.style.webkitMaskRepeat = 'no-repeat';
      caption.style.maskRepeat = 'no-repeat';
      caption.style.borderRadius = '0px';
      caption.style.padding = '2.2vh 3.5vw';
    } else {
      caption.style.webkitMaskImage = 'none';
      caption.style.maskImage = 'none';
      caption.style.borderRadius = style.extraOpacity ? '0px' : '12px';
      caption.style.padding = '1.4vh 2.2vw';
    }

    caption.classList.toggle('visible', style.visible !== false && !!message.text);
    window.clearTimeout(clearTimer);
    if (message.text) clearTimer = window.setTimeout(() => caption.classList.remove('visible'), 5000);
  }

  function connect() {
    const ip = phoneIp.value.trim();
    const code = pin.value.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { setStatus('Geçerli tablet IP adresini girin.'); return; }
    if (code.length !== 6 && !localStorage.getItem('jcrw.tizenToken')) { setStatus('Tablet uygulamasındaki 6 haneli kodu girin.'); return; }
    localStorage.setItem('jcrw.phoneIp', ip);
    if (ws) { try { ws.close(); } catch (_) {} }
    ws = new WebSocket(`ws://${ip}:43822/`);
    ws.onopen = () => {
      const token = localStorage.getItem('jcrw.tizenToken');
      ws.send(token ? JSON.stringify({type:'auth', token}) : JSON.stringify({type:'pair', pin:code}));
      setStatus('Tablete bağlanıyor…');
    };
    ws.onmessage = (event) => {
      let data; try { data = JSON.parse(event.data); } catch (_) { return; }
      if (data.type === 'paired') {
        if (data.token) localStorage.setItem('jcrw.tizenToken', data.token);
        pin.value = ''; setStatus('Tablet bağlandı. HDMI görüntüsünü açabilirsiniz.');
        setup.hidden = true;
      } else if (data.type === 'caption') showCaption(data);
      else if (data.type === 'error') { localStorage.removeItem('jcrw.tizenToken'); setStatus(data.message || 'Eşleştirme başarısız.'); }
    };
    ws.onerror = () => setStatus('Bağlantı kurulamadı. Tablet ve TV’nin aynı Wi‑Fi ağında olduğunu kontrol edin.');
    ws.onclose = () => { if (setup.hidden) setStatus('Tablet bağlantısı kesildi. Ayarlardan tekrar bağlanın.'); };
  }

  function showHdmi() {
    if (!window.tizen?.tvwindow) { setStatus('TVWindow API kullanılamıyor. Samsung Tizen TV uygulaması olarak yükleyin.'); return; }
    try {
      const width = Math.max(1280, window.screen.width || 1920);
      const height = Math.max(720, window.screen.height || 1080);
      window.tizen.tvwindow.show(
        () => { hdmiShown = true; setup.hidden = true; setStatus('HDMI görüntüsü açık. Altyazılar burada gösterilir.'); },
        (error) => setStatus(`HDMI açılamadı: ${error.message || error.name}`),
        ['0px','0px',`${width}px`,`${height}px`], 'MAIN', 'BEHIND'
      );
    } catch (error) { setStatus(`TVWindow hatası: ${error.message}`); }
  }

  function closeReceiver() {
    try { if (hdmiShown) window.tizen.tvwindow.hide(() => {}, () => {}, 'MAIN'); } catch (_) {}
    try { window.tizen.application.getCurrentApplication().exit(); } catch (_) { setup.hidden = false; }
  }

  $('connect').addEventListener('click', connect);
  $('showHdmi').addEventListener('click', showHdmi);
  $('menuButton').addEventListener('click', () => { setup.hidden = !setup.hidden; if (!setup.hidden) phoneIp.focus(); });
  $('exitButton').addEventListener('click', closeReceiver);
  document.addEventListener('visibilitychange', () => { if (document.hidden && ws) ws.close(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' || event.keyCode === 10009) closeReceiver(); });
})();

/* Nymind's TV visual layer v4.0. ES5 / Tizen 3.0 / Chromium 47.
   Intentionally does not listen for remote keys or use TizenBrew modules.
   Safe if wallpaper/weather servers are temporarily unavailable. */
(function () {
  'use strict';
  var blocks = [
    {from:6,to:8,file:'06',name:'Úsvit na pobřeží',part:'NOVÝ DEN',hi:'Dobré ráno.',sub:'Každý příběh někde začíná.'},
    {from:8,to:10,file:'08',name:'Světlé ráno',part:'RANNÍ POHODA',hi:'Příjemné ráno.',sub:'Dopřej si chvíli jen pro sebe.'},
    {from:10,to:12,file:'10',name:'Čisté dopoledne',part:'DOPOLEDNÍ SVĚTLO',hi:'Krásné dopoledne.',sub:'Najdi něco, co tě vtáhne.'},
    {from:12,to:14,file:'12',name:'Polední klid',part:'POLEDNÍ PAUZA',hi:'Pěkné poledne.',sub:'Na chvíli vypni svět okolo.'},
    {from:14,to:16,file:'14',name:'Slunečné odpoledne',part:'ODPOLEDNÍ RYTMUS',hi:'Hezké odpoledne.',sub:'Dobrý příběh nikdy nepočká.'},
    {from:16,to:18,file:'16',name:'Zlatá hodina',part:'ZLATÁ HODINA',hi:'Příjemný podvečer.',sub:'Teď už nikam nespěchej.'},
    {from:18,to:20,file:'18',name:'Podvečerní město',part:'VEČERNÍ POHODA',hi:'Dobrý večer.',sub:'Pohodlně se usaď.'},
    {from:20,to:22,file:'20',name:'Světla po setmění',part:'VEČERNÍ KLID',hi:'Dobrý večer.',sub:'Teď začíná tvůj čas.'},
    {from:22,to:6,file:'22',name:'Hluboká noc',part:'NOČNÍ REŽIM',hi:'Klidnou noc.',sub:'Ještě jeden dobrý příběh?'}
  ];
  var $ = function (id) { return document.getElementById(id); };
  var displayed = -1, requested = 0, transitionTimer = null, weatherXHR = null;
  var wallpaper = $('wallpaper'), next = $('wallpaper-next');
  function getBlock(hour) {
    for (var i=0;i<blocks.length;i++) {
      var b=blocks[i];
      if (b.from < b.to && hour >= b.from && hour < b.to) return i;
      if (b.from > b.to && (hour >= b.from || hour < b.to)) return i;
    }
    return 7;
  }
  function imageFile(b) { return (window.NYMIND_PREVIEW_WALLPAPER_PREFIX || '') + 'wallpapers/wallpaper-' + b.file + '.jpg'; }
  function fadeTo(url) {
    if (transitionTimer) { clearTimeout(transitionTimer); transitionTimer=null; }
    next.style.backgroundImage='url("' + url + '")';
    next.style.opacity='0';
    // Make sure the browser applies the initial opacity before the fade.
    next.offsetWidth;
    next.style.opacity='1';
    transitionTimer=setTimeout(function () {
      wallpaper.style.backgroundImage='url("' + url + '")';
      next.style.opacity='0';
      transitionTimer=null;
    },930);
  }
  function update() {
    var simulated=window.NYMIND_PREVIEW_HOUR;
    var i=getBlock(typeof simulated==='number' ? simulated : (new Date()).getHours());
    var b=blocks[i];
    $('part').textContent=b.part;
    $('greeting').textContent=b.hi;
    $('subtext').textContent=b.sub;
    $('wallpapername').textContent=b.name;
    if (i === displayed) return;
    displayed=i;
    var req=++requested;
    var local=imageFile(b);
    var preload=new Image();
    preload.onload=function () { if (requested===req) fadeTo(local); };
    preload.onerror=function () {
      // Older TizenBrew installations occasionally resolve image paths differently.
      // Use absolute CDN path only if the packaged local path cannot be found.
      var remote='https://cdn.jsdelivr.net/gh/romangazdik-web/nyminds-tv@main/app/' + local;
      var fallback=new Image();
      fallback.onload=function () { if (requested===req) fadeTo(remote); };
      fallback.src=remote;
    };
    preload.src=local;
  }
  function showWeather(data) {
    if (!data || !data.current || typeof data.current.temperature_2m !== 'number') return;
    var code=Number(data.current.weather_code), symbol='☁';
    if (code===0) symbol='☀';
    else if (code===1 || code===2) symbol='◐';
    else if (code>=51 && code<=82) symbol='☂';
    else if (code>=71 && code<=77) symbol='❄';
    else if (code>=95) symbol='⚡';
    $('weather-symbol').textContent=symbol;
    $('weather-text').textContent='Uherský Brod  ·  ' + Math.round(data.current.temperature_2m) + ' °C';
    $('weather').style.display='-webkit-flex';
    $('weather').style.display='flex';
  }
  function refreshWeather() {
    // Never block page load. No fake temperature if an old TV cannot reach the API.
    var url='https://api.open-meteo.com/v1/forecast?latitude=49.025&longitude=17.647&current=temperature_2m,weather_code&timezone=Europe%2FPrague';
    try {
      if (weatherXHR) { try { weatherXHR.abort(); } catch(e) {} }
      var xhr=new XMLHttpRequest(); weatherXHR=xhr;
      xhr.open('GET',url,true);
      xhr.timeout=7000;
      xhr.onreadystatechange=function () {
        if (xhr.readyState!==4) return;
        if (xhr.status!==200) return;
        try { showWeather(JSON.parse(xhr.responseText)); } catch (e) {}
      };
      xhr.send(null);
    } catch(e) {}
  }
  window.NYMIND_PREVIEW_UPDATE=update; // Optional offline PC preview hook; unused on Samsung.
  update();
  if (!window.NYMIND_PREVIEW_OFFLINE) refreshWeather();
  setInterval(update,30000);
  if (!window.NYMIND_PREVIEW_OFFLINE) setInterval(refreshWeather,1800000);
  if (document.addEventListener) document.addEventListener('visibilitychange',function(){if(!document.hidden) update();},false);
})();

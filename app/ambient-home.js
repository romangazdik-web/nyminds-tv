/* Nymind OS 4.0 — living home, built for Samsung Tizen 3.0 / Chromium 47.
 * Zero dependencies; takes REAL weather only from the existing Open-Meteo request.
 * No change to module launching, video/audio, IPTV or PS5 code.
 */
(function () {
  'use strict';
  var names={auto:'Automaticky',cinema:'Cinematic',vice:'Vice Nights',winter:'Snowfall',christmas:'Vánoční svět',rain:'Rainy City'};
  var order=['auto','cinema','vice','winter','christmas','rain'];
  var manual='auto', meteo=null, weatherKnown=false, applied='', lastTick='', toastTimer=0;
  var body=document.body;
  function $(id){return document.getElementById(id);}
  function read(){try{return localStorage.getItem('nymind.os4.mode')||'auto';}catch(e){return 'auto';}}
  function save(){try{localStorage.setItem('nymind.os4.mode',manual);}catch(e){}}
  manual=read(); if(order.indexOf(manual)<0)manual='auto';
  function snow(code){return (code>=71&&code<=77)||code===85||code===86;}
  function rain(code){return (code>=51&&code<=67)||(code>=80&&code<=82)||(code>=95&&code<=99);}
  function holiday(d){return (d.getMonth()===11 && d.getDate()>=1) || (d.getMonth()===0&&d.getDate()<=6);}
  function choose(d) {
    if(manual!=='auto')return manual;
    var hour=d.getHours(),day=d.getDay(),mon=d.getMonth();
    if(holiday(d))return 'christmas';
    if(weatherKnown&&snow(meteo.weather_code))return 'winter';
    if(weatherKnown&&rain(meteo.weather_code))return 'rain';
    if(mon===11||mon===0||mon===1) return 'winter';
    if((day===5||day===6)&&hour>=16)return 'vice';
    if((mon>=4&&mon<=8)&&hour>=16&&hour<22)return 'vice';
    return 'cinema';
  }
  var texts={
    cinema:['TVOJE DOMÁCÍ KINO','Každý večer má svůj příběh.','Pusť si něco, co tě vtáhne.','Film, seriál, živé vysílání. Všechno na jednom místě.','CINEMA / NIGHT'],
    vice:['NYMIND AFTER DARK','Město patří tobě.','Tonight is yours.','Západ slunce, světla města a tvoje oblíbené aplikace.','VICE / SUNSET'],
    winter:['ZIMNÍ REŽIM','Venku je zima. Tady je pohoda.','Zimní večery mají svoje kouzlo.','Zůstaň v teple, pohodlně se usaď a užij si večer.','WINTER / FROST'],
    christmas:['SVÁTEČNÍ ATMOSFÉRA','Vánoční pohoda začíná tady.','Čas světel, klidu a dobrých příběhů.','Udělej si pohodlí. Nymind TV se naladil na svátky.','HOLIDAY / LIGHTS'],
    rain:['DEŠTIVÝ DEN','Déšť za oknem. Klid uvnitř.','Počasí na pořádný film.','Nech město za oknem a vyber si, na co máš náladu.','RAIN / CITY']
  };
  function put(id,txt){var el=$(id);if(el)el.textContent=txt;}
  function clearModes(){body.className=body.className.replace(/\bamb-(?:cinema|vice|winter|christmas|rain|snowing|raining)\b/g,'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');}
  function refresh(){
    var d=new Date(), mode=choose(d), isSnow=weatherKnown&&snow(meteo.weather_code), isRain=weatherKnown&&rain(meteo.weather_code);
    var visualSnow=isSnow||(manual==='winter'), visualRain=isRain||(manual==='rain');
    var sig=mode+'/'+visualSnow+'/'+visualRain+'/'+d.getHours()+'/'+manual;
    if(sig!==lastTick){
      clearModes();
      body.className+=(body.className?' ':'')+'amb-'+mode+(visualSnow?' amb-snowing':visualRain?' amb-raining':'');
      lastTick=sig;applied=mode;
    }
    var t=texts[mode],hour=d.getHours(),greeting=t[1];
    if(mode==='cinema')greeting=hour>=18?'Dnešní večer je tvůj.':hour<11?'Nový den. Nové příběhy.':t[1];
    if(mode==='winter'&&isSnow)greeting='Za oknem právě sněží.';
    if(mode==='christmas'&&isSnow)greeting='Zasněžené Vánoce.';
    put('part',t[0]);
    put('greeting',greeting);
    put('subtext',t[2]);
    put('amb-headline',t[3]);
    put('amb-scene-code',t[4]);
    put('amb-mode-name',names[mode]);
    put('amb-mode-status',manual==='auto'?'AUTO · podle počasí a času':'RUČNĚ · žluté tlačítko');
    put('amb-weather-line',weatherKnown ? (Math.round(meteo.temperature_2m)+' °C · Uherský Brod') : 'Uherský Brod · počasí se načítá');
    put('amb-season-line',mode==='christmas'?'Svátky a světla':mode==='winter'?'Zimní atmosféra':mode==='vice'?'Západ slunce a město':mode==='rain'?'Deštivá atmosféra':'Filmový svět');
    put('wallpapername','Nymind OS 4.0 · '+names[mode]);
    var button=$('amb-mode-pill');if(button)button.setAttribute('title','Žluté tlačítko: změna motivu');
  }
  function weather(current){
    if(current&&typeof current.temperature_2m==='number'&&typeof current.weather_code==='number'){
      meteo=current;weatherKnown=true;
    }
    refresh();
  }
  function cycle(){
    var i=order.indexOf(manual);
    manual=order[(i+1)%order.length];save();refresh();
    var toast=$('amb-toast');if(toast){toast.textContent='Motiv: '+(manual==='auto'?'Automaticky':names[manual]);toast.className='amb-toast visible';clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.className='amb-toast';},2100);}
  }
  function flakes(){
    var root=$('amb-particles');if(!root)return;
    // Small, GPU-friendly CSS-only particles. The screen stays usable on a 2017 TV.
    for(var i=0;i<25;i++){
      var f=document.createElement('i');f.className='amb-flake';
      f.style.left=((i*47+11)%100)+'%';f.style.top='-22px';
      f.style.width=(2+(i%4))+'px';f.style.height=f.style.width;
      f.style.opacity=(0.25+(i%5)*0.12).toFixed(2);
      var duration=(11+(i*7)%12)+'s',delay=('-'+((i*13)%21))+'s';
      f.style.webkitAnimationDuration=duration;f.style.animationDuration=duration;
      f.style.webkitAnimationDelay=delay;f.style.animationDelay=delay;
      root.appendChild(f);
    }
    for(var j=0;j<20;j++){
      var r=document.createElement('i');r.className='amb-drop';
      r.style.left=((j*41+4)%100)+'%';
      r.style.webkitAnimationDelay=('-'+(j*3%9))+'s';r.style.animationDelay=('-'+(j*3%9))+'s';
      root.appendChild(r);
    }
  }
  function lights(){
    var node=$('amb-lights');if(!node)return;
    for(var i=0;i<19;i++){var x=document.createElement('i');x.style.left=(4+i*5)+'%';x.style.top=(i%2===0?'0':'9')+'px';node.appendChild(x);}
  }
  flakes();lights();
  window.NYMIND_AMBIENT={refresh:refresh,weather:weather,cycle:cycle};
  if(window.NYMIND_CURRENT_WEATHER)weather(window.NYMIND_CURRENT_WEATHER);
  else refresh();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();},false);
}());
/* NYMIND NOVA 0.1.0 — independent launcher, ES5, Samsung Tizen 3 / Chromium 47.
 * Preserves existing installed modules; original Nymind OS branch is not touched.
 */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var screen=$('screen'), cards=document.querySelectorAll('#cards .appcard');
  var names=['Filmy a seriály','Živá televize','YouTube','Rádia','PlayStation 5'];
  var descriptions=['Nymind Cinema','Nymind LIVE','TizenTube','Signál · Rock Radio','HDMI 2'];
  var repoIds=['StremioK','tvpin','TizenTube-MojeTV','',''];
  var select=0, panel='', optionIndex=0, options=[], modules=[], loadingMods=false, pending=null, busy=false;
  var lastRadio=-1, radioUrls=[
    {name:'Signál Rádio',label:'České i světové melodie',urls:['https://icecast1.play.cz/signal128.mp3']},
    {name:'Rock Radio',label:'Rockové klasiky',urls:['https://ice.abradio.cz/rockradio128.mp3','https://ice.radia.cz/rockradio128.mp3']}
  ],audio=$('radio-player'), sourceIdx=0;
  var weatherCode=null,weatherTemp=null,theme='auto',effective='';
  var themeChoices=[
    {id:'auto',name:'Automatický',detail:'Počasí, svátky a denní doba'},
    {id:'signature',name:'Signature',detail:'Kinematografický výchozí vzhled'},
    {id:'winter',name:'Snowfall',detail:'Modrý zimní režim a vločky'},
    {id:'christmas',name:'Christmas',detail:'Zelené odstíny a sváteční záře'},
    {id:'vice',name:'Vice Sunset',detail:'Oranžový západ slunce'},
    {id:'rain',name:'Rain City',detail:'Temný deštivý večer'},
    {id:'minimal',name:'Monochrome',detail:'Čistý temný design bez barev'}
  ];
  try{theme=localStorage.getItem('nova.theme')||'auto';}catch(e){}
  function text(id,value){var el=$(id);if(el)el.textContent=value;}
  function fit(){
    var w=window.innerWidth||1920,h=window.innerHeight||1080;
    var scale=Math.min(w/1920,h/1080);if(!isFinite(scale)||scale<=0)scale=1;
    screen.style.webkitTransform='scale('+scale+')';screen.style.transform='scale('+scale+')';
    screen.style.left=((w-1920*scale)/2)+'px';screen.style.top=((h-1080*scale)/2)+'px';
  }
  function pad(n){return n<10?'0'+n:''+n;}
  function clock(){
    var d=new Date();text('clock',pad(d.getHours())+':'+pad(d.getMinutes()));
    text('dayline',d.getDay()===5?'PÁTEČNÍ VEČER':d.getDay()===6?'VÍKENDOVÝ REŽIM':'VYBER SI SVŮJ PROGRAM');
  }
  function snow(c){return(c>=71&&c<=77)||c===85||c===86;}
  function rain(c){return(c>=51&&c<=67)||(c>=80&&c<=82)||(c>=95&&c<=99);}
  function autoTheme(){
    var d=new Date(),month=d.getMonth(),day=d.getDate(),hour=d.getHours();
    if(month===11&&day>=1 || month===0&&day<=6)return 'christmas';
    if(weatherCode!==null&&snow(weatherCode))return 'winter';
    if(weatherCode!==null&&rain(weatherCode))return 'rain';
    if((month===11||month<=1)&&hour>=17)return 'winter';
    // Keep the premium Signature look by default. Vice Sunset is an optional manual theme.
    return 'signature';
  }
  function applyTheme(){
    effective=theme==='auto'?autoTheme():theme;
    screen.className='theme-'+effective;
    var label='SIGNATURE';for(var i=0;i<themeChoices.length;i++)if(themeChoices[i].id===effective)label=themeChoices[i].name.toUpperCase();
    text('mode-mark','NOVA / '+label);if(theme==='auto')text('mode-mark','NOVA / AUTO · '+label);
  }
  function setTheme(id){
    theme=id;try{localStorage.setItem('nova.theme',id);}catch(e){}
    applyTheme();closePanel();
  }
  function weather(){
    try{
      var x=new XMLHttpRequest();
      x.open('GET','https://api.open-meteo.com/v1/forecast?latitude=49.0251&longitude=17.6472&current=temperature_2m,weather_code&timezone=Europe%2FPrague',true);
      x.timeout=8000;
      x.onreadystatechange=function(){
        if(x.readyState!==4||x.status!==200)return;
        try{
          var d=JSON.parse(x.responseText).current;
          if(!d||typeof d.temperature_2m!=='number')return;
          weatherTemp=Math.round(d.temperature_2m);weatherCode=d.weather_code;
          var label=snow(weatherCode)?'Sněžení':rain(weatherCode)?'Déšť':weatherCode===0?'Jasno':weatherCode===1||weatherCode===2?'Polojasno':weatherCode===3?'Zataženo':weatherCode>=45&&weatherCode<=48?'Mlha':'Aktuální počasí';
          text('weather',weatherTemp+' °C · '+label);applyTheme();
        }catch(ignore){}
      };
      x.send(null);
    }catch(ignore){}
  }
  function snowflakes(){
    var area=$('precipitation');if(!area)return;
    for(var i=0;i<22;i++){
      var fl=document.createElement('div');fl.className='flake';
      var size=2+(i%4);fl.style.left=((i*43+8)%100)+'%';
      fl.style.height=size+'px';fl.style.width=size+'px';
      fl.style.webkitAnimationDuration=(10+i%10)+'s';
      fl.style.animationDuration=(10+i%10)+'s';
      fl.style.webkitAnimationDelay='-'+(i*7%18)+'s';
      fl.style.animationDelay='-'+(i*7%18)+'s';area.appendChild(fl);
    }
  }
  function selectCard(i){
    select=(i+cards.length)%cards.length;
    for(var j=0;j<cards.length;j++)cards[j].className=cards[j].className.replace(/ selected/g,'')+(j===select?' selected':'');
    text('dayline',names[select].toUpperCase()+' / '+descriptions[select].toUpperCase());
    try{cards[select].focus();}catch(ignore){}
  }
  function showStatus(msg){text('panel-status',msg);}
  function makeOption(label,detail,click){
    return {name:label,detail:detail||'',run:click};
  }
  function showPanel(kind,title,help,items){
    panel=kind;options=items||[];optionIndex=0;
    $('panel').className='panel';$('panel').setAttribute('aria-hidden','false');
    text('panel-kicker','NYMIND NOVA / '+kind.toUpperCase());
    text('panel-title',title);
    text('panel-help',help||'↑ ↓ vyber, OK potvrď, Zpět zavři.');
    showStatus('');drawOptions();
  }
  function drawOptions(){
    var container=$('options');container.innerHTML='';
    for(var i=0;i<options.length;i++){
      var opt=options[i],el=document.createElement('div');
      el.className='option'+(i===optionIndex?' selected':'');
      var n=document.createElement('strong');n.textContent=opt.name;el.appendChild(n);
      var arrow=document.createElement('span');arrow.className='option-icon';arrow.textContent='↗';el.appendChild(arrow);
      if(opt.detail){var d=document.createElement('span');d.className='option-detail';d.textContent=opt.detail;el.appendChild(d);}
      (function(j){el.onclick=function(){optionIndex=j;drawOptions();runOption();};}(i));
      container.appendChild(el);
    }
  }
  function closePanel(){
    panel='';$('panel').className='panel hidden';$('panel').setAttribute('aria-hidden','true');
    busy=false;selectCard(select);
  }
  function runOption(){if(options[optionIndex]&&options[optionIndex].run)options[optionIndex].run();}
  function openThemes(){
    var items=[];
    for(var i=0;i<themeChoices.length;i++){
      (function(o){items.push(makeOption(o.name+(theme===o.id?' ✓':''),o.detail,function(){setTheme(o.id);}));}(themeChoices[i]));
    }
    showPanel('motivy','Vzhled podle nálady.','Změna se okamžitě projeví a uloží.',items);
  }
  function keyName(m){return ((m.fullName||'')+' '+(m.appName||'')+' '+(m.name||'')).toLowerCase();}
  function repoMatch(m,repo){
    var full=String(m.fullName||'').toLowerCase(),name=String(m.name||'').toLowerCase();
    var token=('romangazdik-web/'+repo).toLowerCase();
    return full.indexOf(token)>=0 || name.indexOf(token)>=0;
  }
  function installed(repo){
    var arr=[],i;
    for(i=0;i<modules.length;i++)if(repoMatch(modules[i],repo))arr.push(modules[i]);
    // Prefer unversioned/main module over preview refs, never select the NOVA branch as original.
    for(i=0;i<arr.length;i++)if((arr[i].fullName||'').indexOf('nova-preview')<0)return arr[i];
    return arr.length?arr[0]:null;
  }
  function listModules(done){
    if(loadingMods){pending=done;return;}
    loadingMods=true;
    var ws=null,timeout=null,finished=false,retries=0;
    function error(){if(finished)return;finished=true;loadingMods=false;clearTimeout(timeout);try{ws.close();}catch(ignore){}if(done)done(false);var p=pending;pending=null;if(p)p(false);}
    timeout=setTimeout(error,8500);
    try{
      ws=new WebSocket('ws://127.0.0.1:8081');
      ws.onopen=function(){ws.send(JSON.stringify({type:4,payload:false}));};
      ws.onerror=error;
      ws.onmessage=function(ev){
        var m;try{m=JSON.parse(ev.data);}catch(e){return;}
        if(m.type!==4||finished)return;
        if(m.payload===null){if(retries++<12)setTimeout(function(){if(!finished&&ws.readyState===1)ws.send(JSON.stringify({type:4,payload:false}));},420);return;}
        if(Object.prototype.toString.call(m.payload)!=='[object Array]')return error();
        finished=true;loadingMods=false;clearTimeout(timeout);modules=m.payload;
        try{ws.close();}catch(ignore){}
        if(done)done(true);var p=pending;pending=null;if(p)p(true);
      };
    }catch(e){error();}
  }
  function runModule(mod){
    if(!mod){showStatus('Tento modul není v TizenBrew nainstalovaný.');return;}
    if(busy)return;
    busy=true;showStatus('Spouštím '+(mod.appName||mod.name||'modul')+'…');
    var ws,done=false,timer=setTimeout(function(){fail('TizenBrew neodpovídá');},9000);
    function fail(message){if(done)return;done=true;busy=false;clearTimeout(timer);try{if(ws)ws.close();}catch(e){}showStatus(message);}
    try {
      ws=new WebSocket('ws://127.0.0.1:8081');
      ws.onerror=function(){fail('TizenBrew není dostupný.');};
      ws.onopen=function(){ws.send(JSON.stringify({type:4,payload:false}));};
      ws.onmessage=function(event){
        if(done)return;var data;try{data=JSON.parse(event.data);}catch(e){return;}
        if(data.type!==4||Object.prototype.toString.call(data.payload)!=='[object Array]')return;
        var match=null;
        for(var i=0;i<data.payload.length;i++)if(data.payload[i].fullName===mod.fullName){match=data.payload[i];break;}
        if(!match)return fail('Modul se změnil. Obnov seznam.');
        var url=match.appPath||match.websiteURL;if(!url)return fail('Modul nemá spouštěcí adresu.');
        try {
          if(typeof tizen!=='undefined'&&tizen.tvinputdevice&&match.keys)for(var k=0;k<match.keys.length;k++)try{tizen.tvinputdevice.registerKey(match.keys[k]);}catch(ignored){}
        }catch(e){}
        ws.send(JSON.stringify({type:5,payload:match}));
        done=true;clearTimeout(timer);
        // Matches the working Nymind launcher: switch TizenBrew module first, navigate second.
        if(!match.evaluateScriptOnDocumentStart)setTimeout(function(){location.href=url;},360);
        else {
          ws.onmessage=function(e){var v;try{v=JSON.parse(e.data);}catch(ignored){return;}if(v.type===5)location.href=url;};
          setTimeout(function(){location.href=url;},2200);
        }
      };
    }catch(e){fail('Nepodařilo se otevřít službu TizenBrew.');}
  }
  function openApp(i){
    if(i===3){openRadio();return;}
    if(i===4){showPanel('playstation','PlayStation 5','Nyní dostupné jako HDMI 2. Spuštění PS5 z TV zatím vyžaduje původní Nymind PS5 Bridge.',[
      makeOption('Přepnout na původní Nymind OS','Tam máš konfiguraci a probouzení konzole.',function(){launchRepo('nyminds-tv');}),
      makeOption('Zavřít','Vrátit se na NOVA',closePanel)]);return;}
    launchRepo(repoIds[i]);
  }
  function launchRepo(repo){
    if(!repo)return;
    showStatus('Hledám nainstalovaný modul…');
    listModules(function(ok){
      if(!ok){showStatus('Není dostupná služba TizenBrew (127.0.0.1:8081).');return;}
      var m=installed(repo);
      if(!m){showStatus('Modul '+repo+' není nainstalovaný.');return;}
      runModule(m);
    });
  }
  function openQuick(){
    showPanel('přepínání','Kam dál?','Rychlé spuštění bez návratu do správce modulů.',[
      makeOption('Nymind Cinema','Filmy a seriály',function(){openApp(0);}),
      makeOption('Nymind LIVE','Kanály a EPG',function(){openApp(1);}),
      makeOption('TizenTube','YouTube bez reklam',function(){openApp(2);}),
      makeOption('Nymind Rádio','Signál Rádio a Rock Radio',function(){openApp(3);}),
      makeOption('PlayStation 5','HDMI 2',function(){openApp(4);}),
      makeOption('Původní Nymind OS','Vrátit se ke stabilní domovské obrazovce',function(){launchRepo('nyminds-tv');})
    ]);
  }
  function openAll(){
    showPanel('moduly','Všechny moduly','Kompletní seznam nainstalovaných aplikací TizenBrew.',[]);
    showStatus('Načítám moduly TizenBrew…');
    listModules(function(ok){
      if(panel!=='moduly')return;
      if(!ok){showStatus('Služba TizenBrew neodpovídá.');return;}
      var arr=[];
      for(var i=0;i<modules.length;i++){
        (function(m){arr.push(makeOption(m.appName||m.name||m.fullName||'Modul',m.fullName||'',function(){runModule(m);}));}(modules[i]));
      }
      options=arr;optionIndex=0;drawOptions();
      showStatus(arr.length?'': 'Žádné moduly nebyly nalezeny.');
    });
  }
  function openRadio(){
    var items=[
      makeOption('Signál Rádio','České i světové melodie',function(){playRadio(0);}),
      makeOption('Rock Radio','Rocková muzika naplno',function(){playRadio(1);}),
      makeOption('Pozastavit / pokračovat','Ovládání právě hrajícího rádia',toggleRadio),
      makeOption('Zastavit rádio','Ukončit přehrávání',stopRadio)
    ];
    showPanel('rádia','Tvoje rádio.','Vyber stanici a potvrď OK. Přehrávání pokračuje i po zavření menu.',items);
    showStatus(lastRadio>=0?'Poslední stanice: '+radioUrls[lastRadio].name:'Vyber stanici.');
  }
  function playRadio(i){
    lastRadio=i;sourceIdx=0;try{audio.pause();audio.src=radioUrls[i].urls[sourceIdx];audio.load();var p=audio.play();if(p&&typeof p.catch==='function')p.catch(function(){showStatus('TV odmítla přehrávání. Zkus znovu OK.');});showStatus('Přehrávám '+radioUrls[i].name+'…');}catch(e){showStatus('Nepodařilo se spustit rádio.');}
  }
  function stopRadio(){try{audio.pause();audio.removeAttribute('src');audio.load();}catch(e){}lastRadio=-1;showStatus('Rádio zastaveno.');}
  function toggleRadio(){if(lastRadio<0)return showStatus('Nejdřív vyber stanici.');try{if(audio.paused){audio.play();showStatus('Pokračuji v přehrávání.');}else{audio.pause();showStatus('Pozastaveno.');}}catch(e){}}
  audio.onerror=function(){
    if(lastRadio<0)return;
    var arr=radioUrls[lastRadio].urls;
    if(sourceIdx<arr.length-1){sourceIdx++;try{audio.src=arr[sourceIdx];audio.play();}catch(e){showStatus('Přehrávání není dostupné.');}}
    else showStatus('Stream není dostupný. Zkus jinou stanici.');
  };
  function onKey(e){
    var k=e.keyCode||e.which||0, key=e.key||'';
    var red=k===403||key==='ColorF0Red',green=k===404||key==='ColorF1Green',yellow=k===405||key==='ColorF2Yellow',blue=k===406||key==='ColorF3Blue';
    var back=k===10009||k===27||key==='BrowserBack';
    var handled=red||green||yellow||blue||back||k===37||k===38||k===39||k===40||k===13;
    if(!handled)return;
    try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}catch(ignore){}
    if(e.type!=='keydown'||e.repeat)return;
    if(red){closePanel();selectCard(0);return;}
    if(green){openQuick();return;}
    if(yellow){openThemes();return;}
    if(blue){openAll();return;}
    if(panel){
      if(back){closePanel();return;}
      if(k===37||k===38){optionIndex=Math.max(0,optionIndex-1);drawOptions();return;}
      if(k===39||k===40){optionIndex=Math.min(options.length-1,optionIndex+1);drawOptions();return;}
      if(k===13)runOption();
      return;
    }
    if(k===37||k===38){selectCard(select-1);return;}
    if(k===39){selectCard(select+1);return;}
    if(k===40){openQuick();return;}
    if(k===13){openApp(select);return;}
  }
  function registerKeys(){try{if(window.tizen&&tizen.tvinputdevice){var a=['ColorF0Red','ColorF1Green','ColorF2Yellow','ColorF3Blue'];for(var i=0;i<a.length;i++)try{tizen.tvinputdevice.registerKey(a[i]);}catch(ignore){}}}catch(e){}}
  for(var c=0;c<cards.length;c++){(function(j){cards[j].onclick=function(){selectCard(j);openApp(j);};}(c));}
  // Focus is managed by document capture, including when TizenBrew changes the focused node.
  window.addEventListener('keydown',onKey,true);
  window.addEventListener('keypress',onKey,true);
  window.addEventListener('keyup',onKey,true);
  registerKeys();snowflakes();fit();clock();applyTheme();selectCard(0);
  window.addEventListener('resize',fit);
  setInterval(clock,15000);setInterval(function(){if(theme==='auto')applyTheme();},60000);
  weather();setInterval(weather,30*60*1000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){fit();clock();weather();}},false);
}());
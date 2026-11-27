/* Nymind CINEMATIC 1.0.0
 * Standalone application. Samsung QE49Q7FAM / Tizen 3 / Chromium 47.
 * Original main and other user modules remain untouched.
 * ES5 syntax only: no Promise dependency, async/await, const/let or CSS layout gaps.
 */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
var shell=$('os'), appNodes=document.querySelectorAll('#apps .app-tile'),
    navNodes=document.querySelectorAll('#navigation .nav-button'),pickNodes=document.querySelectorAll('#recs .pick');
var heroNodes=document.querySelectorAll('.hero-actions .button');
var selected={zone:'apps',app:0,nav:0,pick:0,action:0};
var modalKind='', modalOptions=[], modalIndex=0, modalVisible=false, switching=false, running=false;
var theme='auto', actualTheme='night', weatherCode=null, weatherTemp=null, weatherLoading=false;
var modules=[], moduleWaiters=[], moduleRequesting=false;
var heroIndex=0, currentHeroMeta=null, lastKeyAt=0, imgTicket=0, selectedTitle='dune';
var movieData=[
 {id:'dune',imdb:'tt15239678',type:'movie',title:'Duna: Část druhá',short:'Sci-fi · Dobrodružný · 2024',desc:'Paul Atreides se spojuje s Fremeny a pokračuje v cestě, která rozhodne o osudu Arrakisu.',year:'2024'},
 {id:'last',imdb:'tt3581920',type:'series',title:'The Last of Us',short:'Drama · Postapokalyptický · 2023',desc:'Joel a Ellie procházejí nebezpečným světem, v němž se naděje hledá jen těžko.',year:'2023'},
 {id:'stranger',imdb:'tt4574334',type:'series',title:'Stranger Things',short:'Mysteriózní · Sci-fi · 2016',desc:'Záhadné události v městečku Hawkins otevírají bránu do světa, o kterém nikdo neměl vědět.',year:'2016'},
 {id:'chernobyl',imdb:'tt7366338',type:'series',title:'Černobyl',short:'Drama · Historický · 2019',desc:'Dramatické vyprávění o havárii jaderné elektrárny a lidech, kteří čelili jejím následkům.',year:'2019'}
];
var appDefinitions=[
 {id:'cinema',name:'Nymind Cinema',repo:'StremioK'},
 {id:'live',name:'Nymind LIVE',repo:'tvpin'},
 {id:'tube',name:'TizenTube',repo:'TizenTube-MojeTV'},
 {id:'radio',name:'Rádia'},
 {id:'ps5',name:'PlayStation 5'},
 {id:'modules',name:'Všechny moduly'}
];
var radioStations=[
 {name:'Signál Rádio',urls:['https://icecast1.play.cz/signal128.mp3']},
 {name:'Rock Radio',urls:['https://ice.abradio.cz/rockradio128.mp3','https://ice.radia.cz/rockradio128.mp3']}
],audio=$('radio-player'),radioPlaying=-1,radioFallback=0;
var themeDefinitions=[
 {value:'auto',name:'Automaticky',detail:'Podle počasí a ročního období'},
 {value:'night',name:'Cinematic Night',detail:'Výchozí noční filmový design'},
 {value:'vice',name:'Vice Sunset',detail:'Korálový západ slunce a palmy'},
 {value:'snow',name:'Snowfall',detail:'Studené tóny a jemné vločky'},
 {value:'holiday',name:'Christmas',detail:'Sváteční teplé osvětlení a sněžení'},
 {value:'rain',name:'Rainy City',detail:'Modrý deštivý večer'},
 {value:'minimal',name:'Minimal',detail:'Tlumený monochromatický režim'}
];
function text(id,value){var e=$(id);if(e)e.textContent=value;}
function modClass(el,base,on){if(!el)return;var s=el.className.replace(new RegExp('(?:^|\\s)'+base+'(?=\\s|$)','g'),'');el.className=s+(on?' '+base:'');}
function fit(){var w=window.innerWidth||1920,h=window.innerHeight||1080,scale=Math.min(w/1920,h/1080);if(!isFinite(scale)||scale<=0)scale=1;shell.style.webkitTransform='scale('+scale+')';shell.style.transform='scale('+scale+')';shell.style.left=(w-1920*scale)/2+'px';shell.style.top=(h-1080*scale)/2+'px';}
function pad(n){return n<10?'0'+n:''+n;}
function updateClock(){var d=new Date(),days=['Ne','Po','Út','St','Čt','Pá','So'],months=['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];text('clock',pad(d.getHours())+':'+pad(d.getMinutes()));text('date',days[d.getDay()]+' '+d.getDate()+'. '+months[d.getMonth()]);if(theme==='auto')applyTheme();}
function showToast(msg){var box=$('toast');box.textContent=msg;box.className='toast';clearTimeout(showToast.timer);showToast.timer=setTimeout(function(){box.className='toast hidden';},3500);}
function fmtWeather(c){if(c===0)return 'Jasno';if(c>=1&&c<=3)return 'Oblačno';if(c>=45&&c<=48)return 'Mlha';if(isSnow(c))return 'Sněžení';if(isRain(c))return 'Déšť';return 'Počasí';}
function isSnow(c){return c>=71&&c<=77||c===85||c===86;}
function isRain(c){return c>=51&&c<=67||c>=80&&c<=82||c>=95&&c<=99;}
function getAutoTheme(){var d=new Date(),mo=d.getMonth(),day=d.getDate();if((mo===11&&day>=1)||(mo===0&&day<=6))return 'holiday';if(weatherCode!==null&&isSnow(weatherCode))return 'snow';if(weatherCode!==null&&isRain(weatherCode))return 'rain';return 'night';}
function applyTheme(){actualTheme=theme==='auto'?getAutoTheme():theme;shell.className='skin-'+actualTheme;}
function setTheme(value){theme=value;try{localStorage.setItem('nymind.cinematic.theme',value);}catch(ignore){}applyTheme();closeModal();showToast('Motiv: '+themeLabel(value));}
function themeLabel(value){for(var i=0;i<themeDefinitions.length;i++)if(themeDefinitions[i].value===value)return themeDefinitions[i].name;return 'Cinematic Night';}
function loadWeather(){if(weatherLoading)return;weatherLoading=true;try{
 var x=new XMLHttpRequest();x.open('GET','https://api.open-meteo.com/v1/forecast?latitude=49.025&longitude=17.647&current=temperature_2m,weather_code&timezone=Europe%2FPrague',true);x.timeout=9000;
 x.onreadystatechange=function(){if(x.readyState!==4)return;weatherLoading=false;if(x.status!==200)return;try{var d=JSON.parse(x.responseText),w=d.current;if(!w||typeof w.temperature_2m!=='number')return;weatherTemp=w.temperature_2m;weatherCode=w.weather_code;text('temperature',Math.round(weatherTemp)+' °C');text('weather-icon',isSnow(weatherCode)?'❄':isRain(weatherCode)?'☂':weatherCode===0?'☀':'☁');applyTheme();}catch(ignore){}};
 x.onerror=function(){weatherLoading=false;};x.ontimeout=function(){weatherLoading=false;};x.send(null);
 }catch(ignore){weatherLoading=false;}}
function imageCandidate(imdb,size){return 'https://images.metahub.space/background/'+size+'/'+imdb+'/img';}
function artwork(id,url,kind,ticket){
 var image=new Image();
 image.onload=function(){if(kind==='hero'){if(ticket!==imgTicket)return;var node=$('hero-img');node.style.backgroundImage='url("'+url+'")';node.style.opacity='.9';}else{var e=$(id);if(e)e.style.backgroundImage='url("'+url+'")';}};
 image.onerror=function(){};image.src=url;
}
function showHero(i){heroIndex=(i+movieData.length)%movieData.length;var d=movieData[heroIndex];currentHeroMeta=d;selectedTitle=d.id;
 text('hero-title',d.title);text('hero-meta',d.short);text('hero-desc',d.desc);
 for(var j=0;j<4;j++)modClass(document.querySelectorAll('.pager-dot')[j],'active',j===heroIndex);
 $('hero-img').style.opacity='0';imgTicket++;
 artwork('hero-img',imageCandidate(d.imdb,'large'),'hero',imgTicket);
 // Keep the fallback original art in place until external media loads.
}
function loadThumbnails(){for(var i=0;i<movieData.length;i++){var d=movieData[i];artwork('thumb-'+d.id,imageCandidate(d.imdb,'medium'),'thumb',0);}}
function storeRecent(app){try{localStorage.setItem('nymind.cinematic.lastApp',app);}catch(ignore){}}
function getRecent(){try{return localStorage.getItem('nymind.cinematic.lastApp')||'cinema';}catch(ignore){return 'cinema';}}
function setFocus(zone,i){
 if(!zone)zone='apps';
 if(zone==='apps')selected.app=(i+appNodes.length)%appNodes.length;
 if(zone==='nav')selected.nav=(i+navNodes.length)%navNodes.length;
 if(zone==='recs')selected.pick=(i+pickNodes.length)%pickNodes.length;
 if(zone==='hero')selected.action=(i+heroNodes.length)%heroNodes.length;
 selected.zone=zone;
 for(var a=0;a<appNodes.length;a++)modClass(appNodes[a],'selected',zone==='apps'&&a===selected.app);
 for(var b=0;b<navNodes.length;b++)modClass(navNodes[b],'active',zone==='nav'&&b===selected.nav);
 for(var c=0;c<pickNodes.length;c++)modClass(pickNodes[c],'selected',zone==='recs'&&c===selected.pick);
 for(var d=0;d<heroNodes.length;d++)modClass(heroNodes[d],'current',zone==='hero'&&d===selected.action);
 var node=zone==='apps'?appNodes[selected.app]:zone==='nav'?navNodes[selected.nav]:zone==='recs'?pickNodes[selected.pick]:heroNodes[selected.action];
 if(node)try{node.focus();}catch(ignore){}
}
function option(name,subtitle,action){return {name:name,detail:subtitle||'',action:action};}
function modal(kind,title,desc,options){modalKind=kind;modalOptions=options||[];modalIndex=0;modalVisible=true;
 $('overlay').className='overlay';$('overlay').setAttribute('aria-hidden','false');
 text('dialog-kicker','NYMIND / '+kind.toUpperCase());text('dialog-title',title);text('dialog-subtitle',desc||'Šipkami vyber, OK potvrď.');text('dialog-status','');drawModal();}
function drawModal(){var list=$('dialog-items');list.innerHTML='';
 for(var i=0;i<modalOptions.length;i++){var m=modalOptions[i],div=document.createElement('div');div.className='dialog-item'+(i===modalIndex?' selected':'');
 var name=document.createElement('strong');name.textContent=m.name;div.appendChild(name);if(m.detail){var d=document.createElement('small');d.textContent=m.detail;div.appendChild(d);}
 var arrow=document.createElement('span');arrow.className='dialog-arrow';arrow.textContent='↗';div.appendChild(arrow);
 (function(j){div.onclick=function(){modalIndex=j;drawModal();chooseModal();};}(i));list.appendChild(div);}
 var current=list.children[modalIndex];if(current&&current.scrollIntoView)current.scrollIntoView(false);
 text('dialog-page',pad(modalIndex+1)+' / '+pad(Math.max(1,modalOptions.length)));
}
function chooseModal(){var m=modalOptions[modalIndex];if(m&&m.action)m.action();}
function closeModal(){modalVisible=false;modalKind='';$('overlay').className='overlay hidden';$('overlay').setAttribute('aria-hidden','true');setFocus(selected.zone,selected.zone==='apps'?selected.app:selected.zone==='nav'?selected.nav:selected.zone==='recs'?selected.pick:selected.action);}
function status(msg){if(modalVisible)text('dialog-status',msg);else showToast(msg);}
function openThemes(){var items=[];for(var i=0;i<themeDefinitions.length;i++){(function(t){items.push(option(t.name+(theme===t.value?' ✓':''),t.detail,function(){setTheme(t.value);}));}(themeDefinitions[i]));}modal('Motivy','Vzhled podle nálady','Výchozí automatický režim reaguje na počasí a Vánoce.',items);}
function matchesModule(m,repo){var full=(''+(m.fullName||'')).toLowerCase(),name=(''+(m.name||'')).toLowerCase(),needle=('romangazdik-web/'+repo).toLowerCase();return full.indexOf(needle)>=0||name.indexOf(needle)>=0;}
function chooseStableModule(repo){var matches=[];for(var i=0;i<modules.length;i++)if(matchesModule(modules[i],repo))matches.push(modules[i]);if(!matches.length)return null;
 if(repo==='nyminds-tv'){for(var j=0;j<matches.length;j++){var full=String(matches[j].fullName||'').toLowerCase();if(full.indexOf('cinematic-preview')>=0||full.indexOf('nova-preview')>=0)continue;if(full.indexOf('@')<0||full.indexOf('@main')>=0)return matches[j];}}
 return matches[0];
}
function loadModules(done){if(moduleRequesting){moduleWaiters.push(done);return;}moduleRequesting=true;moduleWaiters.push(done);
 var ws,doneFlag=false,retries=0,timer=setTimeout(function(){finish(false);},7700);
 function finish(ok){if(doneFlag)return;doneFlag=true;clearTimeout(timer);moduleRequesting=false;try{if(ws)ws.close();}catch(ignore){}
 var fns=moduleWaiters.splice(0);for(var i=0;i<fns.length;i++)try{fns[i](ok);}catch(ignore2){}}
 try{ws=new WebSocket('ws://127.0.0.1:8081');ws.onerror=function(){finish(false);};ws.onopen=function(){ws.send(JSON.stringify({type:4,payload:false}));};ws.onmessage=function(ev){
 var d;try{d=JSON.parse(ev.data);}catch(ignore){return;}if(d.type!==4)return;
 if(d.payload===null){if(retries++<9)setTimeout(function(){try{if(ws.readyState===1)ws.send(JSON.stringify({type:4,payload:false}));}catch(ignore){}},350);return;}
 if(Object.prototype.toString.call(d.payload)!=='[object Array]')return finish(false);modules=d.payload;finish(true);
 };}catch(ignore){finish(false);}
}
function launchInstalled(mod){if(!mod){status('Modul nebyl nalezen v TizenBrew.');return;}if(running)return;running=true;status('Spouštím '+(mod.appName||mod.name||'aplikaci')+'…');
 var ws=null,failed=false,timer=setTimeout(function(){fail('TizenBrew neodpovídá.');},9000);
 function fail(message){if(failed)return;failed=true;running=false;clearTimeout(timer);try{if(ws)ws.close();}catch(ignore){}status(message);}
 try{
 ws=new WebSocket('ws://127.0.0.1:8081');
 ws.onerror=function(){fail('Služba TizenBrew není dostupná.');};
 ws.onopen=function(){ws.send(JSON.stringify({type:4,payload:false}));};
 ws.onmessage=function(ev){if(failed)return;var data;try{data=JSON.parse(ev.data);}catch(ignore){return;}
 if(data.type!==4||Object.prototype.toString.call(data.payload)!=='[object Array]')return;
 var m=null;for(var j=0;j<data.payload.length;j++)if(data.payload[j].fullName===mod.fullName){m=data.payload[j];break;}
 if(!m)return fail('Modul se mezitím změnil.');
 var url=m.appPath||m.websiteURL;if(!url)return fail('Modul nemá spouštěcí URL.');
 try{if(window.tizen&&tizen.tvinputdevice&&m.keys)for(var k=0;k<m.keys.length;k++)try{tizen.tvinputdevice.registerKey(m.keys[k]);}catch(ignore){}}catch(ignore){}
 try{ws.send(JSON.stringify({type:5,payload:m}));}catch(e){return fail('Nepodařilo se přepnout modul.');}
 failed=true;clearTimeout(timer);running=false;
 if(!m.evaluateScriptOnDocumentStart)setTimeout(function(){window.location.href=url;},400);
 else{var redirected=false;ws.onmessage=function(ev2){if(redirected)return;var reply;try{reply=JSON.parse(ev2.data);}catch(ignore){return;}if(reply.type===5){redirected=true;window.location.href=url;}};setTimeout(function(){if(!redirected)window.location.href=url;},1800);}
 };
 }catch(ignore){fail('Nelze otevřít TizenBrew WebSocket.');}
}
function launchRepo(repo){status('Hledám nainstalovanou aplikaci…');loadModules(function(ok){if(!ok){status('Nedaří se spojit s TizenBrew.');return;}var m=chooseStableModule(repo);if(!m)return status('Aplikace '+repo+' není nainstalovaná.');launchInstalled(m);});}
function openAllModules(){modal('Moduly','Tvoje aplikace','Všechny nainstalované moduly TizenBrew.',[]);status('Načítám seznam…');loadModules(function(ok){if(!modalVisible||modalKind!=='Moduly')return;if(!ok){status('TizenBrew neodpovídá.');return;}var opts=[];for(var j=0;j<modules.length;j++){(function(m){opts.push(option(m.appName||m.name||m.fullName||'Aplikace',m.fullName||'',function(){launchInstalled(m);}));}(modules[j]));}modalOptions=opts;modalIndex=0;drawModal();status(opts.length?'':'Nejsou dostupné žádné moduly.');});}
function openQuick(){modal('Přepínání','Kam dál?','Spusť aplikaci rovnou z nabídky, bez návratu do TizenBrew.',[
 option('Nymind Cinema','Filmy a seriály',function(){launchRepo('StremioK');}),
 option('Nymind LIVE','Živé kanály a EPG',function(){launchRepo('tvpin');}),
 option('TizenTube','YouTube bez reklam',function(){launchRepo('TizenTube-MojeTV');}),
 option('Rádia','Signál / Rock Radio',openRadio),
 option('PlayStation 5','Původní PS5 Bridge',openPs5),
 option('Původní Nymind OS','Návrat k současné domovské obrazovce',function(){launchRepo('nyminds-tv');})
 ]);}
function openRadio(){modal('Rádia','Co si pustíme?','Přehrávač rádií uvnitř Nymind CINEMATIC.',[
 option('Signál Rádio','Přehrát živý stream',function(){playRadio(0);}),
 option('Rock Radio','Přehrát živý stream',function(){playRadio(1);}),
 option('Pozastavit / pokračovat','Ovládání přehrávání',toggleRadio),
 option('Zastavit rádio','Ukončit přehrávání',stopRadio)
 ]);}
function playRadio(i){var station=radioStations[i];if(!station)return;radioPlaying=i;radioFallback=0;
 try{audio.pause();audio.src=station.urls[0];audio.load();var result=audio.play();if(result&&typeof result.catch==='function')result.catch(function(){status('TV odmítla přehrávání.');});status('Hraje '+station.name+'…');}
 catch(ignore){status('Nepodařilo se spustit rádio.');}}
function toggleRadio(){try{if(radioPlaying<0)return status('Nejdřív vyber stanici.');if(audio.paused){audio.play();status('Rádio hraje.');}else{audio.pause();status('Rádio pozastaveno.');}}catch(ignore){status('Nelze přepnout rádio.');}}
function stopRadio(){try{audio.pause();audio.removeAttribute('src');audio.load();}catch(ignore){}radioPlaying=-1;status('Rádio zastaveno.');}
audio.onerror=function(){if(radioPlaying<0)return;var list=radioStations[radioPlaying].urls;if(radioFallback<list.length-1){radioFallback++;audio.src=list[radioFallback];try{audio.play();}catch(ignore){status('Stream nelze přehrát.');}}else status('Stream není dostupný.');};
function openPs5(){modal('PlayStation','Herní režim','PS5 je připojená na HDMI 2. Přepínání vstupu zatím řeší původní Nymind OS.',[
 option('Otevřít původní Nymind OS','V něm je funkce PS5 Bridge a HDMI 2',function(){launchRepo('nyminds-tv');}),
 option('Vrátit se','Zavřít nabídku',closeModal)
 ]);}
function openApp(id){storeRecent(id);if(id==='cinema')return launchRepo('StremioK');if(id==='live')return launchRepo('tvpin');if(id==='tube')return launchRepo('TizenTube-MojeTV');if(id==='radio')return openRadio();if(id==='ps5')return openPs5();if(id==='modules')return openAllModules();}
function openInfo(){var m=currentHeroMeta;modal('Film','Co právě vidíš?','Doporučený titul · '+m.short,[
 option(m.title,m.desc,function(){launchRepo('StremioK');}),
 option('Otevřít Nymind Cinema','Vyhledat titul přímo v Cinema',function(){launchRepo('StremioK');}),
 option('Další doporučení','Zobrazit jiný titul na hlavní obrazovce',function(){closeModal();showHero(heroIndex+1);}),
 option('Zavřít','Zpět na domovskou obrazovku',closeModal)
 ]);}
function doNav(id){if(id==='home'){closeModal();setFocus('apps',0);return;}if(id==='search')return modal('Hledat','Co hledáš?','Vyhledávání filmů a seriálů je dostupné v Nymind Cinema.',[option('Hledat v Nymind Cinema','Otevřít aplikaci Cinema',function(){launchRepo('StremioK');}),option('Zavřít','Vrátit se domů',closeModal)]);if(id==='grid')return openQuick();if(id==='game')return openPs5();if(id==='settings')return openThemes();}
function handleClick(node,fn){if(node)node.onclick=fn;}
function handleRemote(e){
 var code=e.keyCode||e.which||0,key=e.key||'';
 var red=code===403||key==='ColorF0Red',green=code===404||key==='ColorF1Green',yellow=code===405||key==='ColorF2Yellow',blue=code===406||key==='ColorF3Blue';
 var back=code===10009||code===27||key==='BrowserBack';
 var relevant=red||green||yellow||blue||back||code===37||code===38||code===39||code===40||code===13;
 if(!relevant)return;
 try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}catch(ignore){}
 if(e.type!=='keydown'||e.repeat)return;
 var now=new Date().getTime();if(now-lastKeyAt<95)return;lastKeyAt=now;
 if(red){if(modalVisible)closeModal();setFocus('apps',0);return;}
 if(green){openQuick();return;}
 if(yellow){openThemes();return;}
 if(blue){openAllModules();return;}
 if(modalVisible){if(back)return closeModal();if(code===38||code===37){modalIndex=Math.max(0,modalIndex-1);drawModal();return;}if(code===40||code===39){modalIndex=Math.min(modalOptions.length-1,modalIndex+1);drawModal();return;}if(code===13)return chooseModal();return;}
 if(back){setFocus('apps',0);return;}
 if(code===13){
  if(selected.zone==='apps')return openApp(appDefinitions[selected.app].id);
  if(selected.zone==='nav')return doNav(navNodes[selected.nav].getAttribute('data-nav'));
  if(selected.zone==='recs'){showHero(selected.pick);return setFocus('hero',0);}
  if(selected.zone==='hero'){if(selected.action===0)return launchRepo('StremioK');return openInfo();}
 }
 if(selected.zone==='nav'){
  if(code===40)return setFocus('nav',selected.nav+1);
  if(code===38)return setFocus('nav',selected.nav-1);
  if(code===39)return setFocus('hero',0);
 }
 else if(selected.zone==='hero'){
  if(code===37)return setFocus('nav',0);
  if(code===39)return setFocus('hero',selected.action+1);
  if(code===40)return setFocus('apps',selected.app);
  if(code===38)return showHero(heroIndex+1);
 }
 else if(selected.zone==='apps'){
  if(code===37)return selected.app===0?setFocus('nav',0):setFocus('apps',selected.app-1);
  if(code===39)return setFocus('apps',selected.app+1);
  if(code===38)return setFocus('hero',0);
  if(code===40)return setFocus('recs',Math.min(selected.app,3));
 }
 else if(selected.zone==='recs'){
  if(code===37)return setFocus('recs',selected.pick-1);
  if(code===39)return setFocus('recs',selected.pick+1);
  if(code===38)return setFocus('apps',Math.min(selected.pick,5));
 }
}
function registerKeys(){try{if(window.tizen&&tizen.tvinputdevice){var keys=['ColorF0Red','ColorF1Green','ColorF2Yellow','ColorF3Blue'];for(var i=0;i<keys.length;i++)try{tizen.tvinputdevice.registerKey(keys[i]);}catch(ignore){}}}catch(ignore){}}
for(var n=0;n<appNodes.length;n++){(function(i){handleClick(appNodes[i],function(){setFocus('apps',i);openApp(appDefinitions[i].id);});}(n));}
for(var j=0;j<navNodes.length;j++){(function(i){handleClick(navNodes[i],function(){setFocus('nav',i);doNav(navNodes[i].getAttribute('data-nav'));});}(j));}
for(var k=0;k<pickNodes.length;k++){(function(i){handleClick(pickNodes[i],function(){setFocus('recs',i);showHero(i);setFocus('hero',0);});}(k));}
for(var l=0;l<heroNodes.length;l++){(function(i){handleClick(heroNodes[i],function(){setFocus('hero',i);if(i===0)launchRepo('StremioK');else openInfo();});}(l));}
try{theme=localStorage.getItem('nymind.cinematic.theme')||'auto';}catch(ignore){}
if(['auto','night','vice','snow','holiday','rain','minimal'].indexOf(theme)<0)theme='auto';
window.addEventListener('keydown',handleRemote,true);window.addEventListener('keypress',handleRemote,true);window.addEventListener('keyup',handleRemote,true);
window.addEventListener('resize',fit,false);
registerKeys();fit();updateClock();applyTheme();showHero(0);loadThumbnails();setFocus('apps',0);
loadWeather();setInterval(updateClock,30000);setInterval(loadWeather,30*60*1000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){fit();updateClock();loadWeather();}},false);
}());
(function () {
  'use strict';
  var KEY = {LEFT:37,UP:38,RIGHT:39,DOWN:40,ENTER:13,BACK:10009,ESC:27,RED:403};
  var modules = [], selected = 0, moduleSelected = 0, openList = false, loaded = false, fetching = false, pendingAction = null;
  var tiles = document.querySelectorAll('.tile');
  var days = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];
  var months = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
  function $(id){return document.getElementById(id);}
  function two(n){return n<10?'0'+n:''+n;}
  function fit(){ var w=window.innerWidth,h=window.innerHeight;if(!w||!h)return;var s=Math.min(w/1920,h/1080);if(!isFinite(s)||s<=0)return;$('stage').style.webkitTransform='scale('+s+')';$('stage').style.transform='scale('+s+')';$('stage').style.left=((w-1920*s)/2)+'px';$('stage').style.top=((h-1080*s)/2)+'px';}
  function clock(){var d=new Date();$('clock').textContent=two(d.getHours())+':'+two(d.getMinutes());$('date').textContent=days[d.getDay()]+' '+d.getDate()+'. '+months[d.getMonth()];}
  function status(s){$('status').textContent=s;}
  function displayName(m){return (m.appName||m.name||m.fullName||'Neznámý modul');}
  function find(match){
    var needle=String(match||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    for(var i=0;i<modules.length;i++){
      var m=modules[i];
      var hay=String(m.fullName||'')+' '+String(m.appName||'')+' '+String(m.name||'');
      if(hay.toLowerCase().replace(/[^a-z0-9]/g,'').indexOf(needle)>=0)return m;
    }
    return null;
  }
  function rpc(cb,err){
    var ws,timer,done=false,nullCount=0;
    function fail(s){if(done)return;done=true;clearTimeout(timer);try{ws.close();}catch(e){} if(err)err(s);}
    try{ws=new WebSocket('ws://127.0.0.1:8081');}catch(e){return fail('Nelze otevřít službu TizenBrew');}
    timer=setTimeout(function(){fail('Služba TizenBrew neodpovídá');},11000);
    ws.onerror=function(){fail('Služba TizenBrew není dostupná');};
    ws.onopen=function(){ws.send(JSON.stringify({type:4,payload:false}));};
    ws.onmessage=function(ev){
      var msg;try{msg=JSON.parse(ev.data);}catch(e){return;}
      if(msg.type!==4)return;
      if(msg.payload===null){if(nullCount++<10)setTimeout(function(){if(!done&&ws.readyState===1)ws.send(JSON.stringify({type:4,payload:false}));},550);return;}
      if(Object.prototype.toString.call(msg.payload)!=='[object Array]')return fail('TizenBrew vrátil neznámý seznam modulů');
      if(done)return;done=true;clearTimeout(timer);cb(ws,msg.payload);
    };
  }
  function refresh(then){
    if(then)pendingAction=then;
    if(fetching)return;
    fetching=true;status('Načítám moduly TizenBrew…');
    rpc(function(ws,result){
      modules=result;loaded=true;fetching=false;
      try{ws.close();}catch(e){}
      status(modules.length?'Připraveno · '+modules.length+' modulů TizenBrew':'TizenBrew nenašel žádný modul');
      if(openList)renderList();
      var job=pendingAction;pendingAction=null;
      if(job)job();
    },function(msg){fetching=false;loaded=false;pendingAction=null;status(msg+' · zkontroluj Host PC IP = 127.0.0.1');});
  }
  function iptvNotice(message){
    status(message);
    var el=$('iptv-launch-notice');
    if(!el){
      el=document.createElement('div');
      el.id='iptv-launch-notice';
      el.style.cssText='position:fixed;z-index:30010;left:12%;right:12%;bottom:13%;padding:22px 28px;border:2px solid rgba(156,221,218,.8);border-radius:15px;background:#142631;color:#fff;font:23px Arial,sans-serif;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.7)';
      document.body.appendChild(el);
    }
    el.textContent=message;el.style.display='block';
  }
  var iptvStarting=false;
  function launchIptv(){
    if(iptvStarting)return;
    iptvStarting=true;
    iptvNotice('Otevírám Nymind Živou TV…');
    /* One TizenBrew request, same launch command as the official module menu. */
    rpc(function(ws,list){
      var m=null,i,hay;
      for(i=0;i<list.length;i++){
        hay=String(list[i].fullName||'')+' '+String(list[i].appName||'');
        if(hay.toLowerCase().indexOf('romangazdik-web/tvpin')!==-1||hay.toLowerCase().indexOf('nymind iptv pin')!==-1||hay.toLowerCase().indexOf('nymind živá tv')!==-1){m=list[i];break;}
      }
      if(!m){try{ws.close();}catch(e){}iptvStarting=false;iptvNotice('TizenBrew nenašel modul tvpin. Otevři Správce modulů a zkontroluj, zda je v seznamu. Nic nemaž.');return;}
      /* Nymind LIVE follows current tvpin main; do not reuse an old TizenBrew pinned appPath. */
      var url='https://cdn.jsdelivr.net/gh/romangazdik-web/tvpin@main/app/tv09.html';
      m.appPath=url;
      if(!url){try{ws.close();}catch(e){}iptvStarting=false;iptvNotice('Modul tvpin nemá platnou spouštěcí adresu.');return;}
      try{if(typeof tizen!=='undefined'&&tizen.tvinputdevice&&m.keys){for(i=0;i<m.keys.length;i++)tizen.tvinputdevice.registerKey(m.keys[i]);}}catch(e){}
      try{ws.send(JSON.stringify({type:5,payload:m}));}catch(e){iptvStarting=false;iptvNotice('TizenBrew odmítl spouštění IPTV.');return;}
      /* Use the current tvpin main HTML so stale installed GitHub tags cannot override the IPTV tile. */
      setTimeout(function(){window.location.href=url;},280);
      setTimeout(function(){iptvStarting=false;},5000);
    },function(msg){iptvStarting=false;iptvNotice('Živá TV se nespustila: '+msg);});
  }
  function launchMatch(match,alreadyRefreshed){
    if(!loaded)return refresh(function(){launchMatch(match,true);});
    var mod=find(match);
    if(!mod){
      if(!alreadyRefreshed)return refresh(function(){launchMatch(match,true);});
      var names=[];for(var i=0;i<modules.length;i++)names.push(displayName(modules[i]));
      status(match+' není mezi moduly ('+modules.length+'). Dostupné: '+names.join(', '));
      return;
    }
    run(mod);
  }
  function run(mod){
    if(!mod){status('Modul zatím není dostupný');return;}
    status('Spouštím '+displayName(mod)+'…');
    rpc(function(ws,mods){
      var match=null;
      for(var i=0;i<mods.length;i++){
        if(mods[i].fullName && mods[i].fullName===mod.fullName){match=mods[i];break;}
      }
      if(!match){
        try{ws.close();}catch(e){}
        loaded=false;
        return status('Seznam se změnil. Otevři Všechny moduly nebo aplikaci spusť z TizenBrew.');
      }
      var url=match.appPath||match.websiteURL;
      if(!url){try{ws.close();}catch(e){}return status('Modul nemá adresu pro spuštění');}
      try{if(typeof tizen!=='undefined'&&tizen.tvinputdevice&&match.keys){for(var k=0;k<match.keys.length;k++)tizen.tvinputdevice.registerKey(match.keys[k]);}}catch(e){}
      ws.send(JSON.stringify({type:5,payload:match}));
      if(!match.evaluateScriptOnDocumentStart){setTimeout(function(){location.href=url;},350);}
      else{
        ws.onmessage=function(ev){try{var m=JSON.parse(ev.data);if(m.type===5)location.href=url;}catch(e){}};
        setTimeout(function(){location.href=url;},2200);
      }
    },function(msg){status('Spuštění selhalo: '+msg);});
  }
  function select(i){selected=Math.max(0,Math.min(tiles.length-1,i));for(var j=0;j<tiles.length;j++){var base=tiles[j].className.replace(/\s+active\b/g,'');tiles[j].className=base+(j===selected?' active':'');}tiles[selected].focus();}
  var ps5Busy=false,ps5Timer=0;
  function ps5Notice(message){
    status(message);
    var el=$('ps5-notice');
    if(!el){
      el=document.createElement('div');el.id='ps5-notice';
      el.style.cssText='position:fixed;z-index:30000;left:14%;right:14%;bottom:13%;padding:25px 32px;border:2px solid rgba(255,255,255,.65);border-radius:20px;background:#142230;color:#fff;font-size:23px;line-height:1.35;text-align:center;box-shadow:0 18px 45px rgba(0,0,0,.8)';
      document.body.appendChild(el);
    }
    el.textContent=message;el.style.display='block';
    clearTimeout(ps5Timer);
    ps5Timer=setTimeout(function(){el.style.display='none';},11000);
  }
  function launchPS5(){
    if(ps5Busy)return;
    ps5Busy=true;
    ps5Notice('PS5: zkouším lokální ovladač Samsungu (port 8001)…');
    /* This test sends only KEY_SOURCE after an authorized Samsung remote connection.
       It neither switches directly to HDMI 2 nor powers on the PS5. */
    var ws=null,finished=false,authorized=false,timeout=0;
    var url='ws://127.0.0.1:8001/api/v2/channels/samsung.remote.control?name=bnltaW5kIFRWI';
    function end(message){
      if(finished)return;finished=true;ps5Busy=false;
      clearTimeout(timeout);
      ps5Notice(message);
      try{if(ws)ws.close();}catch(ignore){}
    }
    timeout=setTimeout(function(){
      end('Test Samsung: port 8001 neodpovídá nebo čeká na povolení. Přepni Zdroj → HDMI 2 ručně.');
    },7500);
    try{
      ws=new WebSocket(url);
      ws.onopen=function(){
        ps5Notice('Lokální spojení otevřeno. Čekám na autorizaci ovladače…');
      };
      ws.onmessage=function(ev){
        if(finished||authorized)return;
        var data;
        try{data=JSON.parse(ev.data);}catch(ignore){return;}
        if(data&&data.event==='ms.channel.connect'){
          authorized=true;
          try{
            ws.send(JSON.stringify({method:'ms.remote.control',params:{Cmd:'Click',DataOfCmd:'KEY_SOURCE',Option:'false',TypeOfRemote:'SendRemoteKey'}}));
            /* WebSocket confirms delivery, not whether Samsung actually switched inputs. */
            setTimeout(function(){end('Příkaz Zdroj odeslán. Pokud se otevřela nabídka zdrojů, vyber HDMI 2.');},500);
          }catch(e){end('Příkaz Zdroj nelze odeslat ('+(e.name||'chyba')+').');}
        }else if(data&&(/unauthorized|denied|error/i.test(String(data.event||'')))){
          end('Samsung odmítl lokální ovládání ('+data.event+').');
        }
      };
      ws.onerror=function(){end('Lokální ovladač Samsungu není dostupný. TizenBrew může blokovat spojení na port 8001.');};
      ws.onclose=function(){if(!finished)end('Samsung uzavřel spojení na portu 8001.');};
    }catch(e){end('WebSocket není povolen ('+(e.name||'chyba')+').');}
  }
  function launchSelected(){var t=tiles[selected],kind=t.getAttribute('data-kind');if(kind==='list')showList();else if(kind==='radio'){/* Vestaveny prehravac radii prevezme kliknuti. */t.click();}else if(kind==='ps5')launchPS5();else if(kind==='sports'){window.location.href='nuvio-sports-v3.html';}else if(t.id==='iptvTile')launchIptv();else launchMatch(t.getAttribute('data-match'),false);}
  function showList(){openList=true;$('overlay').className='overlay';renderList();if(!loaded)refresh();}
  function hideList(){openList=false;$('overlay').className='overlay hidden';select(selected);}
  function renderList(){var box=$('module-list');box.innerHTML='';if(!modules.length){box.innerHTML='<div class="module">'+(loaded?'Žádné moduly nejsou dostupné.':'Načítám seznam modulů…')+'</div>';return;}
    moduleSelected=Math.max(0,Math.min(moduleSelected,modules.length-1));
    for(var i=0;i<modules.length;i++){
      var row=document.createElement('div');row.className='module'+(i===moduleSelected?' active':'');
      var nm=document.createElement('div');nm.textContent=modules[i].appName||modules[i].name||modules[i].fullName||'Modul';
      var sub=document.createElement('small');sub.textContent=modules[i].fullName||'';row.appendChild(nm);row.appendChild(sub);box.appendChild(row);
    }
  }
  function moveList(d){if(!modules.length)return;moduleSelected=Math.max(0,Math.min(modules.length-1,moduleSelected+d));renderList();var rs=$('module-list').children;if(rs[moduleSelected])rs[moduleSelected].scrollIntoView(false);}
  document.addEventListener('keydown',function(e){var k=e.keyCode;
    if(openList){if(k===KEY.BACK||k===KEY.ESC){hideList();e.preventDefault();return;}
      if(k===KEY.UP||k===KEY.LEFT){moveList(-1);e.preventDefault();return;}
      if(k===KEY.DOWN||k===KEY.RIGHT){moveList(1);e.preventDefault();return;}
      if(k===KEY.ENTER){run(modules[moduleSelected]);e.preventDefault();return;}}
    else{if(k===KEY.LEFT||k===KEY.UP){select(selected-1);e.preventDefault();return;}
      if(k===KEY.RIGHT||k===KEY.DOWN){select(selected+1);e.preventDefault();return;}
      if(k===KEY.ENTER){launchSelected();e.preventDefault();return;}
      if(k===KEY.RED){showList();e.preventDefault();return;}
      if(k===KEY.BACK||k===KEY.ESC){e.preventDefault();return;}}
  });
  for(var i=0;i<tiles.length;i++){(function(j){tiles[j].onclick=function(){select(j);launchSelected();};})(i);}
  window.addEventListener('resize',fit);fit();setTimeout(fit,500);setTimeout(fit,1700);clock();setInterval(clock,15000);select(0);refresh();
})();

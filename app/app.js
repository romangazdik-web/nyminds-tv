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
  function launchSelected(){var t=tiles[selected],kind=t.getAttribute('data-kind');if(kind==='list')showList();else if(kind==='radio'){/* Vestaveny prehravac radii prevezme kliknuti. */t.click();}else if(kind==='continue'){if(window.NymindContinue&&window.NymindContinue.open)window.NymindContinue.open();}else launchMatch(t.getAttribute('data-match'),false);}
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

/* Nymind Switcher 1.0 | Tizen 3 / Chromium 47 / ES5
 * Global shortcuts: RED=Home, GREEN=app switcher; BACK remains native unless switcher is open.
 * Target apps launch through TizenBrew's local module RPC, never synthetic remote keys.
 */
(function () {
  'use strict';
  if (window.NymindNavigation && window.NymindNavigation.version==='1.0') return;
  var APPS=[
    {id:'home',title:'Nymind OS',detail:'Domovská stránka',repo:'nyminds-tv',glyph:'⌂'},
    {id:'cinema',title:'Nymind Cinema',detail:'Filmy a seriály',repo:'StremioK',glyph:'▶'},
    {id:'tube',title:'TizenTube',detail:'YouTube bez reklam',repo:'TizenTube-MojeTV',glyph:'▷'},
    {id:'live',title:'Nymind LIVE',detail:'Živé kanály a EPG',repo:'tvpin',glyph:'▤'}
  ];
  var HOME='https://cdn.jsdelivr.net/gh/romangazdik-web/nyminds-tv@v4.1.0/app/index.html';
  var panel=null, list=null, note=null, selected=0, opened=false, busy=false;
  function get(id){return document.getElementById(id);}
  function register(){
    try {
      if(window.tizen&&tizen.tvinputdevice&&tizen.tvinputdevice.registerKey){
        tizen.tvinputdevice.registerKey('ColorF0Red');
        tizen.tvinputdevice.registerKey('ColorF1Green');
      }
    } catch(ignore){}
  }
  function build(){
    if(panel)return true;
    if(!document.body)return false;
    var style=document.createElement('style');
    style.type='text/css';
    style.appendChild(document.createTextNode(
      '#nym-switcher{display:none;position:fixed;z-index:2147483646;left:0;top:0;right:0;bottom:0;background:rgba(5,9,20,.95);font:24px Arial,sans-serif;color:#fff}' +
      '#nym-switcher.nym-open{display:block}' +
      '#nym-switcher .nym-shell{position:absolute;left:15%;top:12%;width:70%;height:76%;padding:40px 48px;box-sizing:border-box;border:1px solid rgba(229,229,232,.27);border-radius:26px;background:linear-gradient(135deg,#1d2837,#101621 68%);box-shadow:0 35px 85px #0009}' +
      '#nym-switcher .nym-overline{color:#f0c594;font-size:16px;letter-spacing:4px;font-weight:bold}' +
      '#nym-switcher h2{font-size:53px;line-height:1.1;margin:18px 0 12px;letter-spacing:-2px}' +
      '#nym-switcher .nym-help{font-size:19px;color:#c0cad4;margin-bottom:24px}' +
      '#nym-switcher .nym-entry{display:block;width:100%;padding:16px 22px;margin:10px 0;border-radius:15px;border:2px solid rgba(255,255,255,.11);background:#233041;color:#fff;text-align:left;box-sizing:border-box;min-height:78px}' +
      '#nym-switcher .nym-entry.nym-selected{border:3px solid #f6d29e;background:#455b6b;box-shadow:0 0 0 4px rgba(246,209,157,.17)}' +
      '#nym-switcher .nym-symbol{display:inline-block;width:60px;vertical-align:middle;font-size:36px;font-weight:bold}' +
      '#nym-switcher .nym-info{display:inline-block;vertical-align:middle}' +
      '#nym-switcher .nym-title{display:block;font-size:26px;font-weight:bold}' +
      '#nym-switcher .nym-desc{display:block;font-size:17px;color:#c7d2da;margin-top:3px}' +
      '#nym-switcher .nym-bottom{position:absolute;bottom:28px;left:48px;right:48px;font-size:17px;color:#bdc9d1}' +
      '#nym-switcher .nym-note{color:#ffdba9;font-weight:bold;float:right;max-width:65%;text-align:right}'
    ));
    document.head.appendChild(style);
    panel=document.createElement('div');panel.id='nym-switcher';
    var inner=document.createElement('div');inner.className='nym-shell';
    var over=document.createElement('div');over.className='nym-overline';over.textContent='NYMIND / RYCHLÉ PŘEPÍNÁNÍ';
    var title=document.createElement('h2');title.textContent='Kam dál?';
    var help=document.createElement('div');help.className='nym-help';help.textContent='Vyber aplikaci a stiskni OK. Nepotřebuješ vypínat TizenBrew.';
    list=document.createElement('div');
    for(var i=0;i<APPS.length;i++){
      var a=APPS[i], item=document.createElement('div');item.className='nym-entry';item.setAttribute('data-nym-index',''+i);
      var sym=document.createElement('span');sym.className='nym-symbol';sym.textContent=a.glyph;
      var inf=document.createElement('span');inf.className='nym-info';
      var name=document.createElement('span');name.className='nym-title';name.textContent=a.title;
      var desc=document.createElement('span');desc.className='nym-desc';desc.textContent=a.detail;
      inf.appendChild(name);inf.appendChild(desc);item.appendChild(sym);item.appendChild(inf);
      (function(ix){item.onclick=function(){selected=ix;paint();launch(APPS[ix]);};}(i));
      list.appendChild(item);
    }
    var footer=document.createElement('div');footer.className='nym-bottom';
    footer.textContent='↑ ↓ výběr   ·   OK spustit   ·   Zpět zavřít';
    note=document.createElement('span');note.className='nym-note';footer.appendChild(note);
    inner.appendChild(over);inner.appendChild(title);inner.appendChild(help);inner.appendChild(list);inner.appendChild(footer);
    panel.appendChild(inner);document.body.appendChild(panel);
    return true;
  }
  function paint(){
    if(!list)return;
    var all=list.children;
    for(var i=0;i<all.length;i++)all[i].className='nym-entry'+(i===selected?' nym-selected':'');
  }
  function open(){
    if(!build())return;
    selected=0;opened=true;panel.className='nym-open';if(note)note.textContent='';paint();
  }
  function close(){opened=false;if(panel)panel.className='';}
  function modMatch(m,app){
    var n=(''+(m.fullName||'')+' '+(m.name||'')).toLowerCase();
    return n.indexOf('romangazdik-web/'+app.repo.toLowerCase())>=0;
  }
  function fallbackHome(){try{window.location.replace(HOME);}catch(e){window.location.href=HOME;}}
  function launch(app){
    if(!app||busy)return;
    if(app.id==='home'&&window.NYMIND_IS_LAUNCHER){close();return;}
    busy=true;if(note)note.textContent='Spouštím '+app.title+'…';
    var ws=null,done=false,timer=null;
    function failure(msg){
      if(done)return;done=true;busy=false;clearTimeout(timer);
      try{if(ws)ws.close();}catch(ignore){}
      if(app.id==='home')fallbackHome();
      else if(note)note.textContent=msg+' · zkus otevřít Nymind TV';
    }
    timer=setTimeout(function(){failure('TizenBrew neodpovídá');},5000);
    try {
      ws=new WebSocket('ws://127.0.0.1:8081');
      ws.onopen=function(){ws.send(JSON.stringify({type:4,payload:false}));};
      ws.onmessage=function(e){
        if(done)return;
        var data;try{data=JSON.parse(e.data);}catch(ignore){return;}
        if(data.type!==4)return;
        if(data.payload===null){
          setTimeout(function(){if(!done&&ws.readyState===1)ws.send(JSON.stringify({type:4,payload:false}));},500);
          return;
        }
        if(Object.prototype.toString.call(data.payload)!=='[object Array]')return;
        var mod=null;
        for(var i=0;i<data.payload.length;i++)if(modMatch(data.payload[i],app)){mod=data.payload[i];break;}
        if(!mod)return failure('Modul není nainstalovaný');
        var url=mod.appPath||mod.websiteURL;
        if(!url)return failure('Chybí adresa modulu');
        try{ws.send(JSON.stringify({type:5,payload:mod}));}catch(e2){return failure('Modul se nepodařilo spustit');}
        done=true;clearTimeout(timer);busy=false;
        if(!mod.evaluateScriptOnDocumentStart){
          setTimeout(function(){window.location.href=url;},400);
        } else {
          var navigated=false;
          ws.onmessage=function(ev){if(navigated)return;var response;try{response=JSON.parse(ev.data);}catch(ignored){return;}if(response.type===5){navigated=true;window.location.href=url;}};
          setTimeout(function(){if(!navigated)window.location.href=url;},2200);
        }
      };
      ws.onerror=function(){failure('Služba TizenBrew není dostupná');};
    }catch(e){failure('Nelze otevřít TizenBrew');}
  }
  function goHome(){launch(APPS[0]);}
  function key(e){
    var k=e.keyCode||e.which||0, name=e.key||'';
    var red=k===403||name==='ColorF0Red', green=k===404||name==='ColorF1Green';
    var handled=false, action='';
    if(opened){
      if(red){action='home';handled=true;}
      else if(green){action='close';handled=true;}
      else if(k===38||k===37){action='up';handled=true;}
      else if(k===40||k===39){action='down';handled=true;}
      else if(k===13){action='select';handled=true;}
      else if(k===10009||k===27||k===8){action='close';handled=true;}
    } else if(red&&!window.NYMIND_IS_LAUNCHER){action='home';handled=true;}
    else if(green){action='open';handled=true;}
    if(!handled)return;
    try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}catch(ignore){}
    if(e.type!=='keydown'||e.repeat)return;
    if(action==='home')goHome();
    if(action==='open')open();
    if(action==='close')close();
    if(action==='up'){selected=(selected+APPS.length-1)%APPS.length;paint();}
    if(action==='down'){selected=(selected+1)%APPS.length;paint();}
    if(action==='select')launch(APPS[selected]);
  }
  register();
  window.addEventListener('keydown',key,true);
  window.addEventListener('keypress',key,true);
  window.addEventListener('keyup',key,true);
  window.NymindNavigation={version:'1.0',open:open,close:close,goHome:goHome,launch:function(id){for(var i=0;i<APPS.length;i++)if(APPS[i].id===id)return launch(APPS[i]);}};
  window.NymindHome={open:goHome};
}());
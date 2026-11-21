/* Nymind TV 2.0.11 — light Continue Watching for Tizen 3.0.
   Hardened: draw at most 3 posters, lazy-load artwork, and keep key handling responsive.
   Never store or expose stream URLs, credentials, or player headers. ES5 only.
 */
(function(){
 'use strict';
 var root=document.getElementById('nymind-continue'),track=document.getElementById('cw-track'),counter=document.getElementById('cw-count'),tile=document.getElementById('continueTile');
 if(!root||!track||!tile)return;
 var opened=false,selected=0,renderTimer=0,imageTimers=[],list=[];
 function el(tag,cls,value){var n=document.createElement(tag);if(cls)n.className=cls;if(typeof value==='string')n.textContent=value;return n;}
 function stop(e){try{if(e.preventDefault)e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();else if(e.stopPropagation)e.stopPropagation();}catch(ignore){}}
 function profileKey(){
   var key='stremiok.progress';
   try{
     var p=JSON.parse(window.localStorage.getItem('stremiok.profiles')||'null');
     if(p&&p.active&&p.list)for(var i=0;i<p.list.length;i++){
       var row=p.list[i];
       if(row&&row.id===p.active&&row.slot){key='stremiok.'+row.slot+'.progress';break;}
     }
   }catch(ignore){}
   return key;
 }
 function safePoster(url){return typeof url==='string'&&/^https:\/\/[^\s<>"']{1,500}$/i.test(url);}
 function read(){
   var o=null,all=[],keys=[],seen={},out=[];
   try{
     var raw=window.localStorage.getItem(profileKey());
     if(raw&&raw.length<450000)o=JSON.parse(raw);
   }catch(ignore){}
   if(!o||typeof o!=='object')return [];
   try{keys=Object.keys(o);}catch(ignore){return [];}
   for(var i=0;i<keys.length&&i<250;i++){
     var x=o[keys[i]];
     if(!x||typeof x!=='object'||typeof x.name!=='string'||!x.name)continue;
     var current=Number(x.position||0),duration=Number(x.duration||0),last=Number(x.updated||0);
     if(!isFinite(current)||!isFinite(duration)||current<0||duration<0||(duration&&current/duration>=.96)||(!current&&!x.added))continue;
     var id=String(x.id||keys[i]),group=String(x.parent||id.split(':')[0]);
     all.push({name:x.name.slice(0,100),type:x.type==='series'?'series':'movie',group:group.slice(0,130),
       progress:duration?Math.round(current/duration*100):0,updated:last,poster:safePoster(x.poster)?x.poster:''});
   }
   all.sort(function(a,b){return b.updated-a.updated;});
   for(var j=0;j<all.length;j++){
     var k=all[j].type+':'+all[j].group;
     if(seen[k])continue;seen[k]=true;out.push(all[j]);if(out.length===3)break;
   }
   return out;
 }
 function clearTimers(){
   if(renderTimer){clearTimeout(renderTimer);renderTimer=0;}
   for(var i=0;i<imageTimers.length;i++)clearTimeout(imageTimers[i]);
   imageTimers=[];
 }
 function makeCard(record,index){
   var card=el('div','cw-card');card.setAttribute('role','button');card.setAttribute('data-index',String(index));
   var poster=el('span','cw-poster');poster.appendChild(el('span','cw-poster-fallback','▶'));
   card.appendChild(poster);
   var overlay=el('span','cw-vignette');card.appendChild(overlay);
   var body=el('div','cw-cardtext');
   body.appendChild(el('span','cw-kind',record?(record.type==='series'?'SERIÁL':'FILM'):'STREMIOK'));
   body.appendChild(el('strong','cw-title',record?record.name:'Otevřít StremioK'));
   body.appendChild(el('span','cw-subline',record?(record.progress?record.progress+' % přehráno':'Připraveno ke sledování'):'Zobrazit rozkoukané pořady'));
   card.appendChild(body);
   if(record&&record.progress){
     var bar=el('span','cw-progress'),fill=el('span','cw-progress-fill');
     fill.style.width=Math.max(1,Math.min(95,record.progress))+'%';bar.appendChild(fill);card.appendChild(bar);
   }
   return {node:card,poster:poster};
 }
 function loadArt(slot,url,delay){
   if(!url)return;
   var t=setTimeout(function(){
     if(!opened||!slot.poster.parentNode)return;
     var image=el('img');image.alt='';image.loading='lazy';
     image.onload=function(){if(!opened||!slot.poster.parentNode)return;slot.poster.appendChild(image);};
     image.onerror=function(){image.onload=null;image.onerror=null;};
     image.src=url;
   },delay);
   imageTimers.push(t);
 }
 function focusCard(n){
   var cards=track.querySelectorAll('.cw-card');
   if(!cards.length)return;
   selected=Math.max(0,Math.min(n,cards.length-1));
   for(var i=0;i<cards.length;i++)cards[i].className='cw-card'+(i===selected?' cw-selected':'');
   if(counter)counter.textContent=(selected+1)+' / '+cards.length;
   /* No focus(), offsetWidth, computed styles, or repaints of hidden cards. */
 }
 function draw(){
   renderTimer=0;
   if(!opened)return;
   try{list=read();}catch(e){list=[];}
   if(!opened)return;
   try{
     track.textContent='';
     if(!list.length){
       track.appendChild(makeCard(null,0).node);
     }else{
       var entries=[];
       for(var i=0;i<list.length;i++){
         var slot=makeCard(list[i],i);entries.push(slot);track.appendChild(slot.node);
       }
       for(var j=0;j<entries.length;j++)loadArt(entries[j],list[j].poster,250+j*350);
     }
     focusCard(0);
   }catch(e){
     try{track.textContent='';track.appendChild(makeCard(null,0).node);focusCard(0);}catch(ignore){}
   }
 }
 function open(){
   if(opened)return;
   opened=true;selected=0;
   root.className='cw-overlay';root.setAttribute('aria-hidden','false');
   track.textContent='';track.appendChild(el('div','cw-load','Načítám rozkoukané pořady…'));
   /* Leave the key handler immediately; loading is deferred to the next event-loop turn. */
   clearTimers();
   renderTimer=setTimeout(draw,140);
 }
 function close(){
   opened=false;clearTimers();
   root.className='cw-overlay cw-closed';root.setAttribute('aria-hidden','true');
   try{tile.focus();}catch(ignore){}
 }
 function launch(){
   close();
   var module=document.querySelector('#tiles [data-match*="StremioK"]');
   if(module&&module.click)module.click();
 }
 function onKey(e){
   var k=e.keyCode||e.which;
   if(!opened){
     if(k===13&&document.activeElement===tile){stop(e);open();}
     return;
   }
   if(k===10009||k===27||k===38||k===403){stop(e);close();return;}
   if(k===37){stop(e);focusCard(selected-1);return;}
   if(k===39){stop(e);focusCard(selected+1);return;}
   if(k===13){stop(e);launch();return;}
   if(k===40){stop(e);return;}
 }
 function onHardwareBack(e){
   if(opened&&e.keyName==='back'){stop(e);close();}
 }
 tile.addEventListener('click',function(e){if(!opened){stop(e);open();}},true);
 track.addEventListener('click',function(e){
   if(!opened)return;var n=e.target;
   while(n&&n!==track){
     if(n.getAttribute&&n.getAttribute('data-index')!==null){stop(e);launch();return;}
     n=n.parentNode;
   }
 },true);
 window.addEventListener('keydown',onKey,true);
 window.addEventListener('tizenhwkey',onHardwareBack,true);
 window.NymindContinue={open:open,close:close,isOpen:function(){return opened;}};
})();

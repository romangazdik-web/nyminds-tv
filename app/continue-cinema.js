/* Nymind TV 2.0.10 — cinematic Continue Watching screen.
 * Read only: watches local StremioK progress; no URLs, headers or credentials copied.
 * ES5 compatible with Samsung Tizen 3. No new TizenBrew module required.
 * OK opens StremioK's own library, not an invented title-specific deep link.
 */
(function(){
 'use strict';
 var root=document.getElementById('nymind-continue'),track=document.getElementById('cw-track'),count=document.getElementById('cw-count'),tile=document.getElementById('continueTile');
 if(!root||!track||!tile)return;
 var opened=false,selected=0,items=[],visibleCount=5;
 function el(tag,cls,value){var n=document.createElement(tag);if(cls)n.className=cls;if(typeof value==='string')n.textContent=value;return n;}
 function stop(e){if(e.preventDefault)e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();else if(e.stopPropagation)e.stopPropagation();}
 function profileKey(){
   var key='stremiok.progress';
   try{
     var p=JSON.parse(window.localStorage.getItem('stremiok.profiles')||'null');
     if(p&&p.list&&p.active)for(var i=0;i<p.list.length;i++){
       if(p.list[i]&&p.list[i].id===p.active&&p.list[i].slot){key='stremiok.'+p.list[i].slot+'.progress';break;}
     }
   }catch(e){}
   return key;
 }
 function readProgress(){
   var store=null,keys=[],list=[],seen={};
   try{var raw=window.localStorage.getItem(profileKey());if(raw&&raw.length<700000)store=JSON.parse(raw);}catch(e){}
   if(!store||typeof store!=='object')return [];
   try{keys=Object.keys(store);}catch(e){return [];}
   for(var i=0;i<keys.length&&i<500;i++){
     var x=store[keys[i]];
     if(!x||typeof x!=='object'||typeof x.name!=='string'||!x.name)continue;
     var pos=Number(x.position||0),dur=Number(x.duration||0),updated=Number(x.updated||0);
     if(!isFinite(pos)||!isFinite(dur)||pos<0||dur<0)continue;
     if(pos===0&&!x.added)continue;
     if(dur>0&&pos/dur>=.96)continue;
     var id=String(x.id||keys[i]),group=String(x.parent||id.split(':')[0]);
     list.push({name:x.name.slice(0,120),group:group.slice(0,150),type:x.type==='series'?'series':'movie',
       poster:typeof x.poster==='string'?x.poster:'',pos:pos,dur:dur,updated:updated});
   }
   list.sort(function(a,b){return b.updated-a.updated;});
   var result=[];
   for(var j=0;j<list.length;j++){
     var k=list[j].type+':'+list[j].group;
     if(seen[k])continue;
     seen[k]=true;result.push(list[j]);
     if(result.length>=15)break;
   }
   return result;
 }
 function validPoster(src){return /^https:\/\/[^\s<>"']{1,650}$/i.test(src||'');}
 function makeCard(x,index,empty){
   var card=el('div','cw-card'+(empty?' cw-empty':''));card.tabIndex=-1;
   card.setAttribute('role','button');card.setAttribute('data-index',index);
   card.setAttribute('aria-label',empty?'Otevřít StremioK':x.name);
   var art=el('span','cw-poster');
   if(!empty&&validPoster(x.poster)){
     var img=el('img');img.alt='';img.src=x.poster;img.onerror=function(){
       if(img.parentNode)img.parentNode.removeChild(img);
       art.appendChild(el('span','cw-poster-fallback','▶'));
     };art.appendChild(img);
   }else art.appendChild(el('span','cw-poster-fallback','▶'));
   card.appendChild(art);card.appendChild(el('span','cw-vignette'));
   var info=el('div','cw-cardtext');
   info.appendChild(el('span','cw-kind',empty?'STREMIOK':(x.type==='series'?'SERIÁL':'FILM')));
   info.appendChild(el('strong','cw-title',empty?'Tvoje rozkoukané pořady':x.name));
   var pct=x.dur>0?Math.round(100*x.pos/x.dur):0;
   info.appendChild(el('span','cw-subline',empty?'Otevři StremioK a vyber si příběh':(pct>0?pct+' % přehráno':'Přidáno ke sledování')));
   card.appendChild(info);
   if(!empty&&pct>0){var bar=el('span','cw-progress'),fill=el('span','cw-progress-fill');fill.style.width=Math.min(95,Math.max(2,pct))+'%';bar.appendChild(fill);card.appendChild(bar);}
   return card;
 }
 function render(){
   items=readProgress();track.textContent='';
   if(items.length){
     for(var i=0;i<items.length;i++)track.appendChild(makeCard(items[i],i,false));
   }else{
     track.appendChild(makeCard({name:'',type:'movie',pos:0,dur:0},0,true));
   }
 }
 function cards(){return track.querySelectorAll('.cw-card');}
 function setFocus(n){
   var list=cards();
   if(!list.length)return;
   selected=Math.max(0,Math.min(list.length-1,n));
   for(var i=0;i<list.length;i++)list[i].className=list[i].className.replace(/\s+cw-selected\b/g,'');
   list[selected].className+=' cw-selected';
   var page=Math.floor(selected/visibleCount),w=list[0].offsetWidth;
   var space=0;
   try{space=parseFloat(window.getComputedStyle(list[0]).marginRight)||0;}catch(e){space=20;}
   var shift=-page*visibleCount*(w+space);
   track.style.webkitTransform='translateX('+shift+'px)';
   track.style.transform='translateX('+shift+'px)';
   if(count)count.textContent=(selected+1)+' / '+list.length;
   list[selected].focus();
 }
 function open(){
   render();
   opened=true;root.className='cw-overlay';root.setAttribute('aria-hidden','false');
   setFocus(0);
 }
 function close(){
   opened=false;root.className='cw-overlay cw-closed';root.setAttribute('aria-hidden','true');
   track.style.webkitTransform='translateX(0)';track.style.transform='translateX(0)';
   try{tile.focus();}catch(e){}
 }
 function launchStremio(){
   close();
   var stremio=document.querySelector('#tiles [data-match*="StremioK"]');
   if(stremio&&stremio.click)stremio.click();
 }
 function onKey(e){
   if(!opened)return;
   var k=e.keyCode||e.which;
   if(k===37){stop(e);setFocus(selected-1);}
   else if(k===39){stop(e);setFocus(selected+1);}
   else if(k===13){stop(e);launchStremio();}
   else if(k===10009||k===27||k===38){stop(e);close();}
   else if(k===40){stop(e);}
 }
 function onHardwareBack(e){if(opened&&e.keyName==='back'){stop(e);close();}}
 track.addEventListener('click',function(e){
   if(!opened)return;
   var node=e.target;
   while(node&&node!==track){
     if(node.getAttribute&&node.getAttribute('data-index')!==null){
       selected=Number(node.getAttribute('data-index'))||0;launchStremio();return;
     }
     node=node.parentNode;
   }
 },false);
 window.addEventListener('keydown',onKey,true);
 window.addEventListener('tizenhwkey',onHardwareBack,true);
 window.NymindContinue={open:open,close:close,isOpen:function(){return opened;}};
})();

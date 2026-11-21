/* Nymind TV 2.0.9: read-only StremioK Continue Watching preview.
   Never copies stream URLs, request headers, addons, credentials or keys.
   Only local, same-origin, display-safe data from stremiok.progress.
   Remote: DOWN from tile -> row, LEFT/RIGHT cards, UP/BACK -> tiles.
   Clicking a card opens StremioK's own Watching view (not a fake direct seek). */
(function(){
'use strict';
var root=document.getElementById('nymind-continue'),cards=document.getElementById('nymind-cw-cards'),hint=document.getElementById('nymind-cw-hint');
if(!root||!cards||!hint)return;
var selectedCW=-1,previousTile=0,renderSig='',lastRead=0;
function el(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(typeof txt==='string')n.textContent=txt;return n;}
function remoteStop(e){if(e.preventDefault)e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();else if(e.stopPropagation)e.stopPropagation();}
function getTileList(){return document.querySelectorAll('#tiles .tile');}
function currentProfileKey(){
 var key='stremiok.progress';
 try{
   var raw=window.localStorage.getItem('stremiok.profiles'),obj=raw?JSON.parse(raw):null;
   if(obj&&obj.list&&obj.active){
     for(var i=0;i<obj.list.length;i++){
       var p=obj.list[i];
       if(p&&p.id===obj.active&&p.slot){key='stremiok.'+p.slot+'.progress';break;}
     }
   }
 }catch(e){}
 return key;
}
function readItems(){
 var raw=null,store=null,out=[],keys=[],seen={};
 try{raw=window.localStorage.getItem(currentProfileKey());if(raw&&raw.length<650000)store=JSON.parse(raw);}catch(e){store=null;}
 if(!store||typeof store!=='object')return [];
 try{keys=Object.keys(store);}catch(e){return [];}
 for(var i=0;i<keys.length&&i<500;i++){
   var x=store[keys[i]];
   if(!x||typeof x!=='object'||typeof x.name!=='string'||!x.name)return out;
   var progress=Number(x.position||0),duration=Number(x.duration||0),updated=Number(x.updated||0);
   if(!isFinite(progress)||!isFinite(duration)||progress<0||duration<0)continue;
   if(progress===0&&!x.added)continue;
   if(duration>0&&progress/duration>=.96)continue;
   var id=String(x.id||keys[i]).slice(0,120),group=String(x.parent||id.split(':')[0]).slice(0,120);
   var title=x.name.slice(0,100),type=x.type==='series'?'series':'movie';
   out.push({name:title,type:type,poster:typeof x.poster==='string'?x.poster:'',progress:progress,duration:duration,updated:updated,group:group});
 }
 out.sort(function(a,b){return b.updated-a.updated;});
 var unique=[];
 for(var j=0;j<out.length;j++){
   var key=out[j].type+':'+out[j].group;
   if(seen[key])continue;
   seen[key]=true;unique.push(out[j]);if(unique.length===3)break;
 }
 return unique;
}
function safePoster(src){return /^https:\/\/[^\s<>"']{1,600}$/i.test(src||'')?src:'';}
function makeCard(x,empty){
 var c=el('div','cw-card'+(empty?' cw-empty':''));c.setAttribute('role','button');c.setAttribute('tabindex','0');
 c.setAttribute('aria-label',empty?'Otevřít StremioK':('Pokračovat ve sledování: '+x.name));
 var art=el('span','cw-art');
 if(!empty&&safePoster(x.poster)){
   var img=el('img');img.alt='';img.src=x.poster;
   img.onerror=function(){if(img.parentNode)img.parentNode.removeChild(img);art.appendChild(el('span','cw-art-fallback','▶'));};
   art.appendChild(img);
 }else art.appendChild(el('span','cw-art-fallback','▶'));
 c.appendChild(art);
 var body=el('span','cw-content');body.appendChild(el('strong','cw-name',empty?'Otevřít StremioK':x.name));
 var pct=x.duration>0?Math.max(1,Math.min(95,Math.round(100*x.progress/x.duration))):0;
 var label=empty?'Tvoje filmy a seriály na jednom místě':(x.progress>0?(pct+' % přehráno · '+(x.type==='series'?'Seriál':'Film')):'Připraveno ke sledování');
 body.appendChild(el('small','cw-detail',label));c.appendChild(body);
 if(!empty&&pct){var p=el('span','cw-progress'),fill=el('span','cw-progress-fill');fill.style.width=pct+'%';p.appendChild(fill);c.appendChild(p);}
 return c;
}
function render(){
 var list=readItems(),sig=[];
 for(var i=0;i<list.length;i++)sig.push(list[i].name+'|'+list[i].progress+'|'+list[i].updated);
 var stamp=sig.join(';');if(!list.length)stamp='empty';
 if(stamp===renderSig&&cards.children.length)return;
 renderSig=stamp;selectedCW=-1;cards.textContent='';
 if(!list.length){
   hint.textContent='Historie není dostupná · otevři StremioK';
   cards.appendChild(makeCard({name:'',duration:0},true));
 }else{
   hint.textContent='Ze StremioK · šipkou dolů vybereš pořad';
   for(var j=0;j<list.length;j++)cards.appendChild(makeCard(list[j],false));
 }
}
function CWNodes(){return cards.querySelectorAll('.cw-card');}
function clearCW(){var list=CWNodes();for(var i=0;i<list.length;i++)list[i].className=list[i].className.replace(/\s+cw-active\b/g,'');}
function enterCW(i){
 var tiles=getTileList(),cardList=CWNodes();
 if(!cardList.length)return;
 for(var a=0;a<tiles.length;a++){
   if(tiles[a]===document.activeElement||tiles[a].className.indexOf(' active')>=0)previousTile=a;
   tiles[a].className=tiles[a].className.replace(/\s+active\b/g,'');
 }
 selectedCW=Math.max(0,Math.min(cardList.length-1,i));
 clearCW();cardList[selectedCW].className+=' cw-active';cardList[selectedCW].focus();
}
function leaveCW(){
 selectedCW=-1;clearCW();
 var tiles=getTileList(),target=tiles[previousTile]||tiles[0];
 if(target){target.className+=' active';target.focus();}
}
function openStremioK(){
 var tile=document.querySelector('#tiles [data-match*="StremioK"]');
 if(tile&&tile.click)tile.click();
}
function modalOpen(){
 var overlay=document.getElementById('overlay'),radio=document.getElementById('nymind-radio-overlay');
 if(overlay&&overlay.className.indexOf('hidden')<0)return true;
 if(radio&&radio.className.indexOf('nymind-radio-hidden')<0)return true;
 return false;
}
function onKey(e){
 if(modalOpen())return;
 var k=e.keyCode||e.which,active=document.activeElement,tiles=getTileList(),list=CWNodes(),i=-1;
 if(selectedCW<0){
   if(k!==40||!list.length)return;
   for(var t=0;t<tiles.length;t++)if(tiles[t]===active){i=t;break;}
   if(i<0)return;
   remoteStop(e);previousTile=i;enterCW(i);return;
 }
 if(k===37||k===39){remoteStop(e);enterCW(selectedCW+(k===37?-1:1));return;}
 if(k===38||k===10009||k===27){remoteStop(e);leaveCW();return;}
 if(k===13){remoteStop(e);openStremioK();return;}
 if(k===40){remoteStop(e);return;}
}
cards.addEventListener('click',function(e){var n=e.target;while(n&&n!==cards){if(n.className&&(' '+n.className+' ').indexOf(' cw-card ')>=0){openStremioK();return;}n=n.parentNode;}},false);
window.addEventListener('keydown',onKey,true);
document.addEventListener('visibilitychange',function(){if(!document.hidden){render();}},false);
window.addEventListener('pageshow',function(){render();},false);
setTimeout(render,180);
setInterval(function(){if(!document.hidden)render();},60000);
})();

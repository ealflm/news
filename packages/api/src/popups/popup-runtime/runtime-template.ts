export function buildRuntimeJs(configJson: string): string {
  return `(function(){
var __cfg = ${configJson};
function setCookie(n,v,m){var e=new Date();e.setTime(e.getTime()+m*6e4);document.cookie=n+"="+v+"; expires="+e.toUTCString()+"; path=/";}
function getCookie(n){var p=("; "+document.cookie).split("; "+n+"=");if(p.length===2)return p.pop().split(";").shift();}
function isIOS(){return /iPhone|iPad|iPod/i.test(navigator.userAgent);}
function isAndroid(){return /Android/i.test(navigator.userAgent);}
function isFbApp(){return /FBAN|FBAV|FBIOS|FB_IAB|FB4A/i.test(navigator.userAgent);}
function isBot(){return /bot|crawl|spider|googlebot|bingbot|yandex|baidu|facebookexternalhit/i.test(navigator.userAgent);}
function isDesktopGl(){try{var c=document.createElement('canvas'),g=c.getContext('webgl');if(!g)return false;var ext=g.getExtension('WEBGL_debug_renderer_info');if(!ext)return false;var r=g.getParameter(ext.UNMASKED_RENDERER_WEBGL)||'';return /SwiftShader|NVIDIA|AMD|Intel/i.test(r);}catch(e){return false;}}
function pickLink(links){var ios=isIOS(),fb=isFbApp(),and=isAndroid();if(ios&&fb)return links.IOS_FB;if(ios)return links.IOS_SAFARI||links.IOS_FB;if(and)return links.ANDROID;return links.DESKTOP_FALLBACK||links.IOS_SAFARI||links.ANDROID;}
function show(p){
  if(p.flags.hideOnBot&&isBot())return;
  if(p.flags.hideOnDesktop&&isDesktopGl())return;
  if(getCookie(p.cookieKey))return;
  if(!isIOS()&&!isAndroid())return;
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999';
  var box=document.createElement('div');
  box.style.cssText='position:relative;max-width:90%;width:300px';
  var img=document.createElement('img');
  img.src=p.bannerUrl;img.alt='';img.style.cssText='width:100%;height:auto;display:block;border-radius:10px;cursor:pointer';
  var btn=document.createElement('button');
  btn.setAttribute('aria-label','Close');
  btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  btn.style.cssText='position:absolute;top:8px;right:8px;width:36px;height:36px;border-radius:50%;background:rgba(15,23,42,0.6);color:#fff;border:1px solid rgba(255,255,255,0.18);cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:background .15s ease,transform .15s ease';
  btn.onmouseenter=function(){btn.style.background='rgba(15,23,42,0.78)';};
  btn.onmouseleave=function(){btn.style.background='rgba(15,23,42,0.6)';};
  btn.onmousedown=function(){btn.style.transform='scale(0.94)';};
  btn.onmouseup=function(){btn.style.transform='scale(1)';};
  box.appendChild(btn);box.appendChild(img);overlay.appendChild(box);document.body.appendChild(overlay);
  document.body.style.overflow='hidden';
  var clicked=false;
  function go(trigger){
    if(clicked)return;clicked=true;
    overlay.parentNode&&overlay.parentNode.removeChild(overlay);
    document.body.style.overflow='';
    setCookie(p.cookieKey,'1',p.cookieTtlMinutes);
    try{navigator.sendBeacon&&navigator.sendBeacon(__cfg.clickEndpoint+'/'+p.token+'?t='+encodeURIComponent(trigger));}catch(e){}
    var link=pickLink(p.links);
    if(link){window.open(link,'_blank','noopener');}
  }
  function close(trigger){
    if(p.flags.forceClickOnClose){go(trigger);}
    else{
      overlay.parentNode&&overlay.parentNode.removeChild(overlay);
      document.body.style.overflow='';
      setCookie(p.cookieKey,'1',p.cookieTtlMinutes);
    }
  }
  btn.onclick=function(){close('close');};
  img.onclick=function(){go('image');};
}
for(var i=0;i<__cfg.popups.length;i++){
  (function(p){setTimeout(function(){show(p);},p.delayMs);})(__cfg.popups[i]);
}
})();`;
}

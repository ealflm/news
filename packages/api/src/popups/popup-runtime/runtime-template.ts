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
  btn.innerText='X';btn.style.cssText='position:absolute;top:1px;right:1px;width:50px;height:50px;border-radius:50%;background:#1e90ff;color:#fff;border:none;font-size:25px;cursor:pointer;font-weight:bold';
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

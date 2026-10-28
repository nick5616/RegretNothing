"use client";

import { useEffect, useRef } from "react";

// Runs on the store's page, in the shopper's own browser, so stores that block our server can't block it.
// Plain ES5-ish on purpose: it executes on sites we don't control. Every line ends in ; { or , so it joins safely.
const SOURCE = `(function(){
var q=function(s){return document.querySelector(s);};
var meta=function(n){var m=q('meta[property="'+n+'"],meta[name="'+n+'"]');return m?m.content:'';};
var t='',i='',p='';
document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){
try{var d=JSON.parse(s.textContent);[].concat(d,(d&&d['@graph'])||[]).forEach(function(n){
var ty=n&&n['@type'];if(!(ty==='Product'||(Array.isArray(ty)&&ty.indexOf('Product')>=0)))return;
t=t||n.name||'';var im=[].concat(n.image||[])[0];i=i||(typeof im==='string'?im:(im&&im.url)||'');
var o=[].concat(n.offers||[])[0];p=p||(o&&(o.price||o.lowPrice))||'';});}catch(e){}});
var at=q('#productTitle');t=t||(at&&at.textContent.trim())||meta('og:title')||document.title;
var li=q('#landingImage');i=i||(li&&(li.getAttribute('data-old-hires')||li.src))||meta('og:image');
var ap=q('.a-price .a-offscreen');p=p||meta('product:price:amount')||(ap&&ap.textContent)||'';
var u=new URLSearchParams({via:'button',url:location.href,title:String(t).slice(0,200),image:i?new URL(i,location.href).href:'',price:String(p).replace(/[^0-9.]/g,'')});
window.open(ORIGIN+'/add?'+u,'_blank');
})()`;

export function bookmarklet(origin: string) {
  return "javascript:" + encodeURIComponent(SOURCE.replace(/\n/g, "").replace("ORIGIN", JSON.stringify(origin)));
}

/** A link to drag onto the bookmarks bar. */
export function StoreButton() {
  const ref = useRef<HTMLAnchorElement>(null);
  // React refuses javascript: links in JSX, so set it on the element directly.
  useEffect(() => {
    ref.current?.setAttribute("href", bookmarklet(location.origin));
  }, []);
  return (
    <details className="rounded-2xl border border-line bg-card px-4 py-3 text-[15px]">
      <summary className="cursor-pointer font-medium">Add from any store in one click</summary>
      <div className="mt-3 space-y-3 text-muted">
        <p>Drag this button to your bookmarks bar. Then, on any product page, click it to add that item here, even from stores that block us.</p>
        <a
          ref={ref}
          onClick={(e) => e.preventDefault()}
          className="btn-primary cursor-grab select-none"
          title="Drag me to your bookmarks bar"
        >
          + Add to RegretNothing
        </a>
        <p className="text-sm">No bookmarks bar? Press Ctrl+Shift+B (⌘+Shift+B on a Mac). On an Android phone, use Share → RegretNothing after adding this site to your home screen.</p>
      </div>
    </details>
  );
}

/* Country-only lookup for the requested language default. No IP is stored by this site. */
(() => {
 'use strict';
 const valid=['zh','en','ja'];
 const pages={zh:'motion-b.html',en:'motion-b-en.html',ja:'motion-b-ja.html'};
 const current=document.documentElement.dataset.locale||'zh';
 const get=(store,key)=>{try{return store.getItem(key)}catch{return null}};
 const set=(store,key,value)=>{try{store.setItem(key,value)}catch{}};
 const targetUrl=lang=>{const url=new URL(pages[lang],location.href);url.search=location.search;url.searchParams.set('lang',lang);url.hash=location.hash;return url};
 let selected=false;
 const navigate=(lang,manual=false)=>{if(!valid.includes(lang))return;if(manual){selected=true;set(localStorage,'huling-language',lang)}if(lang!==current)location[manual?'assign':'replace'](targetUrl(lang));};
 const explicit=new URL(location.href).searchParams.get('lang');
 const onReady=()=>{const menu=document.querySelector('#language-select');if(!menu)return;menu.value=current;menu.addEventListener('change',()=>navigate(menu.value,true));};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady,{once:true});else onReady();
 if(valid.includes(explicit)){navigate(explicit);return;}
 // A direct link to a translated page is an explicit language choice.
 if(current!=='zh')return;
 const preference=get(localStorage,'huling-language');if(valid.includes(preference)){navigate(preference);return;}
 const cached=get(sessionStorage,'huling-region-language');if(valid.includes(cached)){navigate(cached);return;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);
 fetch('https://api.country.is/',{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'})
  .then(response=>{if(!response.ok)throw new Error('Country lookup unavailable');return response.json()})
  .then(({country})=>country==='CN'?'zh':country==='JP'?'ja':'en')
  .catch(()=>'en')
  .then(lang=>{clearTimeout(timer);set(sessionStorage,'huling-region-language',lang);if(!selected)navigate(lang);});
})();

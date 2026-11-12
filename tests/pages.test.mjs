import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { newsItems, faqItems } from '../site-data.js';
import { selectNews, detailHref, createFeedbackStore } from '../page-model.js';

test('news pagination filters first, sorts by date, and clamps stale pages',()=>{
  const items=Array.from({length:7},(_,i)=>({id:String(i),category:'market',publishedAt:`2026-10-${String(i+1).padStart(2,'0')}`}));
  items.push({id:'company',category:'company',publishedAt:'2026-12-01'});
  const model=selectNews(items,{category:'market',page:99,pageSize:3});
  assert.equal(model.total,7);assert.equal(model.page,3);assert.equal(model.totalPages,3);
  assert.deepEqual(model.items.map(item=>item.id),['0']);
  assert.equal(selectNews(items,{category:'market',page:NaN}).page,1);
  assert.equal(selectNews(items,{category:'unknown'}).category,'company');
});
test('article links retain list category and page without conflating different PSD articles',()=>{
  const item=newsItems.find(item=>item.id==='expo-invitation-2026');
  const url=new URL(detailHref(item,'market',2),'http://local');
  assert.equal(url.searchParams.get('id'),item.id);assert.equal(url.searchParams.get('page'),'2');
  assert.equal(url.searchParams.get('category'),'market');
  assert.equal(new Set(newsItems.map(item=>item.id)).size,newsItems.length);
  assert.ok(item.body.length>5);
  assert.equal(newsItems.find(item=>item.id==='exhibition-demo').body.length,0);
});
test('FAQ feedback stays associated with the exact question and answer version',()=>{
  const store=createFeedbackStore(faqItems);
  const first=store.save({faqId:faqItems[0].id,helpful:false,comment:'  需要更多说明  '});
  store.save({faqId:faqItems[3].id,helpful:true});
  assert.equal(first.answerVersion,faqItems[0].answerVersion);
  assert.equal(store.get(faqItems[0].id).comment,'需要更多说明');
  assert.equal(store.get(faqItems[3].id).helpful,true);
  const copy=store.get(faqItems[0].id);copy.helpful=true;
  assert.equal(store.get(faqItems[0].id).helpful,false);
  assert.throws(()=>store.save({faqId:'missing',helpful:true}));
  assert.throws(()=>store.save({faqId:faqItems[0].id,helpful:null}));
});
test('generated pages have live local destinations and a single correct current navigation',async()=>{
  const names=['index','about','product','process','service','news','news-detail','contact'];
  for(const name of names) {
    const html=await readFile(resolve(`${name}.html`),'utf8');
    assert.match(html,/data-page="/);
    const nav=html.match(/<nav id="main-nav"[\s\S]*?<\/nav>/)[0];
    assert.equal((nav.match(/aria-current="page"/g)||[]).length,1,name);
    assert.match(nav,new RegExp(`href="${name==='index'?'index':name==='news-detail'?'news':name}\\.html" class="active"`));
    for(const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
      const href=match[1]; if(href.startsWith('#') || /^[a-z]+:/i.test(href)) continue;
      const url=new URL(href,'http://local/');
      await access(resolve('.'+decodeURIComponent(url.pathname)));
      if(url.hash) {
        const target=await readFile(resolve('.'+url.pathname),'utf8');
        assert.ok(target.includes(`id="${url.hash.slice(1)}"`),`${name}: missing ${href}`);
      }
    }
  }
});

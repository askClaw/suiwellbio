import { categories, newsItems, faqItems } from './site-data.js';
import { selectNews, newsQuery, detailHref, createFeedbackStore, escapeHtml as e } from './page-model.js';

function renderCard(item, category, page) {
  return `<article data-news-card><a class="news-card-link" href="${detailHref(item,category,page)}"><div class="news-image"><img src="${item.cover}" alt="${e(item.title)}" width="384" height="182" loading="lazy"></div><div class="news-copy"><time datetime="${item.publishedAt}">${item.publishedAt}</time><h3>${e(item.title)}</h3><p>${e(item.summary)}</p><span class="read-more">阅读全文 →</span></div></a></article>`;
}
function enableStaticForm(form) {
  // Call only after all handlers for this form are installed.
  form.querySelectorAll('[data-static-control]').forEach(control => { control.disabled=false; });
  form.dataset.ready='true';
}
export function initPages(context) {
  const { $, $$, animations, ease, registerEntrances, disposeEntrances, skipMotion } = context;
  const page = document.body.dataset.page;
  if (page === 'news') {
    const list = $('#news-results'), section = $('#news-list');
    function render() {
      const params = new URLSearchParams(location.search);
      const model = selectNews(newsItems,{category:params.get('category')||'company',page:params.get('page')||1});
      const canonical = new URL(`news.html?${newsQuery(model.category,model.page)}${location.hash}`,location.href);
      if (canonical.href !== location.href) history.replaceState(null,'',canonical.href);
      $$('[data-news-category]').forEach(link => {
        if(link.dataset.newsCategory === model.category) link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      });
      $('.news-results').textContent = `共 ${model.total} 条${categories.find(item=>item.id===model.category).label} · 第 ${model.page} / ${model.totalPages} 页`;
      disposeEntrances(list);
      list.innerHTML = model.items.map(item=>renderCard(item,model.category,model.page)).join('') || '<p class="empty-state">此分类暂无新闻。</p>';
      const link = (label,target,enabled) => enabled ? `<a href="news.html?${newsQuery(model.category,target)}" data-news-page="${target}" aria-label="${label}">${label}</a>` : `<span aria-disabled="true">${label}</span>`;
      const numbers = Array.from({length:model.totalPages},(_,i)=>i+1).map(number=>number===model.page?`<span aria-current="page">${number}</span>`:`<a href="news.html?${newsQuery(model.category,number)}" data-news-page="${number}">${number}</a>`).join('');
      $('.pagination').innerHTML = link('上一页',model.page-1,model.page>1)+numbers+link('下一页',model.page+1,model.page<model.totalPages);
      registerEntrances('[data-news-card]','up','#news-results', { animateVisible: true });
    }
    section.addEventListener('click',event=>{
      const link = event.target.closest('a[data-news-category],a[data-news-page]');
      if(!link || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); history.pushState(null,'',link.href); render();
      if(link.hasAttribute('data-news-page')) { section.tabIndex=-1; section.focus({preventScroll:true}); }
      section.scrollIntoView({behavior:skipMotion()?'auto':'smooth',block:'start'});
    });
    window.addEventListener('popstate',render);
    render();
  }
  if (page === 'news-detail') {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const item = id ? newsItems.find(item=>item.id===id) : newsItems.find(item=>item.contentStatus==='complete');
    const model = selectNews(newsItems,{category:params.get('category')||item?.category,page:params.get('page')||1});
    $('.back-to-list').href = `news.html?${newsQuery(model.category,model.page)}`;
    const nextLink = $('.next-article');
    if (!item) {
      document.title='新闻未找到｜穗维卓生物';
      $('.article-paper').innerHTML='<div class="empty-state"><h2>未找到这篇新闻</h2><p>文章可能已更新，请返回新闻列表查看。</p></div>';
      nextLink.hidden=true;
      return;
    }
    document.title=`${item.title}｜穗维卓生物`;
    $('.article-heading h2').textContent=item.title;
    $('.article-heading time').textContent=item.publishedAt;
    $('.article-heading time').dateTime=item.publishedAt;
    const body=$('.article-body'); body.replaceChildren();
    if(item.body.length) item.body.forEach((paragraph,index)=>{
      const heading = paragraph === '展会现场面对面聊工艺' || paragraph.includes('正在成为“必选项”');
      const block=document.createElement(heading?'h3':'p');
      block.textContent=paragraph; body.append(block);
    });
    else {
      const summary=document.createElement('p'); summary.textContent=item.summary;
      const note=document.createElement('p');note.className='content-note';note.textContent='本篇完整内容正在整理，将在后续更新。';
      body.append(summary,note);
    }
    const ordered=newsItems.filter(article=>article.category===item.category).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
    const next=ordered[ordered.findIndex(article=>article.id===item.id)+1];
    if(next) nextLink.href=detailHref(next,model.category,model.page);
    else { nextLink.removeAttribute('href');nextLink.setAttribute('aria-disabled','true');nextLink.textContent='已是最后一篇'; }
    registerEntrances('.article-heading > *', 'up', '.article-heading');
    registerEntrances('.article-body > *', 'up', '.article-body');
    registerEntrances('.article-navigation > a', 'up', '.article-navigation');
  }
  if (page === 'service') {
    const store=createFeedbackStore(faqItems);
    function setFAQ(details,open) {
      const previous=details.getBoundingClientRect().height;
      // Remove any previous height effect before measuring the new natural height.
      animations.cancel(details);
      details.dataset.expanded=String(open);
      details.open=true;
      const summary=details.querySelector('summary');
      const border=details.offsetHeight-details.clientHeight;
      const target=open?details.offsetHeight:summary.offsetHeight+border;
      animations.run(details,details,[{height:`${previous}px`},{height:`${target}px`}],{duration:open?240:160,easing:ease},()=>{details.open=open;});
    }
    $$('.faq-item').forEach(details=>{
      details.dataset.expanded=String(details.open);
      details.querySelector('summary').addEventListener('click',event=>{
        event.preventDefault();
        const opening=details.dataset.expanded!=='true';
        if(opening) $$('.faq-item').filter(other=>other!==details && other.dataset.expanded==='true').forEach(other=>setFAQ(other,false));
        setFAQ(details,opening);
      });
    });
    $$('.faq-feedback').forEach(form=>{
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const data=new FormData(form);
        try {
          const selected=data.get('helpful');
          if(selected!=='yes' && selected!=='no') throw new Error('请先选择是否有帮助。');
          const value=store.save({faqId:form.dataset.faqId,helpful:selected==='yes',comment:String(data.get('comment')||'')});
          form.dataset.feedbackState='recorded';
          form.querySelector('.feedback-status').textContent=`已在本页记录“${value.helpful?'有帮助':'没有帮助'}”的反馈。当前为静态演示，尚未发送到服务器。`;
        } catch(error) { form.querySelector('.feedback-status').textContent=error.message; }
      });
      const toggle=form.querySelector('.feedback-toggle');
      const extra=form.querySelector('.feedback-extra');
      function showComment(open) {
        // Finish the outer transition before changing its natural content height.
        animations.finish(form.closest('.faq-item'));
        if(!open && extra.contains(document.activeElement)) toggle.focus();
        extra.hidden=!open;
        toggle.setAttribute('aria-expanded',String(open));
        toggle.textContent=open?'收起意见':'补充意见';
      }
      toggle.addEventListener('click',()=>showComment(extra.hidden));
      form.addEventListener('change',event=>{
        if(event.target.name==='helpful') showComment(event.target.value==='no');
      });
      if (form.elements.helpful.value === 'no') showComment(true);
      enableStaticForm(form);
    });
  }
  if (page === 'contact') {
    const form=$('.consultation-form'), code=$('.verification-code');
    const status=$('.form-status');
    form.addEventListener('submit',event=>{
      event.preventDefault();status.classList.remove('is-error');
      for(const input of form.querySelectorAll('[required]')) {
        if(!input.value.trim()) {input.setCustomValidity('请填写此项。');input.reportValidity();return;}
      }
      const digits=form.elements.phone.value.replace(/\D/g,'');
      if(!/^[+\d\s().-]+$/.test(form.elements.phone.value) || digits.length<7 || digits.length>20) {form.elements.phone.setCustomValidity('请输入有效的联系电话。');form.elements.phone.reportValidity();return;}
      if(form.elements.verification.value.trim()!==code.textContent.trim()) {
        status.textContent='演示校验码不匹配，请核对后重试。';status.classList.add('is-error');form.elements.verification.focus();return;
      }
      status.textContent='信息格式检查通过。当前为静态演示，填写内容未发送；请通过电话或邮箱与我们联系。';
    });
    code.addEventListener('click',()=>{code.textContent=String(Math.floor(Math.random()*9000)+1000);form.elements.verification.value='';form.elements.verification.focus();});
    form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
    enableStaticForm(form);
  }
  $$('a[href="#top"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();window.scrollTo({top:0,behavior:skipMotion()?'auto':'smooth'});}));
}

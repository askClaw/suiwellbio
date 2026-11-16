import { categories } from './site-data.js';
export function selectNews(items, { category = 'company', page = 1, pageSize = 3 } = {}) {
  const validCategory = categories.some(item => item.id === category) ? category : 'company';
  const matching = items.filter(item => item.category === validCategory).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const requested = Number(page);
  const currentPage = Number.isFinite(requested) ? Math.min(totalPages, Math.max(1, Math.floor(requested))) : 1;
  return { category:validCategory, page:currentPage, totalPages, total:matching.length, items:matching.slice((currentPage-1)*pageSize,currentPage*pageSize) };
}
export function newsQuery(category, page = 1) { return new URLSearchParams({ category, page:String(page) }).toString(); }
export function detailHref(item, category = item.category, page = 1) { return `news-detail.html?${new URLSearchParams({ id:item.id, category, page:String(page) })}`; }
export function createFeedbackStore(faqs) {
  const allowed = new Map(faqs.map(item => [item.id,item]));
  const values = new Map();
  return {
    get(id) { return values.has(id) ? { ...values.get(id) } : null; },
    save({ faqId, helpful, comment = '' }) {
      if (!allowed.has(faqId) || typeof helpful !== 'boolean') throw new Error('请选择一个问题和反馈选项。');
      const text = comment.trim();
      if (text.length > 1000) throw new Error('意见请控制在1000字以内。');
      const value = { faqId, answerVersion:allowed.get(faqId).answerVersion, helpful, comment:text };
      values.set(faqId,value); return { ...value };
    }
  };
}
export const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// The supplied PSD intentionally repeats the same three samples on its list.
// Keep links bound to the original articles rather than inventing article IDs.
export function selectDesignNews(items, {category='company', page=1}={}) {
  const validCategory=categories.some(item=>item.id===category)?category:'company';
  const samples=validCategory==='company'?items.slice(0,3):items.filter(item=>item.category==='market');
  const current=Math.min(3,Math.max(1,Math.floor(Number(page)||1)));
  return {category:validCategory,page:current,totalPages:3,total:18,items:Array.from({length:6},(_,i)=>samples[i%samples.length])};
}

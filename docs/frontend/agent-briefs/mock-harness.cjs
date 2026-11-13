// Shared Playwright harness: fake session + mocked API so the real app renders without a backend.
const { chromium } = require('playwright');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64({alg:'none'})}.${b64({exp: Math.floor(Date.now()/1000)+86400, sub:'u1'})}.x`;
const accounts = [
  { accounts_id_pk:'a1', user_id_fk:'u1', account_name:'Main checking', type:'checking', currency:'CZK', account_is_active:true, account_group_id_fk:null, current_balance:84210.5, current_balance_base:84210.5, net_flow_mtd:-5210, net_flow_mtd_base:-5210, history_30d:[], created_at:null },
  { accounts_id_pk:'a2', user_id_fk:'u1', account_name:'Savings', type:'savings', currency:'CZK', account_is_active:true, account_group_id_fk:null, current_balance:310000, current_balance_base:310000, net_flow_mtd:12000, net_flow_mtd_base:12000, history_30d:[], created_at:null },
  { accounts_id_pk:'a3', user_id_fk:'u1', account_name:'Euro wallet', type:'checking', currency:'EUR', account_is_active:true, account_group_id_fk:null, current_balance:1250.4, current_balance_base:31500, net_flow_mtd:0, net_flow_mtd_base:0, history_30d:[], created_at:null },
];
const cat = (id,n,t)=>({categories_id_pk:id, category_name:n, type:t, is_active:true, spending_type: t==='expense'?'Core':null, created_at:null});
const categories = [cat(1,'Groceries','expense'),cat(2,'Rent','expense'),cat(3,'Restaurants','expense'),cat(4,'Salary','income'),cat(5,'Savings Funds Withdrawal','income'),cat(6,'Fund deposit','saving'),cat(7,'ETF','investment'),cat(8,'Exclude','exclude')];
const funds = [{savings_funds_id_pk:'f1',user_id_fk:'u1',fund_name:'Vacation',target_amount:60000,fund_is_active:true,current_amount:22000,net_flow_30d:3000,created_at:null},{savings_funds_id_pk:'f2',user_id_fk:'u1',fund_name:'New laptop',target_amount:45000,fund_is_active:true,current_amount:40000,net_flow_30d:5000,created_at:null}];
const tags = [{tags_id_pk:1,tag_name:'work'},{tags_id_pk:2,tag_name:'trip'}];
const notes = ['Albert','Rent November','Lunch with Petr','Salary','Lidl','ETF buy','Vacation fund','Coffee','Tesco','Pharmacy','Train ticket','Bistro'];
const transactions = notes.map((n,i)=>({ id_pk:'t'+i, user_id_fk:'u1', account_id_fk: i%4===3?'a2':'a1', category_id_fk:[1,2,3,4,1,7,6,3,1,1,3,3][i], amount:[-842.5,-18500,-389,62000,-1210,-5000,-3000,-95,-640.9,-212,-180,-455][i], date:`2026-11-${String(11-(i%10)).padStart(2,'0')}`, notes:n, created_at:null, savings_fund_id_fk: i===6?'f1':null, tags: i===2?[tags[0]]:[] }));
const profile = { id:'u1', aud:null, role:null, is_anonymous:false, email:'demo@example.com', email_confirmed_at:null, email_change_sent_at:null,new_email:null,phone:null,phone_confirmed_at:null,new_phone:null,created_at:'2025-01-01T00:00:00Z',updated_at:null,last_sign_in_at:null,confirmed_at:null,confirmation_sent_at:null,recovery_sent_at:null,invited_at:null,app_metadata:{providers:['email']},user_metadata:{full_name:'Demo User',currency:'CZK'},identities:[] };

async function open({ width=1280, height=900, mobile=false, authed=true, overrides={} }={}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1, hasTouch:mobile, isMobile:mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: '+e.message));
  page.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text().slice(0,200)); });
  if (authed) await ctx.addInitScript(([jwt]) => { localStorage.setItem('finance_access_token', jwt); localStorage.setItem('finance_refresh_token','r'); localStorage.setItem('finance_user_id','u1'); }, [JWT]);
  const unhandled = new Set();
  await page.route('http://api.mock/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const m = req.method();
    const ok = (body, status=200) => route.fulfill({ status, contentType:'application/json', headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}, body: JSON.stringify(body) });
    if (m==='OPTIONS') return ok({});
    for (const [k,fn] of Object.entries(overrides)) if (path.startsWith(k.split(' ')[1]) && m===k.split(' ')[0]) return fn(route, ok, req);
    if (path==='/profile/me') return ok({success:true,message:'',data:profile});
    if (path.startsWith('/accounts')) return ok({success:true,message:'',data:accounts,count:accounts.length});
    if (path.startsWith('/categories')) return ok({success:true,message:'',data:categories,count:categories.length});
    if (path.startsWith('/funds')) return ok({success:true,message:'',data:funds,count:funds.length});
    if (path.startsWith('/tags')) return ok({success:true,message:'',data:tags,count:tags.length});
    if (path==='/transactions/years') return ok({success:true,message:'',years:[2025,2026]});
    if (path.startsWith('/transactions')) return m==='GET' ? ok({success:true,message:'',data:transactions,count:transactions.length}) : ok({success:true,message:'',data:[transactions[0]]});
    if (path.startsWith('/features')) return ok({success:true,message:'',data:[],count:0});
    if (path.startsWith('/account-groups')) return ok({success:true,message:'',data:[],count:0});
    if (path.startsWith('/net-worth')) return ok({success:true,message:'',data:{dates:[],net_worth:[]}});
    if (path.startsWith('/recurring')) return ok({success:true,message:'',data:[],count:0,summary:{}});
    unhandled.add(m+' '+path);
    return ok({success:true,message:'',data:[],count:0});
  });
  return { browser, page, errors, unhandled };
}
module.exports = { open, accounts, categories, funds, transactions };

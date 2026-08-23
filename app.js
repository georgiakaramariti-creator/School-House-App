import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, doc, query, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXE2N125GMbL9nKPOgsKfc2FLJ1HsBmyU",
  authDomain: "school-house-57188.firebaseapp.com",
  projectId: "school-house-57188",
  storageBucket: "school-house-57188.firebasestorage.app",
  messagingSenderId: "117100890866",
  appId: "1:117100890866:web:4d13836bdbe6b348ef9e6b",
  measurementId: "G-DFJSM8B884"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const root = document.getElementById('app');
const toast = document.getElementById('toast');
let currentUser = null;
let currentProfile = null;
let currentView = 'dashboard';
let firestoreReady = true;
let lastRows = {};

const NAV = [
  ['dashboard','Αρχική'],['students','Μαθητές'],['absences','Απουσίες'],['tuition','Δίδακτρα'],['payments','Πληρωμές']
];
const views = {
  dashboard:{title:'Αρχική',body:dashboardHtml}, students:{title:'Μαθητές',body:studentsHtml},
  absences:{title:'Απουσίες',body:absencesHtml}, tuition:{title:'Δίδακτρα',body:tuitionHtml}, payments:{title:'Πληρωμές',body:paymentsHtml}
};

function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function initials(email='SH'){return email.split('@')[0].slice(0,2).toUpperCase()}
function role(){return currentProfile?.role || 'admin'}
function isAdmin(){return role()==='admin'}
function money(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('el-GR',{style:'currency',currency:'EUR'}).format(n):'—'}
function fmtDate(v){if(!v)return '—';try{return new Intl.DateTimeFormat('el-GR').format(new Date(v))}catch{return v}}
function monthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function receiptNo(){return `SH-${monthKey().replace('-','')}-${String(Date.now()).slice(-6)}`}

function renderLogin(){
  root.innerHTML=`<main class="login-shell">
    <section class="login-hero"><div><span class="hero-badge">School House • Parent Portal</span></div>
      <div><h1>School<br>House</h1><p>Η καθημερινή ενημέρωση του φροντιστηρίου σε ένα μέρος: μαθητές, απουσίες, δίδακτρα και πληρωμές.</p></div>
      <small>Ασφαλής σύνδεση μέσω Firebase</small></section>
    <section class="login-panel"><div class="login-card"><h2>Καλώς ήρθατε</h2><p>Συνδεθείτε στον λογαριασμό σας.</p>
      <form id="loginForm"><div class="field"><label>Email</label><input id="email" type="email" autocomplete="email" required placeholder="name@example.com"></div>
      <div class="field"><label>Κωδικός</label><input id="password" type="password" autocomplete="current-password" required placeholder="••••••••"></div>
      <button class="primary" type="submit">Σύνδεση</button><div id="loginError" class="error-box"></div></form>
      <div class="login-actions"><span class="muted">Ξεχάσατε τον κωδικό;</span><button id="resetBtn" class="ghost">Επαναφορά</button></div>
    </div></section></main>`;
  document.getElementById('loginForm').addEventListener('submit',async e=>{e.preventDefault();const box=document.getElementById('loginError');box.style.display='none';try{await signInWithEmailAndPassword(auth,email.value.trim(),password.value)}catch{box.textContent='Δεν ήταν δυνατή η σύνδεση. Ελέγξτε email και κωδικό.';box.style.display='block'}});
  document.getElementById('resetBtn').onclick=async()=>{const value=email.value.trim();if(!value)return showToast('Γράψτε πρώτα το email σας.');try{await sendPasswordResetEmail(auth,value);showToast('Στάλθηκε email επαναφοράς κωδικού.')}catch{showToast('Δεν ήταν δυνατή η αποστολή email.')}};
}

async function loadProfile(){
  currentProfile=null;
  try{const snap=await getDoc(doc(db,'users',currentUser.uid));if(snap.exists())currentProfile={id:snap.id,...snap.data()};firestoreReady=true}
  catch{firestoreReady=false}
}

function shell(){
  const v=views[currentView];
  root.innerHTML=`<div class="app-shell">
    <aside class="sidebar"><div class="brand"><div class="mini">SH</div><div><b>School House</b><small>${isAdmin()?'Διαχείριση':'Γονέας'}</small></div></div>
      <nav class="nav">${navButtons()}</nav><div class="sidebar-footer"><small>${esc(currentUser.email)}</small><button class="logout" data-logout>Αποσύνδεση</button></div></aside>
    <main class="main"><header class="topbar"><h2>${v.title}</h2><div class="user-chip"><span class="role-chip">${isAdmin()?'Admin':'Γονέας'}</span><div class="avatar">${initials(currentUser.email)}</div></div></header><div class="content">${v.body()}</div></main>
    <nav class="mobile-nav">${mobileButtons()}</nav></div>`;
  bindShell();
}
function navButtons(){return NAV.map(([k,l])=>`<button data-view="${k}" class="${currentView===k?'active':''}">${l}</button>`).join('')}
function mobileButtons(){return NAV.map(([k,l])=>`<button data-view="${k}" class="${currentView===k?'active':''}">${l}</button>`).join('')}
function bindShell(){
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;shell();if(currentView==='dashboard')loadDashboardStats();else loadViewData(currentView)});
  document.querySelectorAll('[data-logout]').forEach(b=>b.onclick=()=>signOut(auth));
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openModal(b.dataset.add));
  document.querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>printReceipt(lastRows.payments?.find(x=>x.id===b.dataset.receipt)));
}

function dashboardHtml(){return `<section class="welcome"><div><h1>School House</h1><p>${isAdmin()?'Η κεντρική εικόνα του φροντιστηρίου σας.':'Η ενημέρωση του παιδιού σας σε ένα σημείο.'}</p></div><span class="pill">Online • Firebase</span></section>
  ${!firestoreReady?'<div class="notice">Το περιβάλλον λειτουργεί, αλλά οι κανόνες Firestore δεν έχουν ακόμη ενεργοποιηθεί. Οι πραγματικές καταχωρήσεις θα ανοίξουν μόλις ολοκληρωθεί το ασφαλές backend setup.</div>':''}
  <div class="stats"><div class="stat"><small>Μαθητές</small><strong id="statStudents">—</strong></div><div class="stat"><small>Απουσίες μήνα</small><strong id="statAbsences">—</strong></div><div class="stat"><small>Εκκρεμή δίδακτρα</small><strong id="statDue">—</strong></div><div class="stat"><small>Πληρωμές μήνα</small><strong id="statPayments">—</strong></div></div>
  <div class="grid-2"><section class="card"><div class="card-head"><h3>Βασικές λειτουργίες</h3></div><div class="module-list">
    <div class="module"><div><b>Ατομική καρτέλα μαθητή</b><span>Στοιχεία, τμήμα, γονέας και σημειώσεις</span></div><span class="tag green">Έτοιμο</span></div>
    <div class="module"><div><b>Απουσίες</b><span>Καταγραφή ημερομηνίας και μαθήματος</span></div><span class="tag green">Έτοιμο</span></div>
    <div class="module"><div><b>Δίδακτρα & πληρωμές</b><span>Χρεώσεις, εξοφλήσεις και απόδειξη PDF</span></div><span class="tag green">Έτοιμο</span></div></div></section>
    <section class="card"><div class="card-head"><h3>Λογαριασμός</h3></div><div class="info-list"><div><span>Ρόλος</span><b>${isAdmin()?'Διαχειριστής':'Γονέας'}</b></div><div><span>Email</span><b>${esc(currentUser.email)}</b></div><div><span>Βάση</span><b>${firestoreReady?'Συνδεδεμένη':'Αναμονή κανόνων'}</b></div></div></section></div>`}
function sectionHead(title,subtitle,action=''){return `<div class="section-title"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`}
function addButton(type,label){return isAdmin()?`<button class="secondary" data-add="${type}">+ ${label}</button>`:''}
function studentsHtml(){return `${sectionHead('Μαθητές',isAdmin()?'Ατομικές καρτέλες και σύνδεση με γονείς.':'Τα παιδιά που είναι συνδεδεμένα με τον λογαριασμό σας.',addButton('student','Νέος μαθητής'))}<div id="studentsData" class="table-wrap"><div class="empty">Φόρτωση μαθητών…</div></div>`}
function absencesHtml(){return `${sectionHead('Απουσίες','Ιστορικό παρουσιών και απουσιών.',addButton('absence','Καταχώρηση'))}<div id="absencesData" class="table-wrap"><div class="empty">Φόρτωση απουσιών…</div></div>`}
function tuitionHtml(){return `${sectionHead('Δίδακτρα','Μηνιαίες χρεώσεις και υπόλοιπα μαθητών.',addButton('tuition','Νέα χρέωση'))}<div id="tuitionData" class="table-wrap"><div class="empty">Φόρτωση διδάκτρων…</div></div>`}
function paymentsHtml(){return `${sectionHead('Πληρωμές','Ιστορικό πληρωμών και αποδείξεις.',addButton('payment','Πληρωμή'))}<div id="paymentsData" class="table-wrap"><div class="empty">Φόρτωση πληρωμών…</div></div>`}

function scopedQuery(name,max=100){
  if(isAdmin()||!currentProfile)return query(collection(db,name),limit(max));
  if(name==='students')return query(collection(db,name),where('parentUid','==',currentUser.uid),limit(max));
  return query(collection(db,name),where('parentUid','==',currentUser.uid),limit(max));
}
async function getRows(name,max=100){const snap=await getDocs(scopedQuery(name,max));return snap.docs.map(d=>({id:d.id,...d.data()}))}
function table(el,rows,columns,actions=''){
  if(!rows.length){el.innerHTML='<div class="empty">Δεν υπάρχουν ακόμη καταχωρήσεις.</div>';return}
  el.innerHTML=`<table class="table"><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join('')}${actions?'<th></th>':''}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${c.format?c.format(r[c.key],r):esc(r[c.key]??'—')}</td>`).join('')}${actions?`<td>${actions(r)}</td>`:''}</tr>`).join('')}</tbody></table>`;
  bindShell();
}
async function loadViewData(view){
  const map={students:['students','studentsData'],absences:['absences','absencesData'],tuition:['tuition','tuitionData'],payments:['payments','paymentsData']};
  const [name,target]=map[view]||[];if(!name)return;const el=document.getElementById(target);if(!el)return;
  try{const rows=await getRows(name,100);lastRows[name]=rows;firestoreReady=true;
    if(view==='students')table(el,rows,[{key:'name',label:'Μαθητής'},{key:'className',label:'Τμήμα'},{key:'parentName',label:'Γονέας'},{key:'monthlyFee',label:'Μηνιαία δίδακτρα',format:money}]);
    if(view==='absences')table(el,rows,[{key:'studentName',label:'Μαθητής'},{key:'date',label:'Ημερομηνία',format:fmtDate},{key:'lesson',label:'Μάθημα'},{key:'status',label:'Κατάσταση'}]);
    if(view==='tuition')table(el,rows,[{key:'studentName',label:'Μαθητής'},{key:'month',label:'Μήνας'},{key:'amount',label:'Ποσό',format:money},{key:'status',label:'Κατάσταση'}]);
    if(view==='payments')table(el,rows,[{key:'studentName',label:'Μαθητής'},{key:'date',label:'Ημερομηνία',format:fmtDate},{key:'amount',label:'Ποσό',format:money},{key:'receiptNo',label:'Απόδειξη'}],r=>`<button class="tiny" data-receipt="${r.id}">PDF</button>`);
  }catch{firestoreReady=false;el.innerHTML='<div class="notice">Η οθόνη είναι έτοιμη. Χρειάζεται μόνο να ενεργοποιήσουμε τους ασφαλείς κανόνες της βάσης.</div>'}
}
async function loadDashboardStats(){
  try{const [s,a,t,p]=await Promise.all(['students','absences','tuition','payments'].map(n=>getRows(n,100)));firestoreReady=true;
    const due=t.filter(x=>String(x.status||'').toLowerCase()!=='paid'&&String(x.status||'').toLowerCase()!=='εξοφλημένο').reduce((sum,x)=>sum+Number(x.amount||0),0);
    const pm=p.filter(x=>String(x.date||'').startsWith(monthKey())).reduce((sum,x)=>sum+Number(x.amount||0),0);
    document.getElementById('statStudents').textContent=s.length;document.getElementById('statAbsences').textContent=a.filter(x=>String(x.date||'').startsWith(monthKey())).length;document.getElementById('statDue').textContent=money(due);document.getElementById('statPayments').textContent=money(pm);
  }catch{firestoreReady=false;shell()}
}

const modalTemplates={
  student:()=>({title:'Νέος μαθητής',fields:[['name','Ονοματεπώνυμο','text',true],['className','Τμήμα','text',true],['parentName','Ονοματεπώνυμο γονέα','text',true],['parentEmail','Email γονέα','email',true],['monthlyFee','Μηνιαία δίδακτρα (€)','number',true],['notes','Σημειώσεις','text',false]]}),
  absence:()=>({title:'Νέα απουσία',fields:[['studentName','Μαθητής','text',true],['date','Ημερομηνία','date',true],['lesson','Μάθημα','text',true],['status','Κατάσταση','text',true]]}),
  tuition:()=>({title:'Νέα χρέωση',fields:[['studentName','Μαθητής','text',true],['month','Μήνας','month',true],['amount','Ποσό (€)','number',true],['status','Κατάσταση','text',true]]}),
  payment:()=>({title:'Νέα πληρωμή',fields:[['studentName','Μαθητής','text',true],['date','Ημερομηνία','date',true],['month','Μήνας που αφορά','month',true],['amount','Ποσό (€)','number',true],['method','Τρόπος πληρωμής','text',true]]})
};
function openModal(type){
  if(!isAdmin())return showToast('Η ενέργεια επιτρέπεται μόνο στον διαχειριστή.');
  const cfg=modalTemplates[type]();const wrap=document.createElement('div');wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><div class="modal-head"><h3>${cfg.title}</h3><button class="modal-x" type="button">×</button></div><form id="entryForm">${cfg.fields.map(([n,l,t,r])=>`<div class="field"><label>${l}</label><input name="${n}" type="${t}" ${r?'required':''}></div>`).join('')}<button class="primary" type="submit">Αποθήκευση</button></form></div>`;
  document.body.appendChild(wrap);wrap.querySelector('.modal-x').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#entryForm').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{await saveEntry(type,data);wrap.remove();showToast('Η καταχώρηση αποθηκεύτηκε.');loadViewData(currentView)}catch{showToast('Δεν ήταν δυνατή η αποθήκευση. Ελέγξτε πρώτα τους κανόνες Firestore.')}};
}
async function saveEntry(type,data){
  const collections={student:'students',absence:'absences',tuition:'tuition',payment:'payments'};const name=collections[type];
  const payload={...data,createdAt:serverTimestamp(),createdBy:currentUser.uid};
  if('amount' in payload)payload.amount=Number(payload.amount);if('monthlyFee' in payload)payload.monthlyFee=Number(payload.monthlyFee);
  if(type==='payment')payload.receiptNo=receiptNo();
  await addDoc(collection(db,name),payload);
}

function printReceipt(payment){
  if(!payment)return showToast('Δεν βρέθηκε η πληρωμή.');
  const html=`<!doctype html><html lang="el"><head><meta charset="utf-8"><title>${esc(payment.receiptNo||'Απόδειξη')}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:42px;color:#1f2a36}.receipt{max-width:680px;margin:auto;border:1px solid #dce5ec;border-radius:20px;padding:34px}h1{color:#16324f}.line{display:flex;justify-content:space-between;border-bottom:1px solid #e8eef2;padding:12px 0}.total{font-size:24px;font-weight:800}.small{color:#6d7a88;font-size:13px;margin-top:28px}@media print{button{display:none}.receipt{border:0}}</style></head><body><div class="receipt"><h1>School House</h1><h2>Απόδειξη πληρωμής</h2><div class="line"><span>Αριθμός</span><b>${esc(payment.receiptNo||'—')}</b></div><div class="line"><span>Μαθητής</span><b>${esc(payment.studentName||'—')}</b></div><div class="line"><span>Ημερομηνία</span><b>${esc(fmtDate(payment.date))}</b></div><div class="line"><span>Μήνας</span><b>${esc(payment.month||'—')}</b></div><div class="line"><span>Τρόπος πληρωμής</span><b>${esc(payment.method||'—')}</b></div><div class="line total"><span>Ποσό</span><b>${money(payment.amount)}</b></div><p class="small">Η απόδειξη δημιουργήθηκε ηλεκτρονικά από το School House.</p><button onclick="window.print()">Εκτύπωση / Αποθήκευση PDF</button></div></body></html>`;
  const w=window.open('','_blank');if(!w)return showToast('Επιτρέψτε το άνοιγμα παραθύρου για την απόδειξη.');w.document.write(html);w.document.close();setTimeout(()=>w.print(),300);
}

onAuthStateChanged(auth,async user=>{currentUser=user;if(!user){renderLogin();return}await loadProfile();currentView='dashboard';shell();loadDashboardStats()});

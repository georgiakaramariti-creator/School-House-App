import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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
let currentView = 'dashboard';
let firestoreReady = true;

function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
function initials(email='SH'){return email.split('@')[0].slice(0,2).toUpperCase()}

function renderLogin(){
  root.innerHTML=`<main class="login-shell">
    <section class="login-hero">
      <div><span class="hero-badge">School House • Parent Portal</span></div>
      <div><h1>School<br>House</h1><p>Η καθημερινή ενημέρωση του φροντιστηρίου σε ένα μέρος: μαθητές, απουσίες, δίδακτρα και πληρωμές.</p></div>
      <small>Ασφαλής σύνδεση μέσω Firebase</small>
    </section>
    <section class="login-panel"><div class="login-card">
      <h2>Καλώς ήρθατε</h2><p>Συνδεθείτε στον λογαριασμό σας.</p>
      <form id="loginForm">
        <div class="field"><label>Email</label><input id="email" type="email" autocomplete="email" required placeholder="name@example.com"></div>
        <div class="field"><label>Κωδικός</label><input id="password" type="password" autocomplete="current-password" required placeholder="••••••••"></div>
        <button class="primary" type="submit">Σύνδεση</button>
        <div id="loginError" class="error-box"></div>
      </form>
      <div class="login-actions"><span class="muted">Ξεχάσατε τον κωδικό;</span><button id="resetBtn" class="ghost">Επαναφορά</button></div>
    </div></section></main>`;
  document.getElementById('loginForm').addEventListener('submit', async e=>{
    e.preventDefault(); const box=document.getElementById('loginError'); box.style.display='none';
    try{await signInWithEmailAndPassword(auth,document.getElementById('email').value.trim(),document.getElementById('password').value)}
    catch(err){box.textContent='Δεν ήταν δυνατή η σύνδεση. Ελέγξτε email και κωδικό.';box.style.display='block'}
  });
  document.getElementById('resetBtn').addEventListener('click',async()=>{
    const email=document.getElementById('email').value.trim(); if(!email){showToast('Γράψτε πρώτα το email σας.');return}
    try{await sendPasswordResetEmail(auth,email);showToast('Στάλθηκε email επαναφοράς κωδικού.')}catch{showToast('Δεν ήταν δυνατή η αποστολή email.')}
  });
}

const views={
 dashboard:{title:'Αρχική',body:()=>dashboardHtml()},
 students:{title:'Μαθητές',body:()=>studentsHtml()},
 absences:{title:'Απουσίες',body:()=>absencesHtml()},
 tuition:{title:'Δίδακτρα',body:()=>tuitionHtml()},
 payments:{title:'Πληρωμές',body:()=>paymentsHtml()}
};

function shell(){
  const v=views[currentView];
  root.innerHTML=`<div class="app-shell">
    <aside class="sidebar"><div class="brand"><div class="mini">SH</div><div><b>School House</b><small>Διαχείριση</small></div></div>
      <nav class="nav">${navButtons()}</nav>
      <div class="sidebar-footer"><small>${currentUser.email}</small><button class="logout" data-logout>Αποσύνδεση</button></div>
    </aside>
    <main class="main"><header class="topbar"><h2>${v.title}</h2><div class="user-chip"><div class="avatar">${initials(currentUser.email)}</div></div></header><div class="content">${v.body()}</div></main>
    <nav class="mobile-nav">${mobileButtons()}</nav>
  </div>`;
  bindShell();
}
function navButtons(){return [['dashboard','Αρχική'],['students','Μαθητές'],['absences','Απουσίες'],['tuition','Δίδακτρα'],['payments','Πληρωμές']].map(([k,l])=>`<button data-view="${k}" class="${currentView===k?'active':''}">${l}</button>`).join('')}
function mobileButtons(){return [['dashboard','Αρχική'],['students','Μαθητές'],['absences','Απουσίες'],['tuition','Δίδακτρα'],['payments','Πληρωμές']].map(([k,l])=>`<button data-view="${k}" class="${currentView===k?'active':''}">${l}</button>`).join('')}
function bindShell(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;shell();if(currentView!=='dashboard')loadViewData(currentView)});document.querySelectorAll('[data-logout]').forEach(b=>b.onclick=()=>signOut(auth))}

function dashboardHtml(){return `<section class="welcome"><div><h1>School House</h1><p>Η κεντρική εικόνα του φροντιστηρίου σας.</p></div><span class="pill">Online • Firebase</span></section>
  ${!firestoreReady?'<div class="notice">Το περιβάλλον είναι έτοιμο, αλλά οι κανόνες του Firestore δεν επιτρέπουν ακόμη ανάγνωση δεδομένων. Θα τους ρυθμίσουμε στο επόμενο backend βήμα.</div>':''}
  <div class="stats"><div class="stat"><small>Μαθητές</small><strong id="statStudents">—</strong></div><div class="stat"><small>Απουσίες μήνα</small><strong id="statAbsences">—</strong></div><div class="stat"><small>Εκκρεμή δίδακτρα</small><strong id="statDue">—</strong></div><div class="stat"><small>Πληρωμές μήνα</small><strong id="statPayments">—</strong></div></div>
  <div class="grid-2"><section class="card"><div class="card-head"><h3>Βασικές λειτουργίες</h3></div><div class="module-list"><div class="module"><div><b>Ατομική καρτέλα μαθητή</b><span>Στοιχεία, τμήμα και ενημέρωση γονέα</span></div><span class="tag green">Έτοιμο UI</span></div><div class="module"><div><b>Απουσίες</b><span>Καταγραφή και ιστορικό</span></div><span class="tag">Module</span></div><div class="module"><div><b>Δίδακτρα & πληρωμές</b><span>Μηνιαίες χρεώσεις και αποδείξεις</span></div><span class="tag">Module</span></div></div></section>
  <section class="card"><div class="card-head"><h3>Σήμερα</h3></div><div class="empty">Δεν υπάρχουν ακόμη καταχωρήσεις.<br>Μόλις ανοίξουμε τη βάση, θα εμφανίζονται εδώ αυτόματα.</div></section></div>`}
function sectionHead(title,subtitle,action=''){return `<div class="section-title"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`}
function studentsHtml(){return `${sectionHead('Μαθητές','Ατομικές καρτέλες και σύνδεση με γονείς.','<button class="secondary" disabled>+ Νέος μαθητής</button>')}<div id="studentsData" class="table-wrap"><div class="empty">Φόρτωση μαθητών…</div></div>`}
function absencesHtml(){return `${sectionHead('Απουσίες','Καταγραφή παρουσιών και απουσιών ανά μαθητή.','<button class="secondary" disabled>+ Καταχώρηση</button>')}<div id="absencesData" class="table-wrap"><div class="empty">Φόρτωση απουσιών…</div></div>`}
function tuitionHtml(){return `${sectionHead('Δίδακτρα','Μηνιαίες χρεώσεις και υπόλοιπα μαθητών.')}<div id="tuitionData" class="table-wrap"><div class="empty">Φόρτωση διδάκτρων…</div></div>`}
function paymentsHtml(){return `${sectionHead('Πληρωμές','Ιστορικό πληρωμών και μελλοντικές αποδείξεις PDF.','<button class="secondary" disabled>+ Πληρωμή</button>')}<div id="paymentsData" class="table-wrap"><div class="empty">Φόρτωση πληρωμών…</div></div>`}

async function loadCollection(name,target,columns){
  const el=document.getElementById(target); if(!el)return;
  try{const snap=await getDocs(query(collection(db,name),limit(30)));firestoreReady=true;if(snap.empty){el.innerHTML='<div class="empty">Δεν υπάρχουν ακόμη καταχωρήσεις.</div>';return}const rows=snap.docs.map(d=>({id:d.id,...d.data()}));el.innerHTML=`<table class="table"><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${r[c.key]??'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
  catch(err){firestoreReady=false;el.innerHTML='<div class="notice">Η οθόνη είναι έτοιμη. Η βάση δεδομένων είναι ακόμη κλειδωμένη από τα production security rules.</div>'}
}
function loadViewData(view){if(view==='students')loadCollection('students','studentsData',[{key:'name',label:'Μαθητής'},{key:'className',label:'Τμήμα'},{key:'parentName',label:'Γονέας'},{key:'status',label:'Κατάσταση'}]);if(view==='absences')loadCollection('absences','absencesData',[{key:'studentName',label:'Μαθητής'},{key:'date',label:'Ημερομηνία'},{key:'lesson',label:'Μάθημα'},{key:'status',label:'Κατάσταση'}]);if(view==='tuition')loadCollection('tuition','tuitionData',[{key:'studentName',label:'Μαθητής'},{key:'month',label:'Μήνας'},{key:'amount',label:'Ποσό'},{key:'status',label:'Κατάσταση'}]);if(view==='payments')loadCollection('payments','paymentsData',[{key:'studentName',label:'Μαθητής'},{key:'date',label:'Ημερομηνία'},{key:'amount',label:'Ποσό'},{key:'receiptNo',label:'Απόδειξη'}])}
async function loadDashboardStats(){try{const [s,a,t,p]=await Promise.all(['students','absences','tuition','payments'].map(n=>getDocs(query(collection(db,n),limit(100)))));firestoreReady=true;document.getElementById('statStudents').textContent=s.size;document.getElementById('statAbsences').textContent=a.size;document.getElementById('statDue').textContent=t.size;document.getElementById('statPayments').textContent=p.size}catch{firestoreReady=false;shell()}}

onAuthStateChanged(auth,user=>{currentUser=user;if(!user){renderLogin();return}currentView='dashboard';shell();loadDashboardStats()});

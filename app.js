const KEY='coffeecontrol-v1';
const initial={members:['Troiti','Pep','Jordi ^^','Diego','Virginia ^','Sonia','Lobo','Sandra','Manolo','Samu','Sisco','Murillo','Marta'].map((name,i)=>({id:'m'+(i+1),name,start:'2026-09-30',end:null})),purchases:[{id:'p1',date:'2026-09-30',kg:4,amount:57.2,buyer:'m2',payments:{}}]};
let data=load(); if(!data.credits)data.credits=[];
 function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(initial)}catch{return structuredClone(initial)}} function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
const euro=n=>new Intl.NumberFormat('ca-ES',{style:'currency',currency:'EUR'}).format(n||0); const dmy=s=>s?new Date(s+'T12:00:00').toLocaleDateString('ca-ES'):'';
function eligible(m,p){return m.start<=p.date&&(!m.end||m.end>=p.date)}
function freezePurchase(p){
 if(!p.participantIds){
   p.participantIds=data.members.filter(m=>eligible(m,p)).map(m=>m.id);
   p.originalShare=p.participantIds.length?p.amount/p.participantIds.length:0;
 }
 if(!p.payments)p.payments={};
 return p;
}
// Migració de la primera compra creada amb les versions anteriors:
for(const p of data.purchases){
 if(p.id==='p1' && p.date==='2026-09-30' && Number(p.amount)===57.2 && Number(p.kg)===4){
   p.participantIds=initial.members.map(m=>m.id);
   p.originalShare=57.2/13;
 }
}
data.purchases.forEach(freezePurchase);
function participants(p){freezePurchase(p);return p.participantIds.map(id=>data.members.find(m=>m.id===id)).filter(Boolean)}
function appliedBalance(p){return Number(p.balanceApplied||0)}
function share(p){freezePurchase(p);return Number(p.originalShare||0)}
function status(m,p){freezePurchase(p);if(!p.participantIds.includes(m.id))return 'none';if(m.id===p.buyer)return 'paid';return p.payments[m.id]?'paid':'pending'}
function availableBalance(){if(!data.credits)data.credits=[];return data.credits.filter(c=>c.paid!==false&&!c.appliedTo).reduce((a,c)=>a+Number(c.amount||0),0)}
function applyBalanceToPurchase(p){
 let available=availableBalance(),use=Math.min(available,p.amount);
 p.balanceApplied=use;
 let remaining=use;
 for(const c of data.credits){
   if(c.paid!==false&&!c.appliedTo&&remaining>0){c.appliedTo=p.id;remaining-=Number(c.amount||0)}
 }
}

function toast(t){let x=document.querySelector('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1700)}
function go(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.go===id));window.scrollTo({top:0,behavior:'smooth'})} document.addEventListener('click',e=>{let b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});
function renderDashboard(){
 let ps=[...data.purchases].sort((a,b)=>a.date.localeCompare(b.date)),last=ps.at(-1);
 let today=new Date().toISOString().slice(0,10),active=data.members.filter(m=>m.start<=today&&(!m.end||m.end>=today));
 document.querySelector('#activeCount').textContent=active.length;
 let kg=ps.reduce((a,p)=>a+p.kg,0),spent=ps.reduce((a,p)=>a+p.amount,0);
 document.querySelector('#kgTotal').textContent=kg.toFixed(1)+' kg';
 document.querySelector('#spentTotal').textContent=euro(spent);
 document.querySelector('#avgKg').textContent=kg?euro(spent/kg):euro(0);
 document.querySelector('#groupBalance').textContent=euro(availableBalance());
 document.querySelector('#lastPurchase').textContent=last?`${last.kg} kg · ${euro(last.amount)}`:'—';
 document.querySelector('#lastSummary').innerHTML=last?(()=>{let pp=participants(last),paid=pp.filter(m=>status(m,last)==='paid').length,buyer=data.members.find(m=>m.id===last.buyer)?.name||'—';return `<b>${dmy(last.date)} · ${buyer}</b><div class='meta'>${euro(share(last))} per persona · ${paid}/${pp.length} pagats · ${pp.length-paid} pendents</div>`})():'<div class="muted">Encara no hi ha compres.</div>';
 let cons=document.querySelector('#consumption');
 if(ps.length>1){let days=(new Date(ps.at(-1).date)-new Date(ps[0].date))/86400000;if(days>0){let rate=kg/days*30;cons.innerHTML=`Consum aproximat: <b>${rate.toFixed(1)} kg/mes</b> · interval mitjà de ${Math.round(days/(ps.length-1))} dies entre compres.`}else cons.textContent='Calen compres en dates diferents per calcular el consum.'}
 else cons.textContent='Afegeix més compres per calcular el ritme de consum.';
}
function renderPurchases(){let box=document.querySelector('#purchaseList');box.innerHTML=[...data.purchases].sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{let pp=participants(p),paid=pp.filter(m=>status(m,p)==='paid').length,buyer=data.members.find(m=>m.id===p.buyer)?.name||'—';return `<div class='purchaseCard'><div class='purchaseTop'><div><strong>${dmy(p.date)}</strong><div class='meta'>Comprat per ${buyer}</div></div><b>${euro(p.amount)}</b></div><div class='purchaseStats'><div><span>Café</span><b>${p.kg} kg</b></div><div><span>Preu/kg</span><b>${euro(p.amount/p.kg)}</b></div><div><span>Per persona</span><b>${euro(share(p))}</b></div><div><span>Bizums</span><b>${paid}/${pp.length}</b></div></div><div class='purchaseActions'><button class='ghost' data-edit-purchase='${p.id}'>✎ Editar</button><button class='dangerGhost' data-delete-purchase='${p.id}'>Eliminar</button></div></div>`}).join('')||'<div class="muted">Encara no hi ha compres.</div>';document.querySelectorAll('[data-edit-purchase]').forEach(b=>b.onclick=()=>openPurchaseEditor(b.dataset.editPurchase));document.querySelectorAll('[data-delete-purchase]').forEach(b=>b.onclick=()=>deletePurchase(b.dataset.deletePurchase))}
function renderPayments(){let sel=document.querySelector('#purchaseSelect'),old=sel.value;sel.innerHTML=[...data.purchases].sort((a,b)=>b.date.localeCompare(a.date)).map(p=>`<option value='${p.id}'>${dmy(p.date)} · ${p.kg} kg</option>`).join('');if(data.purchases.some(p=>p.id===old))sel.value=old;let p=data.purchases.find(x=>x.id===sel.value)||data.purchases.at(-1);if(!p)return;sel.value=p.id;let pp=participants(p),paid=pp.filter(m=>status(m,p)==='paid').length;document.querySelector('#paymentSummary').innerHTML=`<div><span>PER PERSONA</span><b>${euro(share(p))}</b></div><div><span>PAGATS</span><b>${paid}/${pp.length}</b></div><div><span>PENDENT</span><b>${euro((pp.length-paid)*share(p))}</b></div>`;document.querySelector('#paymentList').innerHTML=pp.map(m=>{let st=status(m,p),buyer=m.id===p.buyer;return `<div class='person'><div class='name'>${m.name}<small>${buyer?'Comprador · ':''}${euro(share(p))}</small></div><button class='status ${st}' data-pay='${m.id}' ${buyer?'disabled':''}>${st==='paid'?'✓ Pagat':'Pendent'}</button></div>`}).join('');document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>{p.payments[b.dataset.pay]=!p.payments[b.dataset.pay];save()})}
function renderMembers(){document.querySelector('#memberList').innerHTML=data.members.map(m=>{let c=m.lateContribution?data.credits.find(x=>x.id===m.lateContribution.creditId):null;return `<div class='person'><div class='name'>${m.name}<small>Alta ${dmy(m.start)}${m.end?' · Baixa '+dmy(m.end):''}${c?`<br>Aportació al saldo: ${euro(c.amount)} · ${c.paid?'Pagada':'Pendent'}`:''}</small></div><div class='memberActions'>${c&&!c.paid?`<button class='status pending' data-credit-pay='${c.id}'>Pendent ${euro(c.amount)}</button>`:''}${m.end?`<button class='status inactive' data-react='${m.id}'>Reactivar</button>`:`<button class='ghost' data-end='${m.id}'>Donar de baixa</button>`}</div></div>`}).join('');document.querySelectorAll('[data-credit-pay]').forEach(b=>b.onclick=()=>{let c=data.credits.find(x=>x.id===b.dataset.creditPay);if(c){c.paid=true;save();toast('Aportació afegida al saldo del grup')}});document.querySelectorAll('[data-end]').forEach(b=>b.onclick=()=>{let date=prompt('Data de baixa (AAAA-MM-DD)',new Date().toISOString().slice(0,10));if(date){data.members.find(m=>m.id===b.dataset.end).end=date;save()}});document.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>{data.members.find(m=>m.id===b.dataset.react).end=null;save()})}
function openPurchaseEditor(id){let p=data.purchases.find(x=>x.id===id);if(!p)return;fillBuyers();document.querySelector('#purchaseDialogTitle').textContent='Editar compra';document.querySelector('#savePurchaseBtn').textContent='Desar canvis';pEditId.value=p.id;pDate.value=p.date;pKg.value=p.kg;pAmount.value=p.amount;pBuyer.value=p.buyer;document.querySelector('#purchaseDialog').showModal()}
function openNewPurchase(){fillBuyers();document.querySelector('#purchaseDialogTitle').textContent='Nova compra';document.querySelector('#savePurchaseBtn').textContent='Desar compra';pEditId.value='';pDate.value=new Date().toISOString().slice(0,10);pKg.value='';pAmount.value='';document.querySelector('#purchaseDialog').showModal()}
function deletePurchase(id){let p=data.purchases.find(x=>x.id===id);if(!p)return;let buyer=data.members.find(m=>m.id===p.buyer)?.name||'—';if(!confirm(`Vols eliminar la compra del ${dmy(p.date)} de ${p.kg} kg per ${euro(p.amount)} (${buyer})?

També s’eliminarà el seu control de Bizums.`))return;unapplyBalance(p);data.credits=credits().filter(c=>c.sourcePurchase!==id);data.purchases=data.purchases.filter(x=>x.id!==id);save();toast('Compra eliminada')}

function fillBuyers(){let sel=document.querySelector('#pBuyer');sel.innerHTML=data.members.filter(m=>!m.end).map(m=>`<option value='${m.id}'>${m.name}</option>`).join('')}
function renderAll(){renderDashboard();renderPurchases();renderPayments();renderMembers();fillBuyers()}
document.querySelector('#purchaseSelect').onchange=renderPayments;document.querySelector('#newPurchaseBtn').onclick=openNewPurchase;document.querySelector('#newMemberBtn').onclick=()=>{
 let p=[...data.purchases].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 mStart.value=new Date().toISOString().slice(0,10);mJoinCurrent.checked=false;
 let info=document.querySelector('#joinCurrentInfo');
 if(p){let fair=share(p);info.hidden=false;info.innerHTML=`La compra actual està congelada a <b>${euro(fair)}</b> per persona. Si participa en aquest cafè, el nou membre pagarà <b>exactament ${euro(fair)}</b>, igual que la resta. Quan es marqui com a pagat, aquest import passarà al saldo del grup.`}
 else info.hidden=true;
 document.querySelector('#memberDialog').showModal()
};document.querySelectorAll('.closeDialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelector('#purchaseForm').onsubmit=e=>{e.preventDefault();let editId=pEditId.value;if(editId){let p=data.purchases.find(x=>x.id===editId);if(!p)return;p.date=pDate.value;p.kg=+pKg.value;p.amount=+pAmount.value;p.buyer=pBuyer.value;e.target.closest('dialog').close();e.target.reset();save();toast('Compra actualitzada. Els participants i imports ja registrats es mantenen.')}else{let active=data.members.filter(m=>m.start<=pDate.value&&(!m.end||m.end>=pDate.value));let p={id:'p'+Date.now(),date:pDate.value,kg:+pKg.value,amount:+pAmount.value,buyer:pBuyer.value,payments:{},participantIds:active.map(m=>m.id),balanceApplied:0};applyBalanceToPurchase(p);let net=p.amount-p.balanceApplied;p.originalShare=active.length?net/active.length:0;data.purchases.push(p);e.target.closest('dialog').close();e.target.reset();save();go('payments');toast('Compra afegida')}};document.querySelector('#memberForm').onsubmit=e=>{e.preventDefault();let member={id:'m'+Date.now(),name:mName.value.trim(),start:mStart.value,end:null};data.members.push(member);if(mJoinCurrent.checked){let p=[...data.purchases].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);if(p){let amount=share(p);data.credits.push({id:'c'+Date.now(),memberId:member.id,sourcePurchase:p.id,amount,paid:false,appliedTo:null});member.lateContribution={creditId:data.credits.at(-1).id,amount,sourcePurchase:p.id}}}e.target.closest('dialog').close();e.target.reset();save();toast(mJoinCurrent.checked?'Membre afegit. Aportació pendent registrada.':'Membre afegit')};
document.querySelector('#copyPending').onclick=async()=>{let p=data.purchases.find(x=>x.id===document.querySelector('#purchaseSelect').value),pending=participants(p).filter(m=>status(m,p)==='pending');let txt=`☕ CoffeeControl · ${dmy(p.date)}\nPendent Bizum (${euro(share(p))}):\n${pending.map(m=>'• '+m.name).join('\n')}\n\nTotal pendent: ${euro(pending.length*share(p))}`;try{await navigator.clipboard.writeText(txt);toast('Pendents copiats')}catch{prompt('Copia aquest text:',txt)}};

function buildShareText(){
 let ps=[...data.purchases].sort((a,b)=>a.date.localeCompare(b.date)),p=ps.at(-1);
 if(!p)return '';
 let pp=participants(p),pending=pp.filter(m=>status(m,p)==='pending'),paid=pp.length-pending.length;
 let buyer=data.members.find(m=>m.id===p.buyer)?.name||'—';
 return `☕ CoffeeControl · Resum

🛒 Darrera compra: ${dmy(p.date)}
☕ ${p.kg} kg · ${euro(p.amount)}
👤 Comprat per: ${buyer}
💶 ${euro(share(p))} per persona
✅ Pagats: ${paid}/${pp.length}
🔴 Pendents: ${pending.length}${pending.length?' · '+pending.map(m=>m.name).join(', '):''}
💰 Total pendent: ${euro(pending.length*share(p))}
🏦 Saldo del grup: ${euro(availableBalance())}`;
}
function shareSummary(){
 let txt=buildShareText();
 if(!txt){toast('Encara no hi ha cap compra per compartir');return}
 let dlg=document.querySelector('#shareDialog');
 document.querySelector('#shareText').value=txt;
 dlg.showModal();
}
document.querySelector('#whatsappShare').onclick=()=>{
 let txt=buildShareText();
 window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
};
document.querySelector('#copyShareText').onclick=async()=>{
 let txt=buildShareText();
 try{
   if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(txt)}
   else{
     let ta=document.querySelector('#shareText');ta.focus();ta.select();document.execCommand('copy');
   }
   toast('Resum copiat');
 }catch(e){
   document.querySelector('#shareText').focus();document.querySelector('#shareText').select();
   toast('Text seleccionat: copia’l manualment');
 }
};
document.querySelector('#closeShareDialog').onclick=()=>document.querySelector('#shareDialog').close();

document.querySelector('#addBalanceBtn').onclick=()=>{
 balanceAmount.value='';balanceConcept.value='';balanceDate.value=new Date().toISOString().slice(0,10);
 document.querySelector('#balanceDialog').showModal();
};
document.querySelector('.closeBalanceDialog').onclick=()=>document.querySelector('#balanceDialog').close();
document.querySelector('#balanceForm').onsubmit=e=>{
 e.preventDefault();
 let amount=Number(balanceAmount.value);
 if(!amount||amount<=0)return;
 data.credits.push({id:'c'+Date.now(),type:'manual',amount,concept:balanceConcept.value.trim(),date:balanceDate.value,paid:true,appliedTo:null});
 e.target.closest('dialog').close();e.target.reset();save();toast(`Saldo afegit: ${euro(amount)}`);
};

function backupPayload(){
 return {
   app:'CoffeeControl',
   version:1,
   exportedAt:new Date().toISOString(),
   data:data
 };
}
document.querySelector('#exportBackup').onclick=()=>{
 try{
   let payload=JSON.stringify(backupPayload(),null,2);
   let blob=new Blob([payload],{type:'application/json'});
   let url=URL.createObjectURL(blob);
   let a=document.createElement('a');
   let date=new Date().toISOString().slice(0,10);
   a.href=url;a.download=`CoffeeControl_backup_${date}.json`;
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   toast('Còpia preparada per desar');
 }catch(e){
   alert('No s’ha pogut crear la còpia de seguretat.');
 }
};
document.querySelector('#importBackup').onclick=()=>{
 document.querySelector('#backupFile').value='';
 document.querySelector('#backupFile').click();
};
document.querySelector('#backupFile').onchange=async e=>{
 let file=e.target.files?.[0];if(!file)return;
 try{
   let parsed=JSON.parse(await file.text());
   let incoming=parsed?.app==='CoffeeControl'&&parsed?.data?parsed.data:parsed;
   if(!incoming||!Array.isArray(incoming.members)||!Array.isArray(incoming.purchases)){
     throw new Error('format');
   }
   if(!confirm(`Vols importar la còpia "${file.name}"?\n\nLes dades actuals d’aquest dispositiu se substituiran per les de la còpia.`))return;
   data=incoming;
   if(!data.credits)data.credits=[];
   data.purchases.forEach(freezePurchase);
   save();
   go('dashboard');
   toast('Còpia importada correctament');
 }catch(err){
   alert('Aquest fitxer no sembla una còpia vàlida de CoffeeControl.');
 }
};
document.querySelector('#resetBtn').onclick=()=>{if(confirm('Vols reiniciar totes les dades de l’app?')){data=structuredClone(initial);data.credits=[];data.purchases.forEach(freezePurchase);save();toast('Dades reiniciades')}};document.querySelector('#shareSummary').onclick=shareSummary;renderAll();

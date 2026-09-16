let S={tables:[],menu:[],orders:[]}, report=null, table=null, cart=[], activeCategory='All';
const $=x=>document.querySelector(x);
function money(x){return Number(x).toFixed(0)}
async function refresh(){[S,report]=await Promise.all([fetch('/api/state').then(r=>r.json()),fetch('/api/reports/today').then(r=>r.json())]);render()}
function show(id,btn){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$('#'+id).classList.remove('hidden');document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');}
function render(){
 $('#tables').innerHTML=S.tables.map(t=>`<button class="table ${t.status==='occupied'?'occupied':''} ${table===t.number?'selected':''}" onclick="selectTable(${t.number})">🪑<br>Table ${t.number}<br><small>${t.status==='occupied'?'Occupied • Add items':t.status}</small></button>`).join('');
 const cats=['All',...new Set(S.menu.map(m=>m.category))];
 $('#categories').innerHTML=cats.map((c,i)=>`<button type="button" class="categoryBtn ${activeCategory===c?'active':''}" data-category-index="${i}">${c}</button>`).join('');
 document.querySelectorAll('#categories .categoryBtn').forEach((btn,i)=>{
   btn.addEventListener('click',()=>setCategory(cats[i]));
 });
 const available=S.menu.filter(m=>m.available!==false);
 const visible=activeCategory==='All'?available:available.filter(m=>m.category===activeCategory);
 $('#menu').innerHTML=visible.map(m=>`<button class="food" onclick='add(${JSON.stringify(m)})'><span class="cat">${m.category}</span><b>${m.name}</b><span class="price">₹${money(m.price)}</span></button>`).join('');
 $('#tableTitle').textContent=table?`— Table ${table}`:'';
 $('#cart').innerHTML=cart.length?cart.map(i=>`<div class="cartrow"><span><b>${i.name}</b><br>₹${money(i.price)} × ${i.qty}</span><span class="qty"><button onclick="change(${i.id},-1)">−</button> ${i.qty} <button onclick="change(${i.id},1)">+</button></span></div>`).join(''):'<p class="muted">Select a table and add food.</p>';
 $('#total').textContent=money(cart.reduce((a,i)=>a+i.price*i.qty,0));
 let active=S.orders.filter(o=>!['served','cancelled'].includes(o.status));
 $('#kitchenOrders').innerHTML=active.length?active.slice().reverse().map(o=>orderCard(o,'kitchen')).join(''):'<div class="empty">No active orders.</div>';
 const unpaid=S.orders.filter(o=>o.payment!=='paid'&&o.status!=='cancelled');
 const bills=Object.values(unpaid.reduce((all,o)=>{
   if(!all[o.table]) all[o.table]={table:o.table,orders:[],items:[],total:0};
   all[o.table].orders.push(o);
   all[o.table].items.push(...o.items);
   all[o.table].total+=Number(o.total);
   return all;
 },{}));
 $('#billingOrders').innerHTML=bills.length?bills.sort((a,b)=>b.table-a.table).map(billingCard).join(''):'<div class="empty">No unpaid bills.</div>';
 renderReport();
 renderMenuManager();
}
function selectTable(n){table=n;render()}
function setCategory(c){activeCategory=c;render()}
function clearCart(){cart=[];$('#message').textContent='';render()}
function add(m){let x=cart.find(i=>i.id===m.id);x?x.qty++:cart.push({...m,qty:1});render()}
function change(id,d){let x=cart.find(i=>i.id===id);x.qty+=d;if(x.qty<1)cart=cart.filter(i=>i.id!==id);render()}
async function sendOrder(){
 if(!table)return alert('Please select a table.');
 if(!cart.length)return alert('Please add food.');
 let r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({table,waiter:$('#waiter').value,items:cart})});
 if(r.ok){
   let o=await r.json();
   cart=[];
   $('#message').textContent=`✅ Order #${o.id} sent to kitchen`;
   render();
 }else alert('Could not send order.');
}
function orderCard(o,role){
 let items=o.items.map(i=>`<div>${i.qty} × ${i.name}<span style="float:right">₹${money(i.price*i.qty)}</span></div>`).join('');
 let buttons='';
 if(role==='kitchen'){
   if(o.status==='new')buttons=`<button class="primary" onclick="status(${o.id},'preparing')">START PREPARING</button>`;
   else if(o.status==='preparing')buttons=`<button class="primary" onclick="status(${o.id},'ready')">MARK READY</button>`;
   else if(o.status==='ready')buttons=`<button onclick="status(${o.id},'served')">MARK SERVED</button>`;
 }
 return `<div class="order ${o.payment==='paid'?'paid':''}"><div class="orderhead"><b>Order #${o.id} · Table ${o.table}</b><span class="badge">${o.status.toUpperCase()}</span></div><div class="items">${items}</div><b>Total: ₹${money(o.total)}</b><div class="actions">${buttons}</div></div>`;
}
function billingCard(b){
 const combined=Object.values(b.items.reduce((all,i)=>{
   const key=`${i.id}|${i.name}|${i.price}`;
   if(!all[key]) all[key]={...i,qty:0};
   all[key].qty+=Number(i.qty);
   return all;
 },{}));
 const items=combined.map(i=>`<div>${i.qty} × ${i.name}<span style="float:right">₹${money(i.price*i.qty)}</span></div>`).join('');
 const orderNumbers=b.orders.map(o=>`#${o.id}`).join(', ');
 return `<div class="order bill"><div class="orderhead"><b>Table ${b.table} · Combined bill</b><span class="badge">${b.orders.length} ORDER${b.orders.length>1?'S':''}</span></div><small>Includes orders ${orderNumbers}</small><div class="items">${items}</div><b>Total: ₹${money(b.total)}</b><div class="actions"><button class="primary" onclick="payTable(${b.table},'Cash')">CASH</button><button onclick="payTable(${b.table},'UPI')">UPI</button><button onclick="payTable(${b.table},'Card')">CARD</button></div></div>`;
}
async function status(id,s){await fetch('/api/orders/'+id+'/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:s})});refresh()}
async function pay(id,m){await fetch('/api/orders/'+id+'/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:m})});refresh()}
async function payTable(table,m){
 if(!confirm(`Mark the complete bill for Table ${table} as paid by ${m}?`)) return;
 const r=await fetch('/api/tables/'+table+'/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:m})});
 if(!r.ok) return alert('Could not complete payment.');
 const receipt=await r.json();
 refresh();
 showReceipt(receipt);
}
function showReceipt(r){
 const items=r.items.map(i=>`<div class="receipt-line"><span>${i.qty} × ${i.name}</span><b>₹${money(i.price*i.qty)}</b></div>`).join('');
 $('#receipt').innerHTML=`<div class="receipt-brand">DUOZA</div><p class="receipt-sub">Restaurant POS · Payment receipt</p><div class="receipt-meta"><span>Table ${r.table}</span><span>${r.created_at}</span></div><div class="receipt-items">${items}</div><div class="receipt-total"><span>Total paid</span><b>₹${money(r.total)}</b></div><p class="receipt-payment">Paid by <b>${r.method.toUpperCase()}</b> · ${r.orders_paid} order${r.orders_paid>1?'s':''}</p><p class="receipt-thanks">Thank you. Please visit again!</p>`;
 $('#receiptModal').classList.remove('hidden');
}
function closeReceipt(){$('#receiptModal').classList.add('hidden')}
function renderReport(){
 if(!report)return;
 $('#reportDate').textContent=report.date;
 const payments=['Cash','UPI','Card'].map(m=>`<div class="report-stat"><span>${m}</span><b>₹${money(report.payments[m]||0)}</b></div>`).join('');
 const popular=report.popular.length?report.popular.map((i,n)=>`<div class="report-item"><span><b>${n+1}. ${i.name}</b><small>${i.qty} sold</small></span><b>₹${money(i.total)}</b></div>`).join(''):'<p class="muted">No completed bills today.</p>';
 $('#reportContent').innerHTML=`<div class="report-summary"><div class="report-total"><span>Today’s sales</span><b>₹${money(report.total)}</b></div><div class="report-stat"><span>Completed bills</span><b>${report.bills}</b></div></div><h3>Payment summary</h3><div class="report-payments">${payments}</div><h3>Most ordered items</h3><div class="report-list">${popular}</div>`;
}
function renderMenuManager(){
 $('#menuManagerList').innerHTML=S.menu.map(m=>`<div class="manager-row ${m.available===false?'unavailable':''}"><div class="manager-fields"><input id="name-${m.id}" value="${m.name}" aria-label="Name for ${m.name}"><input id="category-${m.id}" value="${m.category}" aria-label="Category for ${m.name}"><small>${m.available===false?'Unavailable':'Available'}</small></div><div class="manager-controls"><input id="price-${m.id}" type="number" min="1" value="${m.price}" aria-label="Price for ${m.name}"><button onclick="updateMenuItem(${m.id})">Save changes</button><button onclick="toggleAvailability(${m.id})">${m.available===false?'Make available':'Pause'}</button><button class="danger" onclick="deleteMenuItem(${m.id})">Remove</button></div></div>`).join('');
}
async function createMenuItem(e){e.preventDefault();const name=$('#newItemName').value.trim(),category=$('#newItemCategory').value.trim(),price=Number($('#newItemPrice').value);const r=await fetch('/api/menu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,category,price})});if(!r.ok)return alert('Could not add item.');e.target.reset();refresh()}
async function updateMenuItem(id){const name=$(`#name-${id}`).value.trim(),category=$(`#category-${id}`).value.trim(),price=Number($(`#price-${id}`).value);if(!name||!category||price<=0)return alert('Enter a name, category, and valid price.');const r=await fetch(`/api/menu/${id}/update`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,category,price})});if(!r.ok)return alert('Could not save changes.');refresh()}
async function toggleAvailability(id){await fetch(`/api/menu/${id}/availability`,{method:'POST'});refresh()}
async function deleteMenuItem(id){if(!confirm('Remove this item from the menu?'))return;const r=await fetch(`/api/menu/${id}/delete`,{method:'POST'});if(!r.ok)return alert('Could not remove item.');refresh()}
refresh();setInterval(refresh,2000);

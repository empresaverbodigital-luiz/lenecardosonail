/* ============ SHELL / NAV ============ */
const VIEWS=[
 ['dash','🏠','Dashboard'],
 ['agenda','📅','Agenda'],
 ['clientes','👩','Clientes'],
 ['fin','💰','Financeiro'],
 ['rel','📈','Relatórios'],
 ['config','⚙️','Config']
];
let VIEW='dash';
function buildNav(){
  const bn=document.getElementById('bottomnav'), sn=document.getElementById('sidenav');
  VIEWS.forEach(([id,ic,lb])=>{
    bn.insertAdjacentHTML('beforeend',`<button data-v="${id}" onclick="nav('${id}')"><span class="ic">${ic}</span>${lb}</button>`);
    sn.insertAdjacentHTML('beforeend',`<button class="nav-item" data-v="${id}" onclick="nav('${id}')">${ic} ${lb}</button>`);
  });
}
function nav(v){
  VIEW=v;
  document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  const titles={dash:'Dashboard',agenda:'Agenda',clientes:'Clientes',fin:'Financeiro',rel:'Relatórios',config:'Configurações'};
  document.getElementById('tb-title').textContent=titles[v];
  document.getElementById('tb-sub').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('fab').style.display=(v==='agenda'||v==='dash'||v==='clientes')?'flex':'none';
  render();
  window.scrollTo(0,0);
}
function render(){
  const m=document.getElementById('main');
  if(VIEW==='dash')m.innerHTML=viewDash();
  else if(VIEW==='agenda'){m.innerHTML=viewAgenda();}
  else if(VIEW==='clientes')m.innerHTML=viewClientes();
  else if(VIEW==='fin')m.innerHTML=viewFin();
  else if(VIEW==='rel'){m.innerHTML=viewRel();}
  else if(VIEW==='config')m.innerHTML=viewConfig();
}

/* ============ THEME ============ */
function applyTheme(){
  document.documentElement.dataset.theme=DB.config.tema;
  const b=document.getElementById('theme-btn');if(b)b.textContent=DB.config.tema==='dark'?'☀️':'🌙';
}
function toggleTheme(){DB.config.tema=DB.config.tema==='dark'?'light':'dark';save();applyTheme();}

/* ============ LOGIN ============ */
function initLogin(){
  const body=document.getElementById('login-body');
  if(DB.config.pin){
    body.innerHTML=`<input type="password" id="pin-in" inputmode="numeric" placeholder="Digite seu PIN" style="text-align:center;font-size:20px;letter-spacing:6px">
      <button class="btn btn-p btn-w" style="margin-top:14px" onclick="tryPin()">Entrar</button>
      <p style="margin-top:14px;font-size:11px">Esqueceu? O PIN pode ser removido limpando os dados do navegador (isso apaga a agenda).</p>`;
    setTimeout(()=>{const i=document.getElementById('pin-in');i&&i.focus();i&&i.addEventListener('keydown',e=>{if(e.key==='Enter')tryPin();});},50);
  }else{
    enterApp();
  }
}
function tryPin(){
  const v=document.getElementById('pin-in').value;
  if(v===DB.config.pin){enterApp();}
  else{toast('PIN incorreto');document.getElementById('pin-in').value='';}
}
function enterApp(){
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('on');
  nav('dash');
}

/* ============ SHEET (modal) ============ */
function openSheet(html){
  document.getElementById('sheet').innerHTML='<div class="sheet-handle"></div>'+html;
  document.getElementById('overlay').classList.add('on');
  document.getElementById('sheet').classList.add('on');
  document.getElementById('sheet').scrollTop=0;
}
function closeSheet(){
  document.getElementById('overlay').classList.remove('on');
  document.getElementById('sheet').classList.remove('on');
}

/* ============ DASHBOARD ============ */
function freeSlotsToday(){
  const t=todayStr();
  return freeSlots(t).length;
}
function freeSlots(date){
  const ini=toMin(DB.config.horaIni),fim=toMin(DB.config.horaFim);
  const busy=[];
  atsOf(date).forEach(a=>busy.push([toMin(a.hora),toMin(a.hora)+(+a.dur||60)]));
  (DB.bloqueios||[]).filter(b=>b.data===date).forEach(b=>busy.push([toMin(b.hora),toMin(b.hora)+(+b.dur||60)]));
  const out=[];
  for(let m=ini;m<fim;m+=60){
    if(!busy.some(([a,b])=>m<b&&m+60>a))out.push(toHM(m));
  }
  return out;
}
function nextAt(){
  const t=todayStr(),hm=nowHM();
  const list=DB.ats.filter(a=>!['cancelado','falta','concluido'].includes(a.status)&&(a.data>t||(a.data===t&&atEnd(a)>=hm)))
    .sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
  return list[0];
}
function viewDash(){
  const t=todayStr();
  const hoje=atsOf(t);
  const fatDia=receitaPeriodo(t,t);
  const pend=pendentes();
  const pendVal=pend.reduce((s,a)=>s+valorFinal(a),0);
  const recebidosHoje=DB.ats.filter(a=>a.pago&&a.pagto&&a.pagto.data===t).length;
  const nx=nextAt();
  const now=new Date();
  const [m1,m2]=monthRange(now.getFullYear(),now.getMonth());
  const fatMes=receitaPeriodo(m1,m2);
  const meta=+DB.config.meta||0;
  const pct=meta?Math.min(100,Math.round(fatMes/meta*100)):0;
  const nivers=DB.clientes.filter(c=>c.nasc&&+c.nasc.split('-')[1]===now.getMonth()+1);
  const vips=DB.clientes.filter(c=>c.vip);
  const livres=freeSlots(t);

  let nxHtml='';
  if(nx){
    nxHtml=`<div class="next-card" onclick="openAtDetail('${nx.id}')" style="cursor:pointer;margin-bottom:14px">
      <div class="tag">PRÓXIMO ATENDIMENTO ✨</div>
      <div class="nm">${esc(cliName(nx))}</div>
      <div class="dt">${(srv(nx.servicoId)||{}).nome||''} · ${nx.data===t?'Hoje':fmtD(nx.data,{day:'2-digit',month:'2-digit'})} às ${nx.hora} · ${money(valorFinal(nx))}</div>
    </div>`;
  }
  return `
  ${nxHtml}
  <div class="grid g2 g2-d4">
    <div class="card stat"><span class="ic">👩</span><div class="num">${hoje.length}</div><div class="lb">Clientes hoje</div></div>
    <div class="card stat"><span class="ic">🕐</span><div class="num">${livres.length}</div><div class="lb">Horários livres hoje</div></div>
    <div class="card stat"><span class="ic">💰</span><div class="num" style="color:var(--ok)">${money(fatDia)}</div><div class="lb">Recebido hoje (${recebidosHoje} pgtos)</div></div>
    <div class="card stat" onclick="nav('fin')" style="cursor:pointer"><span class="ic">⏳</span><div class="num" style="color:var(--warn)">${money(pendVal)}</div><div class="lb">${pend.length} pagamento(s) pendente(s)</div></div>
  </div>

  <div class="sec-title"><h2>Agenda de hoje</h2><button class="link-btn" onclick="nav('agenda')">ver agenda →</button></div>
  <div class="card">${hoje.length?hoje.sort((a,b)=>a.hora.localeCompare(b.hora)).map(liAt).join(''):'<div class="empty"><span class="ic">🌸</span>Nenhum atendimento hoje.<br>Toque em ＋ para agendar.</div>'}</div>

  <div class="sec-title"><h2>Meta do mês 📊</h2></div>
  <div class="card">
    <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700"><span>${money(fatMes)}</span><span style="color:var(--muted)">meta ${money(meta)}</span></div>
    <div class="meta-bar"><div class="meta-fill" style="width:${pct}%"></div></div>
    <div style="font-size:12px;color:var(--muted);font-weight:700">${pct}% concluído${pct>=100?' · Meta batida! 🎉':''}</div>
  </div>

  <div class="grid g2" style="margin-top:12px">
    <div class="card">
      <h3>🎂 Aniversariantes do mês</h3>
      <div style="margin-top:8px;font-size:13px">${nivers.length?nivers.map(c=>`<div style="padding:5px 0;display:flex;justify-content:space-between"><span>${esc(c.nome)}</span><b>${c.nasc.split('-')[2]}/${c.nasc.split('-')[1]}</b></div>`).join(''):'<span style="color:var(--muted)">Nenhum este mês</span>'}</div>
    </div>
    <div class="card">
      <h3>⭐ Clientes VIP</h3>
      <div style="margin-top:8px;font-size:13px">${vips.length?vips.slice(0,5).map(c=>`<div style="padding:5px 0" onclick="openClienteDetail('${c.id}')">${esc(c.nome)}</div>`).join(''):'<span style="color:var(--muted)">Marque clientes como VIP na ficha</span>'}</div>
    </div>
  </div>

  <div class="card" style="margin-top:12px">
    <h3>🔥 Horários vagos hoje</h3>
    <div class="chip-row" style="margin-top:10px">${livres.length?livres.map(h=>`<button class="chip" onclick="openAtModal(null,'${t}','${h}')">${h}</button>`).join(''):'<span style="color:var(--muted);font-size:13px">Dia lotado! 💪</span>'}</div>
  </div>

  <div class="social-row">
    <a class="btn wa" href="https://wa.me/${DB.config.whats}?text=${encodeURIComponent('Olá, Lene! Gostaria de agendar um horário.')}" target="_blank" style="text-decoration:none">📲 WhatsApp</a>
    <a class="btn ig" href="https://instagram.com/${DB.config.insta}" target="_blank" style="text-decoration:none">📸 Instagram</a>
  </div>`;
}
function liAt(a){
  const s=srv(a.servicoId)||{};
  const st=STATUS[a.status]||STATUS.agendado;
  return `<div class="list-item" onclick="openAtDetail('${a.id}')" style="cursor:pointer">
    <div class="avatar" style="background:${atColor(a)}22;color:${atColor(a)}">${a.hora}</div>
    <div class="li-main"><div class="t">${esc(cliName(a))}</div><div class="s">${esc(s.nome||'Serviço')} · ${a.dur||60} min ${a.pago?'· ✅ pago':''}</div></div>
    <div class="li-end"><div class="v">${money(valorFinal(a))}</div><span class="badge" style="background:${st[1]}22;color:${st[1]}">${st[0]}</span></div>
  </div>`;
}

/* ============ AGENDA ============ */
let AG={mode:'dia',date:todayStr()};
function viewAgenda(){
  return `
  <div class="searchbar">🔎 <input id="ag-search" placeholder="Buscar cliente, serviço, telefone ou data..." oninput="agSearch(this.value)"></div>
  <div id="ag-search-res"></div>
  <div class="seg">
    ${['dia','semana','mes'].map(m=>`<button class="${AG.mode===m?'active':''}" onclick="AG.mode='${m}';render()">${m==='dia'?'Dia':m==='semana'?'Semana':'Mês'}</button>`).join('')}
  </div>
  <div class="day-nav">
    <button class="icon-btn" onclick="agShift(-1)">‹</button>
    <div class="dt" id="ag-title">${agTitle()}</div>
    <button class="icon-btn" onclick="agShift(1)">›</button>
  </div>
  <button class="btn btn-s btn-sm" onclick="AG.date='${todayStr()}';render()" style="margin-bottom:10px">Hoje</button>
  <button class="btn btn-o btn-sm" onclick="openBloqueio()" style="margin-bottom:10px;margin-left:6px">🚫 Bloquear horário</button>
  <button class="btn btn-o btn-sm" onclick="openEspera()" style="margin-bottom:10px;margin-left:6px">📋 Lista de espera${DB.espera.length?' ('+DB.espera.length+')':''}</button>
  <div id="ag-body">${AG.mode==='dia'?agDia():AG.mode==='semana'?agSemana():agMes()}</div>`;
}
function agTitle(){
  const d=parseD(AG.date);
  if(AG.mode==='dia')return d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'short'});
  if(AG.mode==='semana'){const s=weekStart(d);const e=new Date(s);e.setDate(s.getDate()+6);return s.getDate()+' – '+e.getDate()+' '+e.toLocaleDateString('pt-BR',{month:'short'});}
  return d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
}
function weekStart(d){const x=new Date(d);x.setDate(x.getDate()-x.getDay());return x;}
function agShift(n){
  const d=parseD(AG.date);
  if(AG.mode==='dia')d.setDate(d.getDate()+n);
  else if(AG.mode==='semana')d.setDate(d.getDate()+7*n);
  else d.setMonth(d.getMonth()+n);
  AG.date=dstr(d);render();
}
function agDia(){
  const date=AG.date;
  const ini=toMin(DB.config.horaIni),fim=toMin(DB.config.horaFim);
  const ats=atsOf(date).concat(DB.ats.filter(a=>a.data===date&&a.status==='cancelado'));
  const blq=(DB.bloqueios||[]).filter(b=>b.data===date);
  let html='<div class="card" style="padding:14px 12px">';
  for(let m=ini;m<fim;m+=60){
    const h=toHM(m);
    const inSlot=ats.filter(a=>toMin(a.hora)>=m&&toMin(a.hora)<m+60).sort((a,b)=>a.hora.localeCompare(b.hora));
    const bloq=blq.filter(b=>toMin(b.hora)>=m&&toMin(b.hora)<m+60);
    const covered=ats.some(a=>a.status!=='cancelado'&&toMin(a.hora)<m&&toMin(a.hora)+(+a.dur||60)>m);
    html+=`<div class="slot"><div class="hr">${h}</div><div class="sl-body">`;
    inSlot.forEach(a=>{
      const s=srv(a.servicoId)||{};
      const canc=a.status==='cancelado';
      html+=`<button class="ag-block" style="background:${atColor(a)};${canc?'opacity:.45;text-decoration:line-through':''}" onclick="openAtDetail('${a.id}')">
        <span>${a.hora}–${atEnd(a)} · ${esc(cliName(a))}<span class="sub">${esc(s.nome||'')} ${a.pago?'· ✅':''}</span></span>
        <span>${money(valorFinal(a))}</span></button>`;
    });
    bloq.forEach(b=>{
      html+=`<button class="ag-block" style="background:#9b8f93" onclick="delBloqueio('${b.id}')">🚫 ${b.hora}–${toHM(toMin(b.hora)+(+b.dur||60))} Bloqueado ${b.motivo?'· '+esc(b.motivo):''}<span style="font-size:10px">tocar p/ remover</span></button>`;
    });
    if(!inSlot.length&&!bloq.length&&!covered){
      html+=`<button class="ag-free" onclick="openAtModal(null,'${date}','${h}')">＋ disponível</button>`;
    }
    html+='</div></div>';
  }
  return html+'</div>';
}
function agSemana(){
  const s=weekStart(parseD(AG.date));
  let html='';
  for(let i=0;i<7;i++){
    const d=new Date(s);d.setDate(s.getDate()+i);
    const ds=dstr(d);
    const ats=atsOf(ds).sort((a,b)=>a.hora.localeCompare(b.hora));
    html+=`<div class="week-col"><div class="wc-h">${d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric'})}${ds===todayStr()?' · hoje':''}</div>
    <div class="card" style="padding:8px 14px">${ats.length?ats.map(liAt).join(''):`<button class="ag-free" onclick="openAtModal(null,'${ds}','09:00')">＋ livre</button>`}</div></div>`;
  }
  return html;
}
function agMes(){
  const d=parseD(AG.date);
  const y=d.getFullYear(),m=d.getMonth();
  const first=new Date(y,m,1),start=first.getDay(),days=new Date(y,m+1,0).getDate();
  let html='<div class="cal-grid">'+['D','S','T','Q','Q','S','S'].map(w=>`<div class="wd">${w}</div>`).join('');
  for(let i=0;i<start;i++)html+='<div class="cal-cell off"></div>';
  for(let day=1;day<=days;day++){
    const ds=y+'-'+pad(m+1)+'-'+pad(day);
    const n=atsOf(ds).length;
    const cls=(ds===todayStr()?'today ':'')+(ds===AG.date?'sel':'');
    html+=`<button class="cal-cell ${cls}" onclick="AG.date='${ds}';AG.mode='dia';render()">${day}<div class="dots">${'<i></i>'.repeat(Math.min(n,4))}</div></button>`;
  }
  html+='</div>';
  const ats=atsOf(AG.date).sort((a,b)=>a.hora.localeCompare(b.hora));
  html+=`<div class="sec-title"><h2>${fmtDLong(AG.date)}</h2></div><div class="card">${ats.length?ats.map(liAt).join(''):'<div class="empty">Sem atendimentos</div>'}</div>`;
  return html;
}
function agSearch(q){
  const box=document.getElementById('ag-search-res');
  q=q.trim().toLowerCase();
  if(!q){box.innerHTML='';return;}
  const res=DB.ats.filter(a=>{
    const c=a.clienteId&&cli(a.clienteId);
    return cliName(a).toLowerCase().includes(q)
      ||((srv(a.servicoId)||{}).nome||'').toLowerCase().includes(q)
      ||(c&&onlyDigits(c.tel+(c.whats||'')).includes(onlyDigits(q))&&onlyDigits(q).length>=4)
      ||a.data.includes(q)||fmtD(a.data).includes(q);
  }).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora)).slice(0,8);
  box.innerHTML=res.length?`<div class="card" style="margin-bottom:12px">${res.map(a=>`<div class="list-item" onclick="openAtDetail('${a.id}')"><div class="li-main"><div class="t">${esc(cliName(a))}</div><div class="s">${fmtD(a.data)} ${a.hora} · ${esc((srv(a.servicoId)||{}).nome||'')}</div></div><div class="li-end"><div class="v">${money(valorFinal(a))}</div></div></div>`).join('')}</div>`
  :'<div class="card" style="margin-bottom:12px"><div class="empty">Nada encontrado</div></div>';
}

/* ============ BLOQUEIO & ESPERA ============ */
function openBloqueio(){
  openSheet(`<div class="sheet-h"><h2>🚫 Bloquear horário</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <label>Data</label><input type="date" id="bl-data" value="${AG.date}">
  <div class="row2"><div><label>Hora</label><input type="time" id="bl-hora" value="12:00"></div>
  <div><label>Duração (min)</label><input type="number" id="bl-dur" value="60"></div></div>
  <label>Motivo (opcional)</label><input id="bl-motivo" placeholder="Almoço, compromisso...">
  <button class="btn btn-p btn-w" style="margin-top:18px" onclick="saveBloqueio()">Bloquear</button>`);
}
function saveBloqueio(){
  DB.bloqueios.push({id:uid(),data:document.getElementById('bl-data').value,hora:document.getElementById('bl-hora').value,dur:+document.getElementById('bl-dur').value||60,motivo:document.getElementById('bl-motivo').value});
  save();closeSheet();render();toast('Horário bloqueado 🚫');
}
function delBloqueio(id){
  if(!confirm('Remover este bloqueio?'))return;
  DB.bloqueios=DB.bloqueios.filter(b=>b.id!==id);save();render();toast('Bloqueio removido');
}
function openEspera(){
  const list=DB.espera.map(e=>`<div class="list-item"><div class="li-main"><div class="t">${esc(e.nome)}</div><div class="s">${esc(e.obs||'')}</div></div>
    <button class="btn btn-s btn-sm" onclick="closeSheet();openAtModalNome('${e.id}')">Agendar</button>
    <button class="btn btn-danger btn-sm" onclick="delEspera('${e.id}')">✕</button></div>`).join('');
  openSheet(`<div class="sheet-h"><h2>📋 Lista de espera</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <p style="font-size:12.5px;color:var(--muted)">Clientes aguardando um horário vago.</p>
  ${list||'<div class="empty">Lista vazia</div>'}
  <div class="divider"></div>
  <label>Nome</label><input id="es-nome" placeholder="Nome da cliente">
  <label>Observação</label><input id="es-obs" placeholder="Prefere sextas à tarde...">
  <button class="btn btn-p btn-w" style="margin-top:16px" onclick="addEspera()">Adicionar à lista</button>`);
}
function addEspera(){
  const n=document.getElementById('es-nome').value.trim();
  if(!n)return toast('Informe o nome');
  DB.espera.push({id:uid(),nome:n,obs:document.getElementById('es-obs').value});
  save();openEspera();toast('Adicionada à lista de espera');render();
}
function delEspera(id){DB.espera=DB.espera.filter(e=>e.id!==id);save();openEspera();render();}
function openAtModalNome(esperaId){
  const e=DB.espera.find(x=>x.id===esperaId);
  openAtModal(null,AG.date,null,e?e.nome:'');
}

/* ============ ATENDIMENTO: CRIAR/EDITAR ============ */
function openAtModal(atId,date,hora,nomePre){
  const a=atId?DB.ats.find(x=>x.id===atId):null;
  const d=a?a.data:(date||todayStr());
  const h=a?a.hora:(hora||'09:00');
  const cliOpts='<option value="">— selecionar —</option>'+DB.clientes.slice().sort((x,y)=>x.nome.localeCompare(y.nome)).map(c=>`<option value="${c.id}" ${a&&a.clienteId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('');
  const srvOpts='<option value="">— selecionar —</option>'+DB.servicos.map(s=>`<option value="${s.id}" data-preco="${s.preco}" data-dur="${s.dur}" ${a&&a.servicoId===s.id?'selected':''}>${esc(s.nome)} · ${money(s.preco)}</option>`).join('');
  openSheet(`
  <div class="sheet-h"><h2>${a?'✏️ Editar atendimento':'✨ Novo atendimento'}</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <label>Cliente</label>
  <select id="at-cli" onchange="document.getElementById('at-novocli').classList.toggle('hidden',!!this.value)">${cliOpts}</select>
  <div id="at-novocli" class="${a&&a.clienteId?'hidden':''}">
    <label>Ou nova cliente (nome)</label><input id="at-nome" placeholder="Nome da cliente" value="${esc(a?a.nomeAvulso||'':nomePre||'')}">
    <label>WhatsApp da nova cliente (opcional)</label><input id="at-tel" inputmode="tel" placeholder="(95) 9....">
  </div>
  <div class="row2">
    <div><label>Data</label><input type="date" id="at-data" value="${d}"></div>
    <div><label>Hora</label><input type="time" id="at-hora" value="${h}"></div>
  </div>
  <label>Serviço</label>
  <select id="at-srv" onchange="atSrvChange(this)">${srvOpts}</select>
  <div class="row2">
    <div><label>Duração (min)</label><input type="number" id="at-dur" value="${a?a.dur:60}"></div>
    <div><label>Valor (R$)</label><input type="number" step="0.01" id="at-valor" value="${a?a.valor:''}"></div>
  </div>
  <div class="row2">
    <div><label>Desconto / cortesia (R$)</label><input type="number" step="0.01" id="at-desc" value="${a&&a.desconto?a.desconto:''}" placeholder="0,00"></div>
    <div><label>Status</label><select id="at-status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${a&&a.status===k?'selected':''}>${v[0]}</option>`).join('')}</select></div>
  </div>
  <label>Produtos utilizados (opcional)</label><input id="at-prod" placeholder="Gel X, esmalte 032..." value="${esc(a?a.produtos||'':'')}">
  <label>Observações</label><textarea id="at-obs" rows="2" placeholder="Detalhes, referência de unha...">${esc(a?a.obs||'':'')}</textarea>
  ${a?'':`<label>Repetir (recorrência para cliente fixa)</label>
  <div class="chip-row" id="at-rec">
    <button class="chip on" data-rec="0" onclick="recSel(this)">Não repete</button>
    <button class="chip" data-rec="7" onclick="recSel(this)">Semanal</button>
    <button class="chip" data-rec="14" onclick="recSel(this)">Quinzenal</button>
    <button class="chip" data-rec="21" onclick="recSel(this)">A cada 21 dias</button>
    <button class="chip" data-rec="30" onclick="recSel(this)">Mensal</button>
  </div>
  <div id="at-rec-n" class="hidden"><label>Repetir quantas vezes?</label><input type="number" id="at-recn" value="4" min="1" max="26"></div>`}
  <button class="btn btn-p btn-w" style="margin-top:20px" onclick="saveAt('${a?a.id:''}')">${a?'Salvar alterações':'Agendar 💅'}</button>`);
}
function atSrvChange(sel){
  const o=sel.selectedOptions[0];
  if(o&&o.dataset.preco){document.getElementById('at-valor').value=o.dataset.preco;document.getElementById('at-dur').value=o.dataset.dur;}
}
function recSel(btn){
  document.querySelectorAll('#at-rec .chip').forEach(c=>c.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('at-rec-n').classList.toggle('hidden',btn.dataset.rec==='0');
}
function saveAt(atId){
  const cliId=document.getElementById('at-cli').value;
  let nomeAvulso='',novoCliId='';
  if(!cliId){
    nomeAvulso=document.getElementById('at-nome').value.trim();
    if(!nomeAvulso)return toast('Escolha ou informe a cliente');
    const tel=document.getElementById('at-tel')?document.getElementById('at-tel').value:'';
    if(nomeAvulso){
      const c={id:uid(),nome:nomeAvulso,tel:tel,whats:tel,insta:'',nasc:'',obs:'',vip:false,foto:''};
      DB.clientes.push(c);novoCliId=c.id;
    }
  }
  const data=document.getElementById('at-data').value, hora=document.getElementById('at-hora').value;
  if(!data||!hora)return toast('Informe data e hora');
  const srvId=document.getElementById('at-srv').value;
  if(!srvId)return toast('Escolha o serviço');
  const base={
    clienteId:cliId||novoCliId,nomeAvulso:'',servicoId:srvId,
    data,hora,dur:+document.getElementById('at-dur').value||60,
    valor:+document.getElementById('at-valor').value||0,
    desconto:+document.getElementById('at-desc').value||0,
    status:document.getElementById('at-status').value,
    produtos:document.getElementById('at-prod').value,
    obs:document.getElementById('at-obs').value
  };
  if(atId){
    const a=DB.ats.find(x=>x.id===atId);Object.assign(a,base);
    save();closeSheet();render();toast('Atendimento atualizado ✏️');
    return;
  }
  const recBtn=document.querySelector('#at-rec .chip.on');
  const rec=recBtn?+recBtn.dataset.rec:0;
  const nrep=rec?Math.max(1,+((document.getElementById('at-recn')||{}).value||1)):1;
  const total=rec?nrep:1;
  for(let i=0;i<total;i++){
    const dd=parseD(data);dd.setDate(dd.getDate()+i*rec);
    DB.ats.push(Object.assign({},base,{id:uid(),data:dstr(dd),pago:false,pagto:null}));
  }
  save();closeSheet();
  if(VIEW==='agenda'){AG.date=data;AG.mode='dia';}
  render();
  toast(total>1?`${total} atendimentos agendados 🔁`:'Atendimento agendado ✨');
}

/* ============ ATENDIMENTO: DETALHE ============ */
function openAtDetail(id){
  const a=DB.ats.find(x=>x.id===id);if(!a)return;
  const s=srv(a.servicoId)||{};
  const st=STATUS[a.status]||STATUS.agendado;
  const c=a.clienteId&&cli(a.clienteId);
  const phone=cliPhone(a);
  const msgConf=`Olá, ${cliName(a).split(' ')[0]}! 💅 Confirmando seu horário de *${s.nome||'atendimento'}* dia *${fmtD(a.data)}* às *${a.hora}* com Lene Cardoso Nail Designer. Posso confirmar? ✨`;
  openSheet(`
  <div class="sheet-h"><h2>${esc(cliName(a))}</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <span class="badge" style="background:${st[1]}22;color:${st[1]}">${st[0]}</span>
  <div style="margin-top:10px">
    <div class="detail-kv"><span class="k">Serviço</span><span class="v">${esc(s.nome||'—')}</span></div>
    <div class="detail-kv"><span class="k">Data</span><span class="v">${fmtDLong(a.data)}</span></div>
    <div class="detail-kv"><span class="k">Horário</span><span class="v">${a.hora} – ${atEnd(a)} (${a.dur} min)</span></div>
    <div class="detail-kv"><span class="k">Telefone</span><span class="v">${esc(phone||'—')}</span></div>
    <div class="detail-kv"><span class="k">Valor</span><span class="v">${money(a.valor)}${a.desconto?' − '+money(a.desconto)+' desc. = <b>'+money(valorFinal(a))+'</b>':''}</span></div>
    <div class="detail-kv"><span class="k">Pagamento</span><span class="v" style="color:${a.pago?'var(--ok)':'var(--warn)'}">${a.pago?'✅ Pago ('+(a.pagto?a.pagto.forma:'')+')':'⏳ Pendente'}</span></div>
    ${a.produtos?`<div class="detail-kv"><span class="k">Produtos</span><span class="v">${esc(a.produtos)}</span></div>`:''}
    ${a.obs?`<div class="detail-kv"><span class="k">Obs.</span><span class="v">${esc(a.obs)}</span></div>`:''}
  </div>
  <div class="act-grid">
    ${a.status!=='concluido'?`<button class="btn btn-ok" onclick="finalizarAt('${a.id}')">✅ Finalizar</button>`:''}
    ${!a.pago?`<button class="btn btn-p" onclick="openPagto('${a.id}')">💰 Registrar pagamento</button>`:''}
    <button class="btn btn-s" onclick="closeSheet();openAtModal('${a.id}')">✏️ Editar</button>
    <button class="btn btn-s" onclick="remarcarAt('${a.id}')">🔁 Remarcar</button>
    ${phone?`<a class="btn wa" style="text-decoration:none" target="_blank" href="${waLink(phone,msgConf)}">📲 Confirmar no WhatsApp</a>`:''}
    ${c?`<button class="btn btn-o" onclick="closeSheet();openClienteDetail('${c.id}')">👩 Ver ficha</button>`:''}
    ${a.status!=='cancelado'?`<button class="btn btn-danger" onclick="cancelarAt('${a.id}')">🚫 Cancelar</button>`:''}
    ${a.status!=='falta'&&a.status!=='concluido'?`<button class="btn btn-o" onclick="faltaAt('${a.id}')">😞 Marcar falta</button>`:''}
    <button class="btn btn-danger" onclick="delAt('${a.id}')">🗑 Excluir</button>
  </div>`);
}
function finalizarAt(id){
  const a=DB.ats.find(x=>x.id===id);a.status='concluido';save();
  closeSheet();render();
  if(!a.pago){setTimeout(()=>openSheet(`
    <div class="sheet-h"><h2>💰 Registrar pagamento?</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
    <p style="color:var(--muted);font-size:13.5px">${esc(cliName(a))} · ${money(valorFinal(a))}</p>
    <div class="act-grid">
      <button class="btn btn-ok" onclick="openPagto('${a.id}')">✅ Recebi</button>
      <button class="btn btn-o" onclick="closeSheet();toast('Ficou em contas a receber ⏳')">Ainda não</button>
    </div>`),250);}
  else toast('Atendimento concluído ✅');
}
function cancelarAt(id){
  if(!confirm('Cancelar este atendimento?'))return;
  const a=DB.ats.find(x=>x.id===id);a.status='cancelado';save();closeSheet();render();toast('Atendimento cancelado');
}
function faltaAt(id){
  const a=DB.ats.find(x=>x.id===id);a.status='falta';save();closeSheet();render();toast('Falta registrada 😞');
}
function delAt(id){
  if(!confirm('Excluir permanentemente este atendimento?'))return;
  DB.ats=DB.ats.filter(x=>x.id!==id);save();closeSheet();render();toast('Excluído');
}
function remarcarAt(id){
  const a=DB.ats.find(x=>x.id===id);
  openSheet(`<div class="sheet-h"><h2>🔁 Remarcar</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <p style="color:var(--muted);font-size:13px">${esc(cliName(a))} · atualmente ${fmtD(a.data)} às ${a.hora}</p>
  <div class="row2"><div><label>Nova data</label><input type="date" id="rm-data" value="${a.data}"></div>
  <div><label>Nova hora</label><input type="time" id="rm-hora" value="${a.hora}"></div></div>
  <button class="btn btn-p btn-w" style="margin-top:18px" onclick="doRemarcar('${a.id}')">Remarcar ✔</button>`);
}
function doRemarcar(id){
  const a=DB.ats.find(x=>x.id===id);
  a.data=document.getElementById('rm-data').value;a.hora=document.getElementById('rm-hora').value;a.status='agendado';
  save();closeSheet();render();toast('Remarcado para '+fmtD(a.data)+' '+a.hora+' 🔁');
}

/* ============ PAGAMENTO ============ */
function openPagto(id){
  const a=DB.ats.find(x=>x.id===id);
  openSheet(`
  <div class="sheet-h"><h2>💰 Registrar pagamento</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <p style="color:var(--muted);font-size:13.5px">${esc(cliName(a))} · ${esc((srv(a.servicoId)||{}).nome||'')}</p>
  <label>Valor recebido (R$)</label><input type="number" step="0.01" id="pg-valor" value="${valorFinal(a)}">
  <label>Forma de pagamento</label>
  <div class="chip-row" id="pg-forma">
    ${['Pix','Dinheiro','Cartão','Transferência','Outro'].map((f,i)=>`<button class="chip ${i===0?'on':''}" onclick="document.querySelectorAll('#pg-forma .chip').forEach(c=>c.classList.remove('on'));this.classList.add('on')">${f}</button>`).join('')}
  </div>
  <div class="row2">
    <div><label>Data</label><input type="date" id="pg-data" value="${todayStr()}"></div>
    <div><label>Hora</label><input type="time" id="pg-hora" value="${nowHM()}"></div>
  </div>
  <label>Observações</label><input id="pg-obs" placeholder="opcional">
  <button class="btn btn-p btn-w" style="margin-top:18px" onclick="savePagto('${a.id}')">Confirmar recebimento ✅</button>`);
}
function savePagto(id){
  const a=DB.ats.find(x=>x.id===id);
  a.pago=true;
  a.pagto={
    valor:+document.getElementById('pg-valor').value||valorFinal(a),
    forma:document.querySelector('#pg-forma .chip.on').textContent,
    data:document.getElementById('pg-data').value,
    hora:document.getElementById('pg-hora').value,
    obs:document.getElementById('pg-obs').value
  };
  if(a.status!=='concluido')a.status='concluido';
  save();closeSheet();render();toast('Pagamento registrado 💰');
}

/* ============ CLIENTES ============ */
let CLI_Q='';
function viewClientes(){
  const q=CLI_Q.toLowerCase();
  const list=DB.clientes.filter(c=>!q||c.nome.toLowerCase().includes(q)||onlyDigits(c.tel+(c.whats||'')).includes(onlyDigits(q))&&onlyDigits(q).length>=3)
    .sort((a,b)=>a.nome.localeCompare(b.nome));
  return `
  <div class="searchbar">🔎 <input placeholder="Buscar por nome ou telefone..." value="${esc(CLI_Q)}" oninput="CLI_Q=this.value;render();this.focus()" id="cli-q"></div>
  <button class="btn btn-p btn-w" onclick="openClienteForm()" style="margin-bottom:14px">＋ Nova cliente</button>
  <div class="card">${list.length?list.map(c=>{
    const gasto=gastoCliente(c.id);
    return `<div class="list-item" onclick="openClienteDetail('${c.id}')" style="cursor:pointer">
      <div class="avatar">${c.foto?`<img src="${c.foto}">`:iniciais(c.nome)}</div>
      <div class="li-main"><div class="t">${c.vip?'⭐ ':''}${esc(c.nome)}</div><div class="s">${esc(c.whats||c.tel||'sem telefone')}</div></div>
      <div class="li-end"><div class="v">${money(gasto)}</div><div class="s">total gasto</div></div>
    </div>`;}).join(''):'<div class="empty"><span class="ic">👩</span>Nenhuma cliente cadastrada ainda.</div>'}</div>`;
}
const iniciais=n=>n.split(' ').filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('');
function gastoCliente(id){return DB.ats.filter(a=>a.clienteId===id&&a.pago&&a.pagto).reduce((s,a)=>s+(+a.pagto.valor||0),0);}
function openClienteDetail(id){
  const c=cli(id);if(!c)return;
  const hist=DB.ats.filter(a=>a.clienteId===id).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora));
  const ultima=hist.find(a=>a.status==='concluido');
  const prox=hist.slice().reverse().find(a=>['agendado','confirmado'].includes(a.status)&&a.data>=todayStr());
  openSheet(`
  <div class="sheet-h"><h2>${c.vip?'⭐ ':''}${esc(c.nome)}</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <div style="display:flex;gap:14px;align-items:center;margin:6px 0 4px">
    <div class="avatar" style="width:62px;height:62px;font-size:22px">${c.foto?`<img src="${c.foto}">`:iniciais(c.nome)}</div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.7">
      ${c.nasc?'🎂 '+fmtD(c.nasc)+'<br>':''}${hist.filter(a=>a.status==='concluido').length} atendimentos · ${money(gastoCliente(id))} gasto
    </div>
  </div>
  <div class="detail-kv"><span class="k">Telefone</span><span class="v">${esc(c.tel||'—')}</span></div>
  <div class="detail-kv"><span class="k">WhatsApp</span><span class="v">${esc(c.whats||'—')}</span></div>
  <div class="detail-kv"><span class="k">Instagram</span><span class="v">${c.insta?'@'+esc(c.insta):'—'}</span></div>
  <div class="detail-kv"><span class="k">Última visita</span><span class="v">${ultima?fmtD(ultima.data):'—'}</span></div>
  <div class="detail-kv"><span class="k">Próximo agendamento</span><span class="v">${prox?fmtD(prox.data)+' '+prox.hora:'—'}</span></div>
  ${c.obs?`<div class="detail-kv"><span class="k">Obs.</span><span class="v">${esc(c.obs)}</span></div>`:''}
  <div class="act-grid">
    <button class="btn btn-p" onclick="closeSheet();openAtModalCli('${c.id}')">📅 Agendar</button>
    ${(c.whats||c.tel)?`<a class="btn wa" style="text-decoration:none" target="_blank" href="${waLink(c.whats||c.tel,'')}">📲 WhatsApp</a>`:''}
    ${c.insta?`<a class="btn ig" style="text-decoration:none" target="_blank" href="https://instagram.com/${esc(c.insta)}">📸 Instagram</a>`:''}
    <button class="btn btn-s" onclick="openClienteForm('${c.id}')">✏️ Editar</button>
    <button class="btn btn-s" onclick="toggleVip('${c.id}')">${c.vip?'Remover VIP':'⭐ Marcar VIP'}</button>
    <button class="btn btn-danger" onclick="delCliente('${c.id}')">🗑 Excluir</button>
  </div>
  <div class="sec-title"><h2>Histórico</h2></div>
  ${hist.length?hist.slice(0,15).map(a=>{
    const st=STATUS[a.status]||STATUS.agendado;
    return `<div class="list-item"><div class="li-main"><div class="t">${esc((srv(a.servicoId)||{}).nome||'')}</div><div class="s">${fmtD(a.data)} ${a.hora}</div></div>
    <div class="li-end"><div class="v">${money(valorFinal(a))}</div><span class="badge" style="background:${st[1]}22;color:${st[1]}">${st[0]}</span></div></div>`;}).join('')
  :'<div class="empty">Sem histórico ainda</div>'}`);
}
function toggleVip(id){const c=cli(id);c.vip=!c.vip;save();openClienteDetail(id);toast(c.vip?'Cliente VIP ⭐':'VIP removido');}
function delCliente(id){
  if(!confirm('Excluir cliente e manter o histórico anônimo?'))return;
  DB.clientes=DB.clientes.filter(c=>c.id!==id);save();closeSheet();render();toast('Cliente excluída');
}
function openAtModalCli(cliId){
  openAtModal(null,todayStr(),null,'');
  setTimeout(()=>{const s=document.getElementById('at-cli');if(s){s.value=cliId;s.dispatchEvent(new Event('change'));}},60);
}
function openClienteForm(id){
  const c=id?cli(id):null;
  openSheet(`
  <div class="sheet-h"><h2>${c?'✏️ Editar cliente':'👩 Nova cliente'}</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <label>Nome *</label><input id="cf-nome" value="${esc(c?c.nome:'')}" placeholder="Nome completo">
  <div class="row2">
    <div><label>Telefone</label><input id="cf-tel" inputmode="tel" value="${esc(c?c.tel:'')}"></div>
    <div><label>WhatsApp</label><input id="cf-whats" inputmode="tel" value="${esc(c?c.whats:'')}"></div>
  </div>
  <div class="row2">
    <div><label>Instagram (sem @)</label><input id="cf-insta" value="${esc(c?c.insta:'')}"></div>
    <div><label>Nascimento</label><input type="date" id="cf-nasc" value="${c?c.nasc:''}"></div>
  </div>
  <label>Foto (opcional)</label><input type="file" id="cf-foto" accept="image/*" style="padding:8px">
  <label>Observações</label><textarea id="cf-obs" rows="2" placeholder="Alergias, preferências...">${esc(c?c.obs:'')}</textarea>
  <button class="btn btn-p btn-w" style="margin-top:18px" onclick="saveCliente('${c?c.id:''}')">${c?'Salvar':'Cadastrar 💕'}</button>`);
}
function saveCliente(id){
  const nome=document.getElementById('cf-nome').value.trim();
  if(!nome)return toast('Informe o nome');
  const dados={nome,tel:document.getElementById('cf-tel').value,whats:document.getElementById('cf-whats').value,
    insta:document.getElementById('cf-insta').value.replace('@',''),nasc:document.getElementById('cf-nasc').value,
    obs:document.getElementById('cf-obs').value};
  const file=document.getElementById('cf-foto').files[0];
  const done=foto=>{
    if(id){const c=cli(id);Object.assign(c,dados);if(foto)c.foto=foto;}
    else DB.clientes.push(Object.assign({id:uid(),vip:false,foto:foto||''},dados));
    save();closeSheet();render();toast(id?'Cliente atualizada':'Cliente cadastrada 💕');
  };
  if(file){
    const img=new Image(),rd=new FileReader();
    rd.onload=()=>{img.onload=()=>{
      const cv=document.createElement('canvas');const sz=140;cv.width=sz;cv.height=sz;
      const r=Math.max(sz/img.width,sz/img.height);
      cv.getContext('2d').drawImage(img,(sz-img.width*r)/2,(sz-img.height*r)/2,img.width*r,img.height*r);
      done(cv.toDataURL('image/jpeg',.75));
    };img.src=rd.result;};
    rd.readAsDataURL(file);
  }else done(null);
}

/* ============ FINANCEIRO ============ */
let FIN_F='todos';
function viewFin(){
  const t=todayStr();const now=new Date();
  const ws=weekStart(now);const we=new Date(ws);we.setDate(ws.getDate()+6);
  const [m1,m2]=monthRange(now.getFullYear(),now.getMonth());
  const y1=now.getFullYear()+'-01-01',y2=now.getFullYear()+'-12-31';
  const pend=pendentes().sort((a,b)=>a.data.localeCompare(b.data));
  const pagos=DB.ats.filter(a=>a.pago&&a.pagto).sort((a,b)=>(b.pagto.data+b.pagto.hora).localeCompare(a.pagto.data+a.pagto.hora));
  const formas=['todos','Pix','Dinheiro','Cartão','Transferência','Outro'];
  const shown=pagos.filter(a=>FIN_F==='todos'||a.pagto.forma===FIN_F).slice(0,30);
  return `
  <div class="grid g2 g2-d4">
    <div class="card stat"><span class="ic">📆</span><div class="num" style="color:var(--ok)">${money(receitaPeriodo(t,t))}</div><div class="lb">Hoje</div></div>
    <div class="card stat"><span class="ic">🗓</span><div class="num">${money(receitaPeriodo(dstr(ws),dstr(we)))}</div><div class="lb">Esta semana</div></div>
    <div class="card stat"><span class="ic">📅</span><div class="num">${money(receitaPeriodo(m1,m2))}</div><div class="lb">Este mês</div></div>
    <div class="card stat"><span class="ic">💎</span><div class="num">${money(receitaPeriodo(y1,y2))}</div><div class="lb">Este ano</div></div>
  </div>

  <div class="sec-title"><h2>⏳ Contas a receber</h2></div>
  <div class="card">${pend.length?pend.map(a=>{
    const atraso=Math.max(0,Math.round((parseD(t)-parseD(a.data))/864e5));
    const phone=cliPhone(a);
    const msg=`Oi, ${cliName(a).split(' ')[0]}! 💕 Passando pra lembrar do valor de ${money(valorFinal(a))} referente ao seu atendimento de ${(srv(a.servicoId)||{}).nome||''} do dia ${fmtD(a.data)}. Qualquer coisa me avisa! 😘 — Lene Cardoso Nail Designer`;
    return `<div class="list-item">
      <div class="avatar" style="background:var(--warn)22;color:var(--warn)">💸</div>
      <div class="li-main"><div class="t">${esc(cliName(a))}</div><div class="s">${fmtD(a.data)} · ${esc((srv(a.servicoId)||{}).nome||'')}${atraso?` · <b style="color:var(--danger)">${atraso} dia(s) em atraso</b>`:''}</div></div>
      <div class="li-end" style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
        <div class="v" style="color:var(--warn)">${money(valorFinal(a))}</div>
        <div style="display:flex;gap:5px">
          ${phone?`<a class="btn wa btn-sm" style="text-decoration:none" target="_blank" href="${waLink(phone,msg)}">📲 Cobrar</a>`:''}
          <button class="btn btn-ok btn-sm" onclick="openPagto('${a.id}')">Recebi</button>
        </div>
      </div></div>`;}).join(''):'<div class="empty"><span class="ic">🎉</span>Nenhum pagamento pendente!</div>'}</div>

  <div class="sec-title"><h2>✅ Recebidos</h2></div>
  <div class="filter-row">${formas.map(f=>`<button class="chip ${FIN_F===f?'on':''}" onclick="FIN_F='${f}';render()">${f==='todos'?'Todos':f}</button>`).join('')}</div>
  <div class="card">${shown.length?shown.map(a=>`<div class="list-item">
      <div class="avatar" style="background:var(--ok)22;color:var(--ok)">${a.pagto.forma==='Pix'?'⚡':a.pagto.forma==='Dinheiro'?'💵':a.pagto.forma==='Cartão'?'💳':'🏦'}</div>
      <div class="li-main"><div class="t">${esc(cliName(a))}</div><div class="s">${fmtD(a.pagto.data)} ${a.pagto.hora} · ${a.pagto.forma} · ${esc((srv(a.servicoId)||{}).nome||'')}</div></div>
      <div class="li-end"><div class="v" style="color:var(--ok)">${money(a.pagto.valor)}</div></div>
    </div>`).join(''):'<div class="empty">Nenhum recebimento registrado</div>'}</div>`;
}

/* ============ RELATÓRIOS ============ */
let REL_M=null;
function viewRel(){
  const now=new Date();
  if(!REL_M)REL_M=now.getFullYear()+'-'+pad(now.getMonth()+1);
  const [y,m]=REL_M.split('-').map(Number);
  const [d1,d2]=monthRange(y,m-1);
  const atsMes=DB.ats.filter(a=>a.data>=d1&&a.data<=d2);
  const conc=atsMes.filter(a=>a.status==='concluido');
  const canc=atsMes.filter(a=>a.status==='cancelado'||a.status==='falta');
  const receita=receitaPeriodo(d1,d2);
  const ticket=conc.length?receita/conc.length:0;
  const txCanc=atsMes.length?Math.round(canc.length/atsMes.length*100):0;
  const clientesUnicos=new Set(conc.map(a=>a.clienteId||a.nomeAvulso)).size;
  /* receita por dia */
  const days=new Date(y,m,0).getDate();
  const porDia=Array(days).fill(0);
  DB.ats.forEach(a=>{if(a.pago&&a.pagto&&a.pagto.data>=d1&&a.pagto.data<=d2)porDia[+a.pagto.data.split('-')[2]-1]+=+a.pagto.valor||0;});
  const maxDia=Math.max(...porDia,1);
  /* receita últimos 6 meses */
  let evo='';{
    const items=[];let mx=1;
    for(let i=5;i>=0;i--){
      const dd=new Date(y,m-1-i,1);
      const [a1,a2]=monthRange(dd.getFullYear(),dd.getMonth());
      const v=receitaPeriodo(a1,a2);mx=Math.max(mx,v);
      items.push([dd.toLocaleDateString('pt-BR',{month:'short'}),v]);
    }
    evo=items.map(([lb,v])=>barRow(lb,v,mx,money(v))).join('');
  }
  /* rankings */
  const cntS={},cntC={},cntH={},cntW=[0,0,0,0,0,0,0];
  conc.forEach(a=>{
    const sn=(srv(a.servicoId)||{}).nome||'Outro';cntS[sn]=(cntS[sn]||0)+1;
    const cn=cliName(a);cntC[cn]=(cntC[cn]||0)+1;
    const h=a.hora.split(':')[0]+'h';cntH[h]=(cntH[h]||0)+1;
    cntW[parseD(a.data).getDay()]++;
  });
  const top=obj=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const wdN=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const maxW=Math.max(...cntW,1);
  return `
  <label>Mês do relatório</label><input type="month" id="rel-m" value="${REL_M}" onchange="REL_M=this.value;render()" style="margin-bottom:14px">
  <div class="grid g2 g2-d4">
    <div class="card stat"><span class="ic">💰</span><div class="num" style="color:var(--ok)">${money(receita)}</div><div class="lb">Receita do mês</div></div>
    <div class="card stat"><span class="ic">👩</span><div class="num">${clientesUnicos}</div><div class="lb">Clientes atendidas</div></div>
    <div class="card stat"><span class="ic">🎯</span><div class="num">${money(ticket)}</div><div class="lb">Ticket médio</div></div>
    <div class="card stat"><span class="ic">🚫</span><div class="num" style="color:${txCanc>20?'var(--danger)':'var(--text)'}">${txCanc}%</div><div class="lb">Cancelamentos/faltas</div></div>
  </div>
  <div class="sec-title"><h2>Receita diária</h2></div>
  <div class="card"><div class="vchart">${porDia.map((v,i)=>`<div class="vc" title="dia ${i+1}: ${money(v)}"><div class="vb" style="height:${Math.round(v/maxDia*100)}%"></div>${(i+1)%5===0||i===0?`<div class="vl">${i+1}</div>`:'<div class="vl"></div>'}</div>`).join('')}</div></div>
  <div class="sec-title"><h2>📈 Evolução do faturamento (6 meses)</h2></div>
  <div class="card">${evo}</div>
  <div class="sec-title"><h2>🏆 Ranking de serviços</h2></div>
  <div class="card">${top(cntS).length?top(cntS).map(([n,v])=>barRow(n,v,top(cntS)[0][1],v+'x')).join(''):'<div class="empty">Sem dados</div>'}</div>
  <div class="sec-title"><h2>💖 Clientes mais frequentes</h2></div>
  <div class="card">${top(cntC).length?top(cntC).map(([n,v])=>barRow(n,v,top(cntC)[0][1],v+'x')).join(''):'<div class="empty">Sem dados</div>'}</div>
  <div class="sec-title"><h2>⏰ Horários mais procurados</h2></div>
  <div class="card">${top(cntH).length?top(cntH).map(([n,v])=>barRow(n,v,top(cntH)[0][1],v+'x')).join(''):'<div class="empty">Sem dados</div>'}</div>
  <div class="sec-title"><h2>📅 Dias mais movimentados</h2></div>
  <div class="card">${cntW.some(v=>v)?cntW.map((v,i)=>barRow(wdN[i],v,maxW,v+'x')).join(''):'<div class="empty">Sem dados</div>'}</div>
  <button class="btn btn-s btn-w" style="margin-top:16px" onclick="window.print()">🖨 Imprimir / salvar em PDF</button>`;
}
function barRow(lb,v,max,txt){return `<div class="bar-row"><div class="bl">${esc(lb)}</div><div class="bt"><div class="bf" style="width:${Math.round(v/max*100)}%"></div></div><div class="bv">${txt}</div></div>`;}

/* ============ CONFIG ============ */
function viewConfig(){
  return `
  <div class="card">
    <h3>🎨 Aparência</h3>
    <div class="act-grid">
      <button class="btn ${DB.config.tema==='light'?'btn-p':'btn-o'}" onclick="DB.config.tema='light';save();applyTheme();render()">☀️ Claro</button>
      <button class="btn ${DB.config.tema==='dark'?'btn-p':'btn-o'}" onclick="DB.config.tema='dark';save();applyTheme();render()">🌙 Escuro</button>
    </div>
  </div>
  <div class="card" style="margin-top:12px">
    <h3>🎯 Meta e horário de trabalho</h3>
    <label>Meta mensal (R$)</label><input type="number" id="cfg-meta" value="${DB.config.meta}">
    <div class="row2">
      <div><label>Início do expediente</label><input type="time" id="cfg-ini" value="${DB.config.horaIni}"></div>
      <div><label>Fim do expediente</label><input type="time" id="cfg-fim" value="${DB.config.horaFim}"></div>
    </div>
    <button class="btn btn-p btn-w" style="margin-top:14px" onclick="saveCfg()">Salvar</button>
  </div>
  <div class="card" style="margin-top:12px">
    <h3>💅 Serviços</h3>
    ${DB.servicos.map(s=>`<div class="list-item">
      <div class="color-dot" style="background:${s.cor}"></div>
      <div class="li-main"><div class="t">${esc(s.nome)}</div><div class="s">${s.dur} min</div></div>
      <div class="li-end"><div class="v">${money(s.preco)}</div></div>
      <button class="btn btn-s btn-sm" onclick="openServForm('${s.id}')">✏️</button>
    </div>`).join('')}
    <button class="btn btn-s btn-w" style="margin-top:10px" onclick="openServForm()">＋ Novo serviço</button>
  </div>
  <div class="card" style="margin-top:12px">
    <h3>🔔 Lembretes</h3>
    <p style="font-size:12.5px;color:var(--muted);margin:6px 0 10px">Com o app aberto ou instalado, você recebe alertas 1h, 30 min e 15 min antes de cada atendimento.</p>
    <button class="btn ${DB.config.notif?'btn-ok':'btn-p'} btn-w" onclick="toggleNotif()">${DB.config.notif?'✅ Lembretes ativados':'Ativar lembretes'}</button>
  </div>
  <div class="card" style="margin-top:12px">
    <h3>🔒 Segurança</h3>
    <label>PIN de acesso (vazio = sem senha)</label><input type="password" inputmode="numeric" id="cfg-pin" value="${esc(DB.config.pin)}" placeholder="ex.: 1234">
    <button class="btn btn-p btn-w" style="margin-top:12px" onclick="DB.config.pin=document.getElementById('cfg-pin').value;save();toast('PIN atualizado 🔒')">Salvar PIN</button>
  </div>
  <div class="card" style="margin-top:12px">
    <h3>📤 Backup e exportação</h3>
    <div class="act-grid">
      <button class="btn btn-s" onclick="expCSV('agenda')">📅 Agenda (CSV)</button>
      <button class="btn btn-s" onclick="expCSV('clientes')">👩 Clientes (CSV)</button>
      <button class="btn btn-s" onclick="expCSV('fin')">💰 Financeiro (CSV)</button>
      <button class="btn btn-s" onclick="window.print()">🖨 PDF (imprimir)</button>
      <button class="btn btn-o" onclick="expJSON()">💾 Backup completo</button>
      <button class="btn btn-o" onclick="document.getElementById('imp-json').click()">📥 Restaurar backup</button>
    </div>
    <input type="file" id="imp-json" accept=".json" class="hidden" onchange="impJSON(this)">
    <p style="font-size:11.5px;color:var(--muted);margin-top:10px">⚠️ Os dados ficam salvos neste aparelho. Faça backup regularmente e guarde o arquivo no Drive ou WhatsApp.</p>
  </div>
  <div class="card" style="margin-top:12px">
    <h3>📲 Contato do estúdio</h3>
    <label>WhatsApp (com DDI, só números)</label><input id="cfg-whats" value="${esc(DB.config.whats)}">
    <label>Instagram (sem @)</label><input id="cfg-insta" value="${esc(DB.config.insta)}">
    <button class="btn btn-p btn-w" style="margin-top:12px" onclick="DB.config.whats=onlyDigits(document.getElementById('cfg-whats').value);DB.config.insta=document.getElementById('cfg-insta').value.replace('@','');save();toast('Contatos salvos')">Salvar</button>
  </div>`;
}
function saveCfg(){
  DB.config.meta=+document.getElementById('cfg-meta').value||0;
  DB.config.horaIni=document.getElementById('cfg-ini').value||'08:00';
  DB.config.horaFim=document.getElementById('cfg-fim').value||'19:00';
  save();toast('Configurações salvas ✅');
}
const CORES=['#b76e79','#d96b9a','#c98f6b','#8f7fb8','#6b9ac9','#5fa877','#d9a444','#c25b5b','#9a6bd9','#7d8a96'];
function openServForm(id){
  const s=id?srv(id):null;
  openSheet(`
  <div class="sheet-h"><h2>${s?'✏️ Editar serviço':'💅 Novo serviço'}</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
  <label>Nome</label><input id="sv-nome" value="${esc(s?s.nome:'')}" placeholder="Ex.: Alongamento">
  <div class="row2">
    <div><label>Preço (R$)</label><input type="number" step="0.01" id="sv-preco" value="${s?s.preco:''}"></div>
    <div><label>Tempo médio (min)</label><input type="number" id="sv-dur" value="${s?s.dur:60}"></div>
  </div>
  <label>Cor de identificação</label>
  <div class="chip-row" id="sv-cores">${CORES.map((c,i)=>`<button class="color-dot ${s?(s.cor===c?'on':''):(i===0?'on':'')}" style="background:${c}" data-c="${c}" onclick="document.querySelectorAll('#sv-cores .color-dot').forEach(d=>d.classList.remove('on'));this.classList.add('on')"></button>`).join('')}</div>
  <button class="btn btn-p btn-w" style="margin-top:18px" onclick="saveServ('${s?s.id:''}')">Salvar</button>
  ${s?`<button class="btn btn-danger btn-w" style="margin-top:8px" onclick="delServ('${s.id}')">🗑 Excluir serviço</button>`:''}`);
}
function saveServ(id){
  const nome=document.getElementById('sv-nome').value.trim();
  if(!nome)return toast('Informe o nome');
  const dados={nome,preco:+document.getElementById('sv-preco').value||0,dur:+document.getElementById('sv-dur').value||60,cor:document.querySelector('#sv-cores .color-dot.on').dataset.c};
  if(id)Object.assign(srv(id),dados);
  else DB.servicos.push(Object.assign({id:uid()},dados));
  save();closeSheet();render();toast('Serviço salvo 💅');
}
function delServ(id){
  if(!confirm('Excluir este serviço?'))return;
  DB.servicos=DB.servicos.filter(s=>s.id!==id);save();closeSheet();render();toast('Serviço excluído');
}

/* ============ EXPORT ============ */
function dl(name,content,type){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(["﻿"+content],{type:type||'text/csv;charset=utf-8'}));
  a.download=name;a.click();URL.revokeObjectURL(a.href);
}
const csvCell=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
function expCSV(tipo){
  let rows=[];
  if(tipo==='agenda'){
    rows=[['Data','Hora','Cliente','Telefone','Serviço','Duração(min)','Valor','Desconto','Status','Pago','Forma','Obs']];
    DB.ats.slice().sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora)).forEach(a=>rows.push([fmtD(a.data),a.hora,cliName(a),cliPhone(a),(srv(a.servicoId)||{}).nome||'',a.dur,(+a.valor).toFixed(2),(+a.desconto||0).toFixed(2),(STATUS[a.status]||[''])[0],a.pago?'Sim':'Não',a.pagto?a.pagto.forma:'',a.obs||'']));
  }else if(tipo==='clientes'){
    rows=[['Nome','Telefone','WhatsApp','Instagram','Nascimento','VIP','Total gasto','Obs']];
    DB.clientes.forEach(c=>rows.push([c.nome,c.tel,c.whats,c.insta,c.nasc?fmtD(c.nasc):'',c.vip?'Sim':'Não',gastoCliente(c.id).toFixed(2),c.obs||'']));
  }else{
    rows=[['Data pgto','Hora','Cliente','Serviço','Valor recebido','Forma','Obs']];
    DB.ats.filter(a=>a.pago&&a.pagto).forEach(a=>rows.push([fmtD(a.pagto.data),a.pagto.hora,cliName(a),(srv(a.servicoId)||{}).nome||'',(+a.pagto.valor).toFixed(2),a.pagto.forma,a.pagto.obs||'']));
  }
  dl('lene-'+tipo+'-'+todayStr()+'.csv',rows.map(r=>r.map(csvCell).join(';')).join('\n'));
  toast('Arquivo exportado 📤 (abre no Excel)');
}
function expJSON(){
  dl('backup-agenda-lene-'+todayStr()+'.json',JSON.stringify(DB,null,1),'application/json');
  toast('Backup gerado 💾');
}
function impJSON(input){
  const f=input.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{
    const d=JSON.parse(rd.result);
    if(!d.config||!Array.isArray(d.ats))throw 0;
    if(!confirm('Substituir TODOS os dados atuais pelo backup?'))return;
    DB=d;save();applyTheme();render();toast('Backup restaurado ✅');
  }catch(e){toast('Arquivo de backup inválido');}};
  rd.readAsText(f);
}

/* ============ NOTIFICAÇÕES ============ */
function toggleNotif(){
  if(!('Notification' in window))return toast('Este navegador não suporta notificações');
  if(DB.config.notif){DB.config.notif=false;save();render();toast('Lembretes desativados');return;}
  Notification.requestPermission().then(p=>{
    if(p==='granted'){DB.config.notif=true;save();render();toast('Lembretes ativados 🔔');}
    else toast('Permissão negada pelo navegador');
  });
}
const notified={};
function checkReminders(){
  if(!DB.config.notif||Notification.permission!=='granted')return;
  const t=todayStr(),now=toMin(nowHM());
  atsOf(t).forEach(a=>{
    if(['cancelado','falta','concluido'].includes(a.status))return;
    const diff=toMin(a.hora)-now;
    [[60,'1 hora'],[30,'30 minutos'],[15,'15 minutos']].forEach(([m,lb])=>{
      const key=a.id+'-'+m;
      if(diff<=m&&diff>m-2&&!notified[key]){
        notified[key]=1;
        new Notification('💅 Atendimento em '+lb,{body:cliName(a)+' · '+((srv(a.servicoId)||{}).nome||'')+' às '+a.hora,icon:'icon-192.png'});
      }
    });
  });
}
setInterval(checkReminders,60000);

/* ============ INIT ============ */
buildNav();applyTheme();initLogin();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

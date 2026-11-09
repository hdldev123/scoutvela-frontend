// @ts-nocheck
/* Scout Vela engine: logic, rules and screens ported verbatim from the original prototype. */
export function createScout(root) {
/* ---------- parâmetros (Word do Juan, 29/09/2026) ---------- */
const REF = new Date('2026-11-06T12:00:00');
const HOJE = '06/11/2026';
const NAV_ICON = { ranking: 'trophy', avaliar: 'clipboard-text', cadastro: 'user-plus', investimento: 'chart-line-up', parametros: 'sliders-horizontal', painel: 'gauge', ficha: 'identification-card' };
function iniciais(n) { return String(n).split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
const CICLO = { nome: 'novembro de 2026', prazo: '30/11/2026' };
const PESOS_PADRAO = { perf: 20, cf: 20, tec: 15, tat: 10, pot: 5, exp: 5, men: 10, amb: 10, car: 5 };
const PARAMS = { pesos: { ...PESOS_PADRAO } };
const FAIXAS = [
  { min: 85, nome: 'Prioridade de programa', curto: 'Prioridade', cls: 'f1' },
  { min: 75, nome: 'Alto potencial', curto: 'Alto potencial', cls: 'f2' },
  { min: 65, nome: 'Em desenvolvimento', curto: 'Em desenvolvimento', cls: 'f3' },
  { min: 0, nome: 'No radar', curto: 'No radar', cls: 'f4' }
];
const CLASSES = [
  { id: '470-helm', nome: '470 Helm', evento: '470', pos: 'helm', min: 58.9, med: 62.5, max: 66.0 },
  { id: '470-crew', nome: '470 Crew', evento: '470', pos: 'crew', min: 70.4, med: 73.6, max: 76.8 },
  { id: '49er-helm', nome: '49er Helm', evento: '49er', pos: 'helm', min: 80.1, med: 81.7, max: 83.3 },
  { id: '49er-crew', nome: '49er Crew', evento: '49er', pos: 'crew', min: 82.2, med: 83.8, max: 85.3 },
  { id: 'fx-helm', nome: '49erFX Helm', evento: '49erFX', pos: 'helm', min: 67.4, med: 69.3, max: 71.1 },
  { id: 'fx-crew', nome: '49erFX Crew', evento: '49erFX', pos: 'crew', min: 69.3, med: 71.5, max: 73.7 },
  { id: 'ilca6', nome: 'ILCA 6', evento: 'ILCA 6', pos: 'ind', min: 68.7, med: 72.0, max: 75.4 },
  { id: 'ilca7', nome: 'ILCA 7', evento: 'ILCA 7', pos: 'ind', min: 82.8, med: 84.5, max: 87.2 },
  { id: 'iqf-m', nome: 'iQFOiL M', evento: 'iQFOiL', pos: 'ind', min: 88.7, med: 90.4, max: 92.1 },
  { id: 'iqf-w', nome: 'iQFOiL W', evento: 'iQFOiL', pos: 'ind', min: 66.8, med: 70.1, max: 73.3 },
  { id: 'fk-m', nome: 'Formula Kite M', evento: 'Formula Kite', pos: 'ind', min: 93.3, med: 97.1, max: 110.9 },
  { id: 'fk-w', nome: 'Formula Kite W', evento: 'Formula Kite', pos: 'ind', min: 71.7, med: 75.1, max: 78.4 },
  { id: 'n17-helm', nome: 'Nacra 17 Helm', evento: 'Nacra 17', pos: 'helm', min: 68.3, med: 71.7, max: 75.1 },
  { id: 'n17-crew', nome: 'Nacra 17 Crew', evento: 'Nacra 17', pos: 'crew', min: 68.6, med: 71.4, max: 74.1 }
];
/* tipo: T = treinador avalia; A = atleta responde, treinador pontua; R = registrado, não pontua (proposta P5) */
const PILARES = [
  { id: 'perf', nome: 'Performance esportiva', curto: 'Performance', sens: false, ind: [
    ['perf_mundial', 'Resultados em Mundial e Youth World', 'T'], ['perf_continental', 'Resultados continentais', 'T'], ['perf_nacional', 'Resultados nacionais', 'T'], ['perf_consistencia', 'Consistência', 'T'], ['perf_nivel_frota', 'Nível da classe e da frota', 'T']] },
  { id: 'cf', nome: 'Class Fit / perfil físico', curto: 'Class Fit', sens: true, ind: [
    ['cf_peso_kg', 'Peso', 'T'], ['cf_altura_cm', 'Altura', 'T'], ['cf_composicao', 'Composição corporal', 'T'], ['cf_potencia', 'Potência', 'T'], ['cf_forca', 'Força', 'T'], ['cf_compatibilidade', 'Compatibilidade futura com classe e função', 'T']] },
  { id: 'tec', nome: 'Técnica', curto: 'Técnica', sens: false, ind: [
    ['tec_boat_handling', 'Boat handling', 'T'], ['tec_velocidade', 'Velocidade', 'T'], ['tec_trim', 'Trim', 'T'], ['tec_manobras', 'Manobras', 'T'], ['tec_largada', 'Largada', 'T'], ['tec_adaptacao', 'Adaptação a vento e onda', 'T']] },
  { id: 'tat', nome: 'Tática e decisão', curto: 'Tática', sens: false, ind: [
    ['tat_leitura_vento', 'Leitura do vento', 'T'], ['tat_estrategia', 'Estratégia', 'T'], ['tat_posicionamento', 'Posicionamento', 'T'], ['tat_risco', 'Gestão de risco', 'T'], ['tat_adaptacao', 'Adaptação tática', 'T']] },
  { id: 'pot', nome: 'Potencial de desenvolvimento', curto: 'Potencial', sens: false, ind: [
    ['pot_aprendizagem', 'Taxa de aprendizagem', 'T'], ['pot_feedback', 'Resposta ao feedback', 'T'], ['pot_evolucao', 'Evolução em 12 a 24 meses', 'T']] },
  { id: 'exp', nome: 'Experiência de alto rendimento', curto: 'Experiência', sens: false, ind: [
    ['exp_alto_rendimento', 'Experiência de alto rendimento', 'T']] },
  { id: 'men', nome: 'Perfil mental / autonomia', curto: 'Mental', sens: true, ind: [
    ['men_resiliencia', 'Resiliência', 'T'], ['men_disciplina', 'Disciplina', 'T'], ['men_autonomia', 'Autonomia', 'T'], ['men_competitividade', 'Competitividade', 'T'], ['men_controle_pressao', 'Controle sob pressão', 'T']] },
  { id: 'amb', nome: 'Ambiente de desenvolvimento', curto: 'Ambiente', sens: true, ind: [
    ['amb_apoio_familiar', 'Apoio familiar ao projeto', 'A'], ['amb_disponibilidade', 'Disponibilidade para viagens e camps', 'A'], ['amb_estabilidade', 'Estabilidade de estudos ou trabalho', 'A'], ['amb_autonomia', 'Autonomia do atleta', 'T'], ['amb_logistica', 'Organização logística', 'A'], ['amb_historico_familiar', 'Histórico familiar de esporte de alto rendimento', 'R'], ['amb_acesso_estrutura', 'Acesso a treinador e estrutura', 'A']] },
  { id: 'car', nome: 'Projeto de carreira', curto: 'Carreira', sens: false, ind: [
    ['car_compromisso', 'Compromisso', 'T'], ['car_disponibilidade', 'Horas disponíveis para a campanha', 'A'], ['car_equipe_tecnica', 'Equipe técnica', 'A'], ['car_horizonte', 'Horizonte de 2 a 4 anos', 'T']] }
];
const PERGUNTAS = {
  amb_apoio_familiar: ['Sua família apoia o projeto olímpico?', [['Apoia totalmente', 5], ['Apoia em parte', 3], ['Apoia pouco', 1]]],
  amb_disponibilidade: ['Quanto você pode viajar para competições e camps?', [['Sem restrição', 5], ['Algumas semanas por ano', 3], ['Muito pouco', 1]]],
  amb_estabilidade: ['Seus estudos ou trabalho permitem a rotina de treino?', [['Sim, sem conflito', 5], ['Com ajustes', 3], ['Há conflito frequente', 1]]],
  amb_logistica: ['Como você resolve transporte, barco e viagens?', [['Resolvo sozinho(a)', 5], ['Preciso de ajuda às vezes', 3], ['Dependo de outras pessoas', 1]]],
  amb_historico_familiar: ['Alguém da sua família foi atleta de alto rendimento?', [['Sim', null], ['Não', null]]],
  amb_acesso_estrutura: ['Você tem acesso a treinador e estrutura?', [['Treinador e base fixos', 5], ['Treinador eventual', 3], ['Sem treinador', 1]]],
  car_disponibilidade: ['Quantas horas por semana você dedica à campanha?', [['Mais de 20 h', 5], ['10 a 20 h', 3], ['Menos de 10 h', 1]]],
  car_equipe_tecnica: ['Quem faz parte da sua equipe técnica?', [['Treinador e preparador físico', 5], ['Só treinador', 3], ['Ninguém fixo', 1]]]
};
const RUBRICA_EXP = ['Sem experiência internacional relevante', 'Participações internacionais pontuais', 'Participação regular em eventos internacionais', 'Mundial/Continental + circuito internacional', 'Ambiente nacional de alto rendimento + competição internacional consistente', 'Experiência comprovada em ambiente de elite/sênior e contra frota internacional forte'];
const ESCALA = ['Inexistente ou inadequado', 'Muito baixo', 'Abaixo do necessário', 'Adequado', 'Forte', 'Referência para a faixa'];
const EVID = { perf: 'Histórico competitivo', cf: 'Avaliação física', tec: 'Vídeo de treino', tat: 'Observação em regata', pot: 'Comparação com o ciclo anterior', exp: 'Histórico competitivo', men: 'Observação em competição', amb: 'Questionário do atleta', car: 'Conversa de planejamento' };
const SUPORTE = { A: 'A · Alta autonomia', B: 'B · Autonomia parcial', C: 'C · Alta dependência', D: 'D · Estrutura insuficiente' };
const COMPONENTES = ['Treinador', 'Preparação física', 'Equipamento', 'Viagens internacionais', 'Hospedagem e diárias', 'Inscrições', 'Base de treinamento', 'Suporte médico, fisio e psicológico'];

/* ---------- atletas fictícios (todos 18+) ---------- */
const RAW = [
  ['a01', 'Lívia Arruda', 'F', '2006-03-14', 'ilca6', 'Clube Náutico Enseada', 'Florianópolis', 'SC', 'SC-T01', 'BRA 2214', 'Ana Ribeiro', 72.4, 172, 'B', [4.4, 4.6, 4.3, 4.0, 4.5, 3.8, 4.2, 4.0, 4.4]],
  ['a02', 'Caio Tavares', 'M', '2005-07-02', 'ilca7', 'Veleiros da Lagoa', 'Porto Alegre', 'RS', 'RS-T02', 'BRA 2187', 'Marcos Pires', 84.1, 186, 'A', [4.0, 4.4, 4.1, 4.2, 3.6, 4.0, 3.8, 3.5, 4.0]],
  ['a03', 'Bianca Lemos', 'F', '2007-01-20', 'fx-helm', 'Iate Clube Ponta Leste', 'Rio de Janeiro', 'RJ', 'RJ-T03', 'BRA 1903', 'Ana Ribeiro', 68.0, 168, 'C', [3.6, 4.0, 3.8, 3.4, 4.6, 2.8, 4.0, 3.2, 3.6]],
  ['a04', 'Marina Seixas', 'F', '2006-09-11', 'fx-crew', 'Iate Clube Ponta Leste', 'Rio de Janeiro', 'RJ', 'RJ-T04', 'BRA 1903', 'Ana Ribeiro', 74.9, 178, 'C', [3.6, 3.2, 3.9, 3.5, 4.0, 2.8, 3.7, 3.4, 3.5]],
  ['a05', 'Rafael Quintela', 'M', '2004-12-05', '49er-helm', 'Clube de Vela Pedra Branca', 'Niterói', 'RJ', 'RJ-T05', 'BRA 1766', 'Marcos Pires', 81.0, 182, 'B', [4.2, 4.5, 4.4, 4.3, 3.8, 4.2, 4.1, 3.9, 4.2]],
  ['a06', 'Otávio Brandão', 'M', '2005-04-28', '49er-crew', 'Clube de Vela Pedra Branca', 'Niterói', 'RJ', 'RJ-T06', 'BRA 1766', 'Marcos Pires', 86.8, 190, 'B', [4.0, 3.6, 4.0, 3.8, 3.5, 4.0, 3.6, 3.4, 3.8]],
  ['a07', 'Helena Vasques', 'F', '2008-02-17', 'iqf-w', 'Escola de Vela Maré Alta', 'Ilhabela', 'SP', 'SP-T07', 'BRA 707', 'Ana Ribeiro', 66.2, 170, 'C', [3.2, 4.3, 3.8, 3.3, 4.7, 2.2, 4.3, 3.0, 4.0]],
  ['a08', 'Davi Moretto', 'M', '2003-10-09', 'iqf-m', 'Escola de Vela Maré Alta', 'Ilhabela', 'SP', 'SP-T08', 'BRA 88', 'Marcos Pires', 89.5, 185, 'A', [4.5, 4.7, 4.5, 4.4, 3.4, 4.6, 4.3, 4.2, 4.5]],
  ['a09', 'Isadora Prates', 'F', '2006-06-23', 'fk-w', 'Kite Clube Barra Norte', 'Fortaleza', 'CE', 'CE-T09', 'BRA 19', 'Ana Ribeiro', 69.4, 167, 'D', [3.4, 2.6, 3.6, 3.2, 4.2, 2.6, 3.8, 2.8, 3.4]],
  ['a10', 'Tomás Albuquerque', 'M', '2004-08-30', 'fk-m', 'Kite Clube Barra Norte', 'Fortaleza', 'CE', 'CE-T10', 'BRA 7', 'Marcos Pires', 96.0, 188, 'B', [3.8, 4.5, 3.9, 3.6, 3.7, 3.4, 3.5, 3.6, 3.7]],
  ['a11', 'Nina Cardoso', 'F', '2005-11-03', '470-helm', 'Iate Clube Lago Sul', 'Brasília', 'DF', 'DF-T11', 'BRA 470', 'Ana Ribeiro', 61.8, 163, 'C', [3.9, 4.6, 4.0, 4.1, 3.9, 3.5, 4.4, 4.1, 4.3]],
  ['a12', 'Pedro Viana', 'M', '2005-02-14', '470-crew', 'Iate Clube Lago Sul', 'Brasília', 'DF', 'DF-T12', 'BRA 470', 'Ana Ribeiro', 75.5, 183, 'B', [3.8, 4.5, 3.9, 3.9, 3.6, 3.5, 3.9, 4.0, 3.9]],
  ['a13', 'Larissa Fontes', 'F', '2007-05-08', 'n17-helm', 'Veleiros da Lagoa', 'Porto Alegre', 'RS', 'RS-T13', 'BRA 117', 'Marcos Pires', 70.9, 169, 'C', [3.0, 4.2, 3.4, 3.2, 4.4, 2.4, 3.6, 2.6, 3.4]],
  ['a14', 'Gabriel Teles', 'M', '2006-01-25', 'n17-crew', 'Veleiros da Lagoa', 'Porto Alegre', 'RS', 'RS-T14', 'BRA 117', 'Marcos Pires', 79.8, 184, 'D', [2.8, 2.2, 3.2, 3.0, 3.6, 2.0, 3.3, 3.0, 3.0]]
];
const FALTANDO = { a07: (id, tipo) => (id.startsWith('amb_') || id.startsWith('car_')) && (tipo === 'A' || tipo === 'R'), a13: (id) => id.startsWith('tat_'), a09: (id) => id === 'tec_trim' || id === 'tec_largada' };
const VELAID_MOCK = {
  'MG-T15': { nome: 'Renata Bastos', genero: 'F', nasc: '2005-08-19', clube: 'Clube Náutico Lagoa Azul', cidade: 'Lagoa Santa', uf: 'MG', ws: 'BRARB51' },
  'BA-T16': { nome: 'Felipe Guedes', genero: 'M', nasc: '2004-03-02', clube: 'Iate Clube Baía Clara', cidade: 'Salvador', uf: 'BA', ws: 'BRAFG77' },
  'PE-T17': { nome: 'Sofia Lins', genero: 'F', nasc: '2009-06-10', clube: 'Clube de Vela Recife Antigo', cidade: 'Recife', uf: 'PE', ws: '' }
};
const TREINADORES = ['Ana Ribeiro', 'Marcos Pires'];

function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt1 = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt0 = v => Math.round(v).toLocaleString('pt-BR');
const fmtDate = iso => iso.split('-').reverse().join('/');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function idadeDe(nasc) { const d = new Date(nasc + 'T12:00:00'); let i = REF.getFullYear() - d.getFullYear(); const m = REF.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && REF.getDate() < d.getDate())) i--; return i; }
const classe = a => CLASSES.find(c => c.id === a.classe);
function funcaoDe(a) { const c = classe(a); if (c.pos === 'ind') return 'Individual'; const f = a.genero === 'F'; return c.pos === 'helm' ? (f ? 'Timoneira' : 'Timoneiro') : (f ? 'Proeira' : 'Proeiro'); }
function cfDist(a) { const c = classe(a); const half = (c.max - c.min) / 2; return { delta: a.peso - c.med, rel: Math.abs(a.peso - c.med) / half }; }
const notaPeso = rel => rel <= 0.5 ? 5 : rel <= 1 ? 4 : rel <= 1.5 ? 3 : rel <= 2 ? 2 : rel <= 3 ? 1 : 0;
const fmtDelta = d => (d >= 0 ? '+' : '−') + fmt1(Math.abs(d)) + ' kg';

function respostaPara(id, nota, r) { const p = PERGUNTAS[id]; if (!p) return null; if (nota == null) return p[1][r() < 0.3 ? 0 : 1][0]; let best = p[1][0]; p[1].forEach(o => { if (o[1] != null && Math.abs(o[1] - nota) < Math.abs(best[1] - nota)) best = o; }); return best[0]; }

const ATH = RAW.map((x, k) => {
  const [id, nome, genero, nasc, cls, clube, cidade, uf, vela, vela_n, treinador, peso, altura, perfil, base] = x;
  const r = rng(1000 + k * 97);
  const a = { id, nome, genero, nasc, classe: cls, clube, cidade, uf, vela, sail: vela_n, treinador, peso, altura, consentIbvar: id !== 'a07', email: nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@exemplo.com', notas: {}, respostas: {}, gOverride: [null, null, null, null], fin: { perfil }, resultados: [], hist: [] };
  PILARES.forEach((p, pi) => p.ind.forEach(([iid, , tipo]) => {
    const falta = FALTANDO[id] && FALTANDO[id](iid, tipo);
    let v = tipo === 'R' ? null : clamp(Math.round(base[pi] + (r() - 0.5) * 1.6), 0, 5);
    if (iid === 'cf_peso_kg') v = notaPeso(cfDist(a).rel);
    const dia = 20 + Math.floor(r() * 16);
    const at = dia <= 31 ? `${dia}/10/2026` : `0${dia - 31}/11/2026`;
    if (falta) { a.notas[iid] = { v: null }; return; }
    a.notas[iid] = { v, by: tipo === 'A' ? `Resposta do atleta · nota de ${treinador}` : treinador, at, ev: iid === 'cf_peso_kg' ? `Pesagem: ${fmt1(peso)} kg` : EVID[p.id] };
    if (tipo === 'A' || tipo === 'R') a.respostas[iid] = respostaPara(iid, v, r);
  }));
  const perf = base[0], exp = base[5];
  const nIntl = exp >= 4 ? 3 : exp >= 3 ? 2 : exp >= 2.4 ? 1 : 0;
  const nat = [
    { nivel: 'Brasileiro', evento: `Brasileiro de ${classe(a).evento}`, data: '2026-01-24', n: 22, cat: 200 },
    { nivel: 'Estadual', evento: `Copa estadual ${uf}`, data: '2026-05-30', n: 14, cat: 100 },
    { nivel: 'Regional', evento: 'Regata regional · etapa 2', data: '2026-08-22', n: 9, cat: 50 }
  ];
  nat.forEach(e => { e.pos = clamp(Math.round((5 - perf) * (e.n / 6) + 1 + (r() - 0.5) * 2), 1, e.n); e.intl = false; e.pts = (e.n - e.pos + 1) / e.n * e.cat; });
  const intl = [
    { nivel: 'Sul-Americano', evento: `Sul-Americano de ${classe(a).evento}`, data: '2026-03-14', n: 18 },
    { nivel: 'Mundial', evento: `Mundial de ${classe(a).evento}`, data: '2026-07-18', n: 60 },
    { nivel: 'Europeu aberto', evento: `Europeu aberto de ${classe(a).evento}`, data: '2026-09-12', n: 80 }
  ].slice(0, nIntl);
  intl.forEach(e => { const k2 = e.n === 18 ? 4 : e.n === 60 ? 16 : 22; e.pos = clamp(Math.round((5 - perf) * k2 + (e.n === 18 ? 1 : 4) + (r() - 0.5) * 4), 1, e.n); e.intl = true; e.pts = null; });
  a.resultados = [...nat, ...intl].sort((p, q) => q.data.localeCompare(p.data));
  a._d = [(r() * 4 - 1), (r() * 4 - 1)];
  return a;
});
ATH.forEach(a => { const s = score(a); a.hist = [{ c: 'Set', s: clamp(s - a._d[0] - a._d[1], 0, 100) }, { c: 'Out', s: clamp(s - a._d[0], 0, 100) }]; });

/* ---------- cálculo ---------- */
function notaPilar(a, p) { const vals = p.ind.filter(i => i[2] !== 'R').map(i => a.notas[i[0]] && a.notas[i[0]].v).filter(v => v != null); return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null; }
function preench(a, p) { const ids = p.ind.filter(i => i[2] !== 'R'); return { n: ids.filter(i => a.notas[i[0]] && a.notas[i[0]].v != null).length, t: ids.length }; }
function score(a) { let s = 0; PILARES.forEach(p => { const n = notaPilar(a, p); if (n != null) s += n / 5 * PARAMS.pesos[p.id]; }); return s; }
function pct(a) { let n = 0, t = 0; PILARES.forEach(p => { const f = preench(a, p); n += f.n; t += f.t; }); return t ? n / t : 0; }
const completo = a => pct(a) >= 0.999;
const faixa = s => FAIXAS.find(f => s >= f.min);
const ptsCBVela = a => a.resultados.filter(r => !r.intl).reduce((s, r) => s + r.pts, 0);
function gatesAuto(a) {
  const { delta, rel } = cfDist(a);
  const g1 = rel <= 1 ? ['apto', `Dentro da faixa da classe (${fmtDelta(delta)} da média)`] : rel <= 2 ? ['cond', `Leve desvio: ${fmtDelta(delta)} da média da classe`] : ['alerta', `Fora da faixa: ${fmtDelta(delta)} da média da classe`];
  const intl = a.resultados.filter(r => r.intl);
  const mund = intl.find(r => r.nivel === 'Mundial'), sul = intl.find(r => r.nivel === 'Sul-Americano'), bras = a.resultados.find(r => r.nivel === 'Brasileiro');
  let g2;
  if (mund && mund.pos / mund.n <= 0.3) g2 = ['apto', `${mund.pos}º de ${mund.n} no Mundial da classe`];
  else if (sul && sul.pos <= 6) g2 = ['cond', `${sul.pos}º no Sul-Americano`];
  else if (mund && mund.pos / mund.n <= 0.5) g2 = ['cond', `${mund.pos}º de ${mund.n} no Mundial`];
  else if (bras && bras.pos <= 3) g2 = ['cond', `${bras.pos}º no Brasileiro${intl.length ? ', com experiência internacional' : ''}`];
  else g2 = ['alerta', 'Sem evidência relevante fora do circuito nacional'];
  const g3 = intl.length >= 3 ? ['apto', `${intl.length} eventos internacionais em 24 meses`] : intl.length >= 1 ? ['cond', `${intl.length} evento${intl.length > 1 ? 's' : ''} internacional${intl.length > 1 ? 'is' : ''} em 24 meses`] : ['alerta', 'Nenhum evento internacional em 24 meses'];
  const g4 = { A: ['apto', 'Plano e recursos para 36 meses'], B: ['apto', 'Plano e recursos para 24 meses'], C: ['cond', 'Depende de apoio da CBVela'], D: ['alerta', 'Sem estrutura para campanha internacional'] }[a.fin.perfil];
  return [g1, g2, g3, g4];
}
const gates = a => gatesAuto(a).map((g, i) => a.gOverride[i] ? [a.gOverride[i], g[1], true] : [g[0], g[1], false]);
const statusFinal = g => g.some(x => x[0] === 'alerta') ? 'nao' : g.some(x => x[0] === 'cond') ? 'cond' : 'apto';
const GATE_TXT = { apto: 'Apto', cond: 'Condicional', alerta: 'Sinal de alerta' };
const STATUS_TXT = { apto: 'Apto', cond: 'Condicional', nao: 'Não prioritário' };
const GATE_NOMES = ['Class Fit', 'Evidência competitiva', 'Alto rendimento', 'Campanha'];
const mesesAssegurados = a => ({ A: 36, B: 24, C: 12, D: 0 }[a.fin.perfil]);
const patrocinio = a => ({ A: 'Sim', B: 'Em negociação', C: 'Não', D: 'Não' }[a.fin.perfil]);
function autonomia(a, i) { const m = { A: ['Alta', 'Baixa'], B: i % 3 === 0 ? ['Parcial', 'Média'] : ['Alta', 'Baixa'], C: i % 2 ? ['Baixa', 'Alta'] : ['Parcial', 'Média'], D: ['Baixa', 'Alta'] }[a.fin.perfil]; return m; }

/* ---------- estado e acesso ---------- */
const PERFIS = {
  gestor: { nome: 'Gestor CBVela', nav: [['ranking', 'Ranking'], ['avaliar', 'Lançar avaliação'], ['cadastro', 'Cadastrar atleta'], ['investimento', 'Investimento'], ['parametros', 'Parâmetros']], inicio: 'ranking' },
  treinador: { nome: 'Ana Ribeiro', nav: [['ranking', 'Meus atletas'], ['avaliar', 'Lançar avaliação']], inicio: 'ranking' },
  atleta: { nome: 'Helena Vasques', nav: [['painel', 'Meu painel'], ['atleta-a07', 'Minha ficha']], inicio: 'painel' },
  ibvar: { nome: 'IBVAR', nav: [['investimento', 'Investimento'], ['ranking', 'Ranking']], inicio: 'investimento' }
};
const ATLETA_LOGADO = 'a07';
const state = { perfil: 'gestor', filtros: { evento: '', genero: '', faixa: '' }, ordem: 'score', abertos: {}, aval: { atleta: null, pilar: 'tec', rasc: {}, ev: {}, peso: null }, cad: { passo: 0, codigo: '', dados: null, erro: '', classe: '', treinador: 'Ana Ribeiro' }, pesosRasc: null, modulo: null, ultimaRota: '' };
try { const p = localStorage.getItem('scout-perfil'); if (p && PERFIS[p]) state.perfil = p; } catch (e) {}

const doUsuario = a => state.perfil === 'gestor' || (state.perfil === 'treinador' && a.treinador === PERFIS.treinador.nome) || (state.perfil === 'atleta' && a.id === ATLETA_LOGADO) || (state.perfil === 'ibvar' && a.consentIbvar);
function podeVer(rota) {
  const p = state.perfil;
  if (rota.startsWith('atleta-')) { const a = ATH.find(x => x.id === rota.slice(7)); return !!a && doUsuario(a); }
  return ({ ranking: ['gestor', 'treinador', 'ibvar'], avaliar: ['gestor', 'treinador'], cadastro: ['gestor'], investimento: ['gestor', 'ibvar'], parametros: ['gestor'], painel: ['atleta'] }[rota] || []).includes(p);
}
const verSensivel = () => state.perfil !== 'ibvar';
const verFinanceiro = a => state.perfil === 'gestor' || (state.perfil === 'atleta' && a.id === ATLETA_LOGADO);
const verContato = () => state.perfil !== 'ibvar';

/* ---------- componentes ---------- */
function faixaPill(s, curto) { const f = faixa(s); return `<span class="pill ${f.cls}">${curto ? f.curto : f.nome}</span>`; }
function strip(a) {
  return `<span class="strip" aria-label="Notas dos 9 pilares">${PILARES.map(p => { const n = notaPilar(a, p); return n == null ? `<i class="empty" title="${p.curto}: sem nota"></i>` : `<i style="height:${Math.max(8, n / 5 * 100)}%" title="${p.curto}: ${fmt1(n)} de 5"></i>`; }).join('')}</span>`;
}
function gaugeCF(a) {
  const c = classe(a), lo = Math.min(c.min, a.peso) - 4, hi = Math.max(c.max, a.peso) + 4, W = 320, X = v => 16 + (v - lo) / (hi - lo) * (W - 32);
  const st = gatesAuto(a)[0][0], col = st === 'apto' ? 'var(--good)' : st === 'cond' ? 'var(--warn)' : 'var(--bad)';
  return `<svg viewBox="0 0 ${W} 86" width="100%" role="img" aria-label="Peso de ${fmt1(a.peso)} kg contra a faixa de ${fmt1(c.min)} a ${fmt1(c.max)} kg da classe ${c.nome}">
    <line x1="16" x2="${W - 16}" y1="44" y2="44" stroke="var(--line)" stroke-width="2"/>
    <rect x="${X(c.min)}" y="34" width="${X(c.max) - X(c.min)}" height="20" rx="4" fill="var(--sea-soft)" stroke="var(--sea)" stroke-width="1"/>
    <line x1="${X(c.med)}" x2="${X(c.med)}" y1="30" y2="58" stroke="var(--sea)" stroke-width="2"/>
    <text x="${X(c.min) - 4}" y="76" text-anchor="end" font-size="11" fill="var(--ink-2)" font-family="JetBrains Mono, monospace">${fmt1(c.min)}</text>
    <text x="${X(c.max) + 4}" y="76" text-anchor="start" font-size="11" fill="var(--ink-2)" font-family="JetBrains Mono, monospace">${fmt1(c.max)}</text>
    <text x="${X(c.med)}" y="76" text-anchor="middle" font-size="11" fill="var(--sea)" font-family="JetBrains Mono, monospace">média ${fmt1(c.med)}</text>
    <path d="M${X(a.peso) - 7} 20 L${X(a.peso) + 7} 20 L${X(a.peso)} 32 Z" fill="${col}"/>
    <line x1="${X(a.peso)}" x2="${X(a.peso)}" y1="32" y2="56" stroke="${col}" stroke-width="2.5"/>
    <text x="${clamp(X(a.peso), 40, W - 40)}" y="13" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)" font-family="JetBrains Mono, monospace">${fmt1(a.peso)} kg</text>
  </svg>`;
}
function spark(a) {
  const pts = [...a.hist.map(h => h.s), score(a)], labels = ['Set', 'Out', 'Nov'], lo = Math.min(...pts) - 3, hi = Math.max(...pts) + 3;
  const X = i => 12 + i * 58, Y = v => 40 - (v - lo) / (hi - lo) * 30;
  return `<svg viewBox="0 0 140 62" width="140" height="62" role="img" aria-label="Score nos três últimos ciclos: ${pts.map(fmt1).join(', ')}">
    <polyline fill="none" stroke="var(--sea)" stroke-width="2" points="${pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/>
    ${pts.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === 2 ? 4 : 2.5}" fill="${i === 2 ? 'var(--sea)' : 'var(--surface)'}" stroke="var(--sea)" stroke-width="1.5"/><text x="${X(i)}" y="58" text-anchor="middle" font-size="10" fill="var(--ink-2)" font-family="JetBrains Mono, monospace">${labels[i]}</text>`).join('')}
  </svg>`;
}
function semAcesso(msg) { return `<div class="panel empty-state"><h2>Sem acesso para este perfil</h2><p>${msg}</p><p class="muted">Cada perfil só vê o que precisa: a regra fica no banco, não só na tela.</p></div>`; }

/* ---------- telas ---------- */
function viewRanking() {
  const P = state.perfil, f = state.filtros;
  let lista = ATH.slice();
  if (P === 'treinador') lista = lista.filter(a => a.treinador === PERFIS.treinador.nome);
  if (f.evento) lista = lista.filter(a => classe(a).evento === f.evento);
  if (f.genero) lista = lista.filter(a => a.genero === f.genero);
  if (f.faixa) lista = lista.filter(a => faixa(score(a)).cls === f.faixa);
  lista.sort((x, y) => state.ordem === 'cbvela' ? ptsCBVela(y) - ptsCBVela(x) : score(y) - score(x));
  const eventos = [...new Set(CLASSES.map(c => c.evento))];
  const titulo = P === 'treinador' ? 'Meus atletas' : 'Ranking de talento';
  const rows = lista.map((a, i) => {
    const s = score(a), g = gates(a), st = statusFinal(g);
    if (P === 'ibvar' && !a.consentIbvar) return `<div class="rank-row masked"><span class="pos">${i + 1}</span><span class="who"><strong>Atleta sem consentimento</strong><span class="meta">${classe(a).nome} · entra só nos números agregados</span></span><span class="strip"></span><span class="gatecell"><span class="pill st-lock">Restrito</span></span><span class="pts">—</span><span class="scorebox"><b>—</b></span></div>`;
    return `<a class="rank-row" href="#atleta-${a.id}">
      <span class="pos">${i + 1}</span>
      <span class="who"><span class="avatar" aria-hidden="true">${esc(iniciais(a.nome))}</span><span class="who-txt"><strong>${esc(a.nome)}${completo(a) ? '' : '<span class="pill st-parcial">Parcial</span>'}</strong><span class="meta"><code>${a.vela}</code> · ${classe(a).nome} · ${idadeDe(a.nasc)} anos · ${a.uf}</span></span></span>
      ${strip(a)}
      <span class="gatecell"><span class="pill st-${st}"><span class="dot"></span>${STATUS_TXT[st]}</span></span>
      <span class="pts num">${fmt0(ptsCBVela(a))}<small>pts CBVela</small></span>
      <span class="scorebox"><b>${fmt1(s)}</b>${faixaPill(s, true)}</span>
    </a>`;
  }).join('');
  return `<div class="page-head"><div><div class="eyebrow">Ciclo de ${CICLO.nome} · prazo ${CICLO.prazo}</div><h1>${titulo}</h1><p>Ordem de priorização pelo score de 100 pontos, recalculado a cada lançamento. O sistema sugere; gates e decisões ficam com o gestor.</p></div></div>
  <div class="filters">
    <label class="field" for="f-evento">Classe<select id="f-evento" data-filter="evento"><option value="">Todas</option>${eventos.map(e => `<option ${f.evento === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
    <label class="field" for="f-genero">Categoria<select id="f-genero" data-filter="genero"><option value="">Todas</option><option value="F" ${f.genero === 'F' ? 'selected' : ''}>Feminino</option><option value="M" ${f.genero === 'M' ? 'selected' : ''}>Masculino</option></select></label>
    <label class="field" for="f-faixa">Faixa<select id="f-faixa" data-filter="faixa"><option value="">Todas</option>${FAIXAS.map(x => `<option value="${x.cls}" ${f.faixa === x.cls ? 'selected' : ''}>${x.nome}</option>`).join('')}</select></label>
    <label class="field" for="f-ordem">Ordenar por<select id="f-ordem" data-ordem="1"><option value="score">Score de talento</option><option value="cbvela" ${state.ordem === 'cbvela' ? 'selected' : ''}>Pontos no Ranking CBVela</option></select></label>
  </div>
  <p class="rank-legend">Barras: os 9 pilares, de Performance a Carreira. Tracejado = pilar ainda sem nota. Pontos CBVela vêm do ranking oficial (simulado), últimas 52 semanas.</p>
  <div class="rank-headrow" aria-hidden="true"><span>#</span><span>Atleta</span><span>Pilares</span><span>Gates</span><span style="text-align:right">Ranking CBVela</span><span style="text-align:right">Score</span></div>
  <div class="rank">${rows || '<div class="panel empty-state">Nenhum atleta com esses filtros.</div>'}</div>`;
}

function viewFicha(id) {
  const a = ATH.find(x => x.id === id);
  const s = score(a), g = gates(a), st = statusFinal(g), P = state.perfil, c = classe(a);
  const notas = PILARES.map(p => ({ p, n: notaPilar(a, p) }));
  const menor = notas.filter(x => x.n != null).sort((x, y) => x.n / 5 * PARAMS.pesos[x.p.id] - PARAMS.pesos[x.p.id] - (y.n / 5 * PARAMS.pesos[y.p.id] - PARAMS.pesos[y.p.id]))[0];
  const ord = notas.filter(x => x.n != null).sort((x, y) => y.n - x.n);
  const back = P === 'atleta' ? '' : `<a href="#ranking" class="muted">← ${P === 'treinador' ? 'Meus atletas' : 'Ranking'}</a>`;
  const pilares = notas.map(({ p, n }) => {
    const peso = PARAMS.pesos[p.id], contrib = n == null ? 0 : n / 5 * peso, f = preench(a, p), open = state.abertos[a.id + p.id];
    let det;
    if (p.sens && !verSensivel()) det = `<div class="lock">Detalhe restrito: ${p.id === 'amb' ? 'informação sobre a família' : 'dado sensível'}. O IBVAR vê só a nota do pilar.</div>`;
    else det = `<div class="ind-list">${p.ind.map(([iid, nome, tipo]) => {
      const r = a.notas[iid] || {};
      const resp = a.respostas[iid] ? ` · resposta: “${esc(a.respostas[iid])}”` : '';
      if (tipo === 'R') return `<div class="ind"><div>${nome}<div class="src">Registrado, não pontua (proposta P5)${resp}</div></div><span class="nota na">—</span></div>`;
      return `<div class="ind"><div>${nome}<div class="src">${r.v == null ? (tipo === 'A' ? 'Aguardando resposta do atleta' : 'Ainda não avaliado neste ciclo') : `${esc(r.ev)} · ${esc(r.by)} · ${r.at}${resp}`}</div></div><span class="nota ${r.v == null ? 'na' : ''}">${r.v == null ? '—' : r.v}</span></div>`;
    }).join('')}</div>`;
    return `<div class="pilar" data-open="${open ? 1 : 0}">
      <button class="pilar-btn" data-action="toggle" data-key="${a.id + p.id}" aria-expanded="${open ? 'true' : 'false'}">
        <span class="nm">${p.nome}<small>${peso} pts${f.n < f.t ? ` · ${f.n} de ${f.t} indicadores` : ''}${menor && menor.p.id === p.id ? ' · maior perda de pontos' : ''}</small></span>
        <span class="meter ${n != null && n < 3 ? 'low' : ''}"><span style="width:${n == null ? 0 : n / 5 * 100}%"></span></span>
        <span class="contrib">${n == null ? 'sem nota' : `${fmt1(contrib)} de ${peso}`}</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>${open ? det : ''}</div>`;
  }).join('');
  const gatesHtml = g.map((x, i) => `<div class="gate"><span class="gid">G${i + 1}</span><div><div>${GATE_NOMES[i]}</div><div class="why">${esc(x[1])}${x[2] ? ' · ajustado pelo gestor' : ''}</div></div>
    ${P === 'gestor' ? `<select aria-label="Status do gate G${i + 1}" data-gate="${i}" data-atleta="${a.id}">${['apto', 'cond', 'alerta'].map(v => `<option value="${v}" ${x[0] === v ? 'selected' : ''}>${GATE_TXT[v]}</option>`).join('')}</select>` : `<span class="pill st-${x[0]}">${GATE_TXT[x[0]]}</span>`}</div>`).join('');
  const fin = verFinanceiro(a) ? `<dl class="kv"><dt>Perfil de suporte</dt><dd><b>${SUPORTE[a.fin.perfil]}</b></dd><dt>Orçamento assegurado</dt><dd>${mesesAssegurados(a) ? mesesAssegurados(a) + ' meses' : 'Nenhum'}</dd><dt>Patrocínio privado</dt><dd>${patrocinio(a)}</dd></dl>
      <div class="table-scroll" style="margin-top:12px"><table class="data"><thead><tr><th>Componente</th><th>Autonomia</th><th>Apoio CBVela</th></tr></thead><tbody>${COMPONENTES.map((comp, i) => { const m = autonomia(a, i); return `<tr><td>${comp}</td><td>${m[0]}</td><td>${m[1]}</td></tr>`; }).join('')}</tbody></table></div>`
    : P === 'ibvar' ? `<dl class="kv"><dt>Perfil de suporte</dt><dd><b>${SUPORTE[a.fin.perfil]}</b></dd><dt>Orçamento assegurado</dt><dd>${mesesAssegurados(a) ? mesesAssegurados(a) + ' meses' : 'Nenhum'}</dd></dl><div class="lock" style="margin-top:10px">Componentes de custo restritos ao atleta e ao gestor.</div>`
    : `<div class="lock">Financeiro da campanha: visível só para o atleta e o gestor.</div>`;
  const hist = `<div class="table-scroll"><table class="data"><thead><tr><th>Data</th><th>Evento</th><th class="r">Posição</th><th class="r">Pts CBVela</th><th>Fonte</th></tr></thead><tbody>${a.resultados.map(r => `<tr><td class="num">${fmtDate(r.data)}</td><td>${esc(r.evento)}</td><td class="r">${r.pos}º de ${r.n}</td><td class="r">${r.pts == null ? '—' : fmt0(r.pts)}</td><td>${r.intl ? '<span class="src-tag man">Lançado + link oficial</span>' : '<span class="src-tag">Ranking CBVela</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  const forcas = ord.slice(0, 2).map(x => x.p.curto).join(' e '), lacunas = ord.slice(-2).map(x => x.p.curto).join(' e ');
  const mund = a.resultados.find(r => r.nivel === 'Mundial');
  return `<div class="stack">
  <div>${back}</div>
  <div class="athlete-head">
    <div>
      <div class="eyebrow">Ficha individual · ciclo de ${CICLO.nome}</div>
      <h1>${esc(a.nome)}</h1>
      <div class="facts"><span class="sail">${a.sail}</span><span><code>${a.vela}</code> VelaID</span><span>${c.nome} · ${funcaoDe(a)}</span><span>${idadeDe(a.nasc)} anos</span><span>${esc(a.clube)} · ${esc(a.cidade)}/${a.uf}</span>${verContato() ? `<span>Treinador(a): ${a.treinador}</span>` : ''}</div>
    </div>
    <div class="bigscore"><div><div class="val">${fmt1(s)}</div></div><div><div class="of">/100</div>${faixaPill(s)}${completo(a) ? '' : ' <span class="pill st-parcial">Parcial</span>'}</div>${spark(a)}</div>
  </div>
  <div class="grid-2">
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Os 9 pilares</h2><span class="muted" style="font-size:.85rem">Toque num pilar para ver por que a nota é essa</span></div>${pilares}
      ${P === 'atleta' ? `<div class="btn-row" style="margin-top:12px"><button class="btn" data-action="revisao">Pedir revisão de uma nota</button><span class="muted" style="font-size:.82rem">Direito previsto na LGPD (art. 20)</span></div>` : ''}
      ${(P === 'gestor' || P === 'treinador') ? `<div class="btn-row" style="margin-top:12px"><a class="btn primary" href="#avaliar" data-action="avaliar-atleta" data-id="${a.id}">Lançar avaliação</a></div>` : ''}</section>
      <section class="panel"><div class="panel-head"><h2>Histórico competitivo</h2><span class="num"><b>${fmt0(ptsCBVela(a))}</b> <span class="muted">pts no Ranking CBVela</span></span></div>${hist}<p class="muted" style="font-size:.82rem;margin:10px 0 0">Resultados nacionais chegam do Ranking CBVela pelo código VelaID. Internacionais são lançados com o link do resultado oficial.</p></section>
    </div>
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Gates aos 18</h2><span class="pill st-${st}"><span class="dot"></span>${STATUS_TXT[st]}</span></div>${gatesHtml}<p class="muted" style="font-size:.8rem;margin:8px 0 0">Sugestão automática por regra provisória (P7). ${P === 'gestor' ? 'O gestor confirma ou ajusta cada gate.' : 'Quem decide é o gestor.'}</p></section>
      <section class="panel"><div class="panel-head"><h2>Class Fit</h2><span class="muted" style="font-size:.85rem">${c.nome}</span></div>${verSensivel() ? gaugeCF(a) + `<p class="muted" style="font-size:.82rem;margin:6px 0 0">Faixa de peso da classe pelo Word do Juan. Altura: ${a.altura} cm.</p>` : `<div class="lock">Peso e medidas são dado sensível. O IBVAR vê só o resultado do gate G1.</div>`}</section>
      <section class="panel"><div class="panel-head"><h2>Sustentabilidade da campanha</h2></div>${fin}</section>
      <section class="panel"><div class="panel-head"><h2>Plano individual</h2></div><dl class="kv"><dt>Forças</dt><dd>${forcas || 'Aguardando a primeira avaliação'}</dd><dt>Lacunas</dt><dd>${lacunas || '—'}</dd><dt>Meta 12 meses</dt><dd>${mund ? 'Top 10 no Mundial da classe' : 'Primeiro Mundial da classe, top 50%'}</dd><dt>Meta 24 meses</dt><dd>${st === 'apto' ? 'Campanha completa no circuito internacional' : 'Fechar os gates em aberto'}</dd><dt>Recomendação</dt><dd>${faixa(s).nome}${a.fin.perfil === 'C' || a.fin.perfil === 'D' ? ', com apoio para viagens e equipamento' : ''}</dd></dl></section>
    </div>
  </div></div>`;
}

function viewAvaliar() {
  const P = state.perfil, ag = state.aval;
  const meus = P === 'treinador' ? ATH.filter(a => a.treinador === PERFIS.treinador.nome) : ATH;
  if (!ag.atleta || !meus.find(a => a.id === ag.atleta)) { ag.atleta = (meus.find(a => !completo(a)) || meus[0]).id; ag.rasc = {}; ag.ev = {}; ag.peso = null; }
  const a = ATH.find(x => x.id === ag.atleta), p = PILARES.find(x => x.id === ag.pilar);
  const sim = { ...a, notas: { ...a.notas } };
  Object.entries(ag.rasc).forEach(([k, v]) => { sim.notas[k] = { ...(sim.notas[k] || {}), v }; });
  if (ag.peso != null && p.id === 'cf') { sim.peso = ag.peso; sim.notas.cf_peso_kg = { ...(sim.notas.cf_peso_kg || {}), v: notaPeso(cfDist(sim).rel) }; }
  const antes = score(a), depois = score(sim), nAntes = notaPilar(a, p), nDepois = notaPilar(sim, p), dif = depois - antes;
  const tabs = PILARES.map(x => { const f = preench(a, x); return `<button class="ptab" data-action="pilar" data-id="${x.id}" aria-pressed="${x.id === p.id}"><b>${x.curto}</b><span>${f.n}/${f.t} · ${PARAMS.pesos[x.id]} pts</span></button>`; }).join('');
  const rows = p.ind.map(([iid, nome, tipo]) => {
    const atual = a.notas[iid] ? a.notas[iid].v : null, v = iid in ag.rasc ? ag.rasc[iid] : atual;
    if (tipo === 'R') return `<div class="ed-row"><div class="lbl">${nome}<small>Registrado, não pontua (proposta P5)${a.respostas[iid] ? ` · resposta: “${esc(a.respostas[iid])}”` : ''}</small></div></div>`;
    if (iid === 'cf_peso_kg') { const pesoV = ag.peso != null ? ag.peso : a.peso; const nv = sim.notas.cf_peso_kg.v; return `<div class="ed-row"><div class="lbl">Peso, em kg<small>Nota calculada pela faixa da classe: ${nv} de 5 (regra provisória, P3)</small></div><label class="field" for="peso-in" style="min-width:7rem">kg<input id="peso-in" type="number" step="0.1" min="30" max="140" value="${pesoV}" data-peso="1"></label></div>`; }
    const resp = a.respostas[iid] ? `Resposta do atleta: “${esc(a.respostas[iid])}”` : tipo === 'A' ? 'Atleta ainda não respondeu' : `Atual: ${atual == null ? 'sem nota' : atual}`;
    return `<div class="ed-row"><div class="lbl">${nome}<small>${resp}</small></div>
      <div class="seg" role="group" aria-label="Nota de ${nome}">${[0, 1, 2, 3, 4, 5].map(n => `<button type="button" data-action="nota" data-ind="${iid}" data-v="${n}" aria-pressed="${v === n}" title="${ESCALA[n]}">${n}</button>`).join('')}</div>
      <label class="field ev" for="ev-${iid}">Evidência<input id="ev-${iid}" data-ev="${iid}" placeholder="${EVID[p.id]}" value="${esc(ag.ev[iid] || '')}"></label></div>`;
  }).join('');
  const rub = p.id === 'exp' ? `<div class="rubric"><b>Rubrica do Word (seção 9)</b><ol start="0">${RUBRICA_EXP.map(t => `<li>${t}</li>`).join('')}</ol></div>` : `<div class="rubric"><b>Escala geral do Word:</b> ${ESCALA.map((t, i) => `${i} ${t.toLowerCase()}`).join(' · ')}. Rubrica específica deste pilar pendente (P1).</div>`;
  const mudou = Object.keys(ag.rasc).length || ag.peso != null;
  return `<div class="page-head"><div><div class="eyebrow">Ciclo de ${CICLO.nome} · prazo ${CICLO.prazo}</div><h1>Lançar avaliação</h1><p>Cada nota vira um registro com data, avaliador e evidência. Nada é sobrescrito: o histórico mostra a evolução.</p></div>
    <label class="field" for="av-atleta">Atleta<select id="av-atleta" data-aval-atleta="1">${meus.map(x => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.nome)} · ${classe(x).nome}${completo(x) ? '' : ' · pendente'}</option>`).join('')}</select></label></div>
  <div class="ptabs" role="group" aria-label="Pilares">${tabs}</div>
  <div class="grid-2">
    <section class="panel"><div class="panel-head"><h2>${p.nome}</h2><span class="muted">${PARAMS.pesos[p.id]} pts no score</span></div><div class="editor">${rub}${rows}</div>
      <div class="btn-row" style="margin-top:14px"><button class="btn primary" data-action="salvar" ${mudou ? '' : 'disabled'}>Salvar avaliação</button><button class="btn" data-action="descartar" ${mudou ? '' : 'disabled'}>Descartar</button></div></section>
    <aside class="panel preview"><div class="eyebrow">Prévia do cálculo</div>
      <h3 style="margin-top:8px">${esc(a.nome)}</h3>
      <dl class="kv" style="margin-top:10px"><dt>Nota do pilar</dt><dd class="num">${nAntes == null ? 'sem nota' : fmt1(nAntes)} → <b>${nDepois == null ? 'sem nota' : fmt1(nDepois)}</b></dd><dt>Score</dt><dd class="num">${fmt1(antes)} → <b>${fmt1(depois)}</b></dd><dt>Faixa</dt><dd>${faixaPill(depois)}</dd></dl>
      <div class="delta ${dif > 0.05 ? 'up' : dif < -0.05 ? 'down' : ''}" style="margin-top:10px">${dif >= 0 ? '+' : '−'}${fmt1(Math.abs(dif))}</div>
      <p class="muted" style="font-size:.82rem;margin:4px 0 0">Nota do pilar = média dos indicadores (proposta P2). Score = soma de (nota ÷ 5) × peso.</p></aside>
  </div>`;
}

function viewCadastro() {
  const cd = state.cad;
  const passos = ['Buscar no VelaID', 'Completar', 'Consentimento', 'Pronto'].map((t, i) => `<span class="${i === cd.passo ? 'on' : ''}">${i + 1}. ${t}</span>`).join('');
  let corpo;
  if (cd.passo === 0) corpo = `<form id="form-vela" class="stack" style="gap:12px"><label class="field" for="vela-in">Código VelaID<input id="vela-in" value="${esc(cd.codigo)}" placeholder="Ex.: MG-T15" autocomplete="off" style="font-family:var(--f-mono);max-width:14rem"></label>
      ${cd.erro ? `<div class="note">${cd.erro}</div>` : ''}
      <div class="btn-row"><button class="btn primary" type="submit">Buscar no VelaID</button></div>
      <p class="muted" style="font-size:.85rem;margin:0">Códigos de teste: <code>MG-T15</code> e <code>BA-T16</code> (adultos), <code>PE-T17</code> (17 anos). Os já cadastrados, como <code>SC-T01</code>, são recusados.</p></form>`;
  else if (cd.passo === 1) { const d = cd.dados; corpo = `<div class="grid-2"><div class="stack" style="gap:12px">
      <div class="note">Veio do VelaID. Não trazemos CPF nem endereço: só o que o score usa.</div>
      <dl class="kv"><dt>Nome</dt><dd>${esc(d.nome)}</dd><dt>Nascimento</dt><dd>${fmtDate(d.nasc)} · ${idadeDe(d.nasc)} anos</dd><dt>Categoria</dt><dd>${d.genero === 'F' ? 'Feminino' : 'Masculino'}</dd><dt>Clube</dt><dd>${esc(d.clube)}</dd><dt>Cidade</dt><dd>${esc(d.cidade)}/${d.uf}</dd><dt>ID World Sailing</dt><dd>${d.ws || '—'}</dd></dl></div>
      <div class="stack" style="gap:12px"><label class="field" for="cad-classe">Classe e função projetadas<select id="cad-classe" data-cad="classe"><option value="">Escolha</option>${CLASSES.map(c => `<option value="${c.id}" ${cd.classe === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}</select></label>
      <label class="field" for="cad-trein">Treinador(a) responsável<select id="cad-trein" data-cad="treinador">${TREINADORES.map(t => `<option ${cd.treinador === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="btn-row"><button class="btn primary" data-action="cad-termo" ${cd.classe ? '' : 'disabled'}>Enviar termo de consentimento</button><button class="btn" data-action="cad-voltar">Voltar</button></div></div></div>`; }
  else if (cd.passo === 2) corpo = `<div class="stack" style="gap:12px"><div class="note">Termo enviado para o e-mail cadastrado no VelaID em ${HOJE}. O atleta entra no ranking só depois do aceite.</div>
      <dl class="kv"><dt>Versão do termo</dt><dd>Piloto 18+ · v1</dd><dt>Atleta</dt><dd>${esc(cd.dados.nome)}</dd><dt>Status</dt><dd><span class="pill st-cond">Aguardando aceite</span></dd></dl>
      <div class="btn-row"><button class="btn primary" data-action="cad-aceite">Simular aceite do atleta</button></div></div>`;
  else corpo = `<div class="stack" style="gap:12px"><div class="note">${esc(cd.dados.nome)} entrou no piloto com 0% de preenchimento. O treinador já pode lançar a primeira avaliação.</div>
      <div class="btn-row"><a class="btn primary" href="#avaliar" data-action="avaliar-atleta" data-id="${cd.novoId}">Lançar primeira avaliação</a><button class="btn" data-action="cad-novo">Cadastrar outro</button></div></div>`;
  return `<div class="page-head"><div><div class="eyebrow">Gestor CBVela</div><h1>Cadastrar atleta</h1><p>O cadastro parte do VelaID: o sistema não pede CPF nem documento. No piloto, só entram atletas de 18 anos ou mais.</p></div></div>
    <div class="step">${passos}</div><section class="panel">${corpo}</section>`;
}

function viewPainel() {
  const a = ATH.find(x => x.id === ATLETA_LOGADO), s = score(a);
  const quem = p => { const t = new Set(p.ind.map(i => i[2])); return t.has('A') ? (t.has('T') ? 'Você responde · treinador pontua' : 'Você responde') : 'Treinador avalia'; };
  const pend = PILARES.filter(p => p.ind.some(i => (i[2] === 'A' || i[2] === 'R') && !a.respostas[i[0]]));
  const mods = PILARES.map(p => {
    const f = preench(a, p), atl = p.ind.filter(i => i[2] === 'A' || i[2] === 'R'), resp = atl.filter(i => a.respostas[i[0]]).length;
    const precisa = atl.length && resp < atl.length;
    const est = precisa ? '<span class="pill st-parcial">Sua vez</span>' : f.n < f.t ? '<span class="pill st-lock">Com o treinador</span>' : '<span class="pill st-apto">Completo</span>';
    const tag = atl.length ? 'button' : 'div';
    return `<${tag} class="module" ${atl.length ? `data-action="modulo" data-id="${p.id}"` : ''}><span class="mh"><b>${p.nome}</b>${est}</span><span class="who-fills">${quem(p)} · ${PARAMS.pesos[p.id]} pts</span><span class="track"><span style="width:${f.n / f.t * 100}%"></span></span><span class="who-fills num">${f.n} de ${f.t} indicadores${atl.length ? ` · ${resp} de ${atl.length} respostas suas` : ''}</span></${tag}>`;
  }).join('');
  let quest = '';
  if (state.modulo) {
    const p = PILARES.find(x => x.id === state.modulo), atl = p.ind.filter(i => i[2] === 'A' || i[2] === 'R');
    quest = `<section class="panel" id="questionario"><div class="panel-head"><h2>${p.nome}</h2><button class="btn" data-action="modulo-fechar">Fechar</button></div>
      ${atl.map(([iid]) => { const q = PERGUNTAS[iid]; return `<div class="q"><b>${q[0]}</b>${iid === 'amb_historico_familiar' ? '<span class="muted" style="font-size:.82rem">Fica registrado, mas não entra na sua nota.</span>' : ''}<div class="opts">${q[1].map(o => `<button data-action="responder" data-ind="${iid}" data-resp="${esc(o[0])}" aria-pressed="${a.respostas[iid] === o[0]}">${o[0]}</button>`).join('')}</div></div>`; }).join('')}
      <p class="muted" style="font-size:.82rem;margin:8px 0 0">Sua resposta vira uma nota sugerida. O treinador confirma antes de valer no ranking.</p></section>`;
  }
  return `<div class="page-head"><div><div class="eyebrow">Ciclo de ${CICLO.nome} · prazo ${CICLO.prazo}</div><h1>Olá, ${a.nome.split(' ')[0]}</h1><p>Seu score é montado em 9 módulos. Alguns você responde; os outros seu treinador avalia.</p></div>
    <div class="bigscore"><div class="val">${fmt1(s)}</div><div><div class="of">/100</div>${faixaPill(s)}</div></div></div>
  <div class="stack">
    ${pend.length ? `<div class="note">Lembrete enviado por e-mail em 03/11: faltam suas respostas em ${pend.map(p => p.curto).join(' e ')}. Prazo: ${CICLO.prazo}.</div>` : `<div class="note">Suas respostas deste ciclo estão completas. Obrigado!</div>`}
    <div class="modules">${mods}</div>
    ${quest}
    <section class="panel"><div class="panel-head"><h2>Seus dados e consentimento</h2><span class="muted" style="font-size:.85rem">Termo do piloto 18+ · aceito em 14/10/2026</span></div>
      <label class="switch" for="c-ibvar"><span>Compartilhar meu score e meus gates com o IBVAR<br><span class="muted" style="font-size:.82rem">Sem isso, você entra só nos números agregados do painel de investimento.</span></span><input type="checkbox" id="c-ibvar" data-consent="ibvar" ${a.consentIbvar ? 'checked' : ''}></label>
      <div class="switch"><span>Peso, perfil mental e finanças<br><span class="muted" style="font-size:.82rem">Sempre restritos a você, seu treinador e o gestor da CBVela.</span></span><span class="pill st-lock">Restrito</span></div>
      <div class="btn-row" style="margin-top:10px"><a class="btn" href="#atleta-${a.id}">Ver minha ficha</a></div></section>
  </div>`;
}

function viewInvest() {
  const P = state.perfil, scores = ATH.map(a => ({ a, s: score(a), g: gates(a) }));
  const media = scores.reduce((t, x) => t + x.s, 0) / scores.length;
  const aptos = scores.filter(x => statusFinal(x.g) === 'apto').length;
  const depend = scores.filter(x => ['C', 'D'].includes(x.a.fin.perfil)).length;
  const funil = FAIXAS.map(f => ({ f, n: scores.filter(x => faixa(x.s) === f).length })), maxF = Math.max(...funil.map(x => x.n), 1);
  const gateDist = GATE_NOMES.map((nm, i) => { const c = { apto: 0, cond: 0, alerta: 0 }; scores.forEach(x => c[x.g[i][0]]++); return { nm, c }; });
  const pil = PILARES.map(p => { const v = ATH.map(a => notaPilar(a, p)).filter(x => x != null); return { p, m: v.reduce((t, x) => t + x, 0) / v.length }; });
  const alvo = scores.filter(x => x.s >= 75 && statusFinal(x.g) !== 'nao' && ['C', 'D'].includes(x.a.fin.perfil)).sort((x, y) => y.s - x.s);
  const nome = a => (P === 'ibvar' && !a.consentIbvar) ? '<span class="muted">Atleta sem consentimento</span>' : `<a href="#atleta-${a.id}">${esc(a.nome)}</a>`;
  return `<div class="page-head"><div><div class="eyebrow">Piloto 18+ · ciclo de ${CICLO.nome}</div><h1>Painel de investimento</h1><p>Onde o recurso rende mais: talento, gates e dependência de apoio lado a lado. A visão individual só aparece com consentimento do atleta.</p></div></div>
  <div class="kpis"><div class="kpi"><div class="v">${ATH.length}</div><div class="l">atletas no piloto</div></div><div class="kpi"><div class="v">${fmt1(media)}</div><div class="l">score médio</div></div><div class="kpi"><div class="v">${aptos}</div><div class="l">aptos nos 4 gates</div></div><div class="kpi"><div class="v">${depend}</div><div class="l">dependem de apoio (perfil C ou D)</div></div></div>
  <div class="grid-2">
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Onde investir</h2><span class="muted" style="font-size:.85rem">Score 75+, gates não bloqueados e perfil C ou D</span></div>
        <div class="table-scroll"><table class="data"><thead><tr><th>Atleta</th><th>Classe</th><th class="r">Score</th><th>Gates</th><th>Suporte</th><th class="r">Assegurado</th></tr></thead><tbody>
        ${alvo.map(x => `<tr><td>${nome(x.a)}</td><td>${classe(x.a).nome}</td><td class="r"><b>${fmt1(x.s)}</b></td><td><span class="pill st-${statusFinal(x.g)}">${STATUS_TXT[statusFinal(x.g)]}</span></td><td>${x.a.fin.perfil}</td><td class="r">${mesesAssegurados(x.a)} meses</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhum atleta nesse recorte.</td></tr>'}
        </tbody></table></div><p class="muted" style="font-size:.82rem;margin:10px 0 0">Alto potencial com campanha dependente de apoio: é aqui que o investimento muda a trajetória.</p></section>
      <section class="panel"><div class="panel-head"><h2>Gates aos 18</h2><span class="muted" style="font-size:.85rem">${ATH.length} atletas</span></div>
        <div class="hbars">${gateDist.map((x, i) => `<div class="hbar"><span>G${i + 1} ${x.nm}</span><span class="bar" role="img" aria-label="${x.c.apto} aptos, ${x.c.cond} condicionais, ${x.c.alerta} em alerta"><span class="seg-good" style="width:${x.c.apto / ATH.length * 100}%"></span><span class="seg-warn" style="width:${x.c.cond / ATH.length * 100}%"></span><span class="seg-bad" style="width:${x.c.alerta / ATH.length * 100}%"></span></span><span class="n">${x.c.apto}</span></div>`).join('')}</div>
        <div class="legend"><span><i class="seg-good"></i>Apto</span><span><i class="seg-warn"></i>Condicional</span><span><i class="seg-bad"></i>Sinal de alerta</span><span>Número = aptos</span></div></section>
    </div>
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Funil por faixa de score</h2></div>
        <div class="hbars">${funil.map(x => `<div class="hbar"><span>${x.f.nome}</span><span class="bar"><span class="seg-sea" style="width:${x.n / maxF * 100}%;opacity:${x.f.cls === 'f1' ? 1 : x.f.cls === 'f2' ? 0.75 : x.f.cls === 'f3' ? 0.5 : 0.3}"></span></span><span class="n">${x.n}</span></div>`).join('')}</div></section>
      <section class="panel"><div class="panel-head"><h2>Média por pilar</h2><span class="muted" style="font-size:.85rem">nota de 0 a 5</span></div>
        <div class="hbars">${pil.sort((x, y) => x.m - y.m).map(x => `<div class="hbar"><span>${x.p.curto}</span><span class="bar"><span class="${x.m < 3.5 ? 'seg-warn' : 'seg-sea'}" style="width:${x.m / 5 * 100}%"></span></span><span class="n">${fmt1(x.m)}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:.82rem;margin:10px 0 0">Pilares abaixo de 3,5 em laranja: apontam onde o programa como um todo precisa de investimento.</p></section>
    </div>
  </div>`;
}

function viewParametros() {
  const pr = state.pesosRasc || { ...PARAMS.pesos }, soma = Object.values(pr).reduce((t, v) => t + (Number(v) || 0), 0);
  return `<div class="page-head"><div><div class="eyebrow">Gestor CBVela</div><h1>Parâmetros</h1><p>Regras da metodologia ficam aqui, não no código. Mudou um peso, o ranking inteiro é recalculado.</p></div></div>
  <div class="grid-2">
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Pesos dos pilares</h2><span class="num ${soma === 100 ? '' : 'down'}"><b>${soma}</b> de 100 pts</span></div>
        <div class="pesos">${PILARES.map(p => `<label class="field" for="peso-${p.id}">${p.curto}<input id="peso-${p.id}" type="number" min="0" max="100" step="1" value="${pr[p.id]}" data-pesorasc="${p.id}"></label>`).join('')}</div>
        <div class="btn-row" style="margin-top:14px"><button class="btn primary" data-action="aplicar-pesos" ${soma === 100 ? '' : 'disabled'}>Aplicar e recalcular</button><button class="btn" data-action="restaurar-pesos">Voltar aos pesos do Word</button></div>
        ${soma !== 100 ? '<p class="muted" style="font-size:.82rem;margin:8px 0 0">A soma precisa dar 100 para aplicar.</p>' : ''}</section>
      <section class="panel"><div class="panel-head"><h2>Faixas de resultado</h2></div><div class="stack" style="gap:8px">${FAIXAS.map((f, i) => `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span>${faixaPill(f.min + 1)}</span><span class="num muted">${i === 0 ? '85 a 100' : i === 1 ? '75 a 84' : i === 2 ? '65 a 74' : 'abaixo de 65'}</span></div>`).join('')}</div></section>
      <section class="panel"><div class="panel-head"><h2>Regras provisórias deste protótipo</h2></div><ul style="margin:0;padding-left:1.1rem;display:grid;gap:6px;font-size:.9rem">
        <li><b>P2</b> · nota do pilar = média dos indicadores.</li>
        <li><b>P3</b> · peso vira nota pela distância da média da classe: até meia faixa = 5; fora da faixa cai até 0.</li>
        <li><b>P5</b> · histórico familiar fica registrado e não pontua.</li>
        <li><b>P7</b> · um sinal de alerta deixa o atleta como não prioritário; um condicional, como condicional.</li>
        <li><b>P8</b> · perfil de suporte informado pelo gestor.</li></ul></section>
    </div>
    <section class="panel"><div class="panel-head"><h2>Class Fit · faixas de peso</h2><span class="muted" style="font-size:.85rem">kg · Word, seção 5</span></div>
      <div class="table-scroll"><table class="data"><thead><tr><th>Classe e posição</th><th class="r">Mín.</th><th class="r">Média</th><th class="r">Máx.</th></tr></thead><tbody>${CLASSES.map(c => `<tr><td>${c.nome}</td><td class="r">${fmt1(c.min)}</td><td class="r">${fmt1(c.med)}</td><td class="r">${fmt1(c.max)}</td></tr>`).join('')}</tbody></table></div></section>
  </div>`;
}

/* ---------- roteamento ---------- */
const $app = root.querySelector('#app'), $tabs = document.getElementById('tabs'), $perfil = document.getElementById('perfil');
function rota() { const h = location.hash.slice(1); return h || PERFIS[state.perfil].inicio; }
function render() {
  const r = rota(), P = PERFIS[state.perfil];
  $perfil.value = state.perfil;
  $tabs.innerHTML = P.nav.map(([id, t]) => `<a href="#${id}" ${r === id || (id === 'ranking' && r.startsWith('atleta-') && state.perfil !== 'atleta') ? 'aria-current="page"' : ''}><i class="ph ph-${NAV_ICON[id.startsWith('atleta-') ? 'ficha' : id] || 'circle'}" aria-hidden="true"></i>${t}</a>`).join('');
  let html;
  if (!podeVer(r)) html = semAcesso(r.startsWith('atleta-') ? 'Este perfil não vê a ficha deste atleta. Treinador vê só os próprios atletas; o IBVAR vê só quem consentiu.' : 'Esta tela não faz parte do perfil escolhido.');
  else if (r === 'ranking') html = viewRanking();
  else if (r.startsWith('atleta-')) html = viewFicha(r.slice(7));
  else if (r === 'avaliar') html = viewAvaliar();
  else if (r === 'cadastro') html = viewCadastro();
  else if (r === 'painel') html = viewPainel();
  else if (r === 'investimento') html = viewInvest();
  else if (r === 'parametros') html = viewParametros();
  else html = semAcesso('Tela não encontrada.');
  $app.innerHTML = html + `<footer>Protótipo navegável com dados fictícios · metodologia do Word “Sistema de Talent Identification & Scouting” (29/09/2026) · VelaID e Ranking CBVela simulados.</footer>`;
  if (state.ultimaRota !== r) { window.scrollTo(0, 0); state.ultimaRota = r; }
}
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }
window.addEventListener('hashchange', render);
const cleanup = () => window.removeEventListener('hashchange', render);
$perfil.addEventListener('change', () => { state.perfil = $perfil.value; try { localStorage.setItem('scout-perfil', state.perfil); } catch (e) {} state.modulo = null; const ini = PERFIS[state.perfil].inicio; if (location.hash.slice(1) === ini) render(); else location.hash = ini; });

$app.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const act = el.dataset.action, ag = state.aval, cd = state.cad;
  if (act === 'toggle') { state.abertos[el.dataset.key] = !state.abertos[el.dataset.key]; render(); }
  else if (act === 'pilar') { ag.pilar = el.dataset.id; ag.rasc = {}; ag.ev = {}; ag.peso = null; render(); }
  else if (act === 'nota') { ag.rasc[el.dataset.ind] = Number(el.dataset.v); render(); }
  else if (act === 'descartar') { ag.rasc = {}; ag.ev = {}; ag.peso = null; render(); }
  else if (act === 'salvar') {
    const a = ATH.find(x => x.id === ag.atleta), by = state.perfil === 'gestor' ? 'Gestor CBVela' : PERFIS.treinador.nome;
    Object.entries(ag.rasc).forEach(([k, v]) => { a.notas[k] = { v, by: a.respostas[k] ? `Resposta do atleta · nota de ${by}` : by, at: HOJE, ev: ag.ev[k] || EVID[ag.pilar] }; });
    if (ag.peso != null) { a.peso = ag.peso; a.notas.cf_peso_kg = { v: notaPeso(cfDist(a).rel), by, at: HOJE, ev: `Pesagem: ${fmt1(a.peso)} kg` }; }
    ag.rasc = {}; ag.ev = {}; ag.peso = null; render(); toast(`Avaliação salva · score de ${a.nome.split(' ')[0]}: ${fmt1(score(a))}`);
  }
  else if (act === 'avaliar-atleta') { ag.atleta = el.dataset.id; ag.rasc = {}; ag.ev = {}; ag.peso = null; const nova = ATH.find(x => x.id === el.dataset.id); if (nova) { const p = PILARES.find(p => preench(nova, p).n < preench(nova, p).t); ag.pilar = p ? p.id : 'tec'; } }
  else if (act === 'revisao') { toast('Pedido de revisão enviado ao gestor da CBVela'); }
  else if (act === 'modulo') { state.modulo = el.dataset.id; render(); const q = document.getElementById('questionario'); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  else if (act === 'modulo-fechar') { state.modulo = null; render(); }
  else if (act === 'responder') {
    const a = ATH.find(x => x.id === ATLETA_LOGADO), iid = el.dataset.ind, resp = el.dataset.resp, q = PERGUNTAS[iid], op = q[1].find(o => o[0] === resp);
    a.respostas[iid] = resp;
    if (op && op[1] != null) a.notas[iid] = { v: op[1], by: 'Resposta do atleta · nota sugerida, aguardando treinador', at: HOJE, ev: 'Questionário do atleta' };
    render(); toast('Resposta salva');
  }
  else if (act === 'cad-voltar') { cd.passo = 0; render(); }
  else if (act === 'cad-termo') { cd.passo = 2; render(); toast('Termo enviado por e-mail'); }
  else if (act === 'cad-aceite') {
    const d = cd.dados, id = 'a' + (ATH.length + 1);
    const a = { id, nome: d.nome, genero: d.genero, nasc: d.nasc, classe: cd.classe, clube: d.clube, cidade: d.cidade, uf: d.uf, vela: cd.codigo, sail: 'BRA —', treinador: cd.treinador, peso: classe({ classe: cd.classe }).med, altura: 175, consentIbvar: true, email: '', notas: {}, respostas: {}, gOverride: [null, null, null, null], fin: { perfil: 'C' }, resultados: [], hist: [{ c: 'Set', s: 0 }, { c: 'Out', s: 0 }] };
    PILARES.forEach(p => p.ind.forEach(i => { a.notas[i[0]] = { v: null }; }));
    ATH.push(a); cd.novoId = id; cd.passo = 3; render(); toast(`${d.nome} entrou no piloto`);
  }
  else if (act === 'cad-novo') { Object.assign(cd, { passo: 0, codigo: '', dados: null, erro: '', classe: '' }); render(); }
  else if (act === 'aplicar-pesos') { Object.assign(PARAMS.pesos, Object.fromEntries(Object.entries(state.pesosRasc || PARAMS.pesos).map(([k, v]) => [k, Number(v)]))); state.pesosRasc = null; render(); toast('Pesos aplicados · ranking recalculado'); }
  else if (act === 'restaurar-pesos') { Object.assign(PARAMS.pesos, PESOS_PADRAO); state.pesosRasc = null; render(); toast('Pesos do Word restaurados'); }
});
$app.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.filter) { state.filtros[t.dataset.filter] = t.value; render(); }
  else if (t.dataset.ordem) { state.ordem = t.value; render(); }
  else if (t.dataset.gate) { const a = ATH.find(x => x.id === t.dataset.atleta), i = Number(t.dataset.gate), auto = gatesAuto(a)[i][0]; a.gOverride[i] = t.value === auto ? null : t.value; render(); toast(`G${i + 1} atualizado pelo gestor`); }
  else if (t.dataset.avalAtleta) { Object.assign(state.aval, { atleta: t.value, rasc: {}, ev: {}, peso: null }); render(); }
  else if (t.dataset.peso) { const v = parseFloat(t.value); if (!isNaN(v)) { state.aval.peso = v; render(); } }
  else if (t.dataset.consent) { const a = ATH.find(x => x.id === ATLETA_LOGADO); a.consentIbvar = t.checked; render(); toast(t.checked ? 'IBVAR passa a ver seu score e seus gates' : 'IBVAR deixa de ver seus dados individuais'); }
  else if (t.dataset.cad) { state.cad[t.dataset.cad] = t.value; render(); }
});
$app.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.ev) state.aval.ev[t.dataset.ev] = t.value;
  else if (t.dataset.pesorasc) { state.pesosRasc = { ...(state.pesosRasc || PARAMS.pesos), [t.dataset.pesorasc]: t.value }; const pos = t.selectionStart; const id = t.id; render(); const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} } }
  else if (t.id === 'vela-in') state.cad.codigo = t.value;
});
$app.addEventListener('submit', e => {
  if (e.target.id !== 'form-vela') return; e.preventDefault();
  const cd = state.cad, cod = (cd.codigo || '').trim().toUpperCase(); cd.codigo = cod;
  if (ATH.find(a => a.vela === cod)) cd.erro = `O código ${esc(cod)} já está no piloto.`;
  else if (!VELAID_MOCK[cod]) cd.erro = `Nenhum atleta com o código ${esc(cod) || 'informado'} no VelaID.`;
  else if (idadeDe(VELAID_MOCK[cod].nasc) < 18) cd.erro = `Cadastro bloqueado: ${esc(VELAID_MOCK[cod].nome)} tem ${idadeDe(VELAID_MOCK[cod].nasc)} anos. O piloto aceita só 18+; a versão para menores, com responsável, está em desenho.`;
  else { cd.erro = ''; cd.dados = VELAID_MOCK[cod]; cd.passo = 1; }
  render();
});
render();
return { visiveis: () => ATH.filter(doUsuario).map(a => ({ id: a.id, nome: a.nome, classe: classe(a).nome, score: score(a), faixa: faixa(score(a)).nome, status: STATUS_TXT[statusFinal(gates(a))] })), cleanup, PARAMS, PESOS_PADRAO, ATH, score, faixa, notaPeso, gatesAuto, gates, idadeDe, cfDist };
}

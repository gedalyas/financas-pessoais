// /server/quotes.js — Finnhub (ações), CoinGecko (cripto), PTAX (USD/BRL), cache 60s
const express = require('express');
const router = express.Router();

const FINNHUB_TOKEN = process.env.FINNHUB_TOKEN; // deve vir do /server/.env

/* ============================ Helpers ============================ */
function nowISO() { return new Date().toISOString(); }

async function fetchJSON(url, headers = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

/* ============================ Cache simples (TTL 60s) ============================ */
const CACHE_TTL_MS = 60_000;
const cache = new Map(); // key -> { at: epochMs, value }

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return hit.value;
}
function cacheSet(key, value) { cache.set(key, { at: Date.now(), value }); }

/* ============================ Sanidade do token (log de debug) ============================ */
// Você pode comentar esse log após confirmar:
console.log(
  '[quotes] FINNHUB_TOKEN prefix/len:',
  (FINNHUB_TOKEN || '').slice(0, 8),
  (FINNHUB_TOKEN || '').length
);

/* ============================ FX: PTAX + fallback Finnhub ============================ */
async function getUSD_BRL_viaPTAX(dateISO = new Date().toISOString().slice(0,10)) {
  try {
    const j = await fetchJSON(
      'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarUltimo?$top=1&$format=json'
    );
    if (j?.value?.length) {
      const row = j.value[0];
      return { rate: +row.cotacaoVenda, asOf: row.dataHoraCotacao, source: 'ptax' };
    }
  } catch {}

  try {
    const urlDia =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
      `CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateISO}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`;
    const j = await fetchJSON(urlDia);
    if (j?.value?.length) {
      const row = j.value[0];
      return { rate: +row.cotacaoVenda, asOf: row.dataHoraCotacao, source: 'ptax' };
    }
  } catch {}

  return null;
}

async function getUSD_BRL_viaFinnhub() {
  if (!FINNHUB_TOKEN) throw new Error('FINNHUB_TOKEN não configurado');
  const url = `https://finnhub.io/api/v1/forex/rates?base=USD&token=${encodeURIComponent(FINNHUB_TOKEN)}`;
  console.log('[quotes] FH FX url >>>', url); // LOG de diagnóstico
  const j = await fetchJSON(url);
  const rate = j?.quote?.BRL ?? j?.rates?.BRL;
  if (rate == null) throw new Error('Finnhub forex sem BRL');
  return { rate: Number(rate), asOf: nowISO(), source: 'finnhub_fx' };
}

async function getUSD_BRL() {
  const key = 'FX:USD/BRL';
  const hit = cacheGet(key);
  if (hit) return hit;
  const ptax = await getUSD_BRL_viaPTAX();
  const fx = ptax || await getUSD_BRL_viaFinnhub();
  cacheSet(key, fx);
  return fx;
}

/* ============================ Ações via Finnhub ============================ */
/**
 * GET /api/v1/quote?symbol=SYMBOL&token=...
 * Retorna { c: atual, h, l, o, pc, t }
 * Doc: https://finnhub.io/docs/api/quote
 */
async function finnhubQuote(symbol) {
  if (!FINNHUB_TOKEN) throw new Error('FINNHUB_TOKEN não configurado');
  const key = `FH:${symbol.toUpperCase()}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(FINNHUB_TOKEN)}`;
  console.log('[quotes] FH QUOTE url >>>', url); // LOG de diagnóstico
  const q = await fetchJSON(url);

  if (q && q.c != null) {
    const asOf = q.t ? new Date(q.t * 1000).toISOString() : nowISO();
    const obj = {
      price: Number(q.c),
      currency: symbol.toUpperCase().endsWith('.SA') ? 'BRL' : 'USD', // .SA em BRL na prática
      asOf,
      source: 'finnhub',
      symbol: symbol.toUpperCase(),
    };
    cacheSet(key, obj);
    return obj;
  }
  throw new Error(`Finnhub sem preço para ${symbol}`);
}

/* ============================ Cripto via CoinGecko ============================ */
async function coingeckoSimplePrice(idsArr, vs = 'usd') {
  const key = `CG:${idsArr.join(',')}:${vs}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(idsArr.join(','))}&vs_currencies=${vs}`;
  const j = await fetchJSON(url);
  const map = {};
  for (const id of idsArr) {
    const p = j?.[id]?.[vs];
    if (p != null) {
      map[id] = { price: Number(p), currency: vs.toUpperCase(), asOf: nowISO(), source: 'coingecko', id };
    }
  }
  cacheSet(key, map);
  return map;
}

/* ============================ Conversão para BRL ============================ */
async function toBRL(amount, currency) {
  if (currency === 'BRL') return { priceBRL: amount, fx: 1, fxSource: 'native' };
  if (currency === 'USD') {
    const fx = await getUSD_BRL();
    return { priceBRL: amount * fx.rate, fx: fx.rate, fxSource: fx.source };
  }
  // Mantemos free/estável: suportamos BRL e USD.
  throw new Error(`Conversão ${currency}->BRL não suportada no modo free`);
}

/* ============================ Normalização ============================ */
async function normalizeItem(item) {
  if (item.provider === 'finnhub') {
    const sym = String(item.symbol || '').toUpperCase().trim();
    const base = await finnhubQuote(sym);
    const conv = await toBRL(base.price, base.currency);
    return {
      ...base,
      price_brl: +conv.priceBRL.toFixed(6),
      fx_to_brl: +conv.fx.toFixed(6),
      fx_source: conv.fxSource,
    };
  }

  if (item.provider === 'coingecko') {
    const id = String(item.id || '').toLowerCase().trim();
    const map = await coingeckoSimplePrice([id], 'usd'); // padroniza USD
    const base = map[id];
    if (!base || base.price == null) throw new Error(`CoinGecko sem preço para ${id}`);
    const conv = await toBRL(base.price, base.currency);
    return {
      ...base,
      price_brl: +conv.priceBRL.toFixed(6),
      fx_to_brl: +conv.fx.toFixed(6),
      fx_source: conv.fxSource,
    };
  }

  throw new Error('provider inválido (use "finnhub" para ações/ETFs/BDRs ou "coingecko" para cripto)');
}

/* ============================ Rota ============================ */
// GET /api/quotes?assets=[{"provider":"finnhub","symbol":"PETR4.SA"},{"provider":"coingecko","id":"bitcoin"}]
router.get('/', async (req, res) => {
  try {
    const arr = req.query.assets ? JSON.parse(req.query.assets) : null;
    if (!Array.isArray(arr) || arr.length === 0) {
      return res.status(400).json({ error: 'Param ?assets=[...] obrigatório' });
    }

    const results = [];
    for (const item of arr) {
      try {
        results.push(await normalizeItem(item));
      } catch (e) {
        results.push({ error: e.message });
      }
    }
    res.json({ results, at: nowISO() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;

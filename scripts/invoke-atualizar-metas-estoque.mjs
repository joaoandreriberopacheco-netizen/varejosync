#!/usr/bin/env node
/**
 * Dispara o job atualizarMetasEstoque na Base44 (admin).
 * Atualiza estoque_minimo / estoque_ideal a partir de vendas 90d (sem outliers).
 * Requer VITE_BASE44_APP_ID + BASE44_ACCESS_TOKEN ou BASE44_API_KEY nos secrets.
 */
import { requireFlareClient } from './flare-sdk.mjs';

const base44 = requireFlareClient();
const resp = await base44.functions.invoke('atualizarMetasEstoque', {});
const data = resp?.data ?? resp;
console.log(JSON.stringify(data, null, 2));

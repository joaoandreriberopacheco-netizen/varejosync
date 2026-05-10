#!/usr/bin/env node
/**
 * Retificação única do embarque 5R8B3-A (movimentos de stock em falta na Base44).
 *
 * PowerShell (token = localStorage base44_access_token no browser em p38.base44.app):
 *   $env:VITE_BASE44_APP_ID = "<app_id>"
 *   $env:BASE44_ACCESS_TOKEN = "<token>"
 *   npm run retificar:5r8b3
 */

import { requireFlareClient } from './flare-sdk.mjs';
import { retificarEmbarque5r8b3UmaVez } from '../src/lib/oneOffRetificarEmbarque5r8b3.js';

const base44 = requireFlareClient();

const result = await retificarEmbarque5r8b3UmaVez(base44);
console.log(JSON.stringify(result, null, 2));
if (result.aviso) console.warn('[aviso]', result.aviso);
process.exit(result.ok ? 0 : 1);

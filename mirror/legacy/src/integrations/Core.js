import { p38 } from '@/integrations/p38';

/** @param {Record<string, unknown>} payload */
export function UploadFile(payload) {
  return p38.integrations.Core.UploadFile(payload);
}

/** @param {Record<string, unknown>} payload */
export function ExtractDataFromUploadedFile(payload) {
  return p38.integrations.Core.ExtractDataFromUploadedFile(payload);
}

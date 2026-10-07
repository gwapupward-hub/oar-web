'use client';

import { getCompiledTransactionMessageDecoder, getTransactionDecoder } from '@solana/kit';
import { REGISTRATION_PROGRAMS, assertRegistrationInstructions } from '@open-app-registry/sdk/register';

/** POST to the wizard's API; throws its error message. */
export async function post<T>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/register/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}

export const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
export const bytesToBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));

// Names in REGISTRATION_PROGRAMS order: OAR registry, Program Metadata, System, Compute Budget.
const PROGRAM_NAMES = ['OAR registry', 'Program Metadata', 'System Program', 'Compute Budget'];
export const programName = (address: string) => PROGRAM_NAMES[REGISTRATION_PROGRAMS.indexOf(address as never)] ?? address;

export interface DecodedTransaction {
  feePayer: string;
  programs: string[];
  instructionCount: number;
}

/**
 * Read a transaction in the browser, independently of the server that built it: who pays, and which programs it
 * calls. Throws unless every program is part of OAR registration and `expectedPayer` pays.
 */
export function inspectTransaction(wire: Uint8Array, expectedPayer: string): DecodedTransaction {
  const tx = getTransactionDecoder().decode(wire);
  const message = getCompiledTransactionMessageDecoder().decode(tx.messageBytes);
  if (message.version !== 'legacy' && message.version !== 0) throw new Error('Unexpected transaction version.');
  if ('addressTableLookups' in message && (message.addressTableLookups?.length ?? 0) > 0) throw new Error('Unexpected address lookup tables.');
  const programs = message.instructions.map(ix => message.staticAccounts[ix.programAddressIndex]);
  assertRegistrationInstructions(programs.map(programAddress => ({ programAddress })));
  const feePayer = message.staticAccounts[0];
  if (feePayer !== expectedPayer) throw new Error(`The transaction is paid by ${feePayer}, not the connected wallet.`);
  return { feePayer, programs: [...new Set(programs)], instructionCount: programs.length };
}

export function download(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

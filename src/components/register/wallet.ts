'use client';

import { useEffect, useState } from 'react';
import { getWallets } from '@wallet-standard/app';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import { StandardConnect, type StandardConnectFeature } from '@wallet-standard/features';
import { SolanaSignTransaction, type SolanaSignTransactionFeature } from '@solana/wallet-standard-features';

export const CHAIN = 'solana:devnet' as const;

/** Wallets that can connect and sign devnet transactions. Discovery follows the Wallet Standard; no adapters. */
export function usableWallets(): Wallet[] {
  return getWallets()
    .get()
    .filter(w => StandardConnect in w.features && SolanaSignTransaction in w.features && w.chains.includes(CHAIN));
}

export function useWallets(): Wallet[] {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  useEffect(() => {
    const registry = getWallets();
    const refresh = () => setWallets(usableWallets());
    refresh();
    const offRegister = registry.on('register', refresh);
    const offUnregister = registry.on('unregister', refresh);
    return () => {
      offRegister();
      offUnregister();
    };
  }, []);
  return wallets;
}

export async function connect(wallet: Wallet): Promise<WalletAccount> {
  const { accounts } = await (wallet.features as StandardConnectFeature)[StandardConnect].connect();
  const account = accounts.find(a => a.chains.includes(CHAIN)) ?? accounts[0];
  if (!account) throw new Error(`${wallet.name} did not share an account.`);
  return account;
}

/** Ask the wallet to sign one serialized transaction on devnet; returns the signed wire bytes. */
export async function signTransaction(wallet: Wallet, account: WalletAccount, wire: Uint8Array): Promise<Uint8Array> {
  const feature = (wallet.features as SolanaSignTransactionFeature)[SolanaSignTransaction];
  const [output] = await feature.signTransaction({ account, transaction: wire, chain: CHAIN });
  if (!output) throw new Error(`${wallet.name} returned no signed transaction.`);
  return output.signedTransaction;
}

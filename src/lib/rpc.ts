import 'server-only';
import { createDefaultRpcTransport, createSolanaRpcFromTransport, type RpcTransport } from '@solana/kit';
import { RPC_TIMEOUT_MS, RPC_URL } from './config';

// Every RPC call is bounded: a slow or hung provider fails the request instead of holding it open.
const baseTransport = createDefaultRpcTransport({ url: RPC_URL });
const transport: RpcTransport = config => baseTransport({ ...config, signal: config.signal ?? AbortSignal.timeout(RPC_TIMEOUT_MS) });

/** The explorer's only RPC client. Its URL may carry a provider key and never leaves the server. */
export const rpc = createSolanaRpcFromTransport(transport);
export type ServerRpc = typeof rpc;

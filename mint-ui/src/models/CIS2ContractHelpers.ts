import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { Buffer } from "buffer/";

import {
    ContractAddress,
    AccountTransactionType,
    UpdateContractPayload,
    serializeUpdateContractParameters,
    ModuleReference,
    InitContractPayload,
    TransactionStatusEnum,
    TransactionSummary,
    CcdAmount,
} from "@concordium/web-sdk";


/**
 * Waits for the input transaction to Finalize.
 * @param provider Wallet Provider.
 * @param txnHash Hash of Transaction.
 * @returns Transaction outcomes.
 */
export function waitForTransaction(
    provider: WalletApi,
    txnHash: string
): Promise<Record<string, TransactionSummary> | undefined> {
    return new Promise((res, rej) => {
        _wait(provider, txnHash, res, rej);
    });
}

export function ensureValidOutcome(
    outcomes?: Record<string, TransactionSummary>
): Record<string, TransactionSummary> {
    if (!outcomes) {
        throw Error("Null Outcome");
    }

    let successTxnSummary = Object.keys(outcomes)
        .map((k) => outcomes[k])
        .find((s) => s.result.outcome === "success");

    if (!successTxnSummary) {
        let failures = Object.keys(outcomes)
            .map((k) => outcomes[k])
            .filter((s) => s.result.outcome === "reject")
            .map((s) => (s.result as any).rejectReason.tag)
            .join(",");
        throw Error(`Transaction failed, reasons: ${failures}`);
    }

    return outcomes;
}


/**
 * Uses Contract Schema to serialize the contract parameters.
 * @param contractName Name of the Contract.
 * @param schema  Buffer of Contract Schema.
 * @param methodName Contract method name.
 * @param params Contract Method params in JSON.
 * @returns Serialize buffer of the input params.
 */
export function serializeParams<T>(
    contractName: string,
    schema: Buffer,
    methodName: string,
    params: T
): Buffer {
    return serializeUpdateContractParameters(
        contractName,
        methodName,
        params,
        schema
    );
}


export function _wait(
    provider: WalletApi,
    txnHash: string,
    res: (p: Record<string, TransactionSummary> | undefined) => void,
    rej: (reason: any) => void
) {
    setTimeout(() => {
        provider
            .getJsonRpcClient()
            .getTransactionStatus(txnHash)
            .then((txnStatus) => {
                if (!txnStatus) {
                    return rej("Transaction Status is null");
                }

                console.info(`txn : ${txnHash}, status: ${txnStatus?.status}`);
                if (txnStatus?.status === TransactionStatusEnum.Finalized) {
                    return res(txnStatus.outcomes);
                }

                _wait(provider, txnHash, res, rej);
            })
            .catch((err) => rej(err));
    }, 1000);
}

export function parseContractAddress(
    outcomes: Record<string, TransactionSummary>
): ContractAddress {
    for (const blockHash in outcomes) {
        const res = outcomes[blockHash];

        if (res.result.outcome === "success") {
            for (const event of res.result.events) {
                if (event.tag === "ContractInitialized") {
                    return {
                        index: toBigInt((event as any).address.index),
                        subindex: toBigInt((event as any).address.subindex),
                    };
                }
            }
        }
    }

    throw Error(`unable to parse Contract Address from input outcomes`);
}

export function toBigInt(num: BigInt | number): bigint {
    return BigInt(num.toString(10));
}

const MICRO_CCD_IN_CCD = 1000000;
export function toCcd(ccdAmount: bigint): CcdAmount {
    return new CcdAmount(ccdAmount * BigInt(MICRO_CCD_IN_CCD));
}

import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { Buffer } from "buffer/";
import {
    waitForTransaction,
    ensureValidOutcome,
    serializeParams,
    _wait,
    parseContractAddress,
    toBigInt,
    toCcd
} from "./CIS2ContractHelpers";

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

export interface Cis2ContractInfo {
    schemaBuffer: Buffer;
    contractName: string;
    moduleRef: ModuleReference;
    tokenIdByteSize: number;
}

/**
 * Initializes a Smart Contract.
 * @param provider Wallet Provider.
 * @param moduleRef Contract Module Reference. Hash of the Deployed Contract Module.
 * @param schemaBuffer Buffer of Contract Schema.
 * @param contractName Name of the Contract.
 * @param account Account to Initialize the contract with.
 * @param maxContractExecutionEnergy Maximum energy allowed to execute.
 * @param ccdAmount CCD Amount to initialize the contract with.
 * @returns Contract Address.
 */

export async function initContract<T>(provider: WalletApi,
    contractInfo: Cis2ContractInfo,
    account: string,
    params?: T,
    serializedParams?: Buffer,
    maxContractExecutionEnergy = BigInt(9999),
    ccdAmount = BigInt(0)): Promise<ContractAddress> {

    const { moduleRef, schemaBuffer, contractName } = contractInfo;
    let txnHash = await provider.sendTransaction(
        account,
        AccountTransactionType.InitContract,
        {
            amount: toCcd(ccdAmount),
            moduleRef,
            initName: contractName,
            param: serializedParams || Buffer.from([]),
            maxContractExecutionEnergy,
        } as InitContractPayload,
        params || {},
        schemaBuffer.toString("base64"),
        2
    );
    let outcomes = await waitForTransaction(provider, txnHash);
    outcomes = ensureValidOutcome(outcomes);
    return parseContractAddress(outcomes);
}

/**
 * Updates a Smart Contract.
 * @param provider Wallet Provider.
 * @param contractName Name of the Contract.
 * @param schema Buffer of Contract Schema.
 * @param paramJson Parameters to call the Contract Method with.
 * @param account  Account to Update the contract with.
 * @param contractAddress Contract Address.
 * @param methodName Contract Method name to Call.
 * @param maxContractExecutionEnergy Maximum energy allowed to execute.
 * @param amount CCD Amount to update the contract with.
 * @returns Update contract Outcomes.
 */

export async function updateContract<T>(
    provider: WalletApi,
    contractInfo: Cis2ContractInfo,
    paramJson: T,
    account: string,
    contractAddress: { index: number; subindex: number },
    methodName: string,
    maxContractExecutionEnergy: bigint = BigInt(9999),
    amount: bigint = BigInt(0)
): Promise<Record<string, TransactionSummary>> {
    const { schemaBuffer, contractName } = contractInfo;
    const parameter = serializeParams(
        contractName,
        schemaBuffer,
        methodName,
        paramJson
    );
    let txnHash = await provider.sendTransaction(
        account,
        AccountTransactionType.Update,
        {
            maxContractExecutionEnergy,
            address: {
                index: BigInt(contractAddress.index),
                subindex: BigInt(contractAddress.subindex),
            },
            message: parameter,
            amount: toCcd(amount),
            receiveName: `${contractName}.${methodName}`,
        } as UpdateContractPayload,
        paramJson as any,
        schemaBuffer.toString("base64"),
        2 //Schema Version
    );

    let outcomes = await waitForTransaction(provider, txnHash);

    return ensureValidOutcome(outcomes);
}
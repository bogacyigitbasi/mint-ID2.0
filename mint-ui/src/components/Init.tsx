import { FormEvent, useState } from "react";
import { WalletApi } from '@concordium/browser-wallet-api-helpers';
// import { ContractAddress } from "@concordium/common-sdk";

import { Cis2ContractInfo } from "../models/CIS2ContractClient";
import { ContractAddress, serializeInitContractParameters } from '@concordium/web-sdk';
import * as connClient from '../models/CIS2ContractClient';

import { Typography, Button, Stack, Container } from '@mui/material';

export default function Cis2Init(props: {
    provider: WalletApi;
    account: string;
    contractInfo: Cis2ContractInfo;
    verifyKey: string;
    onDone: (address: ContractAddress, contractInfo: Cis2ContractInfo) => void;
}) {
    const [state, setState] = useState({
        error: '',
        processing: false,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const initParams = {
            verify_key: props.verifyKey
        };
        const serializedParams = serializeInitContractParameters(props.contractInfo.contractName, initParams, props.contractInfo.schemaBuffer);
        setState({ ...state, processing: true });
        connClient
            .initContract(props.provider, props.contractInfo, props.account, initParams, serializedParams)
            .then((address) => {
                setState({ ...state, processing: false });
                props.onDone(address, props.contractInfo);
            })
            .catch((err: Error) => {
                setState({ ...state, processing: false, error: err.message });
            });
    }

    return (
        <Container sx={{ maxWidth: 'xl', pt: '10px' }}>
            <Stack component={'form'} spacing={2} onSubmit={submit}>
                {state.error && (
                    <Typography component="div" color="error" variant="body1">
                        {state.error}
                    </Typography>
                )}
                {state.processing && (
                    <Typography component="div" variant="body1">
                        Deploying..
                    </Typography>
                )}
                <Button variant="contained" disabled={state.processing} type="submit">
                    Deploy New
                </Button>
            </Stack>
        </Container>
    );
}

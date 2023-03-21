import { WalletApi } from '@concordium/browser-wallet-api-helpers';
import { Button } from '@mui/material';
import { getChallenge, getSignature, getStatement } from '../models/VerifierGetSignature';

export default function VerifierGetSignature(props: {
    provider: WalletApi;
    account: string;
    verifierUrl: string;
    disabled: boolean;
    onSign: (signature: string) => void;
}) {
    async function sign(e: React.MouseEvent) {
        e.preventDefault();
        var challenge = await getChallenge(props.verifierUrl, props.account);
        const statement = await getStatement(props.verifierUrl);
        const proof = await props.provider.requestIdProof(props.account, statement, challenge);
        const signature = await getSignature(props.verifierUrl, challenge, proof);
        props.onSign(signature.replaceAll('"', ''));
    }

    return (
        <Button type="button" variant="contained" disabled={props.disabled} fullWidth size="large" onClick={sign}>
            Get Signature
        </Button>
    );
}

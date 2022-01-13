import Web3 from 'web3';
import { HarmonyAddress, BN } from "@harmony-js/crypto"
import {abi} from "./staking-abi";
import { Unit } from "@harmony-js/utils"

export const processMetaMaskMessage = async (
    sendData,
    networkConfig,
    from
) => {
    debugger;

    const { type, fee, gasPrice: gasPriceData, validatorAddress, amount:amountData, amounts, toAddress } = sendData
    const { gasEstimate } = fee
    // const { chain_id, rpc_url } = networkConfig //TODO: switch chain

    const web3URL = window.ethereum ? window.ethereum : process.env.HMY_NODE_URL;
    const hmyWeb3 = new Web3(web3URL);

    const web3Contract = new hmyWeb3.eth.Contract(abi, "0x5ecf7797e73485fa883d1b9872a5b0e3d768e7dd");

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    console.log(Unit.Szabo(amountData || 0).toHex());

    const amount = Unit.Szabo(amountData || 0).toHex();

    let result;
    let error;

    const gas = 6721900;
    const gasPrice = Math.max(new BN(await hmyWeb3.eth.getGasPrice()).mul(new BN(1)).toNumber(), gasPriceData);

    try {
        switch (type) {
            case "MsgSend": {
                result = await hmyWeb3.eth
                    .sendTransaction({
                        from: accounts[0],
                        to: new HarmonyAddress(toAddress).checksum,
                        value: Unit.Szabo(amounts[0].amount).toWei(),
                        gasPrice,
                        gas,
                    })
                    .on('error', console.error)
                    .on('transactionHash', transactionHash => {
                        console.log(`Transaction is sending: ${transactionHash}`);
                    });
                break
            }
            case "MsgDelegate": {
                result = await web3Contract.methods.delegate(new HarmonyAddress(validatorAddress).checksum, amount).send({
                    from: accounts[0],
                    // value: amount,
                    gasPrice,
                    gas,
                });
                break
            }
            case "MsgUndelegate": {
                result = await web3Contract.methods.undelegate(new HarmonyAddress(validatorAddress).checksum, amount).send({
                    from: accounts[0],
                    // value: amount,
                    gasPrice,
                    gas,
                });

                break
            }
            case "MsgWithdrawDelegationReward": {
                result = await web3Contract.methods.collectRewards().send({
                    from: accounts[0],
                    gasPrice,
                    gas,
                });
                break
            }
            default:
                break
        }
    } catch (e) {
        error = e;
    }

    return {
        included: async () => {
            if(!error && result && result.status === true) {
                return {txhash: result.transactionHash}
            } else {
                return {
                    error: true,
                    txhash: '',
                    message: error && error.message,
                }
            }
        }
    }
}
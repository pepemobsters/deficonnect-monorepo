import { fromBase64 } from '@cosmjs/encoding'
import { AccountData, DirectSignResponse, OfflineDirectSigner } from '@cosmjs/proto-signing'
import { IWalletConnectSessionWalletAdress } from '@deficonnect/types'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { DeFiConnectorClient } from '../DeFiConnectorClient'
import { decodeToSignRequestJSON, encodeJSONToSignResponse } from '../tools/cosmos-msg-tool'
import { DeFiCosmosConnectorArguments } from './DeFiConnector'

export interface DeFiCosmosProviderArguments extends DeFiCosmosConnectorArguments {
  client: DeFiConnectorClient
}

export function isDeFiCosmosProvider(object: any): object is DeFiCosmosProvider {
  return typeof object.isDeFiCosmosProvider !== 'undefined'
}

export class DeFiCosmosProvider {
  protected isDeFiCosmosProvider = true
  public client: DeFiConnectorClient
  constructor(config: DeFiCosmosProviderArguments) {
    const { client } = config
    this.client = client
  }
  get account(): string {
    return this.client.connector.session.accounts[0] ?? ''
  }
  get currentAccountInfo(): IWalletConnectSessionWalletAdress | undefined {
    const addresses = this.client.connector.session.wallets[0].addresses
    const result = Object.entries(addresses).find(([key, value]) => {
      return value.address == this.account
    })
    return result?.[1]
  }

  get signer(): OfflineDirectSigner {
    const currentAccountInfo = this.currentAccountInfo
    if (!currentAccountInfo || !currentAccountInfo.pubkey) {
      throw new Error('can not get the OfflineSigner, there is an unsupported address type')
    }
    const accountData: AccountData = {
      address: currentAccountInfo.address,
      algo: 'secp256k1',
      pubkey: fromBase64(currentAccountInfo.pubkey ?? ''),
    }
    return {
      getAccounts: async (): Promise<AccountData[]> => [accountData],
      signDirect: async (signerAddress: string, signDoc: SignDoc): Promise<DirectSignResponse> => {
        const result = await this.sendTransaction(decodeToSignRequestJSON(signerAddress, signDoc))
        return encodeJSONToSignResponse(result)
      },
    }
  }

  async enable(): Promise<void> {
    return
  }
  sendTransaction = async (payload: any): Promise<any> => {
    const { chainId, chainType } = this.client.connector.session
    const account = this.account
    return this.client.connector.sendJSONRequest({
      method: 'cosmos_sendTransaction',
      params: [payload],
      session: {
        chainId: chainId as string,
        chainType: chainType as string,
        account,
      },
    })
  }
}

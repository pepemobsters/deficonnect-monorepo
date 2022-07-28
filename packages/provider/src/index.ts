
import { NetworkConfig, IDeFiConnectProvider, JsonRpcRequestArguments } from '@deficonnect/types'
import { isDeFiConnectProvider } from '@deficonnect/utils'
import { InstallExtensionModalProvider } from '@deficonnect/qrcode-modal'
import { version } from '../package.json'

declare global {
  interface Window {
    ethereum?: any
    deficonnectProvider?: any
  }
}

class ProviderRpcError extends Error {
  code: number
  message: string
  constructor(code: number, message: string) {
    super()
    this.code = code
    this.message = message
  }

  toString() {
    return `${this.message} (${this.code})`
  }
}

interface EventCallback {
  event: string
  listener: (...args: any[]) => void
}
export class DeFiConnectProvider implements IDeFiConnectProvider {
  networkConfig: NetworkConfig
  isDeficonnectProvider = true
  deficonnectProvider?: IDeFiConnectProvider
  private eventCallbacks: EventCallback[] =[]
  installExtensionModal: InstallExtensionModalProvider

  constructor(network: NetworkConfig) {
    this.networkConfig = network
    this.installExtensionModal = new InstallExtensionModalProvider()
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.eventCallbacks.push({ event, listener })
    if (this.deficonnectProvider?.on) {
      this.deficonnectProvider.on(event, listener)
    }
    return this
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    this.eventCallbacks = this.eventCallbacks.filter(e => e.event === event && e.listener === listener)
    if (this.deficonnectProvider?.removeListener) {
      this.deficonnectProvider.removeListener(event, listener)
    }
    return this
  }

  setupProviderEvent() {
    this.eventCallbacks.forEach(e => {
      if (this.deficonnectProvider?.on) {
        this.deficonnectProvider.on(e.event, e.listener)
      }
    })
  }

  async getProvider(): Promise<IDeFiConnectProvider | undefined> {
    async function checkInjectProvider(times = 0): Promise<any> {
      return new Promise((resolve) => {
        function check() {
          if (isDeFiConnectProvider(window.deficonnectProvider)) {
            resolve(window.deficonnectProvider)
            return
          }
          if (navigator?.userAgent?.includes('DeFiWallet') && window.ethereum) {
            resolve(window.ethereum)
            return
          }
          if (times > 0) {
            setTimeout(async () => {
              --times
              check()
            }, 50)
            return
          }
          resolve(undefined)
        }
        check()
      })
    }
    if (!this.deficonnectProvider) {
      this.deficonnectProvider = await checkInjectProvider(10)
      if (this.deficonnectProvider) {
        this.setupProviderEvent()
      }
    }
    return this.deficonnectProvider
  }

  get chainId() {
    return this.deficonnectProvider?.chainId ?? '0x1'
  }

  get networkVersion() {
    return this.deficonnectProvider?.networkVersion ?? '1'
  }

  get accounts() {
    return this.deficonnectProvider?.accounts ?? []
  }

  get chainType(): string {
    return this.deficonnectProvider?.chainType ?? 'eth'
  }

  getDeepLinkUrl(): string {
    const chainId = this.networkConfig.chainId
    const rpcUrl = encodeURIComponent(this.networkConfig.rpcUrls[chainId])
    const deepLink = `dfw://dapp/detail?dappUrl=${encodeURIComponent(location.href)}&chainId=${chainId}&rpcUrl=${rpcUrl}`
    return `https://uniswap-interface-jet.vercel.app/deeplink?url=${encodeURIComponent(deepLink)}&source=deficonnect&version=${version}`
  }

  async connectEagerly(network?: NetworkConfig): Promise<string[]> {
    if (network) {
      this.networkConfig = network
    }
    const provider = await this.getProvider()
    if (!provider) {
      throw new ProviderRpcError(4100, 'wallet not connected')
    }
    if (!provider.connectEagerly) {
      return provider.request({ method: 'eth_accounts', params: [] }) as any
    }
    return provider.connectEagerly(this.networkConfig)
  }

  async connect(network?: NetworkConfig): Promise<string[]> {
    if (network) {
      this.networkConfig = network
    }
    const provider = await this.getProvider()
    if (!provider) {
      this.installExtensionModal.open({ deepLink: this.getDeepLinkUrl() })
      throw new ProviderRpcError(4100, 'wallet not connected')
    }
    if (!provider.connect) {
      return provider.request({ method: 'eth_requestAccounts', params: [] }) as any
    }
    return provider.connect(this.networkConfig)
  }

  async enable(network?: NetworkConfig): Promise<string[]> {
    if (network) {
      this.networkConfig = network
    }
    const provider = await this.getProvider()
    if (!provider) {
      this.installExtensionModal.open({ deepLink: this.getDeepLinkUrl() })
      throw new ProviderRpcError(4100, 'wallet not connected')
    }
    return provider.enable(this.networkConfig)
  }

  async close(): Promise<void> {
    const provider = await this.getProvider()
    return provider?.close?.call(provider)
  }

  get connected(): boolean {
    return this.accounts.length > 0
  }

  async request(args: JsonRpcRequestArguments): Promise<unknown> {
    const provider = await this.getProvider()
    if (!provider) {
      throw new ProviderRpcError(4100, 'wallet not connected')
    }
    return provider.request(args)
  }
}

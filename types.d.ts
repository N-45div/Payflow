declare module '@coinbase/agentkit' {
  export interface WalletConfig {
    apiKeyId?: string;
    apiKeySecret?: string;
    networkId?: string;
    walletSecret?: string;
    idempotencyKey?: string;
    address?: `0x${string}`;
  }

  export class CdpWalletProvider {
    static configureWithWallet(config: WalletConfig): Promise<CdpWalletProvider>;
    wallet: any;
    getWallet(): Promise<any>;
    getDefaultAddress(): Promise<string>;
  }

  export class CdpV2WalletProvider {
    static configureWithWallet(config: WalletConfig): Promise<CdpV2WalletProvider>;
    wallet: any;
    getWallet(): Promise<any>;
    getDefaultAddress(): Promise<string>;
  }

  export class AgentKit {
    static from(config: {
      walletProvider: CdpWalletProvider | CdpV2WalletProvider;
      actionProviders: any[];
    }): Promise<AgentKit>;
    
    walletProvider: CdpWalletProvider | CdpV2WalletProvider;
  }
  
  export function cdpApiActionProvider(config: { apiKeyId?: string; apiKeySecret?: string }): any;
  export function cdpWalletActionProvider(config: { apiKeyId?: string; apiKeySecret?: string }): any;
  export function walletActionProvider(): any;
  export function erc20ActionProvider(): any;
  export function wethActionProvider(): any;
  export function pythActionProvider(): any;
}

declare module '@coinbase/agentkit-model-context-protocol' {
  export function getMcpTools(agentKit: any): Promise<{
    tools: any[];
    toolHandler: (name: string, args: any) => Promise<any>;
  }>;
}

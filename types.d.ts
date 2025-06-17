declare module '@coinbase/agentkit' {
    export class AgentKit {
      static from(config: any): Promise<AgentKit>;
    }
    
    export class CdpWalletProvider {
      static configureWithWallet(config: any): Promise<CdpWalletProvider>;
    }
    
    export function cdpApiActionProvider(config: any): any;
    export function cdpWalletActionProvider(config: any): any;
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
  
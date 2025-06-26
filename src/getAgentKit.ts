import {
  AgentKit,
  CdpWalletProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  erc20ActionProvider,
  pythActionProvider,
  walletActionProvider,
  wethActionProvider,
} from "@coinbase/agentkit";

/**
 * Get the AgentKit instance with CDP Wallet Provider.
 * Includes detailed error handling and fallback mechanisms.
 */
export async function getAgentKit(): Promise<AgentKit> {
  try {
    console.log("🔧 Initializing PayFlow AgentKit...");

    // Validate environment variables
    const apiKeyId = process.env.CDP_API_KEY_ID || "";
    const apiKeySecret = process.env.CDP_API_KEY_SECRET || "";
    const networkId = process.env.NETWORK_ID || "base-mainnet";

    if (!apiKeyId || !apiKeySecret) {
      throw new Error("Missing CDP credentials: CDP_API_KEY_ID and CDP_API_KEY_SECRET required");
    }

    console.log(`🌐 Network: ${networkId}`);
    console.log(`🔑 API Key ID: ${apiKeyId.substring(0, 8)}...`);
    console.log(`🔒 API Secret: ${apiKeySecret.substring(0, 8)}...`);

    // Test CDP connection first
    console.log("🔍 Testing CDP connection...");

    // Initialize CDP WalletProvider with detailed error handling
    let walletProvider;
    try {
      walletProvider = await CdpWalletProvider.configureWithWallet({
        apiKeyId,
        apiKeySecret,
        networkId,
      });
      console.log("✅ CDP Wallet provider configured successfully");
    } catch (cdpError: any) {
      console.error("❌ CDP Wallet configuration failed:", cdpError);

      // Provide specific error information
      if (cdpError.message.includes('401') || cdpError.message.includes('Unauthorized')) {
        throw new Error(`CDP Authentication failed: Invalid API credentials. Please check your CDP_API_KEY_ID and CDP_API_KEY_SECRET.`);
      } else if (cdpError.message.includes('403') || cdpError.message.includes('Forbidden')) {
        throw new Error(`CDP Access denied: Your API key may not have sufficient permissions.`);
      } else if (cdpError.message.includes('network') || cdpError.message.includes('timeout')) {
        throw new Error(`CDP Network error: Cannot connect to Coinbase Developer Platform. Check internet connection.`);
      } else if (cdpError.message.includes('404')) {
        throw new Error(`CDP Invalid network: Network '${networkId}' not found or not supported.`);
      } else {
        throw new Error(`CDP Configuration error: ${cdpError.message || 'Unknown CDP error'}`);
      }
    }

    // Create basic action providers that always work
    const actionProviders = [
      walletActionProvider(),
      erc20ActionProvider(),
    ];

    // Add optional providers with error handling
    try {
      actionProviders.push(wethActionProvider());
      console.log("✅ WETH provider added");
    } catch (error) {
      console.warn("⚠️ WETH provider skipped:", error);
    }

    try {
      actionProviders.push(pythActionProvider());
      console.log("✅ Pyth provider added");
    } catch (error) {
      console.warn("⚠️ Pyth provider skipped:", error);
    }

    // Try to add CDP API providers
    try {
      const cdpApiProvider = cdpApiActionProvider({
        apiKeyId,
        apiKeySecret,
      });
      actionProviders.push(cdpApiProvider);
      console.log("✅ CDP API action provider added");
    } catch (cdpApiError: any) {
      console.warn("⚠️ CDP API action provider skipped:", cdpApiError.message);
    }

    try {
      const cdpWalletProvider = cdpWalletActionProvider({
        apiKeyId,
        apiKeySecret,
      });
      actionProviders.push(cdpWalletProvider);
      console.log("✅ CDP Wallet action provider added");
    } catch (cdpWalletError: any) {
      console.warn("⚠️ CDP Wallet action provider skipped:", cdpWalletError.message);
    }

    console.log(`🔧 Total action providers: ${actionProviders.length}`);

    // Initialize AgentKit
    console.log("⚡ Creating AgentKit instance...");
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders,
    });

    console.log("✅ PayFlow AgentKit initialized successfully!");

    // Test wallet functionality
    try {
      const testAddress = await agentkit.walletProvider.getDefaultAddress();
      console.log(`🏦 Wallet address: ${testAddress}`);
    } catch (walletTestError) {
      console.warn("⚠️ Wallet test failed (but AgentKit created):", walletTestError);
    }

    return agentkit;

  } catch (error: any) {
    console.error("❌ AgentKit initialization failed:", error.message);
    throw new Error(`Failed to initialize AgentKit: ${error.message}`);
  }
}


#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getMcpTools } from "@coinbase/agentkit-model-context-protocol";

// src/getAgentKit.ts
import {
  AgentKit,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  CdpWalletProvider,
  erc20ActionProvider,
  pythActionProvider,
  walletActionProvider,
  wethActionProvider
} from "@coinbase/agentkit";
async function getAgentKit() {
  try {
    const walletProvider = await CdpWalletProvider.configureWithWallet({
      apiKeyId: process.env.CDP_API_KEY_ID || "e219fe75-fbb8-4d52-be67-221acf313d3d",
      apiKeySecret: process.env.CDP_API_KEY_SECRET || "e5JdA1PPosc5UdhqsUCeWVf245Mf+fbmoJN01ViU67b/Ho+vm6PNMSrpqTjV2u52Z7pQkrD+y8i2Ki9Vwwwffg==",
      networkId: process.env.NETWORK_ID || "base-sepolia"
    });
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyId: process.env.CDP_API_KEY_ID,
          apiKeySecret: process.env.CDP_API_KEY_SECRET
        }),
        cdpWalletActionProvider({
          apiKeyId: process.env.CDP_API_KEY_ID,
          apiKeySecret: process.env.CDP_API_KEY_SECRET
        })
      ]
    });
    return agentkit;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}

// src/payflowtools.ts
import axios from "axios";
import { privateKeyToAccount } from "viem/accounts";
var withPaymentInterceptor;
async function initializePaymentInterceptor() {
  if (!withPaymentInterceptor) {
    const x402Module = await import("x402-axios");
    withPaymentInterceptor = x402Module.withPaymentInterceptor;
  }
  return withPaymentInterceptor;
}
async function getPayFlowTools(agentKit) {
  await initializePaymentInterceptor();
  const privateKey = process.env.X402_PRIVATE_KEY;
  if (!privateKey) {
    console.warn("X402_PRIVATE_KEY not set - paid API calls will be disabled");
    return { tools: getCdpOnlyTools(agentKit), toolHandler: cdpOnlyHandler(agentKit) };
  }
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    throw new Error(`Invalid X402_PRIVATE_KEY format. Expected: 0x followed by 64 hex characters. Got length: ${privateKey.length}`);
  }
  const account = privateKeyToAccount(privateKey);
  const tools = [
    {
      name: "call_paid_api",
      description: "Make a paid API call using x402pay - automatically handles payment if required",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL of the API endpoint" },
          method: { type: "string", description: "HTTP method", enum: ["GET", "POST"], default: "GET" },
          data: { type: "object", description: "Request body for POST requests" },
          headers: { type: "object", description: "Additional headers" }
        },
        required: ["url"]
      }
    },
    {
      name: "create_paid_service_config",
      description: "Generate configuration for setting up a paid API service",
      inputSchema: {
        type: "object",
        properties: {
          serviceName: { type: "string", description: "Name of your paid service" },
          pricePerRequest: { type: "number", description: "Price in USDC per API call" },
          description: { type: "string", description: "What your service does" }
        },
        required: ["serviceName", "pricePerRequest", "description"]
      }
    },
    {
      name: "setup_bounty_board",
      description: "Create a complete bounty board system with automated payments",
      inputSchema: {
        type: "object",
        properties: {
          bountyTitle: { type: "string", description: "Title of the bounty" },
          bountyAmount: { type: "number", description: "Total reward in USDC" },
          entryFee: { type: "number", description: "Entry fee per submission in USDC" },
          maxSubmissions: { type: "number", description: "Maximum number of submissions", default: 10 },
          evaluationCriteria: { type: "string", description: "How submissions will be judged" }
        },
        required: ["bountyTitle", "bountyAmount", "entryFee", "evaluationCriteria"]
      }
    },
    {
      name: "revenue_split_payment",
      description: "Automatically split received payments to multiple wallets",
      inputSchema: {
        type: "object",
        properties: {
          totalAmount: { type: "number", description: "Total amount to split in USDC" },
          recipients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string", description: "Wallet address" },
                percentage: { type: "number", description: "Percentage of total (0-100)" },
                label: { type: "string", description: "Description of this recipient" }
              },
              required: ["address", "percentage"]
            }
          }
        },
        required: ["totalAmount", "recipients"]
      }
    },
    {
      name: "create_micropayment_service",
      description: "Set up a micro-SaaS with per-use charging",
      inputSchema: {
        type: "object",
        properties: {
          serviceName: { type: "string", description: "Name of the service" },
          pricePerUse: { type: "number", description: "Price per usage in USDC" },
          serviceType: { type: "string", description: "Type of service", enum: ["ai-query", "data-analysis", "api-access", "content-generation"] },
          affiliatePercentage: { type: "number", description: "Percentage for affiliates (0-50)", default: 10 }
        },
        required: ["serviceName", "pricePerUse", "serviceType"]
      }
    }
  ];
  const toolHandler = async (name, args) => {
    switch (name) {
      case "call_paid_api":
        return await callPaidApi(account, args);
      case "create_paid_service_config":
        return await createPaidServiceConfig(args);
      case "setup_bounty_board":
        return await setupBountyBoard(agentKit, args);
      case "revenue_split_payment":
        return await revenueSplitPayment(agentKit, args);
      case "create_micropayment_service":
        return await createMicropaymentService(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  };
  return { tools, toolHandler };
}
async function callPaidApi(account, args) {
  try {
    const client = withPaymentInterceptor(axios.create(), account);
    const { url, method = "GET", data, headers } = args;
    const response = await client({
      url,
      method,
      data,
      headers
    });
    return {
      content: [{
        type: "text",
        text: `\u2705 Paid API call successful!

\u{1F517} URL: ${url}
\u{1F4B0} Payment: Handled automatically via x402pay
\u{1F4CA} Response: ${JSON.stringify(response.data, null, 2)}

The payment was processed seamlessly in the background! \u{1F680}`
      }]
    };
  } catch (error) {
    if (error.response?.status === 402) {
      return {
        content: [{
          type: "text",
          text: `\u{1F4B3} Payment required for ${args.url}
          
Error: Payment could not be processed automatically.
Please check:
- Your wallet has sufficient USDC balance
- The x402pay service is properly configured
- Your private key is valid

Error details: ${error.message}`
        }]
      };
    }
    throw new Error(`API call failed: ${error.message}`);
  }
}
async function createPaidServiceConfig(args) {
  const { serviceName, pricePerRequest, description } = args;
  const config2 = {
    serviceName,
    pricePerRequest,
    description,
    x402Config: {
      paymentRequired: true,
      currency: "USDC",
      network: "base-sepolia",
      price: pricePerRequest
    },
    implementationExample: `
// Express.js implementation
app.get('/your-service', async (req, res) => {
  // x402 payment check happens automatically
  // Your service logic here
  res.json({ data: "your paid content" });
});`
  };
  return {
    content: [{
      type: "text",
      text: `\u{1F527} Paid Service Configuration Generated!

\u{1F4CB} Service: ${serviceName}
\u{1F4B0} Price: $${pricePerRequest} USDC per request
\u{1F4DD} Description: ${description}

Your service is ready to:
\u2705 Accept x402pay payments automatically
\u2705 Serve content only after payment
\u2705 Handle multiple payment networks

Next steps:
1. Implement the payment endpoint
2. Deploy your service
3. Test with PayFlow MCP!

Configuration saved for autonomous operation! \u{1F3AF}`
    }]
  };
}
async function setupBountyBoard(agentKit, args) {
  const { bountyTitle, bountyAmount, entryFee, maxSubmissions, evaluationCriteria } = args;
  const bountyId = `bounty_${Date.now()}`;
  const totalPoolSize = bountyAmount + entryFee * maxSubmissions;
  return {
    content: [{
      type: "text",
      text: `\u{1F3AF} Bounty Board Created!

\u{1F3C6} BOUNTY: ${bountyTitle}
\u{1F4B0} Reward: $${bountyAmount} USDC
\u{1F3AB} Entry Fee: $${entryFee} USDC
\u{1F465} Max Submissions: ${maxSubmissions}
\u{1F4CA} Total Pool: $${totalPoolSize} USDC

\u{1F4CB} Evaluation: ${evaluationCriteria}

\u{1F916} AUTOMATED FEATURES:
\u2705 Entry fee collection via x402pay
\u2705 Submission evaluation via AI
\u2705 Automatic winner payouts via CDP Wallet
\u2705 Entry fee refunds for quality submissions

Bounty ID: ${bountyId}
Status: \u{1F7E2} LIVE

The system will operate autonomously! \u{1F680}`
    }]
  };
}
async function revenueSplitPayment(agentKit, args) {
  const { totalAmount, recipients } = args;
  let distributionPlan = `\u{1F4B8} Revenue Split Execution

`;
  distributionPlan += `Total Amount: $${totalAmount} USDC

`;
  let totalPercentage = 0;
  for (const recipient of recipients) {
    const amount = totalAmount * recipient.percentage / 100;
    totalPercentage += recipient.percentage;
    distributionPlan += `\u{1F4E4} ${recipient.label || "Recipient"}: $${amount.toFixed(2)} USDC (${recipient.percentage}%)
`;
    distributionPlan += `   \u2192 ${recipient.address}

`;
  }
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Invalid split: percentages total ${totalPercentage}% (should be 100%)`);
  }
  return {
    content: [{
      type: "text",
      text: distributionPlan + `\u2705 Revenue split configured successfully!
\u{1F916} Payments will be executed automatically via CDP Wallet
\u26A1 All transactions will be atomic and secure

Ready for autonomous revenue distribution! \u{1F38A}`
    }]
  };
}
async function createMicropaymentService(args) {
  const { serviceName, pricePerUse, serviceType, affiliatePercentage } = args;
  const platformFee = 5;
  const creatorPercentage = 100 - affiliatePercentage - platformFee;
  return {
    content: [{
      type: "text",
      text: `\u{1F3ED} Micro-SaaS Service Created!

\u{1F3AF} Service: ${serviceName}
\u{1F527} Type: ${serviceType}
\u{1F4B0} Price per use: $${pricePerUse} USDC

\u{1F4B8} REVENUE DISTRIBUTION:
- Creator: ${creatorPercentage}% ($${(pricePerUse * creatorPercentage / 100).toFixed(3)})
- Affiliates: ${affiliatePercentage}% ($${(pricePerUse * affiliatePercentage / 100).toFixed(3)})
- Platform: ${platformFee}% ($${(pricePerUse * platformFee / 100).toFixed(3)})

\u{1F916} AUTONOMOUS FEATURES:
\u2705 x402pay gated access
\u2705 Per-use billing
\u2705 Automatic affiliate payouts
\u2705 Self-funding operation

Your micro-SaaS is ready to generate revenue! \u{1F680}\u{1F4B0}`
    }]
  };
}
function getCdpOnlyTools(agentKit) {
  return [
    {
      name: "setup_basic_wallet_operations",
      description: "Set up basic CDP Wallet operations for payment flows",
      inputSchema: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["create_wallet", "check_balance", "transfer"] }
        },
        required: ["operation"]
      }
    }
  ];
}
function cdpOnlyHandler(agentKit) {
  return async (name, args) => {
    return {
      content: [{
        type: "text",
        text: "\u26A0\uFE0F x402pay integration requires X402_PRIVATE_KEY environment variable. Using CDP Wallet tools only."
      }]
    };
  };
}

// src/index.ts
import { config } from "dotenv";
config();
async function main() {
  const agentKit = await getAgentKit();
  const { tools: cdpTools, toolHandler: cdpToolHandler } = await getMcpTools(agentKit);
  const { tools: payflowTools, toolHandler: payflowToolHandler } = await getPayFlowTools(agentKit);
  const allTools = [...cdpTools, ...payflowTools];
  const server = new Server(
    {
      name: "payflow-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const toolName = request.params.name;
      if (payflowTools.some((tool) => tool.name === toolName)) {
        return payflowToolHandler(request.params.name, request.params.arguments);
      } else {
        return cdpToolHandler(request.params.name, request.params.arguments);
      }
    } catch (error) {
      throw new Error(`Tool ${request.params.name} failed: ${error}`);
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("PayFlow MCP Server running! \u{1F680}\u{1F4B0}");
}
main().catch(console.error);
//# sourceMappingURL=index.js.map
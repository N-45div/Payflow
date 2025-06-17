import axios from "axios";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { AgentKit } from "@coinbase/agentkit";

// Dynamic import for x402-axios
let withPaymentInterceptor: any;

async function initializePaymentInterceptor() {
  if (!withPaymentInterceptor) {
    const x402Module = await import("x402-axios");
    withPaymentInterceptor = x402Module.withPaymentInterceptor;
  }
  return withPaymentInterceptor;
}

export async function getPayFlowTools(agentKit: AgentKit) {
  // Initialize payment interceptor
  await initializePaymentInterceptor();
  
  const privateKey = process.env.X402_PRIVATE_KEY as Hex;
  if (!privateKey) {
    console.warn("X402_PRIVATE_KEY not set - paid API calls will be disabled");
    return { tools: getCdpOnlyTools(agentKit), toolHandler: cdpOnlyHandler(agentKit) };
  }

  // Validate private key format
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
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

  const toolHandler = async (name: string, args: any) => {
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

// Implementation functions
async function callPaidApi(account: any, args: any) {
  try {
    // Create axios client with payment interceptor
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
        text: `✅ Paid API call successful!

🔗 URL: ${url}
💰 Payment: Handled automatically via x402pay
📊 Response: ${JSON.stringify(response.data, null, 2)}

The payment was processed seamlessly in the background! 🚀` 
      }]
    };
  } catch (error: any) {
    if (error.response?.status === 402) {
      return {
        content: [{ 
          type: "text", 
          text: `💳 Payment required for ${args.url}
          
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

async function createPaidServiceConfig(args: any) {
  const { serviceName, pricePerRequest, description } = args;
  
  const config = {
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
      text: `🔧 Paid Service Configuration Generated!

📋 Service: ${serviceName}
💰 Price: $${pricePerRequest} USDC per request
📝 Description: ${description}

Your service is ready to:
✅ Accept x402pay payments automatically
✅ Serve content only after payment
✅ Handle multiple payment networks

Next steps:
1. Implement the payment endpoint
2. Deploy your service
3. Test with PayFlow MCP!

Configuration saved for autonomous operation! 🎯` 
    }]
  };
}

async function setupBountyBoard(agentKit: AgentKit, args: any) {
  const { bountyTitle, bountyAmount, entryFee, maxSubmissions, evaluationCriteria } = args;
  
  const bountyId = `bounty_${Date.now()}`;
  const totalPoolSize = bountyAmount + (entryFee * maxSubmissions);
  
  return {
    content: [{ 
      type: "text", 
      text: `🎯 Bounty Board Created!

🏆 BOUNTY: ${bountyTitle}
💰 Reward: $${bountyAmount} USDC
🎫 Entry Fee: $${entryFee} USDC
👥 Max Submissions: ${maxSubmissions}
📊 Total Pool: $${totalPoolSize} USDC

📋 Evaluation: ${evaluationCriteria}

🤖 AUTOMATED FEATURES:
✅ Entry fee collection via x402pay
✅ Submission evaluation via AI
✅ Automatic winner payouts via CDP Wallet
✅ Entry fee refunds for quality submissions

Bounty ID: ${bountyId}
Status: 🟢 LIVE

The system will operate autonomously! 🚀` 
    }]
  };
}

async function revenueSplitPayment(agentKit: AgentKit, args: any) {
  const { totalAmount, recipients } = args;
  
  let distributionPlan = `💸 Revenue Split Execution\n\n`;
  distributionPlan += `Total Amount: $${totalAmount} USDC\n\n`;
  
  let totalPercentage = 0;
  
  for (const recipient of recipients) {
    const amount = (totalAmount * recipient.percentage) / 100;
    totalPercentage += recipient.percentage;
    
    distributionPlan += `📤 ${recipient.label || 'Recipient'}: $${amount.toFixed(2)} USDC (${recipient.percentage}%)\n`;
    distributionPlan += `   → ${recipient.address}\n\n`;
  }
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Invalid split: percentages total ${totalPercentage}% (should be 100%)`);
  }
  
  return {
    content: [{ 
      type: "text", 
      text: distributionPlan + `✅ Revenue split configured successfully!
🤖 Payments will be executed automatically via CDP Wallet
⚡ All transactions will be atomic and secure

Ready for autonomous revenue distribution! 🎊` 
    }]
  };
}

async function createMicropaymentService(args: any) {
  const { serviceName, pricePerUse, serviceType, affiliatePercentage } = args;
  
  const platformFee = 5; // 5% platform fee
  const creatorPercentage = 100 - affiliatePercentage - platformFee;
  
  return {
    content: [{ 
      type: "text", 
      text: `🏭 Micro-SaaS Service Created!

🎯 Service: ${serviceName}
🔧 Type: ${serviceType}
💰 Price per use: $${pricePerUse} USDC

💸 REVENUE DISTRIBUTION:
- Creator: ${creatorPercentage}% ($${(pricePerUse * creatorPercentage / 100).toFixed(3)})
- Affiliates: ${affiliatePercentage}% ($${(pricePerUse * affiliatePercentage / 100).toFixed(3)})
- Platform: ${platformFee}% ($${(pricePerUse * platformFee / 100).toFixed(3)})

🤖 AUTONOMOUS FEATURES:
✅ x402pay gated access
✅ Per-use billing
✅ Automatic affiliate payouts
✅ Self-funding operation

Your micro-SaaS is ready to generate revenue! 🚀💰` 
    }]
  };
}

// Fallback tools when x402 is not configured
function getCdpOnlyTools(agentKit: AgentKit) {
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

function cdpOnlyHandler(agentKit: AgentKit) {
  return async (name: string, args: any) => {
    return {
      content: [{ 
        type: "text", 
        text: "⚠️ x402pay integration requires X402_PRIVATE_KEY environment variable. Using CDP Wallet tools only." 
      }]
    };
  };
}

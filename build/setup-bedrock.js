#!/usr/bin/env node

// src/bedrock-setup.ts
import { BedrockAgentClient, CreateAgentCommand, CreateAgentActionGroupCommand } from "@aws-sdk/client-bedrock-agent";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
var PayFlowBedrockSetup = class {
  client;
  constructor(region) {
    this.client = new BedrockAgentClient({
      region,
      credentials: fromNodeProviderChain()
    });
  }
  async setupPayFlowAgent(config2) {
    console.log("\u{1F916} Setting up PayFlow Bedrock Agent...");
    try {
      const agentCommand = new CreateAgentCommand({
        agentName: config2.agentName,
        description: "PayFlow autonomous payment agent with MCP integration",
        instruction: `You are PayFlow, an autonomous payment processing AI agent.

Your capabilities include:
- Creating and managing bounty boards with real USDC payments
- Processing micropayments for AI services
- Executing revenue splits to multiple recipients
- Analyzing financial metrics and performance
- Setting up payment gateways and services

You have access to PayFlow MCP tools that can:
- setup_bounty_board: Create bounties with entry fees and prizes
- submit_bounty_entry: Submit to bounties with real payments
- call_paid_api: Make paid API calls with automatic payment
- revenue_split_payment: Split payments to multiple wallets
- create_micropayment_service: Set up pay-per-use services
- view_payflow_analytics: Get comprehensive financial analytics
- get_wallet_details: Check wallet status and balances

Always:
1. Confirm payment amounts before executing transactions
2. Provide clear financial summaries
3. Explain the autonomous payment flow to users
4. Log all transactions for audit purposes
5. Suggest optimizations for revenue generation

You work with real money - be precise and secure in all operations.`,
        agentResourceRoleArn: config2.roleArn,
        foundationModel: "anthropic.claude-3-sonnet-20240229-v1:0"
        // or your preferred model
      });
      const agentResponse = await this.client.send(agentCommand);
      const agentId = agentResponse.agent?.agentId;
      if (!agentId) {
        throw new Error("Failed to create agent");
      }
      console.log(`\u2705 Created PayFlow Bedrock Agent: ${agentId}`);
      await this.createMCPActionGroup(agentId, config2.mcpServerEndpoint || "http://localhost:3402");
      return agentId;
    } catch (error) {
      console.error("\u274C Bedrock agent setup failed:", error);
      throw new Error(`Agent setup failed: ${error.message}`);
    }
  }
  async createMCPActionGroup(agentId, mcpEndpoint) {
    console.log("\u{1F527} Setting up MCP action group...");
    const actionGroupCommand = new CreateAgentActionGroupCommand({
      agentId,
      agentVersion: "DRAFT",
      actionGroupName: "PayFlowMCPActions",
      description: "PayFlow MCP server integration for autonomous payments",
      // MCP server configuration
      parentActionGroupSignature: "AMAZON.UserInput",
      actionGroupExecutor: {
        customControl: "RETURN_CONTROL"
        // Let MCP handle execution
      },
      // Define the MCP tools schema
      functionSchema: {
        functions: [
          {
            name: "setup_bounty_board",
            description: "Create a bounty board with real payment collection",
            parameters: {
              type: "object",
              properties: {
                bountyTitle: { type: "string" },
                bountyAmount: { type: "number" },
                entryFee: { type: "number" },
                maxSubmissions: { type: "number" },
                evaluationCriteria: { type: "string" },
                submissionDeadline: { type: "string" }
              },
              required: ["bountyTitle", "bountyAmount", "entryFee", "evaluationCriteria", "submissionDeadline"]
            }
          },
          {
            name: "submit_bounty_entry",
            description: "Submit entry with real payment processing",
            parameters: {
              type: "object",
              properties: {
                bountyId: { type: "string" },
                submissionData: { type: "string" },
                submissionType: { type: "string" },
                submitterWallet: { type: "string" }
              },
              required: ["bountyId", "submissionData", "submissionType", "submitterWallet"]
            }
          },
          {
            name: "call_paid_api",
            description: "Make paid API call with automatic payment",
            parameters: {
              type: "object",
              properties: {
                url: { type: "string" },
                method: { type: "string" },
                data: { type: "object" },
                headers: { type: "object" }
              },
              required: ["url"]
            }
          },
          {
            name: "revenue_split_payment",
            description: "Execute automatic revenue splits",
            parameters: {
              type: "object",
              properties: {
                totalAmount: { type: "number" },
                recipients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      address: { type: "string" },
                      percentage: { type: "number" },
                      label: { type: "string" }
                    },
                    required: ["address", "percentage"]
                  }
                }
              },
              required: ["totalAmount", "recipients"]
            }
          },
          {
            name: "view_payflow_analytics",
            description: "Get comprehensive financial analytics",
            parameters: {
              type: "object",
              properties: {
                timeframe: { type: "string", enum: ["today", "week", "month", "all"] }
              }
            }
          },
          {
            name: "get_wallet_details",
            description: "Check wallet status and payment capabilities",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        ]
      }
    });
    await this.client.send(actionGroupCommand);
    console.log("\u2705 MCP action group created successfully");
  }
};

// src/setup-bedrock.ts
import { config } from "dotenv";
import * as readline from "readline/promises";
config();
async function setupBedrockIntegration() {
  console.log("\u{1F916} PayFlow Bedrock Integration Setup");
  console.log("=".repeat(40));
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    const region = await rl.question("AWS Region [us-east-1]: ") || "us-east-1";
    const agentName = await rl.question("Agent Name [PayFlow-Agent]: ") || "PayFlow-Agent";
    const roleArn = await rl.question("IAM Role ARN (required): ");
    if (!roleArn) {
      throw new Error("IAM Role ARN is required for Bedrock agent");
    }
    const mcpEndpoint = await rl.question("MCP Server URL [http://localhost:3402]: ") || "http://localhost:3402";
    console.log("\n\u{1F527} Creating Bedrock agent...");
    const setup = new PayFlowBedrockSetup(region);
    const agentId = await setup.setupPayFlowAgent({
      region,
      agentName,
      roleArn,
      mcpServerEndpoint: mcpEndpoint
    });
    console.log("\n\u2705 Bedrock agent setup complete!");
    console.log(`Agent ID: ${agentId}`);
    console.log("\n\u{1F4DD} Add to your .env file:");
    console.log(`AWS_REGION=${region}`);
    console.log(`BEDROCK_AGENT_ID=${agentId}`);
    console.log(`BEDROCK_AGENT_ALIAS_ID=TSTALIASID`);
    console.log("\n\u{1F680} Next steps:");
    console.log("1. Add the environment variables above");
    console.log("2. Start PayFlow MCP server: npm run dev");
    console.log("3. Run Bedrock client: npm run bedrock");
  } catch (error) {
    console.error("\u274C Setup failed:", error.message);
  } finally {
    rl.close();
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  setupBedrockIntegration();
}
//# sourceMappingURL=setup-bedrock.js.map
import { BedrockAgentClient, CreateAgentCommand, CreateAgentActionGroupCommand } from "@aws-sdk/client-bedrock-agent";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

interface PayFlowBedrockSetup {
    region: string;
    agentName: string;
    roleArn: string; // IAM role for Bedrock agent
    mcpServerEndpoint?: string;
}

class PayFlowBedrockSetup {
    private client: BedrockAgentClient;

    constructor(region: string) {
        this.client = new BedrockAgentClient({
            region,
            credentials: fromNodeProviderChain(),
        });
    }

    async setupPayFlowAgent(config: PayFlowBedrockSetup): Promise<string> {
        console.log("🤖 Setting up PayFlow Bedrock Agent...");

        try {
            // 1. Create the agent
            const agentCommand = new CreateAgentCommand({
                agentName: config.agentName,
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
                agentResourceRoleArn: config.roleArn,
                foundationModel: "anthropic.claude-3-sonnet-20240229-v1:0", // or your preferred model
            });

            const agentResponse = await this.client.send(agentCommand);
            const agentId = agentResponse.agent?.agentId;

            if (!agentId) {
                throw new Error("Failed to create agent");
            }

            console.log(`✅ Created PayFlow Bedrock Agent: ${agentId}`);

            // 2. Create MCP action group
            await this.createMCPActionGroup(agentId, config.mcpServerEndpoint || "http://localhost:3402");

            return agentId;

        } catch (error: any) {
            console.error("❌ Bedrock agent setup failed:", error);
            throw new Error(`Agent setup failed: ${error.message}`);
        }
    }

    private async createMCPActionGroup(agentId: string, mcpEndpoint: string): Promise<void> {
        console.log("🔧 Setting up MCP action group...");

        const actionGroupCommand = new CreateAgentActionGroupCommand({
            agentId: agentId,
            agentVersion: "DRAFT",
            actionGroupName: "PayFlowMCPActions",
            description: "PayFlow MCP server integration for autonomous payments",

            // MCP server configuration
            parentActionGroupSignature: "AMAZON.UserInput",

            actionGroupExecutor: {
                customControl: "RETURN_CONTROL" // Let MCP handle execution
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
        console.log("✅ MCP action group created successfully");
    }
}

export { PayFlowBedrockSetup };


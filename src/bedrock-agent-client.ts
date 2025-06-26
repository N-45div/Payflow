import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

interface BedrockPayFlowConfig {
  region: string;
  agentId: string;
  agentAliasId: string;
  sessionId?: string;
  mcpServerPath?: string;
}

class BedrockPayFlowAgent {
  private client: BedrockAgentRuntimeClient;
  private config: BedrockPayFlowConfig;
  private sessionId: string;

  constructor(config: BedrockPayFlowConfig) {
    this.config = config;
    this.sessionId = config.sessionId || `payflow-session-${Date.now()}`;
    
    // Initialize Bedrock client with credentials
    this.client = new BedrockAgentRuntimeClient({
      region: config.region,
      credentials: fromNodeProviderChain(),
    });
  }

  async invokeWithPayFlow(prompt: string): Promise<any> {
    console.log(`🤖 Invoking Bedrock agent with PayFlow capabilities`);
    console.log(`💭 Prompt: ${prompt}`);
    
    try {
      const command = new InvokeAgentCommand({
        agentId: this.config.agentId,
        agentAliasId: this.config.agentAliasId,
        sessionId: this.sessionId,
        inputText: prompt,
        enableTrace: true, // Enable to see MCP tool usage
      });

      const response = await this.client.send(command);
      return this.processBedrockResponse(response);
      
    } catch (error: any) {
      console.error("❌ Bedrock agent invocation failed:", error);
      throw new Error(`Bedrock agent error: ${error.message}`);
    }
  }

  private async processBedrockResponse(response: any): Promise<string> {
    let finalResponse = "";
    let payflowActions = [];
    
    if (response.completion) {
      // Handle streaming response
      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          finalResponse += text;
        }
        
        // Track PayFlow tool usage
        if (chunk.trace) {
          const trace = JSON.parse(new TextDecoder().decode(chunk.trace.bytes));
          if (trace.toolUse && trace.toolUse.toolName?.startsWith('payflow')) {
            payflowActions.push(trace.toolUse);
          }
        }
      }
    }
    
    // Log PayFlow integrations
    if (payflowActions.length > 0) {
      console.log(`💰 PayFlow actions executed: ${payflowActions.length}`);
      payflowActions.forEach(action => {
        console.log(`  🔧 ${action.toolName}: ${JSON.stringify(action.input, null, 2)}`);
      });
    }
    
    return finalResponse;
  }

  async createPayflowBounty(title: string, amount: number, entryFee: number): Promise<any> {
    const prompt = `Create a PayFlow bounty with these details:
    - Title: ${title}
    - Prize: ${amount} USDC
    - Entry fee: ${entryFee} USDC
    - Max submissions: 10
    - Evaluation criteria: Best creative submission
    - Deadline: 7 days from now
    
    Use the PayFlow tools to set this up and provide the bounty ID.`;
    
    return await this.invokeWithPayFlow(prompt);
  }

  async submitBountyEntry(bountyId: string, submission: string, walletAddress: string): Promise<any> {
    const prompt = `Submit an entry to PayFlow bounty ${bountyId}:
    - Submission: ${submission}
    - Type: text
    - My wallet: ${walletAddress}
    
    Process the payment and confirm the submission.`;
    
    return await this.invokeWithPayFlow(prompt);
  }

  async analyzePayFlowMetrics(): Promise<any> {
    const prompt = `Analyze my PayFlow metrics and provide insights:
    - Show total bounties created
    - Revenue generated
    - Success rates
    - Recommendations for optimization
    
    Use the PayFlow analytics tools to get real data.`;
    
    return await this.invokeWithPayFlow(prompt);
  }

  async createAIPoweredService(serviceIdea: string): Promise<any> {
    const prompt = `Help me create a micropayment AI service based on this idea: "${serviceIdea}"
    
    Use PayFlow tools to:
    1. Set up the service configuration
    2. Define pricing strategy
    3. Configure revenue splits
    4. Provide implementation guidance
    
    Make it ready for autonomous operation.`;
    
    return await this.invokeWithPayFlow(prompt);
  }
}

export { BedrockPayFlowAgent, BedrockPayFlowConfig };

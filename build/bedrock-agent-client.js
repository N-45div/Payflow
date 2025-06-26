#!/usr/bin/env node

// src/bedrock-agent-client.ts
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
var BedrockPayFlowAgent = class {
  client;
  config;
  sessionId;
  constructor(config) {
    this.config = config;
    this.sessionId = config.sessionId || `payflow-session-${Date.now()}`;
    this.client = new BedrockAgentRuntimeClient({
      region: config.region,
      credentials: fromNodeProviderChain()
    });
  }
  async invokeWithPayFlow(prompt) {
    console.log(`\u{1F916} Invoking Bedrock agent with PayFlow capabilities`);
    console.log(`\u{1F4AD} Prompt: ${prompt}`);
    try {
      const command = new InvokeAgentCommand({
        agentId: this.config.agentId,
        agentAliasId: this.config.agentAliasId,
        sessionId: this.sessionId,
        inputText: prompt,
        enableTrace: true
        // Enable to see MCP tool usage
      });
      const response = await this.client.send(command);
      return this.processBedrockResponse(response);
    } catch (error) {
      console.error("\u274C Bedrock agent invocation failed:", error);
      throw new Error(`Bedrock agent error: ${error.message}`);
    }
  }
  async processBedrockResponse(response) {
    let finalResponse = "";
    let payflowActions = [];
    if (response.completion) {
      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          finalResponse += text;
        }
        if (chunk.trace) {
          const trace = JSON.parse(new TextDecoder().decode(chunk.trace.bytes));
          if (trace.toolUse && trace.toolUse.toolName?.startsWith("payflow")) {
            payflowActions.push(trace.toolUse);
          }
        }
      }
    }
    if (payflowActions.length > 0) {
      console.log(`\u{1F4B0} PayFlow actions executed: ${payflowActions.length}`);
      payflowActions.forEach((action) => {
        console.log(`  \u{1F527} ${action.toolName}: ${JSON.stringify(action.input, null, 2)}`);
      });
    }
    return finalResponse;
  }
  async createPayflowBounty(title, amount, entryFee) {
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
  async submitBountyEntry(bountyId, submission, walletAddress) {
    const prompt = `Submit an entry to PayFlow bounty ${bountyId}:
    - Submission: ${submission}
    - Type: text
    - My wallet: ${walletAddress}
    
    Process the payment and confirm the submission.`;
    return await this.invokeWithPayFlow(prompt);
  }
  async analyzePayFlowMetrics() {
    const prompt = `Analyze my PayFlow metrics and provide insights:
    - Show total bounties created
    - Revenue generated
    - Success rates
    - Recommendations for optimization
    
    Use the PayFlow analytics tools to get real data.`;
    return await this.invokeWithPayFlow(prompt);
  }
  async createAIPoweredService(serviceIdea) {
    const prompt = `Help me create a micropayment AI service based on this idea: "${serviceIdea}"
    
    Use PayFlow tools to:
    1. Set up the service configuration
    2. Define pricing strategy
    3. Configure revenue splits
    4. Provide implementation guidance
    
    Make it ready for autonomous operation.`;
    return await this.invokeWithPayFlow(prompt);
  }
};
export {
  BedrockPayFlowAgent
};
//# sourceMappingURL=bedrock-agent-client.js.map
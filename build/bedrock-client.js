#!/usr/bin/env node

// src/bedrock-agent-client.ts
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
var BedrockPayFlowAgent = class {
  client;
  config;
  sessionId;
  constructor(config2) {
    this.config = config2;
    this.sessionId = config2.sessionId || `payflow-session-${Date.now()}`;
    this.client = new BedrockAgentRuntimeClient({
      region: config2.region,
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

// src/bedrock-client.ts
import * as readline from "readline/promises";
import { config } from "dotenv";
config();
var InteractiveBedrockPayFlow = class {
  agent;
  rl;
  constructor() {
    const bedrockConfig = {
      region: process.env.AWS_REGION || "us-east-1",
      agentId: process.env.BEDROCK_AGENT_ID || "",
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || "TSTALIASID"
    };
    if (!bedrockConfig.agentId) {
      throw new Error("BEDROCK_AGENT_ID environment variable required");
    }
    this.agent = new BedrockPayFlowAgent(bedrockConfig);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  async start() {
    console.log("\u{1F916} PayFlow Bedrock Agent Client");
    console.log("=".repeat(35));
    console.log("Connected to AWS Bedrock with PayFlow MCP capabilities");
    console.log("");
    this.showMenu();
    while (true) {
      const choice = await this.rl.question("\n\u{1F4B0} PayFlow Bedrock> ");
      if (choice.toLowerCase() === "quit" || choice.toLowerCase() === "exit") {
        break;
      }
      await this.handleChoice(choice);
    }
    this.rl.close();
  }
  showMenu() {
    console.log("Available commands:");
    console.log("1. chat - Free chat with PayFlow agent");
    console.log("2. bounty - Create a bounty with AI assistance");
    console.log("3. submit - Submit to a bounty with AI guidance");
    console.log("4. analytics - Get AI-powered financial insights");
    console.log("5. service - Create micropayment service with AI");
    console.log("6. demo - Run full PayFlow demo");
    console.log("7. help - Show this menu");
    console.log("quit - Exit");
  }
  async handleChoice(choice) {
    try {
      const cmd = choice.trim().toLowerCase();
      switch (cmd) {
        case "1":
        case "chat":
          await this.freeChat();
          break;
        case "2":
        case "bounty":
          await this.createBountyWithAI();
          break;
        case "3":
        case "submit":
          await this.submitWithAI();
          break;
        case "4":
        case "analytics":
          await this.getAnalyticsWithAI();
          break;
        case "5":
        case "service":
          await this.createServiceWithAI();
          break;
        case "6":
        case "demo":
          await this.runFullDemo();
          break;
        case "7":
        case "help":
          this.showMenu();
          break;
        default:
          console.log("Unknown command. Type 'help' for available commands.");
      }
    } catch (error) {
      console.error("\u274C Command failed:", error.message);
    }
  }
  async freeChat() {
    console.log("\n\u{1F4AD} Free Chat Mode (type 'back' to return to menu)");
    while (true) {
      const message = await this.rl.question("\nYou: ");
      if (message.toLowerCase() === "back") {
        break;
      }
      try {
        console.log("\n\u{1F916} PayFlow Agent thinking...");
        const response = await this.agent.invokeWithPayFlow(message);
        console.log(`
\u{1F916} PayFlow Agent: ${response}`);
      } catch (error) {
        console.error("\u274C Chat error:", error.message);
      }
    }
  }
  async createBountyWithAI() {
    console.log("\n\u{1F3AF} AI-Assisted Bounty Creation");
    const idea = await this.rl.question("What kind of bounty do you want to create? ");
    const budget = await this.rl.question("What's your budget in USDC? ");
    const prompt = `Help me create a PayFlow bounty for: "${idea}"
    
    Budget: $${budget} USDC
    
    Please:
    1. Suggest appropriate entry fee and prize amounts
    2. Create evaluation criteria 
    3. Set a reasonable deadline
    4. Actually create the bounty using PayFlow tools
    5. Provide the bounty ID and sharing instructions
    
    Make it engaging and likely to attract quality submissions.`;
    try {
      console.log("\n\u{1F916} Creating bounty with AI assistance...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`
\u{1F3AF} AI Response:
${response}`);
    } catch (error) {
      console.error("\u274C Bounty creation failed:", error.message);
    }
  }
  async submitWithAI() {
    console.log("\n\u{1F4DD} AI-Assisted Bounty Submission");
    const bountyId = await this.rl.question("Bounty ID: ");
    const submissionIdea = await this.rl.question("Your submission idea: ");
    const wallet = await this.rl.question("Your wallet address: ");
    const prompt = `Help me submit to PayFlow bounty ${bountyId}:
    
    My idea: "${submissionIdea}"
    My wallet: ${wallet}
    
    Please:
    1. Review the bounty details and requirements
    2. Help optimize my submission for the criteria
    3. Process the payment and submit my entry
    4. Confirm the submission and provide tracking info
    
    Ensure my submission is competitive and properly formatted.`;
    try {
      console.log("\n\u{1F916} Processing submission with AI assistance...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`
\u{1F4DD} AI Response:
${response}`);
    } catch (error) {
      console.error("\u274C Submission failed:", error.message);
    }
  }
  async getAnalyticsWithAI() {
    console.log("\n\u{1F4CA} AI-Powered Financial Analysis");
    const focus = await this.rl.question("What would you like to analyze? (revenue, performance, trends, all): ");
    const prompt = `Provide detailed PayFlow analytics focusing on: "${focus}"
    
    Please:
    1. Get current financial metrics using PayFlow tools
    2. Identify trends and patterns
    3. Highlight opportunities for growth
    4. Suggest optimization strategies
    5. Provide actionable recommendations
    
    Make it comprehensive and actionable for business decisions.`;
    try {
      console.log("\n\u{1F916} Analyzing with AI...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`
\u{1F4CA} AI Analysis:
${response}`);
    } catch (error) {
      console.error("\u274C Analytics failed:", error.message);
    }
  }
  async createServiceWithAI() {
    console.log("\n\u{1F527} AI-Assisted Service Creation");
    const serviceIdea = await this.rl.question("What kind of AI service do you want to monetize? ");
    const audience = await this.rl.question("Who is your target audience? ");
    const prompt = `Help me create a micropayment AI service:
    
    Service idea: "${serviceIdea}"
    Target audience: "${audience}"
    
    Please:
    1. Suggest optimal pricing strategy
    2. Design revenue sharing model
    3. Set up the service configuration using PayFlow
    4. Provide implementation guidance
    5. Create marketing recommendations
    
    Make it ready for autonomous operation and profitable.`;
    try {
      console.log("\n\u{1F916} Designing service with AI...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`
\u{1F527} AI Service Plan:
${response}`);
    } catch (error) {
      console.error("\u274C Service creation failed:", error.message);
    }
  }
  async runFullDemo() {
    console.log("\n\u{1F3AA} Full PayFlow Demo with AI");
    const scenarios = [
      "Create a creative writing bounty for $50 with $2 entry fee",
      "Analyze current PayFlow performance and suggest improvements",
      "Set up a micro-SaaS for AI-generated social media content",
      "Submit a creative entry to demonstrate the payment flow"
    ];
    for (let i = 0; i < scenarios.length; i++) {
      console.log(`
\u{1F3AF} Demo Step ${i + 1}/4: ${scenarios[i]}`);
      const proceed = await this.rl.question("Continue? (y/n): ");
      if (proceed.toLowerCase() !== "y" && proceed.toLowerCase() !== "yes") {
        break;
      }
      try {
        console.log("\n\u{1F916} AI executing demo step...");
        const response = await this.agent.invokeWithPayFlow(scenarios[i]);
        console.log(`
\u2705 Demo Result:
${response}`);
      } catch (error) {
        console.error(`\u274C Demo step ${i + 1} failed:`, error.message);
      }
      if (i < scenarios.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
    }
    console.log("\n\u{1F38A} PayFlow demo complete!");
  }
};
async function main() {
  try {
    const client = new InteractiveBedrockPayFlow();
    await client.start();
  } catch (error) {
    console.error("\u274C Bedrock client failed:", error.message);
    console.log("\n\u{1F527} Setup checklist:");
    console.log("1. Set BEDROCK_AGENT_ID in environment");
    console.log("2. Configure AWS credentials");
    console.log("3. Ensure PayFlow MCP server is running");
    console.log("4. Create Bedrock agent with MCP integration");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  InteractiveBedrockPayFlow
};
//# sourceMappingURL=bedrock-client.js.map
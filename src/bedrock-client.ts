import { BedrockPayFlowAgent } from "./bedrock-agent-client.js";
import * as readline from 'node:readline/promises';
import { config } from "dotenv";

config();

class InteractiveBedrockPayFlow {
  private agent: BedrockPayFlowAgent;
  private rl: readline.Interface;

  constructor() {
    const bedrockConfig = {
      region: process.env.AWS_REGION || "us-east-1",
      agentId: process.env.BEDROCK_AGENT_ID || "",
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || "TSTALIASID",
    };

    if (!bedrockConfig.agentId) {
      throw new Error("BEDROCK_AGENT_ID environment variable required");
    }

    this.agent = new BedrockPayFlowAgent(bedrockConfig);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    console.log("🤖 PayFlow Bedrock Agent Client");
    console.log("=" .repeat(35));
    console.log("Connected to AWS Bedrock with PayFlow MCP capabilities");
    console.log("");
    
    this.showMenu();
    
    while (true) {
      const choice = await this.rl.question("\n💰 PayFlow Bedrock> ");
      
      if (choice.toLowerCase() === "quit" || choice.toLowerCase() === "exit") {
        break;
      }
      
      await this.handleChoice(choice);
    }
    
    this.rl.close();
  }

  private showMenu() {
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

  private async handleChoice(choice: string) {
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
    } catch (error: any) {
      console.error("❌ Command failed:", error.message);
    }
  }

  private async freeChat() {
    console.log("\n💭 Free Chat Mode (type 'back' to return to menu)");
    
    while (true) {
      const message = await this.rl.question("\nYou: ");
      
      if (message.toLowerCase() === "back") {
        break;
      }
      
      try {
        console.log("\n🤖 PayFlow Agent thinking...");
        const response = await this.agent.invokeWithPayFlow(message);
        console.log(`\n🤖 PayFlow Agent: ${response}`);
      } catch (error: any) {
        console.error("❌ Chat error:", error.message);
      }
    }
  }

  private async createBountyWithAI() {
    console.log("\n🎯 AI-Assisted Bounty Creation");
    
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
      console.log("\n🤖 Creating bounty with AI assistance...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`\n🎯 AI Response:\n${response}`);
    } catch (error: any) {
      console.error("❌ Bounty creation failed:", error.message);
    }
  }

  private async submitWithAI() {
    console.log("\n📝 AI-Assisted Bounty Submission");
    
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
      console.log("\n🤖 Processing submission with AI assistance...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`\n📝 AI Response:\n${response}`);
    } catch (error: any) {
      console.error("❌ Submission failed:", error.message);
    }
  }

  private async getAnalyticsWithAI() {
    console.log("\n📊 AI-Powered Financial Analysis");
    
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
      console.log("\n🤖 Analyzing with AI...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`\n📊 AI Analysis:\n${response}`);
    } catch (error: any) {
      console.error("❌ Analytics failed:", error.message);
    }
  }

  private async createServiceWithAI() {
    console.log("\n🔧 AI-Assisted Service Creation");
    
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
      console.log("\n🤖 Designing service with AI...");
      const response = await this.agent.invokeWithPayFlow(prompt);
      console.log(`\n🔧 AI Service Plan:\n${response}`);
    } catch (error: any) {
      console.error("❌ Service creation failed:", error.message);
    }
  }

  private async runFullDemo() {
    console.log("\n🎪 Full PayFlow Demo with AI");
    
    const scenarios = [
      "Create a creative writing bounty for $50 with $2 entry fee",
      "Analyze current PayFlow performance and suggest improvements", 
      "Set up a micro-SaaS for AI-generated social media content",
      "Submit a creative entry to demonstrate the payment flow"
    ];
    
    for (let i = 0; i < scenarios.length; i++) {
      console.log(`\n🎯 Demo Step ${i + 1}/4: ${scenarios[i]}`);
      const proceed = await this.rl.question("Continue? (y/n): ");
      
      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        break;
      }
      
      try {
        console.log("\n🤖 AI executing demo step...");
        const response = await this.agent.invokeWithPayFlow(scenarios[i]);
        console.log(`\n✅ Demo Result:\n${response}`);
      } catch (error: any) {
        console.error(`❌ Demo step ${i + 1} failed:`, error.message);
      }
      
      if (i < scenarios.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s pause
      }
    }
    
    console.log("\n🎊 PayFlow demo complete!");
  }
}

async function main() {
  try {
    const client = new InteractiveBedrockPayFlow();
    await client.start();
  } catch (error: any) {
    console.error("❌ Bedrock client failed:", error.message);
    
    console.log("\n🔧 Setup checklist:");
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

export { InteractiveBedrockPayFlow };

import { PayFlowBedrockSetup } from "./bedrock-setup.js";
import { config } from "dotenv";
import * as readline from 'node:readline/promises';

config();

async function setupBedrockIntegration() {
  console.log("🤖 PayFlow Bedrock Integration Setup");
  console.log("=" .repeat(40));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  try {
    // Get configuration
    const region = await rl.question("AWS Region [us-east-1]: ") || "us-east-1";
    const agentName = await rl.question("Agent Name [PayFlow-Agent]: ") || "PayFlow-Agent";
    const roleArn = await rl.question("IAM Role ARN (required): ");
    
    if (!roleArn) {
      throw new Error("IAM Role ARN is required for Bedrock agent");
    }
    
    const mcpEndpoint = await rl.question("MCP Server URL [http://localhost:3402]: ") || "http://localhost:3402";
    
    console.log("\n🔧 Creating Bedrock agent...");
    
    const setup = new PayFlowBedrockSetup(region);
    const agentId = await setup.setupPayFlowAgent({
      region,
      agentName,
      roleArn,
      mcpServerEndpoint: mcpEndpoint
    });
    
    console.log("\n✅ Bedrock agent setup complete!");
    console.log(`Agent ID: ${agentId}`);
    console.log("\n📝 Add to your .env file:");
    console.log(`AWS_REGION=${region}`);
    console.log(`BEDROCK_AGENT_ID=${agentId}`);
    console.log(`BEDROCK_AGENT_ALIAS_ID=TSTALIASID`);
    
    console.log("\n🚀 Next steps:");
    console.log("1. Add the environment variables above");
    console.log("2. Start PayFlow MCP server: npm run dev");
    console.log("3. Run Bedrock client: npm run bedrock");
    
  } catch (error: any) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupBedrockIntegration();
}

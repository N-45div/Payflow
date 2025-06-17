import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getMcpTools } from "@coinbase/agentkit-model-context-protocol";
import { getAgentKit } from "./getAgentKit.js";
import { getPayFlowTools } from "./payflowtools.js";
import { config } from "dotenv";

// Load environment variables
config();

/**
 * PayFlow MCP - Autonomous Payment Flows for AI Agents
 * Combines CDP Wallet (from AgentKit) with x402pay for autonomous payment processing
 */
async function main() {
  const agentKit = await getAgentKit();

  // Get CDP wallet tools from AgentKit
  const { tools: cdpTools, toolHandler: cdpToolHandler } = await getMcpTools(agentKit);
  
  // Get PayFlow-specific tools (x402pay integration)
  const { tools: payflowTools, toolHandler: payflowToolHandler } = await getPayFlowTools(agentKit);

  // Combine all tools
  const allTools = [...cdpTools, ...payflowTools];

  const server = new Server(
    {
      name: "payflow-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const toolName = request.params.name;
      
      // Route to appropriate handler
      if (payflowTools.some(tool => tool.name === toolName)) {
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
  console.log("PayFlow MCP Server running! 🚀💰");
}

main().catch(console.error);

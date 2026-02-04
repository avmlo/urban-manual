/**
 * Base Agent Framework for Agentic AI
 * Provides foundation for autonomous AI agents that can use tools and plan multi-step tasks
 */

export interface Tool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

export interface AgentMemory {
  remember(context: string, data: any): Promise<void>;
  recall(context: string): Promise<any | null>;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  steps?: string[];
}

export abstract class BaseAgent {
  protected tools: Map<string, Tool> = new Map();
  protected memory: AgentMemory;

  constructor(memory?: AgentMemory) {
    this.memory = memory || new InMemoryAgentMemory();
  }

  /**
   * Register a tool for the agent to use
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Use a tool by name
   */
  protected async useTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return await tool.execute(params);
  }

  /**
   * Plan multi-step task execution
   */
  protected async plan(steps: Array<{ name: string; tool: string; params: any }>): Promise<any[]> {
    const results: any[] = [];
    for (const step of steps) {
      try {
        const result = await this.useTool(step.tool, step.params);
        results.push(result);
      } catch (error: any) {
        console.error(`[Agent] Error in step ${step.name}:`, error);
        throw error;
      }
    }
    return results;
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  abstract execute(task: any): Promise<AgentResult>;
}

/**
 * Simple in-memory memory implementation
 */
class InMemoryAgentMemory implements AgentMemory {
  private storage: Map<string, any> = new Map();

  async remember(context: string, data: any): Promise<void> {
    this.storage.set(context, {
      data,
      timestamp: Date.now(),
    });
  }

  async recall(context: string): Promise<any | null> {
    const entry = this.storage.get(context);
    if (!entry) return null;
    
    // Expire after 1 hour
    if (Date.now() - entry.timestamp > 60 * 60 * 1000) {
      this.storage.delete(context);
      return null;
    }
    
    return entry.data;
  }
}


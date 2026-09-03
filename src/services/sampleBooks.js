/**
 * ddrReader - Built-in Sample Virtual Books
 * Preloaded library items with code blocks, callouts, and rich formatting.
 */

import { extractArticleFromHtml } from './extractor.js';
import { buildVirtualBook } from './bookBuilder.js';

export const SAMPLE_BOOKS_DATA = [
  {
    title: 'The Anatomy of Autonomous AI Agents & Tool Calling',
    author: 'AI Systems Engineering Almanac',
    siteName: 'agentic-systems.io',
    sourceUrl: 'https://agentic-systems.io/handbook/agent-architecture',
    coverImage: '',
    rawHtml: `
      <p>Autonomous AI agents represent a fundamental evolution in software engineering. By combining large language models with planning, tool invocation, and persistent memory, agents can execute complex multi-step workflows with human-grade autonomy.</p>
      
      <blockquote>
        <p>[!NOTE] Agentic Architecture Foundation<br>
        An agent differs from a traditional LLM pipeline in its ability to loop reactively, inspect tool results, and iteratively course-correct until its objective is verified.</p>
      </blockquote>

      <h2>1. The Agentic Reasoning Loop (ReAct)</h2>
      <p>The standard pattern for modern AI agents is the <strong>Reasoning + Acting (ReAct)</strong> loop. Rather than generating a single monolithic completion, the model alternates between internal thought traces and external action dispatches.</p>
      
      <p>Key components include:</p>
      <ul>
        <li><mark>Planner Component</mark>: Decomposes goals into verifiable subtasks.</li>
        <li><mark>Execution Engine</mark>: Validates tool call parameters and invokes local or remote APIs.</li>
        <li><mark>Observation Receiver</mark>: Injects tool stdout/stderr back into the conversation context.</li>
      </ul>

      <blockquote>
        <p>[!TIP] Low-Latency Strategy<br>
        Employing speculative execution and streaming tool calls can reduce end-to-end task duration by up to 40% in interactive coding environments.</p>
      </blockquote>

      <h2>2. Tool Definition and Parameter Schemas</h2>
      <p>Tools are declared to models using standard JSON Schemas. Below is a production Python implementation for registering structured agent tools:</p>

      <pre><code class="language-python">from typing import Dict, Any, Callable
import json

class AgentToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {}
        
    def register(self, name: str, description: str, parameters: dict):
        def decorator(func: Callable):
            self._tools[name] = {
                "name": name,
                "description": description,
                "parameters": parameters,
                "handler": func
            }
            return func
        return decorator

    async def execute(self, tool_name: str, args: dict) -> str:
        if tool_name not in self._tools:
            raise ValueError(f"Tool {tool_name} not registered")
        handler = self._tools[tool_name]["handler"]
        return await handler(**args)</code></pre>

      <h2>3. Error Recovery and Self-Correction</h2>
      <p>Real-world environments are non-deterministic. Web pages change, APIs return rate limits, and compiler outputs produce syntax errors.</p>
      
      <blockquote>
        <p>[!WARNING] Infinite Loop Safeguards<br>
        Always configure step bounds and token budget constraints. If an agent repeats identical failing tool calls more than 3 times, trigger an automatic backoff and alternative plan branch.</p>
      </blockquote>

      <p>A resilient agent detects failure signatures in tool responses and dynamically reformulates its strategy before asking for human intervention.</p>
    `
  },
  {
    title: 'Modern High-Performance Web Architectures',
    author: 'Distributed Systems Laboratory',
    siteName: 'modernweb.dev',
    sourceUrl: 'https://modernweb.dev/guides/edge-rendering-and-caching',
    coverImage: '',
    rawHtml: `
      <p>Building high-speed web applications in the modern era requires rethinking traditional client-server boundaries. With edge computing, static asset optimization, and fine-grained reactivity, web performance has achieved single-digit millisecond response times.</p>
      
      <blockquote>
        <p>[!IMPORTANT] Core Web Vitals 2026<br>
        Interaction to Next Paint (INP) and Largest Contentful Paint (LCP) remain the gold standard for measuring real-world user perceived latency.</p>
      </blockquote>

      <h2>1. The Shift to Edge-First Data Fetching</h2>
      <p>Edge networks allow routing requests to the nearest computing cluster within 10ms of the user. By combining distributed key-value caches with stale-while-revalidate protocols, cold-start latency is virtually eliminated.</p>

      <pre><code class="language-typescript">// Edge caching middleware with Stale-While-Revalidate
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const cacheKey = new URL(request.url).toString();
  const cache = caches.default;
  
  let response = await cache.match(cacheKey);
  if (!response) {
    response = await fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    
    response = new Response(response.body, { ...response, headers });
    await cache.put(cacheKey, response.clone());
  }
  return response;
}</code></pre>

      <h2>2. DOM Virtualization & 3D Hardware Acceleration</h2>
      <p>Rendering thousands of items in virtualized reading layouts requires GPU-accelerated layers via CSS <code>transform: translate3d(...)</code> and <code>will-change</code> declarations to prevent layout thrashing.</p>

      <blockquote>
        <p>[!TIP] 60FPS Page Animation Rule<br>
        Never animate <code>top</code>, <code>left</code>, or <code>margin</code> during book page transitions. Always use <code>transform</code> matrix manipulation and opacity.</p>
      </blockquote>
    `
  }
];

export function getSampleVirtualBooks() {
  return SAMPLE_BOOKS_DATA.map(sample => {
    const extracted = extractArticleFromHtml(sample.rawHtml, sample.sourceUrl);
    extracted.title = sample.title;
    extracted.author = sample.author;
    extracted.siteName = sample.siteName;
    return buildVirtualBook(extracted);
  });
}

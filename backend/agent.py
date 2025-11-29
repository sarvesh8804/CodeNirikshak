from langgraph.graph import StateGraph, END

from state import GraphState
from agents import (
    CloneRepoAgent,
    MetadataAgent,
    TechStackAgent,
    FinTechAgent,
    CodeUnderstandingAgent,
    FinTechComplianceAgent,
    SecurityAgent,
    ArchitectureAgent,
    RiskScoringAgent,
    RecommendationAgent,
    IRBuilderAgent,
)

# --- 1. Initialize StateGraph ---
graph = StateGraph(GraphState)

# --- 2. Instantiate agents ---
clone_agent = CloneRepoAgent(name="CloneRepoAgent")
metadata_agent = MetadataAgent(name="MetadataAgent")
techstack_agent = TechStackAgent(name="TechStackAgent")
fintech_agent = FinTechAgent(name="FinTechAgent")

code_understanding_agent = CodeUnderstandingAgent(name="CodeUnderstandingAgent")
compliance_agent = FinTechComplianceAgent(name="FinTechComplianceAgent")
security_agent = SecurityAgent(name="SecurityAgent")
architecture_agent = ArchitectureAgent(name="ArchitectureAgent")
risk_agent = RiskScoringAgent(name="RiskScoringAgent")
recommendation_agent = RecommendationAgent(name="RecommendationAgent")

ir_builder_agent = IRBuilderAgent(name="IRBuilderAgent")

# --- 3. Add Nodes ---
graph.add_node("clone_node", clone_agent.run)
graph.add_node("metadata_node", metadata_agent.run)
graph.add_node("techstack_node", techstack_agent.run)
graph.add_node("fintech_node", fintech_agent.run)

graph.add_node("code_understanding_node", code_understanding_agent.run)
graph.add_node("compliance_node", compliance_agent.run)
graph.add_node("security_node", security_agent.run)
graph.add_node("architecture_node", architecture_agent.run)
graph.add_node("risk_node", risk_agent.run)
graph.add_node("recommendation_node", recommendation_agent.run)

graph.add_node("ir_builder_node", ir_builder_agent.run)

# --- 4. Define Edges / Flow ---

# Entry: clone repo
graph.set_entry_point("clone_node")

# Stage 1: ingestion (parallel)
graph.add_edge("clone_node", "metadata_node")
graph.add_edge("clone_node", "techstack_node")
graph.add_edge("clone_node", "fintech_node")

# Stage 2: agentic orchestration

# Code understanding after we know metadata + tech stack
graph.add_edge("metadata_node", "code_understanding_node")
graph.add_edge("techstack_node", "code_understanding_node")

# Compliance after fintech + code understanding
graph.add_edge("fintech_node", "compliance_node")
graph.add_edge("code_understanding_node", "compliance_node")

# Security after tech stack (needs dependencies etc.)
graph.add_edge("techstack_node", "security_node")

# Architecture after code understanding + metadata + techstack
graph.add_edge("code_understanding_node", "architecture_node")
graph.add_edge("metadata_node", "architecture_node")
graph.add_edge("techstack_node", "architecture_node")

# Risk scoring after compliance + security + architecture
graph.add_edge("compliance_node", "risk_node")
graph.add_edge("security_node", "risk_node")
graph.add_edge("architecture_node", "risk_node")

# Recommendations after risk
graph.add_edge("risk_node", "recommendation_node")

# IR builder at the end, with everything merged into state
graph.add_edge("recommendation_node", "ir_builder_node")

# Final node -> END
graph.add_edge("ir_builder_node", END)

# --- 5. Compile the Graph ---
app = graph.compile()


def run_pipeline(repo_url: str):
    """
    Runs the compiled LangGraph pipeline with the given repository URL.
    Returns the final IR result dictionary.
    """
    initial_state = {"repo_url": repo_url}
    final_state = app.invoke(initial_state)
    return final_state.get("ir_build_result")
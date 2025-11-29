import os
import uuid
import git
import logging
import json
from pathlib import Path
from typing import Dict, Any, List

from google import genai
from google.genai import types

from state import GraphState  # type: ignore

# -------------------- Logging --------------------
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# -------------------- Configuration --------------------
API_KEY = os.getenv("GENAI_API_KEY", "YOUR_FALLBACK_KEY")

try:
    if not API_KEY:
        logging.warning("GENAI_API_KEY not set. Agents will use fallback data.")
    gemini_client = genai.Client(api_key=API_KEY)
except Exception as e:
    logging.error(f"Failed to initialize Gemini Client: {e}")
    gemini_client = None

# -------------------- Helpers --------------------
IGNORE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".next",
    "dist",
    "build",
    ".idea",
    ".vscode",
}
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".pdf",
    ".exe", ".dll", ".so", ".dylib",
    ".zip", ".tar", ".gz", ".tgz", ".rar", ".7z", ".jar",
    ".class", ".wasm", ".pack"
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".jsx": "JavaScript", ".java": "Java", ".kt": "Kotlin", ".go": "Go",
    ".rb": "Ruby", ".php": "PHP", ".cs": "C#", ".cpp": "C++", ".c": "C",
    ".rs": "Rust", ".swift": "Swift"
}

FINTECH_KEYWORDS = [
    "upi", "kyc", "aadhaar", "aadhar", "wallet", "balance", "ledger", "transaction",
    "txn", "payment", "payout", "refund", "settlement", "ifsc", "account_number",
    "iban", "swift", "encrypt", "encryption", "rsa", "aes", "razorpay", "stripe",
    "cashfree", "paytm", "phonepe", "otp", "2fa", "mfa"
]

SECURITY_KEYWORDS = [
    "secret", "jwt", "token", "password", "passwd", "api_key", "apikey",
    "private_key", "access_key", "auth", "authorization", "csrf", "xss",
    "sql injection", "sqlinjection", "hash", "bcrypt", "scrypt", "salt",
]

def is_ignored(path: Path, root: Path) -> bool:
    parts = path.relative_to(root).parts
    return any(part in IGNORE_DIRS for part in parts)

def get_commit_count(repo_path: str) -> int:
    try:
        if not os.path.exists(os.path.join(repo_path, '.git')):
            return 0
        repo = git.Repo(repo_path)
        return int(repo.git.rev_list('--count', 'HEAD'))
    except Exception:
        return 0

def count_files(repo_path: str) -> int:
    count = 0
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        count += len(files)
    return count

def build_directory_tree(root: Path, max_depth: int = 4) -> Dict[str, Any]:
    def _build(node: Path, depth: int) -> Dict[str, Any]:
        if depth > max_depth:
            return {"type": "dir", "name": node.name, "children": "...truncated..."}
        if node.is_file():
            return {"type": "file", "name": node.name}
        children = []
        for child in sorted(node.iterdir(), key=lambda p: p.name):
            if is_ignored(child, root):
                continue
            children.append(_build(child, depth + 1))
        return {"type": "dir", "name": node.name, "children": children}
    return _build(root, 0)

def detect_languages(root: Path) -> Dict[str, int]:
    lang_counts: Dict[str, int] = {}
    for path in root.rglob("*"):
        if not path.is_file() or is_ignored(path, root):
            continue
        lang = EXTENSION_LANGUAGE_MAP.get(path.suffix.lower())
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1
    return lang_counts

def parse_package_json(path: Path) -> Dict[str, str]:
    deps: Dict[str, str] = {}
    if not path.is_file():
        return deps
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        for section in ["dependencies", "devDependencies", "peerDependencies"]:
            for name, version in data.get(section, {}).items():
                deps[name] = version
    except Exception:
        pass
    return deps

def parse_requirements_txt(path: Path) -> Dict[str, str]:
    deps: Dict[str, str] = {}
    if not path.is_file():
        return deps
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        for sep in ["==", ">=", "<=", "~=", ">", "<"]:
            if sep in line:
                name, version = line.split(sep, 1)
                deps[name.strip()] = f"{sep}{version.strip()}"
                break
        else:
            deps[line] = ""
    return deps

def collect_dependencies(root: Path) -> List[Dict[str, Any]]:
    dep_infos: List[Dict[str, Any]] = []
    for path in root.rglob("*"):
        if not path.is_file() or is_ignored(path, root):
            continue
        rel = str(path.relative_to(root))
        if path.name == "package.json":
            dep_infos.append(
                {
                    "ecosystem": "node",
                    "file": rel,
                    "dependencies": parse_package_json(path),
                }
            )
        elif path.name == "requirements.txt":
            dep_infos.append(
                {
                    "ecosystem": "python",
                    "file": rel,
                    "dependencies": parse_requirements_txt(path),
                }
            )
    return dep_infos

def detect_frameworks(dep_infos: List[Dict[str, Any]]) -> List[str]:
    frameworks = set()
    for info in dep_infos:
        names = [name.lower() for name in info["dependencies"].keys()]
        if info["ecosystem"] == "python":
            if "django" in names:
                frameworks.add("Django")
            if "fastapi" in names:
                frameworks.add("FastAPI")
            if "flask" in names:
                frameworks.add("Flask")
        if info["ecosystem"] == "node":
            if "react" in names:
                frameworks.add("React")
            if "next" in names or "nextjs" in names:
                frameworks.add("Next.js")
            if "express" in names:
                frameworks.add("Express")
    return list(frameworks)

def heuristic_fintech_scan(root: Path, max_files: int = 400) -> List[Dict[str, Any]]:
    matched_files: Dict[str, List[str]] = {}
    scanned = 0
    for path in root.rglob("*"):
        if scanned >= max_files:
            break
        if (
            not path.is_file()
            or is_ignored(path, root)
            or path.suffix.lower() in BINARY_EXTENSIONS
        ):
            continue
        scanned += 1
        text = path.read_text(encoding="utf-8", errors="ignore").lower()
        hits = [kw for kw in FINTECH_KEYWORDS if kw in text]
        if hits:
            matched_files[str(path.relative_to(root))] = hits
    components = []
    if matched_files:
        components.append(
            {
                "name": "heuristic_fintech",
                "type": "heuristic",
                "evidence_files": list(matched_files.keys()),
                "keywords": matched_files,
            }
        )
    return components


# --- helper to sample file contents for LLMs ---
def sample_files_for_llm(
    repo_root: Path, rel_paths: List[str], max_total_chars: int = 15000
) -> Dict[str, str]:
    snippets: Dict[str, str] = {}
    remaining = max_total_chars
    for rel in rel_paths:
        if remaining <= 0:
            break
        path = repo_root / rel
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if len(content) > remaining:
            content = content[:remaining]
        snippets[rel] = content
        remaining -= len(content)
    return snippets


# -------------------- Gemini SDK Helper --------------------
def call_gemini_sdk(prompt: str, system_prompt: str, model: str = "gemini-2.5-flash") -> dict:
    if not API_KEY or gemini_client is None:
        logging.warning("Gemini client not initialized, returning empty LLM output.")
        return {}
    try:
        content = types.Content(
            role="user",
            parts=[types.Part.from_text(prompt)],
        )
        response = gemini_client.models.generate_content(
            model=model,
            contents=[content],
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
                system_instruction=system_prompt,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        logging.error(f"Gemini SDK call failed: {e}")
        return {}

# -------------------- Stage 1 Agents (Ingestion) --------------------
class CloneRepoAgent:
    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_url = state["repo_url"]
        storage_path = Path("storage/repos")
        repo_id = str(uuid.uuid4())
        repo_path = storage_path / repo_id
        os.makedirs(repo_path, exist_ok=True)
        git.Repo.clone_from(repo_url, repo_path, depth=1)
        return {"repo_id": repo_id, "repo_path": str(repo_path)}


class MetadataAgent:
    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        return {
            "metadata": {
                "total_files_sampled": count_files(repo_path),
                "commit_count": get_commit_count(str(repo_path)),
            }
        }


class TechStackAgent:
    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        languages = detect_languages(repo_path)
        deps = collect_dependencies(repo_path)
        frameworks = detect_frameworks(deps)

        summary = {
            "languages": languages,
            "frameworks": frameworks,
            "dependencies": deps,
        }
        system_prompt = (
            "You are a tech stack analyzer. Refine the following repo tech info. "
            "Return JSON with keys: languages, frameworks, noteworthy_dependencies."
        )
        llm_output = call_gemini_sdk(
            prompt=json.dumps(summary), system_prompt=system_prompt
        )
        return {
            "techstack": {
                "languages": languages,
                "frameworks": frameworks,
                "dependencies": deps,
                "llm_output": llm_output,
            }
        }


class FinTechAgent:
    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        heuristic_components = heuristic_fintech_scan(repo_path)
        system_prompt = (
            "You are a FinTech module detector. Given heuristic components, "
            "refine and group fintech-related modules. Return JSON with keys: "
            "components (list), fintech_confidence (0-100), notes."
        )
        llm_output = call_gemini_sdk(
            prompt=json.dumps(heuristic_components), system_prompt=system_prompt
        )
        return {
            "fintech": {
                "heuristic": heuristic_components,
                "llm_output": llm_output,
            }
        }

# -------------------- NEW: Stage 2 Orchestration Agents --------------------

class CodeUnderstandingAgent:
    """
    Agent 1 — Code Understanding Agent
    - Creates semantic understanding of the repo
    - Identifies main components, data models, routes, business flows
    """

    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        metadata = state.get("metadata", {})
        techstack = state.get("techstack", {})
        fintech = state.get("fintech", {})

        directory_tree = build_directory_tree(repo_path, max_depth=4)

        payload = {
            "metadata": metadata,
            "techstack": {
                "languages": techstack.get("languages"),
                "frameworks": techstack.get("frameworks"),
            },
            "fintech": fintech.get("llm_output") or fintech.get("heuristic"),
            "directory_tree": directory_tree,
        }

        system_prompt = """
You are Agent 1: CODE UNDERSTANDING AGENT in a multi-agent FinTech risk analysis system.

Goal:
- Build a semantic understanding of the repository.
- Infer main services, modules, data models, and business flows.
- Focus on FinTech: payments, wallets, KYC, UPI, ledgers, reconciliation, risk rules, etc.

Return ONLY JSON in this exact shape:

{
  "high_level_description": "string",
  "main_components": [
    {
      "name": "string",
      "type": "service|api|worker|library|ui|infra|other",
      "description": "string",
      "key_files": ["relative/path1", "relative/path2"]
    }
  ],
  "data_models": [
    {
      "name": "string",
      "description": "string",
      "probable_storage": "sql|nosql|in-memory|unknown",
      "fields_hint": ["string"]
    }
  ],
  "api_endpoints": [
    {
      "method": "GET|POST|PUT|DELETE|OTHER",
      "path": "string or pattern",
      "description": "string",
      "related_business_flow": "string"
    }
  ],
  "business_flows": [
    {
      "name": "string",
      "description": "string",
      "steps": ["string"]
    }
  ],
  "suspicious_or_critical_modules": [
    {
      "reason": "string",
      "related_files": ["relative/path"],
      "notes": "string"
    }
  ]
}
"""
        llm_output = call_gemini_sdk(
            prompt=json.dumps(payload), system_prompt=system_prompt
        )
        return {"code_understanding": llm_output or {}}


class FinTechComplianceAgent:
    """
    Agent 2 — FinTech Compliance Agent

    Checks repository against:
    - RBI guidelines
    - PCI-DSS
    - KYC/AML
    - GDPR/DPDP
    - Encryption & data handling standards
    """

    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        fintech_data = state.get("fintech", {})
        techstack = state.get("techstack", {})

        evidence_files: List[str] = []
        heuristic = fintech_data.get("heuristic") or []
        for comp in heuristic:
            evidence_files.extend(comp.get("evidence_files", []))
        evidence_files = list(dict.fromkeys(evidence_files))  # dedupe

        snippets = sample_files_for_llm(repo_path, evidence_files, max_total_chars=15000)

        payload = {
            "techstack": {
                "languages": techstack.get("languages"),
                "frameworks": techstack.get("frameworks"),
            },
            "fintech_heuristic": heuristic,
            "fintech_llm": fintech_data.get("llm_output"),
            "code_snippets": snippets,
        }

        system_prompt = """
You are Agent 2: FINTECH COMPLIANCE AGENT.

Jurisdictions & rules to consider (assume Indian FinTech + global best practices):
- RBI guidelines for payment aggregators, wallets, UPI apps
- PCI-DSS for card handling
- KYC / AML
- GDPR / DPDP for data privacy
- Encryption and data-at-rest/data-in-transit handling

Given:
- techstack
- fintech components
- partial code snippets

1. Identify possible compliance areas and violations.
2. Focus heavily on:
   - storage of PII and financial data
   - logging of sensitive fields
   - authentication & authorization boundaries
   - audit trails and transaction logs
   - data retention & deletion

Return ONLY JSON with structure:

{
  "overall_compliance_score": 0-100,
  "regulations": {
    "RBI": {
      "score": 0-100,
      "issues": ["string"],
      "notes": "string"
    },
    "PCI_DSS": {
      "score": 0-100,
      "issues": ["string"],
      "notes": "string"
    },
    "KYC_AML": {
      "score": 0-100,
      "issues": ["string"],
      "notes": "string"
    },
    "GDPR_DPDP": {
      "score": 0-100,
      "issues": ["string"],
      "notes": "string"
    },
    "Encryption_Data_Handling": {
      "score": 0-100,
      "issues": ["string"],
      "notes": "string"
    }
  },
  "high_risk_areas": [
    {
      "title": "string",
      "description": "string",
      "related_files": ["relative/path"],
      "regulation_refs": ["RBI", "PCI_DSS", "KYC_AML", "GDPR_DPDP", "Encryption_Data_Handling"]
    }
  ]
}
"""
        llm_output = call_gemini_sdk(
            prompt=json.dumps(payload), system_prompt=system_prompt
        )
        return {"compliance": llm_output or {}}


class SecurityAgent:
    """
    Agent 3 — Security Agent

    Performs:
    - Vulnerability scanning
    - Secret leakage detection
    - Dependency risk
    - API misuse
    """

    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        techstack = state.get("techstack", {})

        matched_files: List[str] = []
        scanned = 0
        max_files = 400

        for path in repo_path.rglob("*"):
            if scanned >= max_files:
                break
            if (
                not path.is_file()
                or is_ignored(path, repo_path)
                or path.suffix.lower() in BINARY_EXTENSIONS
            ):
                continue
            scanned += 1
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
            if any(kw in text for kw in SECURITY_KEYWORDS):
                matched_files.append(str(path.relative_to(repo_path)))

        matched_files = list(dict.fromkeys(matched_files))
        snippets = sample_files_for_llm(repo_path, matched_files, max_total_chars=15000)

        payload = {
            "techstack": {
                "languages": techstack.get("languages"),
                "frameworks": techstack.get("frameworks"),
                "dependencies": techstack.get("dependencies"),
            },
            "security_related_files": matched_files,
            "security_snippets": snippets,
        }

        system_prompt = """
You are Agent 3: SECURITY AGENT.

Focus on:
- Hard-coded secrets (keys, tokens, passwords)
- Insecure JWT handling
- Missing CSRF protection
- SQL injection / command injection patterns
- Insecure deserialization
- Insecure use of crypto (e.g., ECB mode, weak hashes)
- Dependency risks (very old libraries, vulnerable libraries in FinTech context)
- Open admin/debug endpoints

Return ONLY JSON with structure:

{
  "overall_security_score": 0-100,
  "vulnerabilities": [
    {
      "severity": "low|medium|high|critical",
      "title": "string",
      "description": "string",
      "evidence_files": ["relative/path"],
      "suggested_fix": "string"
    }
  ],
  "secrets_found": [
    {
      "type": "api_key|password|token|other",
      "location": "relative/path",
      "notes": "string"
    }
  ],
  "dependency_risks": [
    {
      "package": "string",
      "version": "string",
      "risk": "string",
      "notes": "string"
    }
  ]
}
"""
        llm_output = call_gemini_sdk(
            prompt=json.dumps(payload), system_prompt=system_prompt
        )
        return {"security": llm_output or {}}


class ArchitectureAgent:
    """
    Agent 4 — Architecture Agent

    Evaluates:
    - Scalability
    - Maintainability
    - Microservices vs monolith
    - Coupling / cohesion
    - Fault tolerance
    """

    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        repo_path = Path(state["repo_path"])
        metadata = state.get("metadata", {})
        techstack = state.get("techstack", {})
        code_understanding = state.get("code_understanding", {})

        directory_tree = build_directory_tree(repo_path, max_depth=4)

        payload = {
            "metadata": metadata,
            "techstack": {
                "languages": techstack.get("languages"),
                "frameworks": techstack.get("frameworks"),
            },
            "directory_tree": directory_tree,
            "code_understanding": code_understanding,
        }

        system_prompt = """
You are Agent 4: ARCHITECTURE AGENT.

Given:
- high-level understanding of the codebase
- directory structure
- languages / frameworks / metadata

Evaluate:
- Architecture style (monolith, layered, microservices, modular monolith, etc.)
- Scalability
- Maintainability
- Fault tolerance
- Observability (logging, metrics)
- Coupling/cohesion
- FinTech suitability (reliability, traceability)

Return ONLY JSON with structure:

{
  "architecture_style": "string",
  "summary": "string",
  "score": {
    "architecture": 0-100,
    "scalability": 0-100,
    "maintainability": 0-100,
    "fault_tolerance": 0-100,
    "observability": 0-100
  },
  "key_components": [
    {
      "name": "string",
      "role": "api|worker|db|cache|queue|other",
      "notes": "string"
    }
  ],
  "risks": [
    {
      "title": "string",
      "impact": "low|medium|high|critical",
      "description": "string",
      "related_files": ["relative/path"]
    }
  ]
}
"""
        llm_output = call_gemini_sdk(
            prompt=json.dumps(payload), system_prompt=system_prompt
        )
        return {"architecture": llm_output or {}}


class RiskScoringAgent:
    """
    Agent 5 — Risk Scoring Agent

    Computes overall risk based on:
    - Compliance
    - Security
    - Architecture
    - Metadata (history, size)
    """

    def __init__(self, name: str):
        self.name = name

    @staticmethod
    def _score_from(d: dict | None, key: str, default: int = 50) -> int:
        if not isinstance(d, dict):
            return default
        value = d.get(key)
        if isinstance(value, (int, float)):
            return int(value)
        return default

    def run(self, state: GraphState) -> dict:
        compliance = state.get("compliance", {})
        security = state.get("security", {})
        architecture = state.get("architecture", {})
        metadata = state.get("metadata", {})

        compliance_score = self._score_from(compliance, "overall_compliance_score", 60)
        security_score = self._score_from(security, "overall_security_score", 60)
        architecture_score = self._score_from(
            architecture.get("score", {}), "architecture", 60
        )

        commit_count = metadata.get("commit_count", 0) or 0
        total_files = metadata.get("total_files_sampled", 0) or 0

        # crude heuristics for code health / bus factor
        code_health_score = 70
        if total_files > 1000:
            code_health_score -= 5
        if commit_count < 20:
            code_health_score -= 10

        # weighted overall risk (higher = better)
        overall_score = int(
            0.3 * compliance_score
            + 0.35 * security_score
            + 0.2 * architecture_score
            + 0.15 * code_health_score
        )

        risk_level = "low"
        if overall_score < 40:
            risk_level = "critical"
        elif overall_score < 60:
            risk_level = "high"
        elif overall_score < 75:
            risk_level = "medium"

        risk_object = {
            "overall_score": overall_score,
            "risk_level": risk_level,
            "dimensions": {
                "compliance": compliance_score,
                "security": security_score,
                "architecture": architecture_score,
                "code_health": code_health_score,
            },
            "metadata": {
                "commit_count": commit_count,
                "total_files_sampled": total_files,
            },
        }

        return {"risk": risk_object}


class RecommendationAgent:
    """
    Agent 6 — Recommendation Agent

    Takes all previous agent outputs and generates:
    - Red flags
    - Priority fix list
    - 7/30/60/90 day roadmap
    """

    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        payload = {
            "metadata": state.get("metadata"),
            "techstack": state.get("techstack"),
            "fintech": state.get("fintech"),
            "code_understanding": state.get("code_understanding"),
            "compliance": state.get("compliance"),
            "security": state.get("security"),
            "architecture": state.get("architecture"),
            "risk": state.get("risk"),
        }

        system_prompt = """
You are Agent 6: RECOMMENDATION AGENT.

Audience:
- Founders / investors (executive summary)
- Engineering team (detailed actions)

Using all the previous agent outputs, produce:

1. Executive summary
2. Red flags (ranked)
3. Priority fix list with estimated effort
4. 7 / 30 / 60 / 90 day roadmap

Return ONLY JSON with structure:

{
  "executive_summary": "string",
  "red_flags": [
    {
      "title": "string",
      "severity": "low|medium|high|critical",
      "description": "string",
      "related_scores": ["compliance", "security", "architecture", "code_health"]
    }
  ],
  "priority_fixes": [
    {
      "title": "string",
      "priority": "P0|P1|P2|P3",
      "estimated_effort_days": 1,
      "owner_hint": "backend|frontend|devops|security|compliance",
      "notes": "string"
    }
  ],
  "roadmap": {
    "7_days": ["string"],
    "30_days": ["string"],
    "60_days": ["string"],
    "90_days": ["string"]
  }
}
"""
        llm_output = call_gemini_sdk(
            prompt=json.dumps(payload), system_prompt=system_prompt
        )
        return {"recommendations": llm_output or {}}


# -------------------- IR Builder Agent (updated) --------------------
class IRBuilderAgent:
    def __init__(self, name: str):
        self.name = name

    def run(self, state: GraphState) -> dict:
        return {
            "ir_build_result": {
                "repo_id": state.get("repo_id"),
                "repo_path": state.get("repo_path"),
                "metadata": state.get("metadata"),
                "techstack": state.get("techstack"),
                "fintech": state.get("fintech"),
                "code_understanding": state.get("code_understanding"),
                "compliance": state.get("compliance"),
                "security": state.get("security"),
                "architecture": state.get("architecture"),
                "risk": state.get("risk"),
                "recommendations": state.get("recommendations"),
            }
        }
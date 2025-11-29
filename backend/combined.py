import os
import re
import json
import time
import base64
import logging
import shutil
import subprocess
import tempfile
from typing import List, Optional
from urllib.parse import urlparse
from datetime import datetime # Added for PyMongo timestamp

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from git import Repo
from pymongo import MongoClient, UpdateOne # Added PyMongo

# --- Global Configuration & Setup ---

# Load environment variables
load_dotenv()
print("GITHUB_TOKEN = ", os.getenv("GITHUB_TOKEN")) 

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN") 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGO_URI = os.getenv("MONGO_URI") # Added MONGO_URI

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY env var is required")

genai.configure(api_key=GEMINI_API_KEY)

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- MongoDB Setup ---
DB_CLIENT = None
DB_COLLECTION = None
if MONGO_URI:
    try:
        # Initialize MongoDB Client
        DB_CLIENT = MongoClient(MONGO_URI)
        
        # Access the specific database and collection
        DB_DATABASE = DB_CLIENT.get_database('repo_analyzer_db')
        DB_COLLECTION = DB_DATABASE.get_collection('analysis_cache')
        
        # Ensure the githubUrl is a unique index for quick lookup
        DB_COLLECTION.create_index("githubUrl", unique=True)
        logger.info("Successfully connected to MongoDB and created index.")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        DB_CLIENT = None
        DB_COLLECTION = None
else:
    logger.warning("MONGO_URI env var is missing. Database caching functionality disabled.")


# System command configurations for the /analyze endpoint
GIT_CMD = ["git"]
PYLINT_CMD = ["pylint"]
BANDIT_CMD = ["bandit"]
SEMGREP_CMD = ["semgrep"]
ESLINT_CMD = ["eslint"]
TSC_CMD = ["tsc", "--noEmit", "--allowJs"]

# --- Pydantic models for /allstats (GitHub Code Extraction) ---

class ExtractionOptions(BaseModel):
    # Default include: Python + JS + TS + JSX + TSX + HTML + CSS
    includeExtensions: List[str] = Field(
        default_factory=lambda: [
            "py", "js", "ts", "tsx", "jsx", "html", "css"
        ]
    )

    # Exclude these by default
    excludeExtensions: List[str] = Field(
        default_factory=lambda: ["md", "png", "jpg"]
    )

    # Excluded directories
    excludeDirectories: List[str] = Field(
        default_factory=lambda: ["node_modules", "dist", ".git"]
    )

    maxFileSize: int = 200000
    maxFiles: int = 200


class GitHubRepoIn(BaseModel):
    github_url: str
    options: ExtractionOptions = Field(default=ExtractionOptions())

class GitHubFileOut(BaseModel):
    path: str
    content: str
    size: int
    language: str

class GitHubRepositoryOut(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    description: Optional[str] = None
    html_url: Optional[str] = None
    clone_url: Optional[str] = None
    language: Optional[str] = None
    stargazers_count: Optional[int] = 0
    forks_count: Optional[int] = 0
    open_issues_count: Optional[int] = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ExtractedCodeOut(BaseModel):
    repository: GitHubRepositoryOut
    files: List[GitHubFileOut]
    totalFiles: int
    totalSize: int
    extractedAt: str

class CodeSummaryOut(BaseModel):
    overview: str
    keyFeatures: List[str]
    techStack: List[str]
    projectStructure: str
    gettingStarted: str
    mainFiles: List[str]
    complexity: str
    estimatedReadingTime: str
    futureScope: str
    roadmap: List[dict]
    pitchDeck: Optional[str] = None

class AllStatsResponse(BaseModel):
    extractedCode: ExtractedCodeOut
    technicalSummary: CodeSummaryOut
    nonTechnicalSummary: str
    raw_ai_text: str

# --- Pydantic model for /analyze (Repo Analysis) ---

class RepoRequest(BaseModel):
    github_url: str


# --- Helper functions for /allstats endpoint ---

GITHUB_API_HEADERS = {"Accept": "application/vnd.github.v3+json"}
if GITHUB_TOKEN:
    GITHUB_API_HEADERS["Authorization"] = f"token {GITHUB_TOKEN}"

def parse_github_owner_repo(github_url: str):
    """
    Accepts full repo URL like https://github.com/owner/repo or git@github.com:owner/repo.git
    Returns (owner, repo)
    """
    # Try HTTP URL form
    try:
        parsed = urlparse(github_url)
        if parsed.scheme in ("http", "https"):
            parts = parsed.path.strip("/").split("/")
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1].replace(".git", "")
                return owner, repo
    except Exception:
        pass

    # Try git@github.com:owner/repo.git
    if github_url.startswith("git@"):
        try:
            path = github_url.split(":", 1)[1]
            owner, repo = path.split("/")[:2]
            repo = repo.replace(".git", "")
            return owner, repo
        except Exception:
            pass

    raise ValueError("Unable to parse GitHub URL. Use https://github.com/owner/repo or git@...")

def github_api_get(path: str, params: dict = None):
    url = f"https://api.github.com{path}"
    resp = requests.get(url, headers=GITHUB_API_HEADERS, params=params, timeout=30)
    if resp.status_code == 403 and "rate limit" in resp.text.lower():
        raise HTTPException(status_code=429, detail="GitHub rate limit exceeded")
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=f"GitHub API error: {resp.text}")
    return resp.json()

def get_repo_metadata(owner: str, repo: str) -> GitHubRepositoryOut:
    data = github_api_get(f"/repos/{owner}/{repo}")
    return GitHubRepositoryOut(
        id=data.get("id"),
        name=data.get("name"),
        full_name=data.get("full_name"),
        description=data.get("description"),
        html_url=data.get("html_url"),
        clone_url=data.get("clone_url"),
        language=data.get("language"),
        stargazers_count=data.get("stargazers_count", 0),
        forks_count=data.get("forks_count", 0),
        open_issues_count=data.get("open_issues_count", 0),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )

def get_repo_contents_recursive(owner: str, repo: str, path: str = ""):
    """
    Uses GitHub Contents API to list files and directories recursively.
    Returns list of items (as returned by GitHub contents API).
    """
    items = []
    resp = github_api_get(f"/repos/{owner}/{repo}/contents/{path}" if path else f"/repos/{owner}/{repo}/contents")
    # When path points to a file, GitHub returns a dict for file; handle that
    if isinstance(resp, dict) and resp.get("type") == "file":
        return [resp]
    for item in resp:
        items.append(item)
    # if any items are directories, handle recursion in caller
    return items

def download_file_content(download_url: str) -> str:
    # For raw files, use download_url
    if not download_url:
        return ""
    r = requests.get(download_url, headers=GITHUB_API_HEADERS, timeout=30)
    if not r.ok:
        # sometimes contents endpoint returns base64 content; attempt fallback
        return ""
    return r.text

def get_language_from_extension(filename: str) -> str:
    extension = (filename.split(".")[-1] or "").lower()
    language_map = {
        'js': 'JavaScript', 'jsx': 'JavaScript',
        'ts': 'TypeScript', 'tsx': 'TypeScript',
        'py': 'Python', 'java': 'Java', 'cpp': 'C++', 'c': 'C',
        'cs': 'C#', 'php': 'PHP', 'rb': 'Ruby', 'go': 'Go',
        'rs': 'Rust', 'swift': 'Swift', 'kt': 'Kotlin',
        'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'sass': 'Sass',
        'json': 'JSON', 'xml': 'XML', 'yaml': 'YAML', 'yml': 'YAML',
        'md': 'Markdown', 'sql': 'SQL', 'sh': 'Shell', 'dockerfile': 'Docker'
    }
    return language_map.get(extension, 'Text')

def should_include_file(item: dict, options: ExtractionOptions) -> bool:
    name = item.get("name", "")
    path = item.get("path", "")
    size = item.get("size", 0) or 0

    # size check
    if size > options.maxFileSize:
        return False

    # exclude directories check (path contains)
    for d in options.excludeDirectories:
        if d and d.lower() in path.lower():
            return False

    # extension checks
    extension = name.split(".")[-1].lower() if "." in name else ""
    if extension in [e.lower() for e in options.excludeExtensions]:
        return False

    if options.includeExtensions:
        # if includeExtensions provided, require extension to be in it
        return extension in [e.lower() for e in options.includeExtensions]

    return True

# --- Build prompt (identical to your TS) ---

def build_prompt_for_extracted_code(repository: GitHubRepositoryOut, files: List[GitHubFileOut]) -> str:
    file_names = ", ".join([os.path.basename(f.path) for f in files])
    introduction = (
        f"This project contains the following key files: {file_names}. "
        "These files indicate that the project is likely a web-based application with components, services, and types organized for scalability and maintainability."
    )

    code_snippets = ""
    # Only use first 20 files for snippets to keep prompt size manageable
    for f in files[:20]:
        content = f.content
        if len(content) > 2000:
            content = content[:2000] + "...[truncated]"
        code_snippets += f"\nFile: {f.path} ({f.language})\n{content}\n---\n"

    prompt = f"""
Analyze this GitHub repository and provide three types of summaries:

1. **Technical Summary**:
- Repository: {repository.full_name}
- Description: {repository.description or 'No description provided'}
- Primary Language: {repository.language or 'Not specified'}
- Stars: {repository.stargazers_count}
- Forks: {repository.forks_count}

Introduction:
{introduction}

Code Files ({len(files)} total files):
{code_snippets}

Please provide a JSON response with the following structure. Do not include any text before or after the JSON block.
{{
  "overview": "A comprehensive overview of what this project does and its main purpose",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "techStack": ["technology1", "technology2", "technology3"],
  "projectStructure": "Description of how the project is organized",
  "gettingStarted": "Brief guide on how to get started with this project",
  "mainFiles": ["important_file1.js", "important_file2.py"],
  "complexity": "Low|Medium|High",
  "estimatedReadingTime": "X minutes",
  "futureScope": "Potential future improvements or extensions for this project",
  "roadmap": [
    {{ "step": "Step 1", "description": "Define the project goals and objectives." }},
    {{ "step": "Step 2", "description": "Set up the development environment and tools." }},
    {{ "step": "Step 3", "description": "Develop the core features and functionalities." }},
    {{ "step": "Step 4", "description": "Test and debug the application thoroughly." }},
    {{ "step": "Step 5", "description": "Deploy the application to the production environment." }},
    {{ "step": "Step 6", "description": "Gather user feedback and iterate on improvements." }}
  ],
  "pitchDeck": "A concise, persuasive pitch deck for this project, suitable for investors or stakeholders."
}}

2. **Non-Technical Summary**:
- What this project is and its main purpose.
- Who the target audience or users are.
- The key features and benefits of the project.
- The technologies or tools used, described in simple terms.

3. **Roadmap**:
- A step-by-step plan for the project, including key milestones and objectives.

Provide the technical summary in JSON format inside ```json ...```.
Provide the non-technical summary and roadmap in plain text.
"""
    return prompt

# --- Call Gemini & parse for /allstats ---

def call_gemini_and_parse(prompt: str):
    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content(prompt)
        ai_text = response.text or ""
    except Exception as e:
        logger.exception("Gemini API error")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")

    # Find JSON block inside ```json ... ```
    json_match = re.search(r"```json\s*([\s\S]*?)\s*```", ai_text)
    technical_summary = None
    if json_match:
        json_block = json_match.group(1)
        try:
            technical_summary = json.loads(json_block)
        except Exception as e:
            logger.exception("Failed to parse JSON block from AI")
            technical_summary = {
                "overview": "Unable to parse technical summary.",
                "keyFeatures": [],
                "techStack": [],
                "projectStructure": "",
                "gettingStarted": "",
                "mainFiles": [],
                "complexity": "Low",
                "estimatedReadingTime": "Unknown",
                "futureScope": "No future scope provided.",
                "roadmap": [],
                "pitchDeck": ""
            }
    else:
        technical_summary = {
            "overview": "Unable to parse technical summary.",
            "keyFeatures": [],
            "techStack": [],
            "projectStructure": "",
            "gettingStarted": "",
            "mainFiles": [],
            "complexity": "Low",
            "estimatedReadingTime": "Unknown",
            "futureScope": "No future scope provided.",
            "roadmap": [],
            "pitchDeck": ""
        }

    # Extract non-technical summary (after the section marker)
    parts = ai_text.split("2. **Non-Technical Summary**:")
    non_tech = parts[1].strip() if len(parts) > 1 else "Non-technical summary not provided."

    return technical_summary, non_tech, ai_text

# --- Helper functions for /analyze endpoint ---

def run_command(cmd, cwd=None):
    try:
        # Use shell=False for security and clearer command structure
        result = subprocess.run(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=False # MUST use shell=False for security and clarity
        )
        return result.stdout.strip()
    except Exception as e:
        return str(e)


def generate_gemini_summary(log_content: str):
    """Call Gemini API to summarize error logs."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
Analyze the following error log for tools (pylint, eslint, tsc, bandit, semgrep).
Group issues by:
- High Risk
- Medium Risk
- Low Risk

Give actionable (short) advice per file.

Error log:
{log_content}

---
Summary:
"""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Gemini API error: {e}"

# --- FastAPI App Initialization ---

app = FastAPI(title="Combined Repo Analyzer with Gemini", version="2.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clean up client connection when FastAPI shuts down (good practice)
@app.on_event("shutdown")
def shutdown_db_client():
    if DB_CLIENT:
        DB_CLIENT.close()
        logger.info("Closed MongoDB connection.")


# --- /allstats Endpoint (Code Extraction & Technical/Non-Technical Summary) ---

@app.post("/allstats", response_model=AllStatsResponse)
def allstats(payload: GitHubRepoIn):
    github_url = payload.github_url
    options = payload.options or ExtractionOptions()

    try:
        owner, repo = parse_github_owner_repo(github_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1) repo metadata
    repo_meta = get_repo_metadata(owner, repo)

    # 2) recursively walk repository contents and collect files
    collected_files: List[GitHubFileOut] = []
    to_process_paths = [""] # start at root

    while to_process_paths and len(collected_files) < options.maxFiles:
        current_path = to_process_paths.pop(0)
        try:
            items = get_repo_contents_recursive(owner, repo, current_path)
        except HTTPException as e:
            logger.error(f"Error listing contents at {current_path}: {e.detail}")
            break

        for item in items:
            if len(collected_files) >= options.maxFiles:
                break

            item_type = item.get("type")
            if item_type == "file":
                if not should_include_file(item, options):
                    continue

                download_url = item.get("download_url")
                size = item.get("size", 0) or 0

                content = ""
                if download_url:
                    try:
                        content = download_file_content(download_url)
                    except Exception:
                        content = ""

                # Fallback logic not implemented from original, relying on download_url
                # if GitHub contents endpoint included 'content' base64 (rare for list),

                language = get_language_from_extension(item.get("name", ""))
                collected_files.append(GitHubFileOut(
                    path=item.get("path"),
                    content=content,
                    size=size,
                    language=language
                ))
            elif item_type == "dir":
                # check excludeDirectories
                is_excluded = any(d and d.lower() in item.get("path", "").lower() for d in options.excludeDirectories)
                if not is_excluded:
                    to_process_paths.append(item.get("path"))

        # simple delay to be nice to GitHub API
        time.sleep(0.1)

    total_size = sum(f.size for f in collected_files)
    extracted_code = ExtractedCodeOut(
        repository=repo_meta,
        files=collected_files,
        totalFiles=len(collected_files),
        totalSize=total_size,
        extractedAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    )

    # Build prompt and call Gemini
    prompt = build_prompt_for_extracted_code(repo_meta, collected_files)
    technical_summary, non_tech, raw_text = call_gemini_and_parse(prompt)

    # Normalize technical_summary into CodeSummaryOut shape for response_model
    code_summary = CodeSummaryOut(
        overview=technical_summary.get("overview", ""),
        keyFeatures=technical_summary.get("keyFeatures", []),
        techStack=technical_summary.get("techStack", []),
        projectStructure=technical_summary.get("projectStructure", ""),
        gettingStarted=technical_summary.get("gettingStarted", ""),
        mainFiles=technical_summary.get("mainFiles", []),
        complexity=technical_summary.get("complexity", "Low"),
        estimatedReadingTime=technical_summary.get("estimatedReadingTime", ""),
        futureScope=technical_summary.get("futureScope", ""),
        roadmap=technical_summary.get("roadmap", []),
        pitchDeck=technical_summary.get("pitchDeck", None),
    )

    return AllStatsResponse(
        extractedCode=extracted_code,
        technicalSummary=code_summary,
        nonTechnicalSummary=non_tech,
        raw_ai_text=raw_text
    )


# --- /analyze Endpoint (Static Analysis and Summary) ---

@app.post("/analyze")
def analyze_repo(req: RepoRequest):
    repo_url = req.github_url
    tmp_dir = tempfile.mkdtemp()
    repo_name = os.path.basename(repo_url).replace(".git", "")
    repo_path = os.path.join(tmp_dir, repo_name)

    response_data = {
        "clone_output": "",
        "pylint": "",
        "bandit": "",
        "semgrep": "",
        "eslint": "",
        "tsc": ""
    }

    # ---------------- Clone Repo ---------------- #
    # Note: run_command uses shell=False now as a security improvement
    clone_cmd = GIT_CMD + ["clone", repo_url, repo_name]
    response_data["clone_output"] = run_command(clone_cmd, cwd=tmp_dir)

    if not os.path.exists(repo_path):
        response_data["clone_output"] += "\nError: Repo folder not found. Check URL or git installation."
        shutil.rmtree(tmp_dir, ignore_errors=True) # Ensure cleanup on early exit
        return response_data

    # ---------------- Detect Files ---------------- #
    python_files = []
    js_ts_files = []

    for root, _, files in os.walk(repo_path):
        # Exclude node_modules, .git etc. for analysis tools
        if 'node_modules' in root or '.git' in root or '.venv' in root:
            continue

        for f in files:
            full_path = os.path.join(root, f)
            if f.endswith(".py"):
                # Use absolute path for tools like pylint/bandit that might run outside repo_path
                # but need to report relative to repo_path or use a temp cwd.
                # For simplicity here, use full path and rely on tools' relative path handling
                python_files.append(full_path)
            elif f.endswith((".js", ".ts", ".tsx")):
                js_ts_files.append(full_path)

    # Relative paths for tools that need them (like eslint/tsc in a cwd)
    relative_python_files = [os.path.relpath(p, repo_path) for p in python_files]
    # relative_js_ts_files = [os.path.relpath(p, repo_path) for p in js_ts_files] # Not used below

    # ---------------- Python Analysis ---------------- #
    if python_files:
        # Run PYLINT in the repo root
        response_data["pylint"] = run_command(PYLINT_CMD + relative_python_files, cwd=repo_path)
        # Run BANDIT in the repo root
        response_data["bandit"] = run_command(BANDIT_CMD + ["-r", "."], cwd=repo_path)
        # Run SEMGREP in the repo root, ensuring it has access to the repo
        response_data["semgrep"] = run_command(SEMGREP_CMD + ["--config", "auto", ".", "--json"], cwd=repo_path)
    else:
        response_data["pylint"] = "No Python files"
        response_data["bandit"] = "No Python files"
        response_data["semgrep"] = "No Python files"

    # ---------------- JS/TS Analysis ---------------- #
    if js_ts_files:
        # Ensure dependencies (runs in repo root)
        run_command(["npm", "install"], cwd=repo_path)

        # Ensure minimal eslint config file exists for eslint command to run
        eslint_config_path = os.path.join(repo_path, "eslint.config.js")
        if not os.path.exists(eslint_config_path):
            with open(eslint_config_path, "w") as f:
                # Minimal placeholder for tool execution
                f.write("module.exports = [];")

        # Run ESLINT in the repo root
        response_data["eslint"] = run_command(ESLINT_CMD + ["."], cwd=repo_path)
        # Run TSC (TypeScript Compiler) in the repo root
        response_data["tsc"] = run_command(TSC_CMD, cwd=repo_path)
    else:
        response_data["eslint"] = "No JS/TS files"
        response_data["tsc"] = "No TS files"

    # ---------------- Prepare Logs for Gemini ---------------- #
    log_content = json.dumps(response_data, indent=4)
    
    # ---------------- Gemini Summary ---------------- #
    gemini_summary = generate_gemini_summary(log_content)

    # Save raw logs and summary to temporary files (as in original code)
    temp_file_path = os.path.join(tmp_dir, "temp.txt")
    error_file_path = os.path.join(tmp_dir, "errors.txt")
    
    with open(temp_file_path, "w", encoding="utf-8") as f:
        f.write(log_content)

    with open(error_file_path, "w", encoding="utf-8") as f:
        f.write(gemini_summary)
        
    # ---------------- Cleanup ---------------- #
    shutil.rmtree(tmp_dir, ignore_errors=True)

    # Return the structure exactly as in the original /analyze
    return {
        "response": response_data,
        "temp_file": "temp.txt", 
        "errors_file": "errors.txt", 
        "gemini_summary": gemini_summary
    }


# ============================================================
#                /health  — Project Health Analysis
# ============================================================

TEMP_REPOS_DIR = "temp_repos"
os.makedirs(TEMP_REPOS_DIR, exist_ok=True)


def clone_repo_health(repo_url: str, folder: str):
    """Clone repo only once."""
    if os.path.exists(folder):
        return Repo(folder)
    return Repo.clone_from(repo_url, folder)


def analyze_repo_commits(repo: Repo):
    """Commit metadata (same as Node version)."""
    try:
        commits = list(repo.iter_commits())
        if not commits:
            return {
                "totalCommits": 0,
                "contributors": 0,
                "lastCommitDate": None,
                "latestCommitMsg": "No commits",
                "daysSinceLastCommit": None,
                "active": False
            }

        latest = commits[0]
        contributors = set(c.author.name for c in commits)
        days_since = (datetime.now() - datetime.fromtimestamp(latest.committed_date)).days

        return {
            "totalCommits": len(commits),
            "contributors": len(contributors),
            "lastCommitDate": str(datetime.fromtimestamp(latest.committed_date)),
            "latestCommitMsg": latest.message,
            "daysSinceLastCommit": days_since,
            "active": True
        }
    except Exception as e:
        return {
            "totalCommits": 0,
            "contributors": 0,
            "lastCommitDate": None,
            "latestCommitMsg": f"Error: {e}",
            "daysSinceLastCommit": None,
            "active": False
        }


def analyze_branch_commits(repo: Repo, base="main"):
    try:
        repo.git.fetch()

        branches = [h.name for h in repo.heads]
        merged = repo.git.branch("--merged", base).split()
        unmerged = [b for b in branches if b not in merged]

        stale = 0
        active_list = []

        for b in branches:
            try:
                commit = next(repo.iter_commits(b, max_count=1))
                days = (datetime.now() - datetime.fromtimestamp(commit.committed_date)).days
                if days > 90:
                    stale += 1
                else:
                    active_list.append(b)
            except:
                continue

        return {
            "totalBranches": len(branches),
            "merged": len(merged),
            "unmerged": len(unmerged),
            "active": len(active_list),
            "stale": stale,
            "activeBranches": active_list,
            "staleBranches": []
        }

    except Exception as e:
        return {
            "totalBranches": 0,
            "merged": 0,
            "unmerged": 0,
            "active": 0,
            "stale": 0,
            "error": str(e)
        }


def get_repo_files(folder: str):
    """Recursively read repo files."""
    contents = {}
    for root, _, files in os.walk(folder):
        for f in files:
            full = os.path.join(root, f)
            try:
                contents[os.path.relpath(full, folder)] = open(full, "r", encoding="utf8", errors="ignore").read()
            except:
                contents[f] = ""
    return contents


def mock_ai(file_contents):
    num_files = len(file_contents)
    has_tests = any("test" in f.lower() for f in file_contents)
    has_docs = any("readme" in f.lower() for f in file_contents)

    return {
        "summary": f"Project contains {num_files} files.",
        "qualityReport": {
            "hasUnitTests": "Partial" if has_tests else "No",
            "hasDocumentation": "Basic" if has_docs else "Missing",
            "complexityRating": "Medium",
        },
        "criticalIssues": [
            "Potential undefined behavior in logic.",
            "Error handling inconsistent."
        ],
        "suggestedFeatures": [
            "Improve folder structure.",
            "Add rate limiting."
        ]
    }


def health_score(repo_stats, branch_stats, ai_report):
    score = 50
    if ai_report["qualityReport"]["hasUnitTests"] != "No":
        score += 10
    if ai_report["qualityReport"]["hasDocumentation"] != "Missing":
        score += 10
    if branch_stats["active"] > 0:
        score += 10
    return min(score, 100)


@app.get("/health")
async def health(repo_url: str):
    repo_dir = os.path.join(TEMP_REPOS_DIR, repo_url.split("/")[-1].replace(".git", ""))

    # 1. Clone repo if needed
    try:
        repo = clone_repo_health(repo_url, repo_dir)
    except Exception as e:
        raise HTTPException(400, f"Git clone error: {e}")

    # 2. Commit analysis
    repo_stats = analyze_repo_commits(repo)

    # 3. Branch analysis
    branch_stats = analyze_branch_commits(repo)

    # 4. Read repo files
    files = get_repo_files(repo_dir)

    # 5. Mock AI analysis (same as Node version)
    ai_report = mock_ai(files)

    # 6. Calculate health score
    score = health_score(repo_stats, branch_stats, ai_report)

    return {
        "repoStats": repo_stats,
        "branchStats": branch_stats,
        "projectReport": ai_report,
        "roadmap": ai_report["suggestedFeatures"],
        "healthScore": score
    }


# ============================================================
#                /security — Code Security Audit
# ============================================================

@app.get("/security")
async def security_scan(repo_url: str):
    repo_dir = os.path.join(TEMP_REPOS_DIR, repo_url.split("/")[-1].replace(".git", ""))

    # Step 1: Clone repo
    try:
        repo = clone_repo_health(repo_url, repo_dir)
    except Exception as e:
        raise HTTPException(400, f"Git clone error: {e}")

    # Step 2: Collect all files
    files = get_repo_files(repo_dir)

    # Step 3: Run security tools (best-effort)
    security_logs = {}

    # --- Bandit (Python only) ---
    if any(f.endswith(".py") for f in files):
        bandit_out = run_command(["bandit", "-r", "."], cwd=repo_dir)
        security_logs["bandit"] = bandit_out
    else:
        security_logs["bandit"] = "No Python files"

    # --- Semgrep (Security rules) ---
    semgrep_out = run_command(["semgrep", "--config", "p/owasp-top-ten", ".", "--json"], cwd=repo_dir)
    security_logs["semgrep"] = semgrep_out

    # --- ESLint Security (JS/TS) ---
    if any(f.endswith((".js", ".ts", ".tsx")) for f in files):
        # Minimal config
        es_cfg = os.path.join(repo_dir, "eslint.config.js")
        if not os.path.exists(es_cfg):
            open(es_cfg, "w").write("module.exports = [];")

        eslint_out = run_command(["eslint", "."], cwd=repo_dir)
        security_logs["eslint"] = eslint_out
    else:
        security_logs["eslint"] = "No JS/TS files"

    # Step 4: Combine file content + tool results for Gemini
    combined_log = json.dumps(security_logs, indent=4)
    file_summary = "\n".join([f"{name}: {len(code)} chars" for name, code in files.items()])

    gemini_prompt = f"""
You are a senior cybersecurity auditor. Analyze this entire codebase deeply.

### 1. Authentication & Authorization Audit
Check:
- login flow quality
- password handling
- JWT / session quality
- API permission model
- access control flaws
- missing validation
- insecure redirect patterns

### 2. Code Vulnerabilities
Identify HIGH, MEDIUM, LOW issues from:
- Semgrep
- Bandit
- ESLint security checks
- plus your own deep reading

### 3. Attack Surface Summary
Identify:
- endpoints exposed
- sensitive operations
- data flow
- untrusted input vectors

### 4. Critical Security Risks (Top 5)
For each: give risk, why it matters, and how to fix.

### 5. Final Security Score (0-100)
Consider:
- authentication quality
- access control
- secure coding practices
- secret handling
- dependency risk

### --- CODEBASE FILE STRUCTURE ---
{file_summary}

### --- SECURITY TOOL LOGS ---
{combined_log}

### OUTPUT FORMAT (JSON):
{{
  "authScore": 0-100,
  "securityScore": 0-100,
  "highRisks": ["issue1", "issue2"],
  "mediumRisks": ["issue1", "issue2"],
  "lowRisks": ["issue1", "issue2"],
  "attackSurface": "...",
  "topFixes": ["fix1", "fix2", "fix3"],
  "finalRecommendation": "..."
}}
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        ai_response = model.generate_content(gemini_prompt).text
    except Exception as e:
        ai_response = f"Gemini API error: {e}"

    # extract JSON
    json_match = re.search(r"\{[\s\S]*\}", ai_response)
    if json_match:
        try:
            parsed_json = json.loads(json_match.group(0))
        except:
            parsed_json = {"error": "Invalid JSON from Gemini", "raw": ai_response}
    else:
        parsed_json = {"error": "No JSON from Gemini", "raw": ai_response}

    return {
        "tools": security_logs,
        "securityAI": parsed_json,
        "raw_ai": ai_response
    }


# ============================================================
#                /feasibility — Idea Feasibility From Repo
# ============================================================

@app.get("/feasibility")
async def feasibility(repo_url: str):

    # 1. Reuse your GitHub parsing
    try:
        owner, repo_name = parse_github_owner_repo(repo_url)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # 2. Repo metadata
    repo_meta = get_repo_metadata(owner, repo_name)

    # 3. Extract essential files (same approach as /allstats)
    options = ExtractionOptions()
    collected_files: List[GitHubFileOut] = []
    to_process_paths = [""]

    while to_process_paths and len(collected_files) < options.maxFiles:
        current_path = to_process_paths.pop(0)
        try:
             items = get_repo_contents_recursive(owner, repo_name, current_path)
        except HTTPException:
            # Handle potential 404 or rate limit errors gracefully
            break


        for item in items:
            if len(collected_files) >= options.maxFiles: break

            if item.get("type") == "file" and should_include_file(item, options):
                text = ""
                url = item.get("download_url")
                if url:
                    try:
                        text = download_file_content(url)
                    except:
                        text = ""

                collected_files.append(GitHubFileOut(
                    path=item.get("path"),
                    content=text,
                    size=item.get("size", 0),
                    language=get_language_from_extension(item.get("name", "")),
                ))

            elif item.get("type") == "dir":
                if not any(d.lower() in item.get("path","").lower() for d in options.excludeDirectories):
                    to_process_paths.append(item.get("path"))

    # 4. Build prompt (reuse the SAME summarizer)
    extraction_prompt = build_prompt_for_extracted_code(repo_meta, collected_files)
    technical_summary, _, raw_text = call_gemini_and_parse(extraction_prompt)

    # 5. Build Feasibility Prompt using EXISTING extracted meaning
    feasibility_prompt = f"""
You are a senior VC partner, startup strategist, and product-market-fit expert.

Analyze the following software project ONLY from a **real startup/business feasibility perspective**:

### PROJECT OVERVIEW (FROM CODE ANALYSIS)
{technical_summary.get("overview")}

### KEY FEATURES
{json.dumps(technical_summary.get("keyFeatures", []), indent=2)}

### TECH STACK
{json.dumps(technical_summary.get("techStack", []), indent=2)}

### PROJECT STRUCTURE
{technical_summary.get("projectStructure")}

---

### YOUR TASK:
Assess if this project can be turned into a successful **business or product**, 
NOT if the code is good.

Focus on:

- Problem-market fit  
- Customer pain intensity  
- Potential demand  
- Monetization ability  
- Competition & differentiation  
- Scalability  
- Business model strength  
- Market timing  
- Founder advantage  
- Whether this can become a startup or *should just remain a project*  

---

### STRICT OUTPUT FORMAT (JSON):
{{
  "realProblem": "What painful problem does this actually solve?",
  "painSeverity": "Low | Medium | High",
  "targetCustomers": ["customer1", "customer2"],
  "marketDemand": "Low | Medium | High",
  "payingWillingness": "Low | Medium | High",
  "marketSizeEstimate": "Brief realistic TAM/SAM explanation",

  "competitionAnalysis": {{
      "existingPlayers": ["player1", "player2"],
      "competitivePressure": "Low | Medium | High",
      "moatPotential": "Low | Medium | High",
      "differentiation": ["point1", "point2"]
  }},

  "businessModelOptions": ["subscription", "SaaS", "freemium", "enterprise", "ads"],

  "scalability": "Low | Medium | High",
  "marketTiming": "Bad | Acceptable | Good | Perfect",
  "risks": ["risk1", "risk2"],
  
  "startupSuccessProbability": 0-100,
  "investorReadinessScore": 0-100,

  "verdict": "Build It | Maybe Build | Not Worth Building",
  "reasoning": "Short explanation why",
  
  "recommendedNextSteps": [
      "step1",
      "step2",
      "step3"
  ]
}}
"""


    # 6. Generate feasibility report
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        ai_out = model.generate_content(feasibility_prompt).text
    except Exception as e:
        return {"error": f"Gemini API error: {e}"}

    # 7. Parse JSON
    json_match = re.search(r"\{[\s\S]*\}", ai_out)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
        except:
            parsed = {"error": "Invalid JSON from AI", "raw": ai_out}
    else:
        parsed = {"error": "No JSON found", "raw": ai_out}

    return {
        "repo": repo_meta,
        "technicalSummaryUsed": technical_summary,
        "feasibility": parsed,
        "raw_ai": ai_out
    }


# ============================================================
#          /cost  — Cost, Monetization & Funding Analysis
# ============================================================

@app.get("/cost")
async def cost_analysis(repo_url: str):

    # 1. Reuse GitHub repo parsing
    try:
        owner, repo_name = parse_github_owner_repo(repo_url)
    except ValueError as e:
        raise HTTPException(400, str(e))

    repo_meta = get_repo_metadata(owner, repo_name)

    # 2. Extract files with same logic as /feasibility
    options = ExtractionOptions()
    collected_files: List[GitHubFileOut] = []
    to_process = [""]

    while to_process and len(collected_files) < options.maxFiles:
        current = to_process.pop(0)
        try:
            items = get_repo_contents_recursive(owner, repo_name, current)
        except HTTPException:
            break

        for item in items:
            if len(collected_files) >= options.maxFiles:
                break

            if item.get("type") == "file" and should_include_file(item, options):
                url = item.get("download_url")
                content = download_file_content(url) if url else ""

                collected_files.append(GitHubFileOut(
                    path=item.get("path"),
                    content=content,
                    size=item.get("size", 0),
                    language=get_language_from_extension(item.get("name", "")),
                ))

            elif item.get("type") == "dir":
                if not any(d.lower() in item.get("path","").lower() for d in options.excludeDirectories):
                    to_process.append(item.get("path"))

    # 3. Reuse technical summary from earlier
    extraction_prompt = build_prompt_for_extracted_code(repo_meta, collected_files)
    technical_summary, _, _ = call_gemini_and_parse(extraction_prompt)

    # 4. Cost + Business Model Prompt
    cost_prompt = f"""
You are a startup analyst and VC advisor. 
Your job is to evaluate a software project based only on:

- Its idea
- Technical summary
- Features
- Potential use cases
- Market need
- Comparable products

DO NOT analyze code. Use the summary below as the idea of the project.

### PROJECT OVERVIEW
{technical_summary.get("overview")}

### KEY FEATURES
{json.dumps(technical_summary.get("keyFeatures", []), indent=2)}

### TECH STACK
{json.dumps(technical_summary.get("techStack", []), indent=2)}

---

### YOUR TASK:
Provide a **medium-depth** business & cost analysis. Not basic, not too detailed.

Avoid large tables, avoid markdown formatting.

Focus on:
- Which market this project belongs to
- Real problem being solved
- Whether customers will pay for it
- Comparable startups (3–4 only)
- Rough cost to build
- Rough monthly operational cost
- Possible business models
- Monetization strength
- Risk factors
- Overall success probability

---

### STRICT OUTPUT FORMAT (VALID JSON ONLY, NO MARKDOWN):

{{
  "marketCategory": "",
  "realProblemSolved": "",
  "customerSegments": ["", ""],
  "marketDemand": "Low | Medium | High",

  "comparableStartups": [
    {{
      "name": "",
      "businessModel": "",
      "fundingStatus": "",
      "similarityReason": ""
    }}
  ],

  "estimatedCostToBuild": {{
    "mvpCostUSD": "",
    "timeToBuild": ""
  }},

  "operationalCostMonthlyUSD": "",
  
  "businessModelOptions": ["", ""],
  "monetizationStrength": "Weak | Medium | Strong",

  "risks": ["", ""],

  "successProbability": 0-100,
  "fundingPotential": "Low | Medium | High",
  "finalVerdict": "Not viable | Maybe viable | Viable with pivot",
  "reasoning": "",
  
  "nextSteps": ["", ""]
}}
"""


    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        ai_output = model.generate_content(cost_prompt).text
    except Exception as e:
        return {"error": f"Gemini API error: {e}"}

    # Extract JSON
    json_match = re.search(r"\{[\s\S]*\}", ai_output)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
        except:
            parsed = {"error": "Invalid JSON from AI", "raw": ai_output}
    else:
        parsed = {"error": "No valid JSON found", "raw": ai_output}

    return {
        "repo": repo_meta,
        "technicalSummaryUsed": technical_summary,
        "costAnalysis": parsed,
        "raw_ai": ai_output
    }


# --- Pydantic model for /combined response (combining all outputs) ---

class CombinedResponse(BaseModel):
    # Reusing existing Pydantic models for nested data
    allstats: AllStatsResponse
    health: dict 
    security: dict 
    feasibility: dict 
    cost: dict
    fintech_compliance: dict 

# --- Database Utility Functions ---

# --- Database Utility Functions ---

# (In your trial2.py file)

def save_single_endpoint_result(github_url: str, field_name: str, result_data: dict | BaseModel):
    """Saves or updates a single field (endpoint result) in the MongoDB cache."""
    
    if DB_COLLECTION is None:
        logger.warning(f"DB access disabled, skipping save for {field_name}.")
        return

    # --- FIX APPLIED HERE ---
    # Convert BaseModel objects to dict, which handles nested Pydantic objects 
    # and ensures MongoDB compatibility.
    if isinstance(result_data, BaseModel):
        # Convert the Pydantic model to a dictionary. 
        # model_dump() handles nested BaseModel objects automatically.
        data = result_data.model_dump()
    else:
        # For dictionary results (like from /health or /security), we must manually 
        # check for and convert any deeply nested Pydantic objects.
        # The structure of /feasibility and /cost makes this manual check necessary 
        # because they return dicts containing the Pydantic class GitHubRepositoryOut.
        
        # A simpler way is to use JSON dump/load as a bridge, or a recursive function.
        # Since we know the structure has nested Pydantic models in the dict keys 'repo' 
        # (for feasibility/cost), we'll do a focused conversion.
        
        # NOTE: This conversion must be customized if your dict results contain 
        # other non-primitive Pydantic classes, but this handles the reported error.
        data = result_data.copy()
        
        # Handle the specific error found in the traceback for /feasibility and /cost
        if 'repo' in data and isinstance(data['repo'], BaseModel):
            data['repo'] = data['repo'].model_dump()
        
        if 'technicalSummaryUsed' in data and isinstance(data['technicalSummaryUsed'], BaseModel):
             data['technicalSummaryUsed'] = data['technicalSummaryUsed'].model_dump()

    # If the data is still a dict containing BaseModel objects, PyMongo will still fail.
    # The safest universal method is to dump the whole object to JSON then load it back 
    # into a Python dict, but we'll try to stick to model_dump() first.

    try:
        # ... (rest of DB update logic remains the same)
        DB_COLLECTION.update_one(
            {"githubUrl": github_url},
            {"$set": {
                field_name: data,
                "lastUpdated": datetime.now()
            },
            "$setOnInsert": {
                "githubUrl": github_url,
                "createdAt": datetime.now()
            }},
            upsert=True
        )
        logger.info(f"DB: Updated {field_name} for {github_url}")
    except Exception as e:
        logger.error(f"DB Error saving {field_name}: {e}")












# --- /combined Endpoint (Calls All Endpoints) ---
# ============================================================
#          /fintech_compliance — FinTech Compliance Scan
# ============================================================
def extract_json_from_ai(text):
    # Remove code fences like json ... 
    if text.strip().startswith("```"):
        lines = text.splitlines()
        if len(lines) > 2:
            text = "\n".join(lines[1:-1]).strip()

    # Try direct load
    try:
        return json.loads(text)
    except:
        pass

    # Fallback: regex extract JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            return None

    return None


# You can reuse the 'extract_json_from_ai' function defined earlier

@app.get("/fintech_compliance")
async def fintech_compliance_scan(repo_url: str):
    repo_dir = os.path.join(
        TEMP_REPOS_DIR,
        repo_url.split("/")[-1].replace(".git", "")
    )

    # Step 1: Clone repo
    try:
        repo = clone_repo_health(repo_url, repo_dir)
    except Exception as e:
        raise HTTPException(400, f"Git clone error: {e}")

    # Step 2: Collect all files (dict: {path: content})
    files = get_repo_files(repo_dir)
    
    # Step 3: Run minimal compliance-related static tools (best-effort, fast)
    compliance_logs = {}

    # Lightweight Semgrep run (OWASP + generic security – reused for compliance signals)
    try:
        semgrep_out = run_command(
            ["semgrep", "--config", "p/owasp-top-ten", ".", "--json"],
            cwd=repo_dir
        )
        compliance_logs["semgrep"] = semgrep_out
    except Exception as e:
        compliance_logs["semgrep"] = f"Semgrep error: {e}"

    # Optional: detect manifest files for lending / mobile permissions / env
    manifest_files = {
        name: len(code)
        for name, code in files.items()
        if any(
            name.endswith(suffix)
            for suffix in [
                "AndroidManifest.xml",
                "Info.plist",
                ".env",
                "application.yml",
                "application.yaml",
                "application.properties",
                "package.json",
                "requirements.txt",
                "pom.xml"
            ]
        )
    }

    # Step 4: Build lightweight file summary to avoid huge prompts
    file_summary_lines = []
    max_files = 200 # safety cap to keep prompt small
    for i, (name, code) in enumerate(files.items()):
        if i >= max_files:
            file_summary_lines.append("... truncated ...")
            break
        file_summary_lines.append(f"{name}: {len(code)} chars")
    file_summary = "\n".join(file_summary_lines)

    combined_log = json.dumps(compliance_logs, indent=2)
    FINTECH_RULEBOOK = """
RBI DIGITAL LENDING (HIGH SEVERITY)
DL-001: Missing KFS before disbursement
DL-003: LSP data access without explicit consent
DL-004: Loan flows through non-RE accounts
DL-005: Unnecessary mobile permissions
DL-006: Hidden/dynamic fees
DL-007: No grievance system

DPDP ACT 2023
DP-001: Missing granular consent
DP-003: Excessive data collection
DP-004: No DSAR mechanisms
DP-005: Soft delete only
DP-006: Cross-border data transfers w/o consent
DP-007: No breach detection

GDPR
GD-002: No encryption / plain-text PII
GD-004: No right-to-erasure implementation

PCI-DSS
PC-001: CVV/PIN/track data stored/logged
PC-002: Full PAN unmasked
PC-004: HTTP payment endpoints
PC-005: No RBAC for cardholder data
PC-009: SQL injection / unsafe input in payments

CROSS CUTTING
CC-001: Hardcoded secrets
CC-002: PII in logs/comments
CC-003: Admin endpoints without auth
CC-004: SQL/NoSQL injection patterns
CC-005: Vulnerable dependencies
"""

    # Step 5: Gemini prompt – optimized for speed, high-severity fintech compliance
    gemini_prompt = f"""
SYSTEM INSTRUCTION:
Return ONLY JSON. No code blocks. No markdown. No explanations.

RULEBOOK:
{FINTECH_RULEBOOK}

You are a Senior FinTech Compliance Auditor. 
Your job is to analyze the codebase for HIGH-SEVERITY violations only.

INPUT:
FILE SUMMARY:
{file_summary}

SECURITY LOGS:
{combined_log}

REQUIREMENTS:
1. Map findings to RULE IDs exactly (DL-xxx, DP-xxx, PC-xxx, CC-xxx).
2. If you are unsure, be conservative and flag the risk.
3. Output ONLY the JSON object below.

JSON FORMAT TO RETURN:
{{
  "rbiViolations": [],
  "dpdpViolations": [],
  "gdprViolations": [],
  "pciViolations": [],
  "crossCuttingRisks": [],
  "topCriticalFindings": [
    {{ "rule": "", "why": "", "fix": "" }}
  ],
  "complianceScore": 0,
  "finalRecommendation": ""
}}
"""


    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        ai_response = model.generate_content(gemini_prompt).text
    except Exception as e:
        ai_response = f"Gemini API error: {e}"

    # Extract JSON from response
    parsed_json = extract_json_from_ai(ai_response)

    if parsed_json is None:
        parsed_json = {
            "error": "Invalid or missing JSON from Gemini",
            "raw": ai_response
        }

    return {
        "tools": compliance_logs,
        "fintechComplianceAI": parsed_json,
        "raw_ai": ai_response,
        "manifest_files": manifest_files,
    }












# --- /combined Endpoint (Calls All Endpoints) ---

@app.post("/combined", response_model=CombinedResponse)
async def combined_analysis(req: RepoRequest):
    """
    Calls all analysis endpoints, saves results to MongoDB individually, 
    and returns a single combined result.
    """
    github_url = req.github_url
    allstats_payload = GitHubRepoIn(github_url=github_url)
    
    # ... (Steps 1-5 remain the same) ...

    # 1. Call /allstats (POST)
    try:
        allstats_result = allstats(payload=allstats_payload)
        save_single_endpoint_result(github_url, "allstats", allstats_result)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Error in /allstats: {e.detail}")
    print("Allstats done")
    # 2. Call /health (GET)
    try:
        health_result = await health(repo_url=github_url)
        save_single_endpoint_result(github_url, "health", health_result)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Error in /health: {e.detail}")
    print("Health done")
    # 3. Call /security (GET)
    try:
        security_result = await security_scan(repo_url=github_url)
        save_single_endpoint_result(github_url, "security", security_result)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Error in /security: {e.detail}")
    print("Security done")
    # 4. Call /feasibility (GET)
    try:
        feasibility_result = await feasibility(repo_url=github_url)
        save_single_endpoint_result(github_url, "feasibility", feasibility_result)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Error in /feasibility: {e.detail}")
    print("Feasibility done")
    # 5. Call /cost (GET)
    try:
        cost_result = await cost_analysis(repo_url=github_url)
        save_single_endpoint_result(github_url, "cost", cost_result)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Error in /cost: {e.detail}")
    print("Cost done")        
    # 6. Call /fintech_compliance (GET) <--- NEW STEP
    try:
        fintech_compliance_result = await fintech_compliance_scan(repo_url=github_url)
        save_single_endpoint_result(github_url, "fintech_compliance", fintech_compliance_result)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Error in /fintech_compliance: {e.detail}")
    print("FinTech Compliance done")
    # 7. Combine and return the results (updated to include new result)
    final_combined_response = CombinedResponse(
        allstats=allstats_result,
        health=health_result,
        security=security_result,
        feasibility=feasibility_result,
        cost=cost_result,
        fintech_compliance=fintech_compliance_result # <--- ADDED THIS LINE
    )

    # 8. Final Combined Save (Optional, as fields are already updated, but ensures consistency)
    save_single_endpoint_result(github_url, "combined_response", final_combined_response)
    
    return final_combined_response


# ============================================================
#          MongoDB Fetch Endpoints
# ============================================================

from fastapi import FastAPI, HTTPException, Query
from typing import List
from pymongo import MongoClient
from bson import ObjectId

def format_doc(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if "createdAt" in doc:
        doc["createdAt"] = doc["createdAt"].isoformat()
    if "lastUpdated" in doc:
        doc["lastUpdated"] = doc["lastUpdated"].isoformat()
    return doc

# -----------------------------
# Endpoint: fetch repos by IDs
# -----------------------------
@app.get("/repos")
async def fetch_repos(ids: str = Query(..., description="Comma-separated list of repo IDs")):
    """
    Return repo documents for selected repo IDs.
    Example: /repos?ids=id1,id2,id3
    """
    if DB_COLLECTION is None:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        ids_list = [ObjectId(i) for i in ids.split(",") if i]
        results = list(DB_COLLECTION.find({"_id": {"$in": ids_list}}))

        if not results:
            raise HTTPException(status_code=404, detail="No repositories found")

        formatted = [format_doc(r) for r in results]
        return {
            "count": len(formatted),
            "records": formatted
        }

    except Exception as e:
        logger.error(f"Error fetching repos: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/history")
async def fetch_history():
    """
    Return ALL saved analysis documents from MongoDB.
    Used for History Page frontend.
    """
    if DB_COLLECTION is None:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        results = list(DB_COLLECTION.find().sort("lastUpdated", -1))

        formatted = []
        for item in results:
            item["_id"] = str(item["_id"])     # convert ObjectId → string

            # Ensure createdAt, lastUpdated are JSON safe
            if "createdAt" in item:
                item["createdAt"] = item["createdAt"].isoformat()
            if "lastUpdated" in item:
                item["lastUpdated"] = item["lastUpdated"].isoformat()

            formatted.append(item)

        return {
            "count": len(formatted),
            "records": formatted
        }

    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@app.get("/analysis/{github_url:path}")
async def get_analysis(github_url: str):
    """
    Fetch analysis results from MongoDB by GitHub URL.
    The path parameter allows URLs with slashes.
    """
    if DB_COLLECTION is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Decode URL if needed
        from urllib.parse import unquote
        decoded_url = unquote(github_url)
        
        result = DB_COLLECTION.find_one({"githubUrl": decoded_url})
        if result is None:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Convert ObjectId to string for JSON serialization
        result["_id"] = str(result["_id"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/analyses")
async def get_all_analyses():
    """
    Fetch all analysis results from MongoDB.
    """
    if DB_COLLECTION is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        results = list(DB_COLLECTION.find().sort("lastUpdated", -1).limit(100))
        for result in results:
            result["_id"] = str(result["_id"])
        return results
    except Exception as e:
        logger.error(f"Error fetching analyses: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
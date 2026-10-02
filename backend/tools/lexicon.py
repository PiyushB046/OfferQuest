"""Skills lexicon and small text helpers shared by the tools and the offline brain."""
from __future__ import annotations

import re
from collections import Counter

# canonical name -> aliases (matched case-insensitively on word boundaries)
SKILLS: dict[str, list[str]] = {
    "Python": ["python"], "Java": ["java"], "C++": ["c++", "cpp"], "C": ["c language", "c programming"],
    "JavaScript": ["javascript", "js"], "TypeScript": ["typescript"], "Go": ["golang"],
    "Rust": ["rust"], "Kotlin": ["kotlin"], "Swift": ["swift"], "R": ["r language", "r programming"],
    "SQL": ["sql"], "HTML": ["html"], "CSS": ["css"], "Bash": ["bash", "shell scripting"],
    "React": ["react", "reactjs", "react.js"], "Next.js": ["next.js", "nextjs"],
    "Angular": ["angular"], "Vue": ["vue", "vuejs"], "Node.js": ["node.js", "nodejs"],
    "Express": ["express", "expressjs"], "Django": ["django"], "Flask": ["flask"],
    "FastAPI": ["fastapi"], "Spring Boot": ["spring boot"], "Tailwind": ["tailwind"],
    "REST APIs": ["rest api", "rest apis", "restful"], "GraphQL": ["graphql"],
    "Microservices": ["microservices", "microservice"],
    "Git": ["git"], "GitHub": ["github"], "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"],
    "CI/CD": ["ci/cd", "cicd", "continuous integration"], "Linux": ["linux", "unix"],
    "AWS": ["aws", "amazon web services"], "GCP": ["gcp", "google cloud"], "Azure": ["azure"],
    "PostgreSQL": ["postgresql", "postgres"], "MySQL": ["mysql"], "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"], "SQLite": ["sqlite"], "Firebase": ["firebase"],
    "Machine Learning": ["machine learning", "ml"], "Deep Learning": ["deep learning"],
    "NLP": ["nlp", "natural language processing"], "Computer Vision": ["computer vision", "opencv"],
    "PyTorch": ["pytorch"], "TensorFlow": ["tensorflow"], "scikit-learn": ["scikit-learn", "sklearn"],
    "Pandas": ["pandas"], "NumPy": ["numpy"], "LLM APIs": ["llm apis", "llm api", "llms", "llm"],
    "RAG": ["rag", "retrieval-augmented generation", "retrieval augmented generation"],
    "LangChain": ["langchain"], "LangGraph": ["langgraph"], "Prompt Engineering": ["prompt engineering"],
    "Vector Databases": ["vector database", "vector databases", "vector db", "chromadb", "pinecone", "faiss"],
    "Embeddings": ["embeddings", "embedding"], "Hugging Face": ["hugging face", "huggingface", "transformers"],
    "Evaluation": ["evaluation", "evals"], "Fine-tuning": ["fine-tuning", "finetuning", "fine tuning"],
    "Gemini": ["gemini"], "OpenAI": ["openai", "gpt"],
    "Data Analysis": ["data analysis", "data analytics"], "Excel": ["excel"],
    "Power BI": ["power bi", "powerbi"], "Tableau": ["tableau"], "Statistics": ["statistics", "statistical"],
    "Data Visualization": ["data visualization", "data visualisation", "matplotlib", "seaborn"],
    "Spark": ["spark", "pyspark"], "ETL": ["etl", "data pipeline", "data pipelines"],
    "Data Structures": ["data structures", "dsa"], "Algorithms": ["algorithms"],
    "OOP": ["oop", "oops", "object-oriented", "object oriented"],
    "DBMS": ["dbms", "database management"], "Operating Systems": ["operating systems", "operating system"],
    "Computer Networks": ["computer networks", "networking"], "System Design": ["system design"],
    "Testing": ["unit testing", "testing", "pytest", "jest"], "Agile": ["agile", "scrum"],
    "Android": ["android"], "Flutter": ["flutter"], "React Native": ["react native"],
    "Communication": ["communication skills", "communication"], "Problem Solving": ["problem solving", "problem-solving"],
    "WebSockets": ["websocket", "websockets"], "Phaser": ["phaser"],
}

DSA_TOPICS: dict[str, list[str]] = {
    "Arrays": ["array", "arrays"], "Strings": ["string manipulation", "strings"],
    "Hashing": ["hashing", "hash map", "hashmap", "hash table"],
    "Two Pointers": ["two pointers", "two pointer"], "Sliding Window": ["sliding window"],
    "Linked Lists": ["linked list", "linked lists"], "Stacks & Queues": ["stack", "queue", "stacks", "queues"],
    "Trees": ["tree", "trees", "binary tree", "bst"], "Graphs": ["graph", "graphs", "bfs", "dfs"],
    "Dynamic Programming": ["dynamic programming"], "Recursion & Backtracking": ["recursion", "backtracking"],
    "Sorting & Searching": ["sorting", "searching", "binary search"], "Heaps": ["heap", "priority queue"],
    "Greedy": ["greedy"],
}

THEORY_TOPICS: dict[str, list[str]] = {
    "OOP": SKILLS["OOP"], "DBMS": SKILLS["DBMS"] + ["sql", "database"],
    "Operating Systems": SKILLS["Operating Systems"], "Computer Networks": SKILLS["Computer Networks"],
    "System Design": SKILLS["System Design"],
    "ML fundamentals": ["machine learning", "ml"], "Statistics & probability": ["statistics", "probability"],
    "LLM & RAG fundamentals": ["llm", "rag", "retrieval"], "Web fundamentals": ["http", "rest", "web"],
    "Aptitude": ["aptitude", "quantitative"],
}

STOPWORDS = set("""a an the and or of to in for with on at by from as is are be will you we our your their
this that have has it its who what which can should must may such etc using use used work working ability
strong good great excellent knowledge experience understanding skills skill role team teams looking join
intern internship engineer developer candidate candidates including across well also other more than into
about plus nice preferred required requirements responsibilities qualifications years year build building
help ideal familiarity familiar hands basic basics like some real least any able write""".split())


def _pattern(alias: str) -> re.Pattern:
    # The dot in the lookbehind stops "js" matching inside "Node.js".
    return re.compile(r"(?<![A-Za-z0-9+#.])" + re.escape(alias) + r"(?![A-Za-z0-9+#])", re.I)


# Using the tool on the left is direct evidence of the skill on the right.
IMPLIES: dict[str, list[str]] = {
    "Gemini": ["LLM APIs"], "OpenAI": ["LLM APIs"], "LangChain": ["LLM APIs"], "LangGraph": ["LLM APIs"],
    "FastAPI": ["REST APIs"], "Flask": ["REST APIs"], "Django": ["REST APIs"], "Express": ["REST APIs"],
    "Spring Boot": ["REST APIs"], "PyTorch": ["Deep Learning"], "TensorFlow": ["Deep Learning"],
    "scikit-learn": ["Machine Learning"], "PostgreSQL": ["SQL"], "MySQL": ["SQL"], "GitHub": ["Git"],
    "Pandas": ["Data Analysis"], "React Native": ["React"], "Next.js": ["React"],
}


def implied_skills(skills: list[str]) -> dict[str, str]:
    """{implied skill: the tool that proves it} for the given canonical skills."""
    out: dict[str, str] = {}
    for s in skills:
        for imp in IMPLIES.get(canon(s), []):
            out.setdefault(imp, canon(s))
    return out


_COMPILED = {name: [_pattern(a) for a in al] for name, al in SKILLS.items()}
_ALIAS_TO_CANON = {a.lower(): name for name, al in SKILLS.items() for a in al}
_ALIAS_TO_CANON.update({name.lower(): name for name in SKILLS})


def has_term(text: str, term: str) -> bool:
    """True if `term` (a canonical skill or any free phrase) occurs in `text`."""
    pats = _COMPILED.get(term) or _COMPILED.get(canon(term))
    if pats:
        return any(p.search(text) for p in pats) or bool(_pattern(term).search(text))
    return bool(_pattern(term).search(text))


def canon(skill: str) -> str:
    return _ALIAS_TO_CANON.get(skill.strip().lower(), skill.strip())


def find_skills(text: str) -> list[str]:
    """Canonical skills mentioned in `text`, in order of first appearance."""
    hits = []
    for name, pats in _COMPILED.items():
        pos = min((m.start() for p in pats if (m := p.search(text))), default=-1)
        if pos >= 0:
            hits.append((pos, name))
    return [n for _, n in sorted(hits)]


def find_topics(text: str, table: dict[str, list[str]]) -> list[str]:
    return [name for name, al in table.items() if any(_pattern(a).search(text) for a in al)]


def tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-zA-Z][a-zA-Z+#.\-]{2,}", text.lower()) if t not in STOPWORDS]


def top_keywords(text: str, n: int = 8) -> list[str]:
    skill_words = set(_ALIAS_TO_CANON)
    counts = Counter(t.strip(".-") for t in tokens(text) if len(t) >= 5 and t not in skill_words)
    return [w for w, _ in counts.most_common(n)]


def numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+(?:\.\d+)?", text))


def dedupe(items: list[str]) -> list[str]:
    seen, out = set(), []
    for i in items:
        k = i.strip().lower()
        if k and k not in seen:
            seen.add(k)
            out.append(i.strip())
    return out


def role_category(role: str, jd: str = "") -> str:
    r = role.lower()
    if re.search(r"\b(ai|ml|machine learning|llm|genai|nlp|deep learning)\b", r):
        return "ai_ml"
    if re.search(r"\b(data|analyst|analytics|bi)\b", r):
        return "data"
    if re.search(r"\b(frontend|front-end|web|ui|full.?stack)\b", r):
        return "web"
    if re.search(r"\b(trainee|associate|graduate engineer|system engineer|get)\b", r):
        return "service"
    if re.search(r"\b(ai|ml|llm)\b", jd.lower()[:400]) and "sde" not in r:
        return "ai_ml"
    return "sde"


ROLE_DEFAULTS: dict[str, dict[str, list[str]]] = {
    "ai_ml": {
        "skills": ["Python", "Machine Learning", "LLM APIs", "Git", "SQL"],
        "rounds": ["Online assessment", "Technical (projects + ML/DSA)", "HR"],
        "dsa": ["Arrays", "Hashing", "Strings", "Graphs"],
        "theory": ["ML fundamentals", "LLM & RAG fundamentals", "OOP", "DBMS"],
        "values": ["Shipped projects", "Measurable impact", "Ownership"],
    },
    "data": {
        "skills": ["SQL", "Python", "Excel", "Statistics", "Data Visualization"],
        "rounds": ["Online assessment (SQL + aptitude)", "Technical (SQL + case study)", "HR"],
        "dsa": ["Arrays", "Strings", "Hashing", "Sorting & Searching"],
        "theory": ["DBMS", "Statistics & probability", "Aptitude"],
        "values": ["Clear communication of insights", "Attention to detail", "Business understanding"],
    },
    "web": {
        "skills": ["JavaScript", "React", "HTML", "CSS", "Git", "REST APIs"],
        "rounds": ["Online assessment", "Technical (JS + projects)", "Machine coding", "HR"],
        "dsa": ["Arrays", "Strings", "Hashing", "Trees"],
        "theory": ["Web fundamentals", "OOP", "DBMS"],
        "values": ["Polished shipped work", "Ownership", "Collaboration"],
    },
    "service": {
        "skills": ["Java", "SQL", "OOP", "Data Structures", "Communication"],
        "rounds": ["Aptitude + coding test", "Technical interview", "HR"],
        "dsa": ["Arrays", "Strings", "Sorting & Searching", "Linked Lists"],
        "theory": ["OOP", "DBMS", "Operating Systems", "Computer Networks", "Aptitude"],
        "values": ["Strong fundamentals", "Willingness to learn", "Communication"],
    },
    "sde": {
        "skills": ["Data Structures", "Algorithms", "OOP", "Git", "SQL"],
        "rounds": ["Online assessment (DSA)", "Technical 1 (DSA)", "Technical 2 (projects + CS fundamentals)", "HR"],
        "dsa": ["Arrays", "Hashing", "Trees", "Graphs", "Dynamic Programming"],
        "theory": ["OOP", "DBMS", "Operating Systems", "Computer Networks"],
        "values": ["Problem solving", "Clean code", "Ownership"],
    },
}

# Things you study rather than build a project around.
FUNDAMENTALS = {"Data Structures", "Algorithms", "OOP", "DBMS", "Operating Systems", "Computer Networks",
                "System Design", "Communication", "Problem Solving", "Statistics", "Agile"}

RED_FLAGS = [
    "No GitHub or demo links on projects",
    "Vague project descriptions with no numbers",
    "Listing skills you cannot explain in an interview",
    "One generic resume reused for every company",
]

"""Writes eval/test_quests.json: 20 quests = 5 fictional students x varied companies and roles.

The JDs are written by us in the style of typical public campus JDs (product, service, AI startup,
data, web). They are not copied from real postings, and the companies are fictional. Replace them
with real public JDs before quoting results outside the team.
"""
import json
from pathlib import Path

P = lambda name, desc, tech, link=None, metrics=(): {  # noqa: E731
    "name": name, "description": desc, "tech_stack": tech, "link": link, "metrics": list(metrics)}

STUDENTS = {
    "neha": {"id": "stu_eval_neha", "name": "Neha Kulkarni", "college": "Deccan College of Engineering", "degree": "B.E.",
             "branch": "Information Technology", "year": 3, "graduation_date": "2028", "cgpa": 8.6,
             "skills": ["Java", "C++", "SQL", "Git"], "achievements": ["300+ problems solved on LeetCode"],
             "links": {"github": "https://github.com/neha-eval"},
             "projects": [P("Library Manager", "Made a library management system with book issue and return. Used JDBC to connect to the database.", ["Java", "MySQL"], "https://github.com/neha-eval/library-manager", ["Handles 500 book records"]),
                          P("Pathfinder Visualiser", "Worked on a tool that shows how BFS and Dijkstra explore a graph.", ["JavaScript", "HTML", "CSS"])]},
    "rohan": {"id": "stu_eval_rohan", "name": "Rohan Patil", "college": "Vidarbha Institute of Science", "degree": "B.Sc",
              "branch": "Statistics", "year": 3, "graduation_date": "2027", "cgpa": None,
              "skills": ["Excel", "SQL", "Python"], "achievements": [], "links": {},
              "projects": [P("Mandi Price Tracker", "Did an analysis of vegetable prices across 12 mandis using Pandas. Made charts showing weekly price changes.", ["Python", "Pandas", "Matplotlib"])]},
    "sana": {"id": "stu_eval_sana", "name": "Sana Sheikh", "college": "Konkan Institute of Technology", "degree": "B.Tech",
             "branch": "Computer Engineering", "year": 4, "graduation_date": "2027", "cgpa": 7.9,
             "skills": ["JavaScript", "React", "HTML", "CSS", "Git"], "achievements": ["Winner, college UI hackathon"],
             "links": {"github": "https://github.com/sana-eval"},
             "projects": [P("Tiffin Tracker", "Created a web app for hostel students to order tiffins. Worked on the cart and order history pages.", ["React", "Node.js", "MongoDB"], "https://github.com/sana-eval/tiffin", ["Used by 60 hostel students"]),
                          P("Portfolio Site", "Made a personal portfolio with a blog.", ["Next.js", "Tailwind"])]},
    "dev": {"id": "stu_eval_dev", "name": "Dev Malhotra", "college": "Satpura Engineering College", "degree": "B.Tech",
            "branch": "Artificial Intelligence", "year": 3, "graduation_date": "2028", "cgpa": 8.9,
            "skills": ["Python", "PyTorch", "SQL", "Git", "Docker"], "achievements": ["Top 5%, a public Kaggle competition"],
            "links": {"github": "https://github.com/dev-eval"},
            "projects": [P("Crop Doctor", "Worked on an image classifier that detects leaf diseases from phone photos. Deployed it as an API.", ["Python", "PyTorch", "FastAPI", "Docker"], "https://github.com/dev-eval/crop-doctor", ["91% accuracy on 4 disease classes"]),
                         P("Notes Search", "Made a semantic search over lecture notes using embeddings.", ["Python", "LangChain", "ChromaDB"])]},
    "isha": {"id": "stu_eval_isha", "name": "Isha Nair", "college": "Malabar College of Engineering", "degree": "B.Tech",
             "branch": "Electronics", "year": 4, "graduation_date": "2027", "cgpa": 7.2,
             "skills": ["C", "Python", "Communication"], "achievements": [], "links": {},
             "projects": [P("Attendance Counter", "Did a small project that counts people entering a classroom with a sensor.", ["Python"])]},
}

JD = lambda req, nice="", process="": (  # noqa: E731
    "Requirements:\n" + "\n".join(f"- {r}" for r in req)
    + (f"\n\nInterview process: {process}." if process else "")
    + ("\n\nNice to have:\n" + "\n".join(f"- {n}" for n in nice) if nice else ""))

QUESTS = [
    ("neha", "Brightlane Software", "SDE Intern", 21, 3, JD(["Strong problem solving with data structures and algorithms (trees, graphs, dynamic programming)", "Proficiency in Java or C++", "Understanding of OOP, DBMS and operating systems", "Familiarity with Git and SQL"], ["Spring Boot", "Docker", "AWS"], "online assessment, two technical interviews, HR round")),
    ("neha", "Quillstack", "Backend Engineer Intern", 14, 2, JD(["Java and Spring Boot for building REST APIs", "SQL and PostgreSQL", "Git, unit testing and clean code", "Ownership of features end to end"], ["Redis", "Kubernetes"])),
    ("neha", "Infovista Services", "Graduate Engineer Trainee", 10, 2, JD(["Good knowledge of Java, SQL and OOP", "Basics of DBMS, operating systems and computer networks", "Aptitude and communication skills", "Willingness to learn"], [], "aptitude test, technical interview, HR round")),
    ("neha", "Ledgerline", "SDE-1", 28, 3, JD(["Data structures and algorithms: arrays, hashing, graphs, dynamic programming", "System design basics", "Java or Go", "Experience with microservices and SQL in production"], ["AWS", "CI/CD"], "online assessment, technical interview, system design round, HR round")),
    ("rohan", "Kirana Insights", "Data Analyst Trainee", 10, 2, JD(["SQL, Excel and basic statistics", "Clean and analyse data with Python and Pandas", "Build dashboards in Power BI", "Attention to detail and clear communication"], ["Tableau"])),
    ("rohan", "Farmlytics", "Business Analyst Intern", 14, 1, JD(["Advanced Excel and SQL", "Data visualization and presenting insights to business teams", "Statistics and probability"], ["Python", "Power BI"])),
    ("rohan", "Meterwise", "Data Engineer Intern", 21, 2, JD(["Python and SQL", "ETL and data pipelines with Spark", "Git and Linux basics", "DBMS fundamentals"], ["AWS", "Docker"], "online assessment, technical interview, HR round")),
    ("rohan", "Quantleaf", "Junior Data Scientist", 18, 2, JD(["Python, Pandas and scikit-learn", "Machine learning fundamentals and statistics", "SQL", "Communicating measurable impact of models"], ["Deep Learning", "Docker"])),
    ("sana", "Pixelpanda", "Frontend Developer Intern", 12, 3, JD(["JavaScript, React, HTML and CSS", "REST APIs and Git", "Eye for polished, shipped interfaces", "Collaboration with designers"], ["TypeScript", "Next.js", "Tailwind"], "take-home assignment, technical interview, HR round")),
    ("sana", "Cartwheel", "Full Stack Intern", 20, 2, JD(["React and Node.js", "MongoDB or PostgreSQL", "REST APIs, Git and unit testing", "Ownership of a feature end to end"], ["Docker", "AWS"])),
    ("sana", "Brightlane Software", "SDE Intern", 25, 2, JD(["Strong problem solving with data structures and algorithms (trees, graphs, dynamic programming)", "Proficiency in Java or C++", "Understanding of OOP, DBMS and operating systems", "Familiarity with Git and SQL"], ["Spring Boot"], "online assessment, two technical interviews, HR round")),
    ("sana", "Tapstream", "React Native Developer Intern", 9, 2, JD(["React Native and JavaScript", "REST APIs and Firebase", "Git"], ["TypeScript", "Android"])),
    ("dev", "NovaMind Labs", "AI Engineer Intern", 14, 2.5, JD(["Strong Python and comfort with Git", "Hands-on experience with LLM APIs and retrieval (RAG) pipelines", "Understanding of evaluation: how do you know your system is good?", "Solid basics: data structures (arrays, hashing, graphs), OOP and DBMS", "Ability to build and call REST APIs"], ["LangGraph", "Docker", "Vector databases"])),
    ("dev", "Visionworks", "Computer Vision Intern", 16, 3, JD(["Python and PyTorch", "Deep learning and computer vision", "Deployed models as APIs with Docker", "Measurable results on real data"], ["TensorFlow", "AWS"])),
    ("dev", "Quantleaf", "Junior Data Scientist", 18, 2, JD(["Python, Pandas and scikit-learn", "Machine learning fundamentals and statistics", "SQL", "Communicating measurable impact of models"], ["Deep Learning", "Docker"])),
    ("dev", "Promptforge", "ML Engineer Intern", 30, 2, JD(["Python, PyTorch and Hugging Face", "Fine-tuning and evaluation of language models", "Git, Docker and Linux", "Data structures and algorithms"], ["Kubernetes", "GCP"], "online assessment, technical interview, HR round")),
    ("isha", "Infovista Services", "Graduate Engineer Trainee", 10, 2, JD(["Good knowledge of Java, SQL and OOP", "Basics of DBMS, operating systems and computer networks", "Aptitude and communication skills", "Willingness to learn"], [], "aptitude test, technical interview, HR round")),
    ("isha", "Corewave Systems", "Associate Software Engineer", 15, 2, JD(["Programming in C or Python", "Data structures, OOP and DBMS", "Problem solving and communication"], ["Linux", "Git"], "aptitude test, coding test, technical interview, HR round")),
    ("isha", "Testbridge", "QA Engineer Trainee", 7, 1.5, JD(["Testing fundamentals and attention to detail", "Python or Java for test scripts", "SQL basics", "Clear communication"], ["Agile", "Git"])),
    ("isha", "Kirana Insights", "Data Analyst Trainee", 12, 2, JD(["SQL, Excel and basic statistics", "Clean and analyse data with Python and Pandas", "Build dashboards in Power BI", "Attention to detail and clear communication"], ["Tableau"])),
]

cases = [{"name": f"{STUDENTS[s]['name'].split()[0]} → {role} at {company}", "company": company, "role": role,
          "days_available": days, "hours_per_day": hours, "job_description": f"{company} — {role}\n\n{jd}",
          "student": STUDENTS[s], "confidence": {"dsa": 3, "fundamentals": 3, "projects": 3, "communication": 3}}
         for s, company, role, days, hours, jd in QUESTS]
Path(__file__).with_name("test_quests.json").write_text(json.dumps(cases, indent=1, ensure_ascii=False))
print(len(cases), "quests written")

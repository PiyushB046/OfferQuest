"""Well-known practice problems by topic, easy → hard. Names only; the student finds them on any judge."""
from __future__ import annotations

BANK: dict[str, list[tuple[str, str]]] = {
    "Arrays": [("Two Sum", "E"), ("Best Time to Buy and Sell Stock", "E"), ("Maximum Subarray", "M"),
               ("Product of Array Except Self", "M"), ("Merge Intervals", "M"), ("Rotate Array", "M")],
    "Strings": [("Valid Anagram", "E"), ("Valid Palindrome", "E"), ("Longest Common Prefix", "E"),
                ("Group Anagrams", "M"), ("Longest Palindromic Substring", "M")],
    "Hashing": [("Contains Duplicate", "E"), ("Two Sum (hash map)", "E"), ("Top K Frequent Elements", "M"),
                ("Longest Consecutive Sequence", "M"), ("Subarray Sum Equals K", "M")],
    "Two Pointers": [("Move Zeroes", "E"), ("Container With Most Water", "M"), ("3Sum", "M")],
    "Sliding Window": [("Longest Substring Without Repeating Characters", "M"),
                       ("Minimum Size Subarray Sum", "M"), ("Permutation in String", "M")],
    "Linked Lists": [("Reverse Linked List", "E"), ("Merge Two Sorted Lists", "E"),
                     ("Linked List Cycle", "E"), ("Remove Nth Node From End", "M")],
    "Stacks & Queues": [("Valid Parentheses", "E"), ("Min Stack", "M"), ("Daily Temperatures", "M")],
    "Trees": [("Maximum Depth of Binary Tree", "E"), ("Invert Binary Tree", "E"),
              ("Binary Tree Level Order Traversal", "M"), ("Validate Binary Search Tree", "M"),
              ("Lowest Common Ancestor of a BST", "M")],
    "Graphs": [("Flood Fill", "E"), ("Number of Islands", "M"), ("Clone Graph", "M"),
               ("Course Schedule", "M"), ("Rotting Oranges", "M")],
    "Dynamic Programming": [("Climbing Stairs", "E"), ("House Robber", "M"), ("Coin Change", "M"),
                            ("Longest Increasing Subsequence", "M"), ("Longest Common Subsequence", "M")],
    "Recursion & Backtracking": [("Subsets", "M"), ("Permutations", "M"), ("Combination Sum", "M")],
    "Sorting & Searching": [("Binary Search", "E"), ("Search in Rotated Sorted Array", "M"),
                            ("Sort Colors", "M"), ("Kth Largest Element in an Array", "M")],
    "Heaps": [("Last Stone Weight", "E"), ("K Closest Points to Origin", "M")],
    "Greedy": [("Assign Cookies", "E"), ("Jump Game", "M"), ("Gas Station", "M")],
}

THEORY_SUBTOPICS: dict[str, list[str]] = {
    "OOP": ["Four pillars with examples", "Abstract class vs interface", "Overloading vs overriding"],
    "DBMS": ["Normalisation (1NF–3NF)", "Joins and indexes", "ACID and transactions", "SQL practice: GROUP BY, window functions"],
    "Operating Systems": ["Process vs thread", "Deadlocks", "Paging and virtual memory", "CPU scheduling"],
    "Computer Networks": ["OSI vs TCP/IP", "TCP vs UDP", "What happens when you open a URL", "HTTP vs HTTPS"],
    "System Design": ["Load balancing and caching basics", "SQL vs NoSQL trade-offs", "Design a URL shortener"],
    "ML fundamentals": ["Bias–variance and overfitting", "Precision, recall, F1", "Train/validation/test splits",
                        "Gradient descent in plain words"],
    "Statistics & probability": ["Mean, median, variance", "Hypothesis testing and p-values", "Bayes' theorem"],
    "LLM & RAG fundamentals": ["How embeddings and vector search work", "Chunking and retrieval strategies",
                               "Evaluating a RAG system", "Hallucination and how to reduce it",
                               "Tokens, context windows and prompt design"],
    "Web fundamentals": ["HTTP methods and status codes", "REST principles", "Browser rendering and the event loop"],
    "Aptitude": ["Percentages, ratios, time & work", "Logical reasoning sets", "Reading comprehension"],
}


def problems_for(topic: str) -> list[tuple[str, str]]:
    return BANK.get(topic, [])

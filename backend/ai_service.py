"""Local AI-like complaint prioritizer.

This module replaces external LLM usage with a robust score-based
keyword analyzer so the backend can run fully offline with high accuracy.
"""
import logging
import re
from typing import List, Dict, Tuple

logger = logging.getLogger("ccms.ai")

# Keyword Groups (Support Regex Patterns for Critical Items)
CRITICAL_PATTERNS = [
    r"sexual.*harass", r"sexually.*harass", r"molest", r"rape", r"assault", 
    r"ragging", r"suicide", r"threat", r"blackmail", r"violence", r"murder", r"kill"
]

CRITICAL_KEYWORDS = [
    "sexual harassment", "molestation", "rape", "assault", "ragging", 
    "suicide", "threat", "blackmail", "violence", "murder", "kill"
]

HIGH_KEYWORDS = [
    "harassment", "sexually harassed", "stalking", "bullying", "abuse",
    "physical abuse", "mental abuse", "unsafe", "danger", "misbehaviour", 
    "misbehavior", "eve teasing", "hacking", "cyber attack", "security breach", 
    "theft", "robbery", "attack", "fire", "emergency", "injury", "accident", "fraud"
]

MEDIUM_KEYWORDS = [
    "electricity", "power cut", "water", "leakage", "hostel", "room issue", 
    "mess food", "food quality", "cleanliness", "hygiene", "maintenance", 
    "repair", "fan not working", "ac not working", "plumbing", "drainage", 
    "internet slow", "network issue", "classroom issue", "lab issue", 
    "equipment problem", "broken", "lost item"
]

LOW_KEYWORDS = [
    "wifi", "slow wifi", "minor", "small issue", "typo", "suggestion", 
    "feedback", "request", "inconvenience", "delay", "ui issue", 
    "button not working", "layout issue", "cosmetic issue", "improvement", 
    "feature request", "light not working"
]

# Category Overrides
HIGH_CATEGORIES = ["Women Safety", "Anti Ragging", "Security", "Medical Emergency"]

def _match_flexible(text: str, keywords: List[str]) -> List[str]:
    """Detect keywords/phrases using flexible matching."""
    found = []
    for k in keywords:
        # Support phrases and partial matches
        if len(k) < 4:
            pattern = rf"\b{re.escape(k)}\b"
        else:
            pattern = re.escape(k)
            
        if re.search(pattern, text, re.IGNORECASE):
            found.append(k.lower())
    return found

def _check_contextual_rules(text: str) -> Tuple[int, List[str]]:
    """Apply contextual intelligence rules."""
    extra_score = 0
    reasons = []
    
    # Rule 1: "harass" + "girl/student" -> High
    if re.search(r"harass", text, re.IGNORECASE) and re.search(r"girl|student|female|lady", text, re.IGNORECASE):
        extra_score += 5
        reasons.append("Contextual: Harassment involving a student/female detected.")
        
    # Rule 2: "unsafe" + "hostel/campus" -> High
    if re.search(r"unsafe|danger", text, re.IGNORECASE) and re.search(r"hostel|campus|gate|night", text, re.IGNORECASE):
        extra_score += 5
        reasons.append("Contextual: Safety concern in residential/campus area.")

    return extra_score, reasons

async def analyze_complaint(title: str, description: str, category: str) -> dict:
    """Analyze complaint text and return local priority result using weighted scoring."""
    try:
        title = title or ""
        description = description or ""
        category = category or ""
        full_text = f"{title} {description} {category}".lower()
        
        # 1. CRITICAL OVERRIDE (Enhanced with Regex Patterns)
        critical_matches = []
        for pattern in CRITICAL_PATTERNS:
            if re.search(pattern, full_text, re.IGNORECASE):
                critical_matches.append(pattern.replace(".*", " "))
        
        if critical_matches:
            return {
                "ai_status": "done",
                "priority": "High",
                "urgency_score": 10,
                "ai_reasoning": f"CRITICAL INCIDENT DETECTED: {', '.join(critical_matches).upper()}. Immediate action required.",
                "ai_tags": list(set(critical_matches))[:5],
                "confidence": 100
            }

        # 2. CATEGORY OVERRIDE
        if any(c.lower() in category.lower() for c in HIGH_CATEGORIES):
            return {
                "ai_status": "done",
                "priority": "High",
                "urgency_score": 10,  # Categories like Women Safety should also be 10/10
                "ai_reasoning": f"High-priority category '{category}' assigned. Automatic escalation.",
                "ai_tags": [category.lower()],
                "confidence": 95
            }

        # 3. WEIGHTED SCORING
        score = 0
        all_tags = []
        
        # Match groups
        high_matches = _match_flexible(full_text, HIGH_KEYWORDS)
        medium_matches = _match_flexible(full_text, MEDIUM_KEYWORDS)
        low_matches = _match_flexible(full_text, LOW_KEYWORDS)
        
        score += len(high_matches) * 5
        score += len(medium_matches) * 3
        score += len(low_matches) * 1
        
        all_tags.extend(high_matches)
        all_tags.extend(medium_matches)
        all_tags.extend(low_matches)
        
        # 4. CONTEXTUAL RULES
        context_score, context_reasons = _check_contextual_rules(full_text)
        score += context_score
        
        # 5. DETERMINATION
        priority = "Low"
        urgency_score = min(score, 10)
        reasoning = "General inquiry or minor feedback."
        
        if score >= 5:
            priority = "High"
            # Ensure high priority starts at least at 8/10, but goes to 10 if score is high
            urgency_score = max(8, min(score, 10))
            reasoning = context_reasons[0] if context_reasons else "Serious concern or multiple issues detected."
            if not context_reasons and high_matches:
                reasoning = f"Detected high-priority issues: {', '.join(high_matches)}."
        elif score >= 3:
            priority = "Medium"
            urgency_score = max(5, min(score, 7))
            reasoning = f"Standard maintenance or infrastructure issue: {', '.join(medium_matches[:2])}."
        elif low_matches:
            urgency_score = max(2, min(score, 4))
            reasoning = f"Low-priority item: {', '.join(low_matches[:2])}."
            
        # 6. CONFIDENCE CALCULATION
        confidence = min(90, 40 + (score * 5))
        if not all_tags:
            confidence = 60
            reasoning = "No specific keywords found; defaulting to Low based on general text analysis."

        return {
            "ai_status": "done",
            "priority": priority,
            "urgency_score": urgency_score,
            "ai_reasoning": reasoning,
            "ai_tags": list(dict.fromkeys(all_tags))[:5],
            "confidence": int(confidence)
        }

    except Exception as e:
        logger.exception("Local analyze_complaint failed: %s", e)
        return {
            "ai_status": "failed", 
            "priority": "Unrated", 
            "urgency_score": 0,
            "ai_reasoning": f"Error during AI analysis: {str(e)[:100]}", 
            "ai_tags": [],
            "confidence": 0
        }

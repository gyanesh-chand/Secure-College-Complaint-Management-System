import asyncio
import sys
import os

# Add current directory to path so we can import ai_service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_service import analyze_complaint

async def test_scenarios():
    scenarios = [
        {
            "name": "Critical Override - Sexual Harassing",
            "title": "Senior student harassing girls in hostel",
            "description": "A senior student has been sexually harassing girls in the hostel corridor.",
            "category": "General",
            "expected_priority": "High"
        },
        {
            "name": "Critical Override - Threat",
            "title": "I am being threatened",
            "description": "A student is threatening me with violence and blackmail.",
            "category": "General",
            "expected_priority": "High"
        },
        {
            "name": "Category Override - Women Safety",
            "title": "Concern in hostel",
            "description": "Just wanted to report something minor.",
            "category": "Women Safety",
            "expected_priority": "High"
        },
        {
            "name": "High Priority - Harassment + Context",
            "title": "Harassment problem",
            "description": "A girl is being harassed by a group of students near the gate.",
            "category": "General",
            "expected_priority": "High"
        },
        {
            "name": "Medium Priority - Infrastructure",
            "title": "Water leakage",
            "description": "There is a water leakage in the washroom of block B.",
            "category": "Infrastructure",
            "expected_priority": "High"
        },
        {
            "name": "Low Priority - Feedback",
            "title": "Suggestion",
            "description": "Please improve the user interface of this portal.",
            "category": "Others",
            "expected_priority": "Low"
        },
        {
            "name": "Contextual Rule - Unsafe Hostel",
            "title": "Unsafe environment",
            "description": "The hostel area is unsafe at night due to poor lighting.",
            "category": "Infrastructure",
            "expected_priority": "High"
        }
    ]

    print(f"{'Scenario':<40} | {'Result':<10} | {'Score':<5} | {'Confidence':<10} | {'Reasoning'}")
    print("-" * 120)

    for s in scenarios:
        result = await analyze_complaint(s["title"], s["description"], s["category"])
        priority = result.get("priority")
        score = result.get("urgency_score")
        conf = result.get("confidence")
        reasoning = result.get("ai_reasoning")
        
        status = "PASS" if priority == s["expected_priority"] else "FAIL"
        print(f"{s['name']:<40} | {priority:<10} | {score:<5} | {conf:<10} | {reasoning}")

if __name__ == "__main__":
    asyncio.run(test_scenarios())

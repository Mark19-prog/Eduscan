from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import GradeComponent, GradeScore, GradebookState, Person
from .settings_store import get_json


def transmute_grade(initial_grade: float) -> int:
    grade = max(0.0, min(100.0, float(initial_grade)))
    if grade >= 100:
        return 100
    if grade >= 60:
        return int(((grade - 60) + 1e-9) // 1.6) + 75
    return int((grade + 1e-9) // 4) + 60


def gradebook_state(db: Session, class_key: str) -> GradebookState | None:
    return db.get(GradebookState, class_key)


def gradebook_summary(db: Session, class_key: str) -> dict:
    components = db.scalars(
        select(GradeComponent).where(GradeComponent.class_key == class_key).order_by(GradeComponent.sequence)
    ).all()
    component_ids = [item.id for item in components]
    scores = db.scalars(select(GradeScore).where(GradeScore.component_id.in_(component_ids))).all() if component_ids else []
    score_map = {(item.person_id, item.component_id): item for item in scores}
    state = gradebook_state(db, class_key)
    rules = get_json(db, f"gradebook:{class_key}:rules", {})
    grade = state.grade if state else rules.get("grade", "")
    section = state.section if state else rules.get("section", "")
    people = db.scalars(select(Person).where(
        Person.role == "Student", Person.active.is_(True), Person.grade == grade, Person.section == section,
    ).order_by(Person.full_name, Person.external_id)).all() if grade and section else []

    manual = next((item for item in components if item.category == "Manual Overall"), None)
    weighted = [item for item in components if item.category != "Manual Overall"]
    rows = []
    for person in people:
        component_results: dict[str, dict] = {}
        completed = True
        initial = 0.0
        manual_score = score_map.get((person.id, manual.id)) if manual else None
        if manual_score and manual_score.status == "Scored":
            initial = (manual_score.score / manual.max_score) * 100
            component_results[manual.label] = {"score": manual_score.score, "max_score": manual.max_score,
                                                "status": manual_score.status, "percentage": initial}
        else:
            for component in weighted:
                record = score_map.get((person.id, component.id))
                status = record.status if record else "Missing"
                percentage = None
                if record and status == "Scored":
                    percentage = (record.score / component.max_score) * 100
                    initial += percentage * (component.weight / 100)
                else:
                    completed = False
                component_results[component.label] = {
                    "score": record.score if record and status == "Scored" else None,
                    "max_score": component.max_score,
                    "status": status,
                    "percentage": percentage,
                }
        transmuted = transmute_grade(initial) if completed or (manual_score and manual_score.status == "Scored") else None
        passing = state.passing_grade if state else int(rules.get("passing_grade", 75))
        rows.append({
            "person_id": person.id, "external_id": person.external_id, "lrn": person.lrn,
            "full_name": person.full_name, "components": component_results,
            "initial_grade": round(initial, 2) if transmuted is not None else None,
            "transmuted_grade": transmuted,
            "status": "Passed" if transmuted is not None and transmuted >= passing else "Below rule" if transmuted is not None else "Incomplete",
            "complete": transmuted is not None,
        })
    completed_grades = [item["transmuted_grade"] for item in rows if item["transmuted_grade"] is not None]
    distribution = defaultdict(int)
    for value in completed_grades:
        distribution["90-100" if value >= 90 else "85-89" if value >= 85 else "80-84" if value >= 80 else "75-79" if value >= 75 else "Below 75"] += 1
    metadata = {
        "class_key": class_key,
        "school_year": state.school_year if state else rules.get("school_year", ""),
        "quarter": state.quarter if state else rules.get("quarter", 1),
        "subject": state.subject if state else rules.get("subject", ""),
        "grade": grade,
        "section": section,
        "passing_grade": state.passing_grade if state else int(rules.get("passing_grade", 75)),
        "gradebook_status": state.status if state else "Draft",
        "finalized_at": state.finalized_at if state else None,
        "finalized_by_name": state.finalized_by_name if state else None,
    }
    statistics = {
        "learners": len(rows), "complete": len(completed_grades), "incomplete": len(rows) - len(completed_grades),
        "passed": sum(value >= metadata["passing_grade"] for value in completed_grades),
        "below_rule": sum(value < metadata["passing_grade"] for value in completed_grades),
        "average": round(sum(completed_grades) / len(completed_grades), 2) if completed_grades else None,
        "highest": max(completed_grades) if completed_grades else None,
        "lowest": min(completed_grades) if completed_grades else None,
        "distribution": dict(distribution),
    }
    return {"metadata": metadata, "components": components, "rows": rows, "statistics": statistics}

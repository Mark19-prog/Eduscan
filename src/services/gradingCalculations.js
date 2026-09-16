/**
 * EduScan Client-Side Grading Calculation Engine
 *
 * Mirrors the backend grading_engine.py for instant UI feedback.
 * The backend remains the authority — these functions are used only
 * for real-time display while the teacher is entering scores.
 */

/**
 * Default DepEd K-12 piecewise transmutation.
 * @param {number} initialGrade - Initial grade (0-100)
 * @returns {number|null}
 */
export function applyTransmutation(initialGrade, transmutationTable = null) {
  if (initialGrade == null) return null;
  const grade = Math.max(0, Math.min(100, Number(initialGrade) || 0));

  if (transmutationTable && transmutationTable.length > 0) {
    for (const entry of transmutationTable) {
      if (grade >= entry.min && grade <= entry.max) return entry.value;
    }
    if (grade >= 100) return 100;
    return null;
  }

  // Fallback: piecewise formula
  if (grade >= 100) return 100;
  if (grade >= 60) return Math.floor((grade - 60 + 1e-9) / 1.6) + 75;
  return Math.floor((grade + 1e-9) / 4) + 60;
}

/**
 * Calculate the percentage for a single assessment component using the
 * total-score / total-possible method (DepEd standard).
 *
 * @param {Array<{itemId, score, status}>} scores
 * @param {Array<{id, maxScore}>} items
 * @returns {{totalEarned, totalPossible, percentage, complete, scoredCount}}
 */
export function calculateComponentPercentage(scores, items) {
  const scoreMap = new Map(scores.map(s => [s.itemId, s]));
  let totalEarned = 0;
  let totalPossible = 0;
  let scoredCount = 0;
  let complete = true;

  for (const item of items) {
    const entry = scoreMap.get(item.id);
    if (!entry || entry.status !== 'Scored') { complete = false; continue; }
    if (entry.score == null || entry.score === '') { complete = false; continue; }
    totalEarned += Number(entry.score);
    totalPossible += Number(item.maxScore);
    scoredCount++;
  }

  if (totalPossible <= 0 || scoredCount === 0) {
    return { totalEarned: 0, totalPossible: 0, percentage: null, complete: false, scoredCount: 0, itemCount: items.length };
  }

  return {
    totalEarned,
    totalPossible,
    percentage: (totalEarned / totalPossible) * 100,
    complete,
    scoredCount,
    itemCount: items.length,
  };
}

/**
 * Calculate the initial grade from component percentages and weights.
 *
 * @param {Array<{name, weight, percentage, complete}>} componentResults
 * @returns {{initialGrade, complete, componentGrades}}
 */
export function calculateWeightedGrade(componentResults) {
  let allComplete = true;
  const componentGrades = [];
  let initialGrade = 0;

  for (const r of componentResults) {
    const pct = r.percentage;
    const weight = Number(r.weight) || 0;

    if (pct == null || !r.complete) {
      allComplete = false;
      componentGrades.push({ name: r.name, percentage: pct, weight, weightedScore: null });
      continue;
    }

    const weighted = pct * (weight / 100);
    initialGrade += weighted;
    componentGrades.push({
      name: r.name,
      percentage: Math.round(pct * 100) / 100,
      weight,
      weightedScore: Math.round(weighted * 100) / 100,
    });
  }

  return {
    initialGrade: allComplete ? Math.round(initialGrade * 100) / 100 : null,
    complete: allComplete,
    componentGrades,
  };
}

/**
 * Determine grade status string.
 * @param {number|null} reportedGrade
 * @param {number} passingGrade
 * @param {boolean} allComplete
 * @returns {string}
 */
export function determineStatus(reportedGrade, passingGrade = 75, allComplete = true) {
  if (reportedGrade == null || !allComplete) return 'Incomplete';
  if (reportedGrade >= passingGrade) return 'Passing';
  return 'Below Passing';
}

/**
 * Full student grade calculation pipeline.
 *
 * @param {object} params
 * @param {Array} params.studentScores - [{itemId, score, status}]
 * @param {Array} params.components - [{id, name, weight, items: [{id, maxScore}]}]
 * @param {Array|null} params.transmutationTable
 * @param {number} params.passingGrade
 * @returns {object} Full calculation result
 */
export function calculateStudentGrade({ studentScores, components, transmutationTable = null, passingGrade = 75 }) {
  const scoreByItem = new Map(studentScores.map(s => [s.itemId, s]));

  const componentResults = components.map(comp => {
    const compScores = (comp.items || []).map(item => ({
      itemId: item.id,
      score: scoreByItem.get(item.id)?.score,
      status: scoreByItem.get(item.id)?.status || 'Missing',
    }));
    const pctResult = calculateComponentPercentage(compScores, comp.items || []);
    return {
      name: comp.name,
      weight: comp.weight,
      percentage: pctResult.percentage,
      complete: pctResult.complete,
      totalEarned: pctResult.totalEarned,
      totalPossible: pctResult.totalPossible,
    };
  });

  const weighted = calculateWeightedGrade(componentResults);
  const reportedGrade = weighted.initialGrade != null
    ? applyTransmutation(weighted.initialGrade, transmutationTable)
    : null;
  const status = determineStatus(reportedGrade, passingGrade, weighted.complete);

  return {
    initialGrade: weighted.initialGrade,
    reportedGrade,
    status,
    complete: weighted.complete,
    componentGrades: weighted.componentGrades,
  };
}

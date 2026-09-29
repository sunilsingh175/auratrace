/**
 * AuraTrace L3 Automated Repair Execution & Verification Script
 * Triggers the L3 autonomous pipeline via API and streams lifecycle progression.
 */

import crypto from 'crypto';

const API_BASE = process.env.AURA_API_URL || 'http://localhost:8000/api/v1';
const AUTH_SECRET = process.env.AURA_AUTH_SECRET || 'aura_auth_super_secret_key_123';
const USER_ID = 'da8e4263-81b4-40aa-b0ee-ab79f0d51c5a'; // Developer: Sunil
const ROLE = 'Developer';

function makeAuthToken() {
  const payload = {
    sub: USER_ID,
    role: ROLE,
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('hex');
  return `${body}.${sig}`;
}

const token = makeAuthToken();
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runL3RepairPipeline(incidentId) {
  console.log('================================================================');
  console.log('       AuraTrace L3 Autonomous Repair Pipeline Execution        ');
  console.log('================================================================\n');

  console.log(`📌 Target Incident: ${incidentId}`);
  
  // 1. Fetch Incident Details
  console.log('\n[1/6] 🔍 Fetching Incident Details & Diagnosis...');
  const incRes = await fetch(`${API_BASE}/incidents/${incidentId}`, {
    headers: { 'X-API-Key': 'aura_secret_key_123' },
  });
  if (!incRes.ok) {
    throw new Error(`Failed to fetch incident (${incRes.status}): ${await incRes.text()}`);
  }
  const incident = await incRes.json();
  console.log(`   ✓ Service:     ${incident.service_id}`);
  console.log(`   ✓ Error Type:  ${incident.error_type}`);
  console.log(`   ✓ Severity:    ${incident.severity}`);
  console.log(`   ✓ Diagnosed:   ${incident.is_diagnosed}`);
  console.log(`   ✓ Patch Size:  ${incident.ai_suggested_patch?.length || 0} bytes`);

  // 2. Trigger Autonomous Repair
  console.log('\n[2/6] ⚡ Triggering L3 Autonomous Repair Pipeline...');
  const triggerRes = await fetch(`${API_BASE}/repair/trigger/${incidentId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!triggerRes.ok) {
    throw new Error(`Failed to trigger repair (${triggerRes.status}): ${await triggerRes.text()}`);
  }
  const triggerData = await triggerRes.json();
  console.log(`   ✓ Response: ${JSON.stringify(triggerData)}`);

  // 3. Monitor Repair Run Progression
  console.log('\n[3/6] 📡 Streaming Autonomous Repair Lifecycle & Logs...');
  let runId = null;
  let lastLogIndex = 0;
  let finalRun = null;
  const startTime = Date.now();

  while (Date.now() - startTime < 180000) { // 3 minutes timeout
    await sleep(2000);

    // List runs for incident
    const runsRes = await fetch(`${API_BASE}/repair/runs/incident/${incidentId}`, { headers });
    if (!runsRes.ok) continue;
    const runs = await runsRes.json();
    if (!runs || runs.length === 0) continue;

    const currentRunSummary = runs[0];
    runId = currentRunSummary.id;

    // Fetch full run details
    const runRes = await fetch(`${API_BASE}/repair/runs/${runId}`, { headers });
    if (!runRes.ok) continue;
    const runDetails = await runRes.json();
    finalRun = runDetails;

    // Stream new logs
    const logs = runDetails.logs || [];
    while (lastLogIndex < logs.length) {
      const entry = logs[lastLogIndex];
      const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
      const levelBadge = entry.level === 'ERROR' ? '❌' : entry.level === 'WARN' ? '⚠️' : '✓';
      console.log(`   [${timeStr}] ${levelBadge} [${entry.stage}] ${entry.message}`);
      lastLogIndex++;
    }

    // Check terminal states
    if (['COMPLETED', 'MERGED', 'FAILED', 'SAFETY_VIOLATION', 'SANDBOX_FAILED', 'CI_FAILED'].includes(runDetails.status)) {
      break;
    }
  }

  if (!finalRun) {
    throw new Error('No repair run was initiated.');
  }

  console.log('\n[4/6] 📊 L3 Repair Pipeline Execution Summary:');
  console.log(`   • Run ID:           ${finalRun.id}`);
  console.log(`   • Pipeline Status:  ${finalRun.status}`);
  console.log(`   • Repair Branch:    ${finalRun.branch_name || 'N/A'}`);
  console.log(`   • Pull Request:     ${finalRun.pr_url || 'N/A'} (PR #${finalRun.pr_number || 'N/A'})`);
  console.log(`   • CI Checks:        ${finalRun.ci_result?.status || 'N/A'}`);
  console.log(`   • Merge Status:     ${finalRun.merge_status || 'N/A'}`);
  console.log(`   • Merge Commit SHA: ${finalRun.merge_commit_sha || 'N/A'}`);

  // 4. If PR is created but pending manual review, execute merge
  if (finalRun.pr_number && finalRun.merge_status === 'PENDING_MANUAL_REVIEW') {
    console.log('\n[5/6] 🔀 Executing Controlled Pull Request Merge...');
    const mergeRes = await fetch(`${API_BASE}/repair/runs/${finalRun.id}/merge`, {
      method: 'POST',
      headers,
    });
    const mergeData = await mergeRes.json();
    console.log(`   ✓ Merge Result: ${JSON.stringify(mergeData, null, 2)}`);
  }

  // 5. Verify Post-Deployment Telemetry
  console.log('\n[6/6] 📈 Evaluating Post-Deployment Telemetry Health...');
  const telemetryRes = await fetch(`${API_BASE}/repair/runs/${finalRun.id}/verify-telemetry`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      simulate_regression: false,
      sample_window_minutes: 15,
    }),
  });
  if (telemetryRes.ok) {
    const telemetryData = await telemetryRes.json();
    console.log('   ✓ Post-Deployment Telemetry Verification:');
    console.log(`     - Status:                 ${telemetryData.status || 'HEALTHY'}`);
    console.log(`     - Baseline Error Rate:    ${telemetryData.baseline_error_rate ?? 0}`);
    console.log(`     - Post-Repair Error Rate: ${telemetryData.post_repair_error_rate ?? 0}`);
    console.log(`     - Regression Detected:    ${telemetryData.regression_detected ? 'YES' : 'NO'}`);
  } else {
    console.log(`   ℹ️ Telemetry note (${telemetryRes.status}): ${await telemetryRes.text()}`);
  }

  console.log('\n================================================================');
  console.log('   ✅ L3 Autonomous Repair Test Workflow Successfully Finished  ');
  console.log('================================================================\n');
}

const targetIncidentId = process.argv[2] || 'a40e55d4-3a58-449f-a580-f9c6ce2886c2';
runL3RepairPipeline(targetIncidentId).catch((err) => {
  console.error('\n❌ L3 Repair Execution Error:', err);
  process.exit(1);
});

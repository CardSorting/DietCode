import { GovernanceAction, ResourceGovernor } from '../../core/capabilities/ResourceGovernor';

async function testToolLimits() {
  console.log('🧪 Running Governance Tool Limits Test...');

  const governor = new ResourceGovernor({
    maxToolCalls: 5,
    pauseThreshold: 3,
    maxConsecutiveFailures: 2,
    maxTotalDurationMs: 1000, // 1 second
  });

  // 1. Test Pause Threshold
  governor.recordInvocation('read_file');
  governor.recordResult('read_file', true, 100);
  governor.recordInvocation('write_file');
  governor.recordResult('write_file', true, 100);

  let result = governor.shouldProceed('read_file');
  console.log(`Resource count 2, action: ${result.action}`);

  governor.recordInvocation('read_file');
  governor.recordResult('read_file', true, 100);

  result = governor.shouldProceed('read_file');
  console.log(`Resource count 3, action: ${result.action} (Reason: ${result.reason})`);
  if (result.action !== GovernanceAction.PAUSE) {
    throw new Error('❌ Failed: Should have PAUSED at threshold 3');
  }

  // 2. Test Max Tool Calls (BLOCK)
  governor.recordInvocation('read_file');
  governor.recordResult('read_file', true, 100);
  governor.recordInvocation('read_file');
  governor.recordResult('read_file', true, 100);

  result = governor.shouldProceed('read_file');
  console.log(`Resource count 5, action: ${result.action} (Reason: ${result.reason})`);
  if (result.action !== GovernanceAction.BLOCK) {
    throw new Error('❌ Failed: Should have BLOCKED at max calls 5');
  }

  // 3. Test Consecutive Failures (Loop Detection)
  governor.reset();
  governor.recordInvocation('bad_tool');
  governor.recordResult('bad_tool', false, 10);
  governor.recordInvocation('bad_tool');
  governor.recordResult('bad_tool', false, 10);

  result = governor.shouldProceed('bad_tool');
  console.log(`Consecutive failures 2, action: ${result.action} (Reason: ${result.reason})`);
  if (result.action !== GovernanceAction.BLOCK) {
    throw new Error('❌ Failed: Should have BLOCKED on consecutive failures');
  }

  console.log('\n✨ GOVERNANCE TOOL LIMITS VERIFIED! ✨');
}

testToolLimits().catch((err) => {
  console.error('💥 Error during test:', err);
  process.exit(1);
});

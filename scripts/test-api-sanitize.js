async function testPollSanitize() {
  const res = await fetch('http://localhost:3000/api/agent/poll', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TEST-LICENSE-123',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      machineId: 'test-machine-01',
      version: '0.1.0',
      os: 'Windows',
      password: 'SHOULD_BE_REDACTED'
    })
  });
  
  const data = await res.json();
  console.log('POLL RESULT (check server logs for sanitization)');
}

testPollSanitize();

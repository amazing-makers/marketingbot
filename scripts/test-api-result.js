async function testResult() {
  const taskId = 'cmoma6jb10004h0v0s19y89qx'; // 이전 poll 테스트에서 받은 ID
  const res = await fetch('http://localhost:3000/api/agent/result', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TEST-LICENSE-123',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      taskId: taskId,
      status: 'SUCCESS',
      executedAt: new Date().toISOString()
    })
  });
  
  const data = await res.json();
  console.log('RESULT REPORT:', JSON.stringify(data, null, 2));
}

testResult();

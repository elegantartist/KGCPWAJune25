// Test patient authentication flow
const email = "reuben.collins@keepgoingcare.com";
const testCode = "123456"; // We'll use a fixed code for testing

fetch("http://localhost:5000/api/patient/login/send-sms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email })
}).then(res => res.json()).then(data => {
  console.log("SMS send result:", data);
  
  // Now try to verify with the test code (this will fail but show us the flow)
  return fetch("http://localhost:5000/api/patient/login/verify-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, smsCode: testCode })
  });
}).then(res => res.json()).then(data => {
  console.log("SMS verify result:", data);
}).catch(err => {
  console.error("Error:", err);
});

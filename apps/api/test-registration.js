const fetch = require('node-fetch');

async function testRegistration() {
  const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'fr-FR'
    },
    body: JSON.stringify({
      email: "salafa5476@misehub.com",
      password: "password123",
      firstName: "Test",
      lastName: "User"
    })
  });

  const data = await response.json();
  console.log('Response:', data);
  console.log('Status:', response.status);
}

testRegistration().catch(console.error);

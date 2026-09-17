const http = require('http');

http.get('http://localhost:3001/dashboard/home/overview', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    if (data.includes('view_in_ar')) {
      console.log('3D button is present in the HTML output on port 3001.');
    } else {
      console.log('3D button NOT found in the HTML output on port 3001.');
    }
  });
}).on('error', (err) => {
  console.log('Error hitting localhost:3001:', err.message);
});

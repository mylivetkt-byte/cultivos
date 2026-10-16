import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/tables/modules',
  method: 'GET',
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', error => {
  console.error(error);
});

req.end();

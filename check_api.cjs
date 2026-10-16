const http = require('http');
http.get('http://127.0.0.1:3002/api/table/com_empresas_transportadoras/data', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});

http.get('http://127.0.0.1:3002/api/table/com_empresas_transportadoras/structure', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});

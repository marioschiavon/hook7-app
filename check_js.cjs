const https = require('https');

https.get('https://app.hook7.com.br', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^\.]+\.js)"/);
    if (match) {
      const jsUrl = 'https://app.hook7.com.br' + match[1];
      console.log('Fetching:', jsUrl);
      https.get(jsUrl, (jsRes) => {
        let jsData = '';
        jsRes.on('data', chunk => jsData += chunk);
        jsRes.on('end', () => {
          console.log('Found supabaseUrl is required:', jsData.includes('supabaseUrl is required'));
          console.log('Found kfsvpbujmetlendgwnrs:', jsData.includes('kfsvpbujmetlendgwnrs'));
          console.log('JS Size:', jsData.length);
        });
      });
    } else {
      console.log('No JS bundle found in HTML');
    }
  });
}).on('error', err => console.error(err));

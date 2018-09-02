var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');

var USER_AGENT = 'Coconut/2.2.0 (NodeJS)';

module.exports = {

  submit(configContent, apiKey, callback) {
    var coconutURL = url.parse(process.env.HEYWATCH_URL || 'https://api.coconut.co');

    if(!apiKey) {
      apiKey = process.env.COCONUT_API_KEY;
    }

    var reqOptions = {
      hostname: coconutURL.hostname,
      port: coconutURL.port || (coconutURL.protocol === 'https:' ? 443 : 80),
      path: '/v1/job',
      method: 'POST',
      auth: `${apiKey}:`,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'text/plain',
        Accept: 'application/json',
        'Content-Length': configContent.length
      }
    };

    function handleError(e) {
      console.log(`problem with request: ${e.message}`);
      if(callback) {
        callback(null);
      }
    }

    var req = (coconutURL.protocol === 'https:' ? https : http).request(reqOptions, (res) => {
      res.setEncoding('utf8');
      var responseString = '';

      res.on('data', (data) => {
        responseString += data;
      });

      res.on('end', () => {
        try{
          var resultObject = JSON.parse(responseString);
          if(callback) {
            callback(resultObject);
          }
        } catch(e) {
          handleError(e);
        }
      });
    });

    req.on('error', handleError);

    req.write(configContent);
    req.end();
  },

  config(options) {
    var conf_file = options.conf;
    var conf;
    if(conf_file) {
      conf = fs.readFileSync(conf_file, 'utf8').split('\n');
    } else{
      conf = [];
    }

    var {
      vars,
      source,
      webhook,
      outputs,
    } = options;

    if(vars) {
      Object.entries(outputs).forEach(([v, value]) => {
        conf.push(`var ${v} = ${String(value)}`);
      });
    }

    if(source) {
      conf.push(`set source = ${source}`);
    }

    if(webhook) {
      conf.push(`set webhook = ${webhook}`);
    }

    if(outputs) {
      Object.entries(outputs).forEach(([format, value]) => {
        conf.push(`-> ${format} = ${String(value)}`);
      });
    }

    var new_conf = [];
    new_conf = new_conf.concat(conf.filter(l => l.indexOf('var') === 0).sort());
    new_conf.push('');
    new_conf = new_conf.concat(conf.filter(l => l.indexOf('set') === 0).sort());
    new_conf.push('');
    new_conf = new_conf.concat(conf.filter(l => l.indexOf('->') === 0).sort());

    return new_conf.join('\n');
  },
  createJob(options, callback) {
    this.submit(this.config(options), options.api_key, callback);
  }
};

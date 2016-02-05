var child_process = require('child_process');
var http=require('http');
var express = require('express');
var bodyParser=require('body-parser');
var handleYield=require('handleYield');
var app = express();
var server = http.createServer(app).listen(7000); //required fro socket.io
var io = require('socket.io').listen(server);
app.use(bodyParser.json());

/*app.get('/', function (req, res) {
   res.render('index');
});*/
app.get('/', function(req, res){
  res.render('dist/index.html');
});
var genericDataFunction=function(data, fullData, callback){
  data=data.split(/\\n/g);
  var n=data.length;
  data[0]=fullData+data[0];
  for(var i=0; i<(n-1);i++){
    callback(data[i]);
    return "";
  }
  if(n===1){
    return data[0];
  }

  /*if(data.endsWith("\n")){ //requires new node!
    fullData+=data.substr(0, data.length-3);
    callback(fullData);
    fullData="";
  }
  else{
    fullData+=data;
  }
  return fullData;*/
}
io.on('connection', function(socket) {
  console.log("connected");
  var marketRisk="";
  var opsRisk="";
  var creditRisk="";
  socket.on('marketrisk', function(data) { //send MC to child
    var currentData="";
    marketRisk = child_process.spawn('./OptionPricing',
      {
        stdio: [
          'pipe', //pipe parent to child
          'pipe', // pipe child's stdout to parent
          'pipe' // pipe
        ]
      }
    );
    marketRisk.stdout.setEncoding('utf8');
    marketRisk.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    marketRisk.on('close', function (code) {
        console.log('child process marketRisk exited with code ' + code);
    });
    marketRisk.stdout.on('data', function (data) {
      currentData=genericDataFunction(data, currentData, function(data){
        //if(data)
        socket.emit('marketRisk-data', data);

        //console.log(data);
      });
        //socket.emit('marketRisk-data', data.toString('utf8'));
    });
  });
  socket.on('opsrisk', function(data) { //send MC to child
    console.log("opsrisk");
    var currentData="";
    opsRisk = child_process.spawn('./opsRisk',
      {
        stdio: [
          'pipe', //pipe parent to child
          'pipe', // pipe child's stdout to parent
          'pipe' // pipe
        ]
      }
    );
    opsRisk.stdout.setEncoding('utf8');
    opsRisk.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    opsRisk.stdout.on('data', function (data) {
      currentData=genericDataFunction(data, currentData, function(data){
        socket.emit('opsRisk-data', data);
      });
      //console.log(data.toString('utf8'));
        //socket.emit('opsRisk-data', data.toString('utf8'));
    });
  });
  socket.on('creditrisk', function(data) { //send MC to child
    var currentData="";
    var progressData="";
    creditRisk = child_process.spawn('./creditRisk',
      {
        stdio: [
          'pipe', //pipe parent to child
          'pipe', // pipe child's stdout to parent
          'pipe' // pipe
        ]
      }
    );
    creditRisk.stdout.setEncoding('utf8');
    creditRisk.stderr.setEncoding('utf8');
    creditRisk.stderr.on('data', function (data) {
        progressData=genericDataFunction(data, progressData, function(data){
          //console.log(data);
          socket.emit('progress', data);
        });
    });
    creditRisk.stdout.on('data', function (data) {
      currentData=genericDataFunction(data, currentData, function(data){
        //console.log(data);
        socket.emit('creditRisk-data', data);
      });
      //console.log(data.toString('utf8'));
        //socket.emit('creditRisk-data', data.toString('utf8'));
    });
  });
  socket.on('getYield', function(data) { //if "submit" is clicked ona  project page
    if(marketRisk){
      var yields=new handleYield(marketRisk);
      yields.retreiveLiborAndSwap(marketRisk);
    }
    else{
      console.log("market Risk not yet defined");
    }

  });
  socket.on('getMarket', function(data) { //send MC to child
      marketRisk.stdin.write(JSON.stringify(data));
      marketRisk.stdin.write("\n");
  });
  socket.on('getOps', function(data) { //send MC to child
      console.log("got to 110");
      //console.log(data);
      opsRisk.stdin.write(JSON.stringify(data));
      opsRisk.stdin.write("\n");
  });
  socket.on('getCredit', function(data) { //send MC to child
      creditRisk.stdin.write(JSON.stringify(data));
      creditRisk.stdin.write("\n");
  });
  socket.on('disconnect', function(){
      console.log("disconnect");
      if(marketRisk){
        marketRisk.kill();
      }
      if(opsRisk){
        opsRisk.kill();
      }
      if(creditRisk){
        creditRisk.kill();
      }
  });
});

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const request = require('request');
const convert = require('xml-js');

// Prepare btoa & atob functions for base64 encode/decode
global.Buffer = global.Buffer || require('buffer').Buffer;

if (typeof btoa === 'undefined') {
    global.btoa = function (str) {
        return new Buffer(str).toString('base64');
    };
}

if (typeof atob === 'undefined') {
    global.atob = function (b64Encoded) {
        return new Buffer(b64Encoded, 'base64').toString();
    };
}

// Ignore self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

// Events from renderer
const {ipcMain} = require('electron');

let defaultHeaders = {};
let defaultServerUrl = '';
let defaultUser = '';

ipcMain.on('get-status', (event, arg) => {

  let headers = {'Authorization' : 'Basic ' + btoa(arg.user + ':' + arg.password) };

  let options = {
    url: arg.serverUrl + '/finesse/api/User/' + arg.user,
    method: 'GET',
    headers: headers
  };

  // store the header & url
  defaultHeaders = headers;
  defaultServerUrl = arg.serverUrl;
  defaultUser = arg.user;

  request(options, (error,response,body) => {

    if (error) {
      console.error(error);
    } else {

      let reply = convert.xml2json(body, {compact: true});
      let replyObj = JSON.parse(reply);

      console.log(reply);

      event.sender.send('get-status-reply', replyObj);
    }

  })


});


ipcMain.on('set-status', (event,arg) => {

    let headers = defaultHeaders;
    headers['Content-Type'] = 'application/xml';

    let options = {
        url: defaultServerUrl + '/finesse/api/User/' + defaultUser,
        method: 'PUT',
        headers: defaultHeaders,
        body: '<User><state>' + arg.status + '</state></User>'
    }

    request(options, (error,response,body) => {

        if (error) {
            console.error(error);
        } else {
            console.log(response);
            event.sender.send('set-status-reply', 'OK')
        }

    });

});
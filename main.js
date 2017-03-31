const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const fs = require('fs')

const xmpp = require('simple-xmpp')

const request = require('request')
const convert = require('xml-js')

const userDataPath = (electron.app || electron.remote.app).getPath('userData');

// Prepare btoa & atob functions for base64 encode/decode
global.Buffer = global.Buffer || require('buffer').Buffer

if (typeof btoa === 'undefined') {
    global.btoa = function (str) {
        return new Buffer(str).toString('base64')
    }
}

if (typeof atob === 'undefined') {
    global.atob = function (b64Encoded) {
        return new Buffer(b64Encoded,'base64').toString()
    }
}

// Ignore self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 300,height: 300})

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname,'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Emitted when the window is closed.
    mainWindow.on('closed',function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready',createWindow)

// Quit when all windows are closed.
app.on('window-all-closed',function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate',function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// Events from renderer
const {ipcMain} = require('electron')

let persistedHeaders = {};
let persistedServerUrl = '';
let persistedUser = '';
let persistedExtension = '';
let persistedPort = '';

function parseStanza(stanza){

    if (stanza.children[0] != undefined && stanza.children[0].hasOwnProperty('name')){

        switch(stanza.children[0].name) {

            case 'query':
                console.log('found query');
                break;

            case 'event':
                console.log('found event');

                let eventStanza = stanza.children[0].children[0].children[0].children[0].children[0];

                let reply = convert.xml2json(eventStanza,{compact: true});

                // TODO: send event to renderer to handle change in agent state

                break;
        }

    }
}

ipcMain.on('load-config',(event, arg) => {

    console.log('MAIN: load-config');

    let config = {};

    try {
        // Read the config file
        config = fs.readFileSync(path.join(userDataPath, '/config.json'));
        config = JSON.parse(config);
    } catch (err) {

        console.log('error reading config file');

        let newConfig = {
            serverUrl: '',
            user: '',
            extension: '',
            password: '',
            port: '8445'
        }

        // Write a blank config file
        fs.writeFileSync(path.join(userDataPath, '/config.json'), JSON.stringify(newConfig), (err) => {
            if (err) throw err;
        });

        config = newConfig;
    }

    event.sender.send('load-config-reply', config);
})

ipcMain.on('save-config',(event,arg) => {

    // arg should equal the config

    fs.writeFileSync(path.join(userDataPath, '/config.json'), JSON.stringify(arg), (err) => {
        if (err) throw err;
    });
    console.log('config saved');

})

ipcMain.on('start-xmpp-listener', (event,arg) => {

    xmpp.on('online', function(data) {
        console.log('Connected with JID: ' + data.jid.user);
    });

    xmpp.on('error', function(err) {
        console.error(err);
    });

    xmpp.on('stanza', (stanza) => parseStanza(stanza));


    xmpp.connect({
        jid	: arg.user + '@' + arg.serverUrl,
        password: arg.password,
        host: arg.serverUrl,
        port: 5222
});

})

ipcMain.on('stop-xmpp-listener',(event,arg) => {

})

ipcMain.on('agent-login',(event,arg) => {

    let headers = {'Authorization': 'Basic ' + btoa(arg.user + ':' + arg.password)}

    let options = {
        url: 'https://' + arg.serverUrl + ':' + arg.port + '/finesse/api/User/' + arg.user,
        method: 'PUT',
        headers: headers,
        body: '<User><state>LOGIN</state><extension>' + arg.extension + '</extension></User>'
    }

    // store the header & url
    persistedHeaders = headers;
    persistedServerUrl = arg.serverUrl;
    persistedUser = arg.user;
    persistedExtension = arg.extension;
    persistedPort = arg.port;

    headers['Content-Type'] = 'application/xml';

    request(options,(error,response,body) => {

        if (error) {
            console.error('MAIN: login error')
        } else {
            //console.log(response)
            event.sender.send('agent-login-reply','OK')
        }

    })


})

ipcMain.on('get-status',(event,arg) => {

    let headers = {'Authorization': 'Basic ' + btoa(arg.user + ':' + arg.password)}

    let options = {
        url: 'https://' + arg.serverUrl + ':' + arg.port + '/finesse/api/User/' + arg.user,
        method: 'GET',
        headers: headers
    }

    request(options,(error,response,body) => {

        if (error) {
            console.error(error)
        } else {

            let reply = convert.xml2json(body,{compact: true})
            let replyObj = JSON.parse(reply)

            event.sender.send('get-status-reply',replyObj)
        }

    })


})

ipcMain.on('set-status',(event,arg) => {

    let headers = persistedHeaders
    headers['Content-Type'] = 'application/xml'

    let options = {
        url: 'https://' + persistedServerUrl + ':' + persistedPort + '/finesse/api/User/' + persistedUser,
        method: 'PUT',
        headers: persistedHeaders,
        body: '<User><state>' + arg.status + '</state></User>'
    }

    request(options,(error,response,body) => {

        if (error) {
            //console.error(error)
        } else {
            //console.log(response)
            event.sender.send('set-status-reply','OK')
        }

    })

})
const {ipcRenderer} = require('electron');

let activeConfig = {
    serverUrl: '',
    user: '',
    extension: '',
    password: '',
    port: ''
}

let status = 'Not Logged In';

function loadConfig(){

    ipcRenderer.send('load-config', '');

}

function saveConfig(){

    ipcRenderer.send('save-config', activeConfig);

}

function agentLogin(){

    activeConfig.user = document.getElementById('userTextInput').value;
    activeConfig.password = document.getElementById('passwordTextInput').value;
    activeConfig.serverUrl = document.getElementById('serverUrlTextInput').value;
    activeConfig.extension = document.getElementById('extensionTextInput').value;
    activeConfig.port = document.getElementById('portTextInput').value;

    ipcRenderer.send('agent-login', activeConfig);
}

function getStatus(){

    ipcRenderer.send('get-status', {
        user: activeConfig.user,
        password: activeConfig.password,
        serverUrl: activeConfig.serverUrl,
        port: activeConfig.port
    });

}

function changeStatus(){

    let newStatus ='';
    if (status == 'NOT_READY'){
        newStatus = 'READY';
    } else if (status == 'READY'){
        newStatus = 'NOT_READY';
    } else {

    }

    ipcRenderer.send('set-status', { status: newStatus });
}

function startXmppListener(){
    ipcRenderer.send('start-xmpp-listener',activeConfig);
}

function renderPage(){

    document.getElementById('currentState').innerHTML = status;

    document.getElementById('serverUrlTextInput').value = activeConfig.serverUrl;
    document.getElementById('portTextInput').value = activeConfig.port;
    document.getElementById('userTextInput').value = activeConfig.user;
    document.getElementById('extensionTextInput').value = activeConfig.extension;
    document.getElementById('passwordTextInput').value = activeConfig.password;
    document.getElementById('port').value = activeConfig.port;

}

function initialPageRender(){

    loadConfig();

    // Add new event listeners
    document
        .querySelector('#agentLoginButton')
        .addEventListener('click', (event) => {
            agentLogin();
        });

    document
        .querySelector('#setStatusButton')
        .addEventListener('click', (event) => {
            changeStatus();
        })

    // Update changed variables
    document.getElementById('currentState').innerHTML = status;
}


ipcRenderer.on('load-config-reply', (event,arg) => {

    console.log('Renderer: load-config-reply');

    // The loaded config or blank config should be returned in arg
    activeConfig = arg;

    renderPage();

});

ipcRenderer.on('save-config-reply', (event,arg) => {
    // TODO: Inform user that the config has been saved
});

ipcRenderer.on('get-status-reply', (event,arg) => {

    status = arg.User.state._text;

    renderPage();

});

ipcRenderer.on('set-status-reply', (event,arg) => {

    if (arg == 'OK') {

        if (status == 'READY') {
            status = 'NOT_READY';
        }

        else if (status == 'NOT_READY') {
            status = 'READY';
        }

    }

    renderPage();

});

ipcRenderer.on('agent-login-reply', (event,arg) => {

    if (arg === 'OK') {

        getStatus();
        saveConfig();

        startXmppListener();
    }


});

initialPageRender();

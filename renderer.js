const {ipcRenderer} = require('electron');

let user = '';
let password = '';
let serverUrl = '';
let status = 'Not Logged In';

function agentLogin(){

    user = document.getElementById('userTextInput').value;
    password = document.getElementById('passwordTextInput').value;
    serverUrl = document.getElementById('serverUrlTextInput').value;
    extension = document.getElementById('extensionTextInput').value;

    ipcRenderer.send('agent-login', { user: user, password: password, serverUrl: serverUrl, extension: extension} );
}

function getStatus(){

    ipcRenderer.send('get-status', { user: user, password: password, serverUrl: serverUrl} );

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

function renderPage(){

    document.getElementById('currentState').innerHTML = status;

}

function initialPageRender(){
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



// Listen for events for get status
ipcRenderer.on('get-status-reply', (event, arg) => {

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
    }


});

initialPageRender();

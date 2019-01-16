/* NOTE
 - Unicast
socket.emit('random-event', randomContent);
 - Broadcast
socket.broadcast.emit('random-event', randomContent);
 - broadcast + unicast
io.emit('random-event', randomContent);
*/

// Tout d'abbord on initialise notre application avec le framework Express et la bibliothèque http integrée à node.
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//Array contenant tous les users connectés
var users = [];
//Array contenant l'historique de message
var messages = []; 
//Array contenant tous les users en cours de saisie
var typingUsers = [];

// On gère les requêtes HTTP des utilisateurs en leur renvoyant les
//fichiers du dossier 'public'
app.use("/", express.static(__dirname + "/public"));

// On lance le serveur en écoutant les connexions arrivant sur le
//port 3000
http.listen(3000, function(){
console.log('Server is listening on *:3000');
});

//Event de connection
io.on('connection' ,function(socket){
    var loggedUser;
    console.log('a user connected');
    for (i = 0; i < users.length; i++) { //Envoie la liste des users connectés
        socket.emit('user-login', users[i]);
    }

    for (i = 0; i < messages.length; i++) { //Envoi de la liste des messages(historique)
        if (messages[i].username !== undefined) { //Si un pseudo associé
            socket.emit('chat-message', messages[i]); //Envoi message "normal"
        }  
        else {
            socket.emit('service-message', messages[i]); //Envoi message co/deco
        }
    }

    //Event de déconnexion
    socket.on('disconnect', function () {
        if (loggedUser !== undefined) //Si on a le pseudo
        {
            console.log('user disconnected : ' + loggedUser.username); 
            //Message de déco
            var serviceMessage = 
            {
                text: 'User "' + loggedUser.username + '" disconnected',
                type: 'logout' //Indique qu'il s'agit d'une déco
            };
            //Envoi du message en broadcast
            socket.broadcast.emit('service-message', serviceMessage);
            // Suppression de la liste des connectés
            var userIndex = users.indexOf(loggedUser);
            if (userIndex !== -1) {
                users.splice(userIndex, 1); //Enlève l'user de l'array
            }
            // Ajout du message à l'historique
            messages.push(serviceMessage);
            // Emission d'un 'user-logout' contenant le user en broadcast + unicast
            io.emit('user-logout', loggedUser); 
            //Enlève l'user de la liste des utilisateurs en cours de saisie (cas ou déco brusque)
            var typingUserIndex = typingUsers.indexOf(loggedUser); //Récupère index
            if (typingUserIndex !== -1) { //Si dans liste
                typingUsers.splice(typingUserIndex, 1); //Suppression
            }

        }
    }); 

    socket.on('user-login', function (user) {
        loggedUser = user;
        if (loggedUser !== undefined) {
            var serviceMessage = { 
                text: 'User "' + loggedUser.username + '" logged in',
                type: 'login'
            };
            socket.broadcast.emit('service-message', serviceMessage);
        }
    }); 

    socket.on('chat-message',function(message){//Réception d'un message
        message.username =  loggedUser.username; //Ajout du pseudo 
        io.emit('chat-message', message);//Envoi du message à tout le monde
        console.log('Message de : ' + loggedUser.username); 
        messages.push(message); //Ajoute le message à l'array message
        if(messages.length > 150){ //Si + de 150 msgs
            messages.splice(0,1); //Supprime le plus ancien
        }
    });

    socket.on('user-login', function (user, callback) { //Login user + vérif
        // Vérification que l'utilisateur n'existe pas
        var userIndex = -1;
        for (i = 0; i < users.length; i++) {
            if (users[i].username === user.username) { //Vérifie les pseudos 1 à 1
            userIndex = i; //Remplace l'index
            }
        }   
        if (user !== undefined && userIndex === -1) { // S'il est bien nouveau 
            // Sauvegarde de l'utilisateur et ajout à la liste des connectés
            loggedUser = user;
            users.push(loggedUser);
            // Envoi des messages de service
            var userServiceMessage = {
                text: 'You logged in as "' + loggedUser.username + '"',
                type: 'login'
            };
            var broadcastedServiceMessage = {
                text: 'User "' + loggedUser.username + '" logged in',
                type: 'login'
            };
            socket.emit('service-message', userServiceMessage); //Envoi à "soi-même"
            messages.push(broadcastedServiceMessage); //Ajout à l'array msg
            io.emit('user-login', loggedUser);
            callback(true); //Set le callback
        } 
        else {
            callback(false);
        }
    }); 

    socket.on('start-typing', function () { //User commence la saisie
        // Ajout du user à la liste des utilisateurs en cours de saisie
        if (typingUsers.indexOf(loggedUser) === -1) {
            typingUsers.push(loggedUser);
        }
        io.emit('update-typing', typingUsers); //Envoi de l'update
    });

    socket.on('stop-typing', function () { //User à fini la saise
        var typingUserIndex = typingUsers.indexOf(loggedUser); //Va rechercher l'user
        if (typingUserIndex !== -1) { //Si dans l'array
            typingUsers.splice(typingUserIndex, 1); //On le remove
        }
        io.emit('update-typing', typingUsers); //Envoi de l'update
    }); 
});


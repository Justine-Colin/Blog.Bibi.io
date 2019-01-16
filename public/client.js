/*jslint browser: true*/  //Permet de reconnaitre "window"

/* NOTE
 - Unicast
socket.emit('random-event', randomContent);
 - Broadcast
socket.broadcast.emit('random-event', randomContent);
 - broadcast + unicast
io.emit('random-event', randomContent);
*/

var socket = io(); //Accès à socket.io

/*Connexion d'un utilisateur*/ 
$('#login form').submit(function (e) {   //Connexion d'un utilisateur
    e.preventDefault();   // On évite le recharchement de la page lors de la validation du formulaire.
    var user = {     //On crée l'objet user
        username : $('#login input').val().trim()   
    };   
    if (user.username.length > 0) { // Si le champ de connexion n'est pas vide
        socket.emit('user-login', user, function (success) { //Callback pour vérif si pas doublon pseudo
            if (success) { //Si pseudo unique
                $('body').removeAttr('id'); // Cache formulaire de connexion
                $('#chat input').focus(); // Focus sur le champ du message
            }
        });
    }
});

$('form').submit(function(e) {
    e.preventDefault(); // On évite le recharchement de la page lors de la 
    //validation du formulaire. On crée notre objet JSON correspondant à notre message
    var message = {
        text : $('#m').val()
    };
    
    $('#m').val(''); // On vide le champ texte
    if (message.text.trim().length !== 0) { // Gestion message vide
        socket.emit('chat-message', message);
    }
    $('#chat input').focus(); // Focus sur le champ du message   
});

//* NOTE Le tag <li> n'est pas OBLIGÉ d'être fermé
socket.on('chat-message', function (message){//Reception message
    $('#messages').append($('<li>').html('<span class="username">' + message.username + '</span> ' + message.text + '</li>'));
     //Affichage
     scrollToBottom(); 
});

//* NOTE Le tag <li> n'est pas OBLIGÉ d'être fermé
/*Réception d'un message de service*/ 
socket.on('service-message', function (message) {     
    $('#messages').append($('<li class="' + //Ajout du message de service à l'array message
    message.type + //Login or logout en tant qu'id de l'élément de liste
    '">').html('<span class="info">Information :</span> ' + //"Information :" écrit devant le message
    message.text + '</li>')); //Message de co/déco
    scrollToBottom(); //Retour en bas
});

/*Scroll vers le bas de page si l'utilisateur n'est pas remonté pour lire d'anciens messages*/
function scrollToBottom() {
    if ($(window).scrollTop() + //scrollTop mesure la distance entre le haut de la page et le haut de la partie visible en px
    $(window).height() + 2 * $(' #messagesli ').last().outerHeight() >= $(document).height()) { //outerHeight : taille avec padding et autres
        $("html, body").animate({ scrollTop: $(document).height() }, 0);
    }
} 

//* NOTE Le tag <li> n'est pas OBLIGÉ d'être fermé
/*Connexion d'un nouvel utilisateur*/
socket.on('user-login', function (user) {
    $('#users').append($('<li class="' + user.username + //On met le nom d'utilisateur en classe pour pouvoir le retrouver à la déco
    ' new ">').html(user.username + //Ajout de l'user à la liste users
        '<span class="typing"> typing</span>' + '</li>')); //Si en cours de saisie, typing s'affiche à coté
    setTimeout(function () {//Après 1s on enlève new pour changer la couleur de fond
        $('#users li.new').removeClass('new');
    }, 1000);
});

/*Déconnexion d'un utilisateur*/
socket.on('user-logout', function (user) {
    var selector = '#users li.' + user.username; //va rechercher le <li> avec le pseudo
    $(selector).remove(); //L'enlève de l'array
});

/*Saisie en cours*/
var typingTimer; //Pour le timeout, ici 0.5s
var isTyping = false;
$('#m').keypress(function () { //Détecte la pression sur une touche
    clearTimeout(typingTimer); //Reset du timeout
    if (!isTyping) { //Si début saisie
        socket.emit('start-typing'); //Envoi event
        isTyping = true;
    }
});

/*Saisie terminée*/
$('#m').keyup(function () { //Plus de touches pressée
    clearTimeout(typingTimer); //Reset timeout
    typingTimer = setTimeout(function () { //Lance le timeout de 0.5s
        if (isTyping) { //Si fin cours
            socket.emit('stop-typing'); //Envoi event
            isTyping = false;
        }
    }, 500);
}); 

/*Gestion saisie des autres utilisateurs*/
socket.on('update-typing', function (typingUsers) { //Quand qq'un écrit
    $('#users li span.typing').hide(); //Cache les <span>typing</span>
    for (i = 0; i < typingUsers.length; i++) { //Pour chaque user en saisie
        $('#users li.' + typingUsers[i].username + ' span.typing').show(); //Montre la span associée
    }
});
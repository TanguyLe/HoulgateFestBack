exports.getShotgunNotificationContent = (owner, room, users) => {
    return `<head>
            <style>
            </style>
        </head>
        Félicitations, tu as trouvé un endroit où dormir dans la belle villa des Gênets!
        <br/>
        <p>
        Récapitulatif de ton shotgun:
            <ul>
                <li>${owner} a réservé la chambre "${room}"</li>
                <li> Compagnons de chambre :
                    <ul>${users.map((user) => `<li>${user}</li>`).join('')}</ul>
                </li>
        </p>
        <b>Merci et à bientôt!</b>
        <br/>
    <i>Au cas où tu te poses la question c'est un message automatique, ça sert à rien de répondre banane.</i>`;
};

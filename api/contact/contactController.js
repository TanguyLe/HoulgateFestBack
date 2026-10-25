let mail = require("../mail/mailController"),
    { escapeHtml } = require("../utils/html"),
    { sendServerError } = require("../utils/errors");

// The confirmation is mailed to the sender, so only accept a single plain address
const EMAIL_REGEX = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

exports.send = (req, res) => {
    try {
        let replyTo = req.body.mailContent && req.body.mailContent.mail;
        if (typeof replyTo !== "string" || replyTo.length > 254 || !EMAIL_REGEX.test(replyTo))
            return res.status(400).send({ message: "Invalid email address" });

        // mailSender sends the text as HTML, so every user-provided field is escaped
        let form = {};
        for (let field of ["firstname", "lastname", "phone", "mail", "content"])
            form[field] = escapeHtml(req.body.mailContent[field]);

        let title = `Mail de ${form.firstname} ${form.lastname}`;
        let content = `Joignable au ${form.phone}, ou par mel au ${form.mail}.
            Contenu de la demande : ${form.content}`;
        let mailContent = {
            to: "houlgatefest@gmail.com",
            subject: title,
            text: content,
        };

        mail.mailSender(mailContent, (err) => {
            if (err) return sendServerError(res, err);
            let contactAnswer = {
                to: replyTo,
                subject: "Demande de contact reçue",
                // No copy of the message: the address is unverified, so this would relay any text to anyone
                text: "Nous avons bien reçu votre demande, nous vous répondrons au plus vite.",
            };

            mail.mailSender(contactAnswer, (err) => {
                if (err) return sendServerError(res, err);
                return res.sendStatus(200);
            });
        });
    } catch (err) {
        return sendServerError(res, err);
    }
};

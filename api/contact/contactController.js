let mail = require("../mail/mailController"),
    { escapeHtml } = require("../utils/html");

exports.send = (req, res) => {
    try {
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
            if (err) {
                return res.status(err.httpStatusCode || 500).send({
                    meta: {
                        error_type: err.name || "Error 500 : Internal Server Error",
                        code: err.httpStatusCode || "500",
                        error_message:
                            err.message ||
                            "Some error occurred while sending contact request mail. Please retry later.",
                    },
                });
            }
            let contactAnswer = {
                to: req.body.mailContent.mail,
                subject: "Demande de contact reçue",
                text: `Nous avons bien reçu votre demande. Ci-joint une copie du message envoyé : 
                "${form.content}"`,
            };

            mail.mailSender(contactAnswer, (err) => {
                if (err) {
                    return res.status(err.httpStatusCode || 500).send({
                        meta: {
                            error_type: err.name || "Error 500 : Internal Server Error",
                            code: err.httpStatusCode || "500",
                            error_message:
                                err.message ||
                                "Some error occurred while sending contact answer mail.",
                        },
                    });
                }
                return res.sendStatus(200);
            });
        });
    } catch (err) {
        console.error("Catch error :" + err);
        return res.status(500).send(err);
    }
};

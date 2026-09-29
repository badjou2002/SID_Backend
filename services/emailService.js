const nodemailer = require('nodemailer');


// Configuration du service d'envoi des emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Erreur SMTP :", error.message);
  } else {
    console.log("✅ Connexion SMTP réussie");
  }
});


// Envoyer le code de confirmation
const sendVerificationEmail = async (email, code) => {

  await transporter.sendMail({
    from: `"Job Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Confirmation de votre compte',

    text: `
Votre code de vérification est : ${code}

Ce code expire dans 10 minutes.
`
  });
};


// Envoyer le code de réinitialisation
const sendPasswordResetEmail = async (email, code) => {

  await transporter.sendMail({
    from: `"Job Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe',

    text: `
Votre code de réinitialisation est : ${code}

Ce code expire dans 10 minutes.
`
  });
};


module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
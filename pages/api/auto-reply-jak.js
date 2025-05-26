import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // 1. Configuration des en-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-secret');

  // 2. Vérification de la méthode HTTP
  if (req.method !== 'POST') {
    console.warn('Méthode non autorisée:', req.method);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // 3. Vérification du secret API
  const apiSecret = req.headers['x-api-secret'];
  if (apiSecret !== process.env.API_SECRET_KEY) {
    console.error('Authentification échouée - Secret API invalide');
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // 4. Validation des données d'entrée
  const { to, from, subject, messageId, body } = req.body;
  if (!from || !subject || !messageId) {
    console.error('Champs manquants dans la requête:', req.body);
    return res.status(400).json({ 
      error: 'Champs obligatoires manquants',
      required: ['from', 'subject', 'messageId']
    });
  }

  // 5. Configuration du transporteur SMTP
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER1,
        pass: process.env.SMTP_PASSWORD1,
      },
      debug: true,
      logger: true
    });
  } catch (error) {
    console.error('Erreur de configuration SMTP:', error);
    return res.status(500).json({ 
      error: 'Erreur de configuration du serveur mail',
      details: error.message
    });
  }

  // 6. Préparation de l'email
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: to,
    subject: `Re: ${subject}`,
    text: body || 'Merci pour votre message. Nous traitons votre demande.',
    inReplyTo: messageId,
    references: messageId,
  };

  // 7. Envoi de l'email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès:', info.messageId);
    return res.status(200).json({ 
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error);
    return res.status(500).json({ 
      error: 'Échec de l\'envoi du email',
      details: error.message,
      smtpError: error.response
    });
  }
}
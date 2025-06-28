// Fichier : netlify/functions/send-simulation.js
// Mis à jour pour gérer le simulateur de rentabilité par quartier

const { Resend } = require('resend');

// --- Helper function to format the main body of the email based on the theme ---
function getEmailBody(theme, data) {
    const { objectifs, resultats } = data;
    const commonFooter = `
        <p style="margin-top: 25px;">Pour une analyse complète et des conseils adaptés à votre situation, n'hésitez pas à nous contacter.</p>
        <br>
        <p>Cordialement,</p>
        <p><strong>L'équipe Aeternia Patrimoine</strong></p>
    `;

    // --- Cas Spécial : Simulateur de Rentabilité Bordeaux ---
    if (theme === 'Rentabilité Bordeaux') {
        let scenariosHtml = '';
        resultats.forEach(scenario => {
            scenariosHtml += `
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong style="color: #00877a;">${scenario.quartier}:</strong> ${scenario.rendement}<br>
                    <small style="color: #555;">Loyer: ${scenario.loyer} | Prix: ${scenario.prix}</small>
                </div>
            `;
        });

        return `
            <p>Merci d'avoir utilisé notre comparateur de rentabilité pour Bordeaux. Voici le résumé de votre simulation :</p>
            <h3 style="color: #333;">Vos paramètres :</h3>
            <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
                <li><strong>Type de bien :</strong> ${objectifs.typeBien}</li>
                <li><strong>Budget d'investissement :</strong> ${objectifs.budget}</li>
            </ul>
            <h3 style="color: #333;">Résultats du comparatif :</h3>
            <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px;">
                ${scenariosHtml}
            </div>
            ${commonFooter}
        `;
    }
    
    // ... (ici, les autres templates que nous avons déjà faits pour les autres simulateurs) ...
    // Fallback
    return `<p>Merci d'avoir utilisé nos services.</p>${commonFooter}`;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = JSON.parse(event.body);
    const { email, data, theme = 'default' } = body;

    if (!data) {
        throw new Error("Données de simulation manquantes.");
    }
    
    const emailSubjects = {
        'Rentabilité Bordeaux': "Votre comparatif de rentabilité locative à Bordeaux",
        // ... (autres sujets)
        'default': `Votre simulation Aeternia Patrimoine`
    };

    const subject = emailSubjects[theme] || emailSubjects['default'];
    const emailBodyHtml = getEmailBody(theme, data);

    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #333;">Bonjour,</h2>
          ${emailBodyHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
          <p style="font-size: 10px; color: #777; text-align: center; margin-top: 20px;">
            Les informations et résultats fournis par ce simulateur sont donnés à titre indicatif et non contractuel. Ils sont basés sur les hypothèses de calcul et les paramètres que vous avez renseignés et ne constituent pas un conseil en investissement.
          </p>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email envoyé avec succès !' }),
    };

  } catch (error) {
    console.error("Erreur dans la fonction Netlify :", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }),
    };
  }
};

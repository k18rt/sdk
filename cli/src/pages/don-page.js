/**
 * don-page.js  —  remplace don.js
 *
 * Équivalences React → Lit :
 *   DonPageStyles (<style> inline)   → balise <style> dans render() (pas de Shadow DOM)
 *   DonateStripeButton handleClick   → méthode _handleStripeClick()
 *   useGlobalContext                 → non utilisé dans ce fichier
 *
 * Dépendance externe à ajouter :
 *   npm install @stripe/stripe-js
 */

import { LitElement, html } from 'lit'
import { loadStripe } from '@stripe/stripe-js'

// Initialisation Stripe au niveau module, identique à React
const stripePromise = loadStripe(
  'pk_test_51SMpA2HXvJcxIQDmFT2gZuvSwBlXTdAGwrU7GJVnRDFB4Uy3dtHKdCu8CmuZYrI3Fi7IoCwZZ0IUyUVDQps86SDz00PYrtzGFr'
)

export class DonPage extends LitElement {
  // Pas de Shadow DOM : les classes .pg-container / .pg-header viennent de main.css
  createRenderRoot() { return this }

  // Équivalent de handleClick dans DonateStripeButton
  async _handleStripeClick() {
    try {
      const stripe   = await stripePromise
      const response = await fetch('http://localhost:4242/create-checkout-session')
      if (!response.ok) {
        console.error('Erreur HTTP:', await response.text())
        alert('Une erreur est survenue côté serveur.')
        return
      }
      const data = await response.json()
      if (!data.id) {
        console.error('Réponse inattendue:', data)
        alert('Impossible de créer la session de paiement.')
        return
      }
      await stripe.redirectToCheckout({ sessionId: data.id })
    } catch (error) {
      console.error('Erreur côté client:', error)
      alert('Erreur réseau ou Stripe indisponible.')
    }
  }

  render() {
    return html`
      <!-- Styles scoped identiques à DonPageStyles de React -->
      <style>
        .choices-container {
          display: grid; gap: 20px;
          grid-template-columns: 1fr;
          align-items: stretch; width: 100%; max-width: 100%;
        }
        @media (min-width: 1060px) {
          .choices-container { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        }
        .choice-card {
          background: white; border: 1px solid #EFE7E4;
          border-radius: var(--radius-xl); padding: 2rem 2.5rem;
          box-shadow: var(--shadow); display: flex; flex-direction: column;
          align-items: center; gap: 1rem; transition: box-shadow 0.3s ease;
          color: var(--terracotta-700); position: relative; padding-bottom: 2rem;
        }
        .choice-card:hover { box-shadow: 0 10px 30px rgba(93,44,40,.3); }
        .choice-card h2    { font-size: 1.75rem; margin: 0.5rem 0 0 0; }
        .choice-card p     { line-height: 1.6; margin: 0 0 auto 0; min-height: 80px; }
        .choice-card .icon { width: 50px; height: 50px; color: var(--terracotta-500); margin-bottom: 0.5rem; }
        .choice-buttons {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; padding: 12px 0 0 0; position: relative; bottom: 0;
        }
        .choice-buttons > *:only-child { grid-column: 1 / -1; }
        .choice-button {
          padding: 12px 24px; border-radius: 999px; font-weight: 700; font-size: 1rem;
          background: var(--terracotta-200); color: var(--terracotta-700);
          border: 1px solid var(--terracotta-300); cursor: pointer; transition: background 0.2s ease;
        }
        .choice-button:hover {
          background: var(--terracotta-300); border-color: var(--terracotta-400); transform: scale(1.05);
        }
        .stripe-btn {
          background: #635BFF; color: #fff; border: none;
          padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 1rem;
        }
        .stripe-btn:hover { background: #4b44d4; }
      </style>

      <div class="pg-container">
        <header class="pg-header">
          <h1>Faire un don</h1>
          <p style="text-align:left;">
            Tu passes de bons moments ici ? Aide-nous à aller plus loin !
            Un don, petit ou grand, nous permet de garder ce projet vivant.
          </p>
        </header>

        <!-- Équivalent de <DonateStripeButton /> -->
        <button class="stripe-btn" @click=${() => this._handleStripeClick()}>
          Soutenir (Carte bancaire via Stripe)
        </button>
      </div>
    `
  }
}

customElements.define('don-page', DonPage)

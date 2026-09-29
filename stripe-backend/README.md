# AGR CRM Payments Backend

Vercel serverless function used by the AGR Solutions LLC CRM to create Stripe Payment Links securely.

## Required Vercel environment variable

STRIPE_SECRET_KEY

Use a Stripe test secret key first. Never commit the key to GitHub.

## Endpoint

POST /api/create-payment-link

Body:
- amount
- caseId
- clientName
- service
- clientEmail

The function returns the Stripe Payment Link URL.

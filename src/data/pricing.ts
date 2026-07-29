export interface Plan {
  eyebrow: string;
  name: string;
  price: string;
  cadence: string;
  note: string;
  features: string[];
  highlighted: boolean;
}

export const plans: Plan[] = [
  {
    eyebrow: 'Entry',
    name: 'Basic',
    price: '$129.99',
    cadence: '/mo',
    note: '3-month term or $100 signup fee',
    features: [
      'Up to 2 classes per week',
      'Karate & BJJ included',
    ],
    highlighted: false,
  },
  {
    eyebrow: 'Most Popular',
    name: 'Core',
    price: '$159.99',
    cadence: '/mo',
    note: 'No signup fee · No term limit',
    features: [
      'Unlimited classes (Karate & BJJ)',
      'Adult / Youth / Kids',
      'No signup fees',
    ],
    highlighted: true,
  },
  {
    eyebrow: 'Premium',
    name: 'Elite',
    price: '$209.99',
    cadence: '/mo',
    note: 'Fastest progress',
    features: [
      'Everything in Core',
      '1 private lesson/month (30 min)',
      '15% gear discount',
    ],
    highlighted: false,
  },
];

// Lowest published monthly membership price, for lightweight cross-page mentions.
export const startingPlan = plans[0];
export const startingPriceLabel = `${startingPlan.price}${startingPlan.cadence}`;

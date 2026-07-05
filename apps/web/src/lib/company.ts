/** Yuletide Lighting Co. — public website constants */

export const COMPANY = {
  name: 'Yuletide Lighting Co.',
  shortName: 'Yuletide',
  tagline: 'Professional Christmas Light Installation',
  phone: '870-588-7841',
  phoneHref: 'tel:+18705887841',
  email: 'info@yuletidelightingco.com',
  emailHref: 'mailto:info@yuletidelightingco.com',
  bookingDeadline: 'December 17',
  seasonYear: 2025,
  region: 'Eastern & Southeast Arkansas',
} as const;

export const SERVICE_CITIES = [
  'DeWitt',
  'Stuttgart',
  'Pine Bluff',
  'Helena',
  'West Memphis',
  'Forrest City',
  'Monticello',
  'Warren',
  'McGehee',
  'Brinkley',
  'Marianna',
  'Hazen',
] as const;

export const TRUST_STATS = [
  { value: '100%', label: 'Fully insured' },
  { value: 'LED', label: 'Energy-efficient' },
  { value: 'Oct–Dec', label: 'Install season' },
  { value: 'Jan+', label: 'Takedown & storage' },
] as const;

export const PROCESS_STEPS = [
  { step: '01', title: 'Free consultation', desc: 'We visit your property, learn your vision, and walk the layout together.' },
  { step: '02', title: 'Custom design', desc: 'Rooflines, trees, pathways — a tailored plan that fits your style and budget.' },
  { step: '03', title: 'Professional install', desc: 'Our trained crew installs with commercial-grade gear and strict safety protocols.' },
  { step: '04', title: 'Enjoy the season', desc: 'Sit back and soak in the glow. We handle maintenance if anything needs attention.' },
  { step: '05', title: 'Takedown & storage', desc: 'After the holidays we remove, organize, and store your lights for next year.' },
] as const;

export const SERVICES = [
  {
    id: 'residential',
    title: 'Residential Lighting',
    desc: 'Transform your home into a seasonal showstopper with custom roofline lighting, tree wraps, pathway glow, and architectural accents.',
    highlights: ['Roofline & gutter lighting', 'Tree wraps & landscape', 'Pathway & entryway', 'Design to takedown'],
  },
  {
    id: 'commercial',
    title: 'Commercial Lighting',
    desc: 'Make your business shine and draw festive foot traffic with elegant installations tailored to your brand and storefront.',
    highlights: ['Storefront & signage', 'Parking & walkways', 'Brand-aligned colors', 'HOA & municipal compliant'],
  },
  {
    id: 'events',
    title: 'Event Lighting',
    desc: 'Weddings, corporate gatherings, festivals, and private celebrations — ambient lighting that sets the perfect mood.',
    highlights: ['Weddings & receptions', 'Corporate events', 'Festivals & parades', 'Private celebrations'],
  },
] as const;

export const TESTIMONIALS = [
  {
    quote: 'They turned our farmhouse into something out of a magazine. Zero stress — they handled everything from design to takedown.',
    name: 'Sarah M.',
    location: 'Stuttgart, AR',
  },
  {
    quote: 'Our storefront looked incredible all season. Customers kept stopping to take photos. Worth every penny.',
    name: 'James T.',
    location: 'Pine Bluff, AR',
  },
  {
    quote: 'Professional, on time, and the storage service means we never touch a tangled strand again. Already booked for next year.',
    name: 'Linda & Robert K.',
    location: 'DeWitt, AR',
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: 'When should I book my installation?',
    a: `Spots fill quickly! We recommend booking early — installations run October through mid-December. Contact us before ${COMPANY.bookingDeadline} to secure your ${COMPANY.seasonYear} date.`,
  },
  {
    q: 'What areas do you serve?',
    a: `We proudly serve ${COMPANY.region}, including ${SERVICE_CITIES.slice(0, 4).join(', ')}, and surrounding communities.`,
  },
  {
    q: 'Do you provide the lights?',
    a: 'Yes. We supply commercial-grade LED lighting in a wide range of colors and styles. Returning clients can use our off-season storage program.',
  },
  {
    q: 'What if a bulb goes out during the season?',
    a: 'Our maintenance team responds promptly. Customer support is included throughout the season — just call or email us.',
  },
  {
    q: 'Are you insured?',
    a: 'Absolutely. We are fully insured and follow strict safety protocols to protect your property.',
  },
] as const;

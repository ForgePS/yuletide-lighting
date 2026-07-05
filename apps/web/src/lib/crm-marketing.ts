import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  Calendar,
  Clock,
  FileText,
  GitBranch,
  HardHat,
  Image,
  Kanban,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Receipt,
  Route,
  Star,
  Users,
  Warehouse,
  Zap,
} from 'lucide-react';

export const CRM_PRODUCT = {
  name: 'Yuletide CRM',
  tagline: 'The all-in-one platform to run, grow, and scale your Christmas light company.',
  supportEmail: 'hello@yuletidelightingco.com',
  trialDays: 14,
} as const;

export const CRM_STATS = [
  { label: 'Platform modules', value: '18+', detail: 'Sales through field ops' },
  { label: 'Free trial', value: '14 days', detail: 'No credit card to start' },
  { label: 'Team seats', value: '10 incl.', detail: '$7/mo per extra user' },
] as const;

export const CRM_WORKFLOW = [
  {
    step: '01',
    title: 'Capture leads',
    description: 'Track every inquiry from first call through signed agreement with pipeline stages and customer profiles.',
  },
  {
    step: '02',
    title: 'Sell with confidence',
    description: 'Build proposals with packages, mockups, and e-signatures — then invoice and collect payments in one flow.',
  },
  {
    step: '03',
    title: 'Run the install season',
    description: 'Schedule crews, optimize routes, track inventory, and give field teams a mobile app with time clock and photos.',
  },
  {
    step: '04',
    title: 'Rebook & grow',
    description: 'Automate review requests, rebooking campaigns, yard sign tracking, and year-over-year customer retention.',
  },
] as const;

export type CrmModule = {
  key: string;
  label: string;
  description: string;
  category: 'Sales' | 'Operations' | 'Business' | 'Growth';
  icon: LucideIcon;
  highlights: string[];
};

export const CRM_MODULES: CrmModule[] = [
  {
    key: 'pipeline',
    label: 'Pipeline',
    category: 'Sales',
    icon: GitBranch,
    description: 'Visual sales pipeline from lead to signed job.',
    highlights: ['Custom stages', 'Lead source tracking', 'Activity history'],
  },
  {
    key: 'customers',
    label: 'Customers & properties',
    category: 'Sales',
    icon: Users,
    description: 'Customer CRM with properties, contacts, and install notes.',
    highlights: ['Multi-property accounts', 'Contact roles', 'Service history'],
  },
  {
    key: 'proposals',
    label: 'Proposals',
    category: 'Sales',
    icon: FileText,
    description: 'Professional proposals with packages, line items, and online approval.',
    highlights: ['Templates & packages', 'E-sign ready', 'Customer portal links'],
  },
  {
    key: 'mockups',
    label: 'Design mockups',
    category: 'Sales',
    icon: Image,
    description: 'Visual design studio and AI-assisted mockups for sales presentations.',
    highlights: ['Photo overlays', 'Design library', 'Share with customers'],
  },
  {
    key: 'jobs',
    label: 'Jobs',
    category: 'Operations',
    icon: Kanban,
    description: 'Job board from scheduled through installed with materials and checklists.',
    highlights: ['Stage tracking', 'Material reservations', 'Completion workflows'],
  },
  {
    key: 'crew',
    label: 'Crew management',
    category: 'Operations',
    icon: HardHat,
    description: 'Crew profiles, assignments, and a field-ready mobile experience.',
    highlights: ['Crew schedules', 'Field job details', 'Mobile app for installers'],
  },
  {
    key: 'schedule',
    label: 'Schedule & dispatch',
    category: 'Operations',
    icon: Calendar,
    description: 'Calendar, crew assignments, and customer appointment notifications.',
    highlights: ['Drag-and-drop calendar', 'Crew views', 'SMS reminders'],
  },
  {
    key: 'routes',
    label: 'Route planning',
    category: 'Operations',
    icon: Route,
    description: 'Optimize daily routes so crews spend less time driving.',
    highlights: ['Map-based planning', 'Stop ordering', 'Drive-time savings'],
  },
  {
    key: 'time_clock',
    label: 'Time clock',
    category: 'Operations',
    icon: Clock,
    description: 'GPS-backed clock in/out tied to jobs for payroll accuracy.',
    highlights: ['Job-linked entries', 'Field clock in', 'Office reporting'],
  },
  {
    key: 'invoices',
    label: 'Invoices & payments',
    category: 'Business',
    icon: Receipt,
    description: 'Invoicing, online pay links, and collections tracking.',
    highlights: ['Stripe payments', 'Payment portal', 'Past-due tracking'],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    category: 'Business',
    icon: Package,
    description: 'Warehouse, truck stock, and job material consumption.',
    highlights: ['Multi-location stock', 'Job reservations', 'Usage tracking'],
  },
  {
    key: 'commercial',
    label: 'Commercial accounts',
    category: 'Business',
    icon: Building2,
    description: 'Manage multi-site commercial clients and larger contracts.',
    highlights: ['Account hierarchy', 'Bulk properties', 'Contract tracking'],
  },
  {
    key: 'storage',
    label: 'Seasonal storage',
    category: 'Business',
    icon: Warehouse,
    description: 'Track customer lights in and out of storage between seasons.',
    highlights: ['Bin locations', 'Pull lists', 'Customer notifications'],
  },
  {
    key: 'sign_tracker',
    label: 'Sign tracker',
    category: 'Growth',
    icon: Megaphone,
    description: 'GPS yard sign campaigns with pickup routes and recovery stats.',
    highlights: ['Sign placement map', 'Pickup mode', 'Campaign reporting'],
  },
  {
    key: 'messages',
    label: 'Messages',
    category: 'Growth',
    icon: MessageSquare,
    description: 'SMS and email to customers and crews from one inbox.',
    highlights: ['Twilio SMS', 'Templates', 'Conversation history'],
  },
  {
    key: 'rebooking',
    label: 'Rebooking',
    category: 'Growth',
    icon: MapPin,
    description: 'Renewal campaigns to bring last season\'s customers back.',
    highlights: ['Season rollover', 'Outreach lists', 'Conversion tracking'],
  },
  {
    key: 'reviews',
    label: 'Reviews',
    category: 'Growth',
    icon: Star,
    description: 'Automated review requests after job completion.',
    highlights: ['Post-install triggers', 'Google review links', 'Reputation dashboard'],
  },
  {
    key: 'automation',
    label: 'Automation',
    category: 'Growth',
    icon: Zap,
    description: 'Workflow automations for follow-ups, reminders, and status changes.',
    highlights: ['Trigger-based rules', 'Email & SMS actions', 'Pipeline automation'],
  },
  {
    key: 'reports',
    label: 'Reports & analytics',
    category: 'Growth',
    icon: BarChart3,
    description: 'Revenue, pipeline, and operations reporting for owners.',
    highlights: ['Season dashboards', 'Revenue by city', 'Crew productivity'],
  },
];

export const CRM_TESTIMONIALS = [
  {
    quote: 'We replaced three spreadsheets and a group text thread. Crews actually use the mobile app — that alone paid for the subscription.',
    name: 'Mike R.',
    company: 'Holiday Lights Pro, TX',
  },
  {
    quote: 'Proposals go out the same day we measure. Customers approve online and we schedule the install without chasing paperwork.',
    name: 'Sarah K.',
    company: 'Bright Nights Lighting, GA',
  },
  {
    quote: 'Sign tracker changed our marketing. We know where every yard sign is and crews pick them up in the most efficient route.',
    name: 'Jason T.',
    company: 'Carolina Christmas Co.',
  },
] as const;

export const CRM_FAQ = [
  {
    q: 'Who is Yuletide CRM built for?',
    a: 'Professional Christmas light installation companies — residential and commercial crews that need proposals, scheduling, inventory, field tools, and rebooking in one system.',
  },
  {
    q: 'How does the free trial work?',
    a: 'Start a 14-day trial with no credit card. Invite your team, import customers, and run a real week of installs before you subscribe.',
  },
  {
    q: 'Is there a mobile app for crews?',
    a: 'Yes. Crew members get today\'s schedule, job details, photo capture, time clock, and sign tracking from their phone — plus a mobile-friendly field mode in the browser.',
  },
  {
    q: 'Can I migrate from another system?',
    a: 'Most teams start fresh for the season and import customers via spreadsheet. We offer an onboarding call on annual plans to help you set up pipelines, templates, and crew structure.',
  },
  {
    q: 'What does pricing include?',
    a: 'All platform modules, 10 user seats, unlimited customers and proposals, inventory, scheduling, and the crew mobile experience. Additional users are $7/month each.',
  },
  {
    q: 'Is Yuletide CRM the same company as Yuletide Lighting Co.?',
    a: 'Yuletide CRM is the software platform built by the team behind Yuletide Lighting Co. — shaped by real install-season operations in the field.',
  },
] as const;

export const CRM_NAV = [
  { href: '/for-installers', label: 'Overview', exact: true },
  { href: '/for-installers/features', label: 'Features' },
  { href: '/for-installers/pricing', label: 'Pricing' },
  { href: '/for-installers/contact', label: 'Contact' },
] as const;

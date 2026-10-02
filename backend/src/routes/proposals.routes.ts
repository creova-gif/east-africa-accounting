/**
 * Proposals Routes
 * Customer proposal requests and admin management.
 *
 * POST / is public lead intake. It stores only the fields the proposal UI
 * collects and does not echo them back. Unauthenticated submissions are owned
 * by PROPOSALS_INTAKE_TENANT_ID. If that variable is unset, intake fails closed
 * (503) and nothing is stored.
 *
 * Justin must configure:
 * - JWT_SECRET: existing auth secret. Protected routes reject every request
 *   when it is missing or blank.
 * - PROPOSALS_INTAKE_TENANT_ID: tenant id (the same value as the JWT tenantId
 *   claim) of the org that should see public proposal requests. Must match a
 *   real tenant or those leads are invisible to every logged-in user.
 *
 * GET, PATCH status, and POST invoice require authMiddleware. A proposal id
 * that belongs to another tenant is indistinguishable from a missing id (404).
 */

import { Router, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware';
import { salesConfiguratorService, SalesRecommendation } from '../services/salesConfigurator.service';

const router = Router();

const STATUSES = ['pending', 'approved', 'rejected', 'invoiced'] as const;
type ProposalStatus = (typeof STATUSES)[number];

interface StoredProposal {
  id: string;
  tenantId: string;
  createdByUserId: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  company_size: string;
  industry: string;
  countries: string[];
  needs_offline: boolean;
  modules_needed: string[];
  additional_info: string;
  status: ProposalStatus;
  created_at: string;
  recommendation?: SalesRecommendation;
  invoice_id?: string;
}

// In-memory storage (replace with database in production).
let proposals: StoredProposal[] = [];

export function resetProposalsForTests(): void {
  proposals = [];
}

function authenticateIfPresent(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.headers.authorization) {
    next();
    return;
  }
  authMiddleware(req, res, next);
}

function asString(value: unknown, max: number): string | null {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    return null;
  }
  return trimmed;
}

function asStringArray(value: unknown): string[] | null {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 20) {
    return null;
  }
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0 || item.length > 100) {
      return null;
    }
    items.push(item.trim());
  }
  return items;
}

function toPublic(proposal: StoredProposal) {
  return {
    id: proposal.id,
    company_name: proposal.company_name,
    contact_name: proposal.contact_name,
    email: proposal.email,
    phone: proposal.phone,
    company_size: proposal.company_size,
    industry: proposal.industry,
    countries: proposal.countries,
    needs_offline: proposal.needs_offline,
    modules_needed: proposal.modules_needed,
    additional_info: proposal.additional_info,
    status: proposal.status,
    created_at: proposal.created_at,
    ...(proposal.recommendation ? { recommendation: proposal.recommendation } : {}),
  };
}

function findOwned(id: string, tenantId: string): StoredProposal | undefined {
  return proposals.find((proposal) => proposal.id === id && proposal.tenantId === tenantId);
}

function notFound(res: Response) {
  return res.status(404).json({ error: 'Proposal not found' });
}

/**
 * POST /api/v1/proposals
 * Submit a proposal request (customer-facing). Does not return stored PII.
 */
router.post('/', authenticateIfPresent, async (req: AuthRequest, res: Response) => {
  try {
    const intakeTenantId = process.env.PROPOSALS_INTAKE_TENANT_ID?.trim() || '';
    const tenantId = req.user?.tenantId || intakeTenantId;
    if (!tenantId) {
      return res.status(503).json({
        error: 'Proposal intake is not configured',
      });
    }

    const body = req.body ?? {};
    const companyName = asString(body.company_name, 200);
    const contactName = asString(body.contact_name, 200);
    const email = asString(body.email, 320);
    const phone = asString(body.phone, 40);
    const companySize = asString(body.company_size, 50);
    const industry = asString(body.industry, 100);
    const countries = asStringArray(body.countries);
    const modulesNeeded = asStringArray(body.modules_needed);
    const additionalInfo = asString(body.additional_info, 2000);

    if (
      companyName === null ||
      contactName === null ||
      email === null ||
      phone === null ||
      companySize === null ||
      industry === null ||
      countries === null ||
      modulesNeeded === null ||
      additionalInfo === null ||
      (body.needs_offline !== undefined && typeof body.needs_offline !== 'boolean')
    ) {
      return res.status(400).json({ error: 'Invalid proposal' });
    }

    const proposal: StoredProposal = {
      id: randomUUID(),
      tenantId,
      createdByUserId: req.user?.userId ?? null,
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      company_size: companySize,
      industry,
      countries,
      needs_offline: body.needs_offline === true,
      modules_needed: modulesNeeded,
      additional_info: additionalInfo,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    proposals.push(proposal);

    return res.status(201).json({
      success: true,
      id: proposal.id,
      status: proposal.status,
      message: 'Proposal submitted successfully',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to submit proposal' });
  }
});

/**
 * GET /api/v1/proposals
 * Proposals owned by the caller's tenant.
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = proposals
      .filter((proposal) => proposal.tenantId === tenantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(toPublic);

    return res.json(owned);
  } catch {
    return res.status(500).json({ error: 'Failed to get proposals' });
  }
});

/**
 * GET /api/v1/proposals/:id
 * Single proposal owned by the caller's tenant.
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposal = findOwned(req.params.id, req.user!.tenantId);
    if (!proposal) {
      return notFound(res);
    }
    return res.json(toPublic(proposal));
  } catch {
    return res.status(500).json({ error: 'Failed to get proposal' });
  }
});

/**
 * PATCH /api/v1/proposals/:id/status
 * Update proposal status (approve/reject) for the caller's tenant.
 */
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposal = findOwned(req.params.id, req.user!.tenantId);
    if (!proposal) {
      return notFound(res);
    }

    const { status } = req.body ?? {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    proposal.status = status;

    return res.json({
      success: true,
      proposal: toPublic(proposal),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/v1/proposals/:id/invoice
 * Generate an invoice from an owned proposal. Response omits contact PII;
 * the management UI only checks that generation succeeded.
 */
router.post('/:id/invoice', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposal = findOwned(req.params.id, req.user!.tenantId);
    if (!proposal) {
      return notFound(res);
    }

    let recommendation = proposal.recommendation;
    if (!recommendation) {
      recommendation = await salesConfiguratorService.generate({
        company_size: proposal.company_size,
        industry: proposal.industry,
        countries: proposal.countries,
        offline_required: proposal.needs_offline,
        modules_needed: proposal.modules_needed,
        data_volume: 'medium',
        deployment_preference: 'undecided',
      });
      proposal.recommendation = recommendation;
    }

    const invoiceId = randomUUID();
    const invoice = {
      id: invoiceId,
      proposal_id: proposal.id,
      invoice_number: `INV-${Date.now()}`,
      items: [
        {
          description: `${recommendation.license_tier} Plan - ${recommendation.recommended_deployment} Deployment`,
          quantity: 1,
          unit_price: recommendation.pricing.license_fee,
          total: recommendation.pricing.license_fee,
        },
        {
          description: 'Setup & Implementation',
          quantity: 1,
          unit_price: recommendation.pricing.setup_fee,
          total: recommendation.pricing.setup_fee,
        },
      ],
      subtotal: recommendation.pricing.total_first_year,
      tax: 0,
      total: recommendation.pricing.total_first_year,
      status: 'draft',
      billing_frequency: recommendation.pricing.billing_frequency,
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    proposal.status = 'invoiced';
    proposal.invoice_id = invoice.id;

    return res.json({
      success: true,
      invoice,
      proposal: {
        id: proposal.id,
        status: proposal.status,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

export default router;

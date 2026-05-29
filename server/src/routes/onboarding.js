import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/onboarding — fetch current user's application
router.get('/', requireAuth, async (req, res) => {
  const app = await prisma.onboardingApplication.findUnique({
    where: { userId: req.user.id },
  })
  if (!app) return res.status(404).json({ error: 'Application not found' })
  res.json(app)
})

// PATCH /api/onboarding — save form fields + advance step
router.patch('/', requireAuth, async (req, res) => {
  const { legalName, dob, address, phone, ssn, currentStep } = req.body

  const app = await prisma.onboardingApplication.update({
    where: { userId: req.user.id },
    data: {
      ...(legalName    !== undefined && { legalName }),
      ...(dob          !== undefined && { dob }),
      ...(address      !== undefined && { address }),
      ...(phone        !== undefined && { phone }),
      ...(ssn          !== undefined && { ssn }),
      ...(currentStep  !== undefined && { currentStep }),
    },
  })
  res.json(app)
})

// POST /api/onboarding/analyze-documents — mock AI document analysis
// In production this would call a real OCR / AI service.
// Returns structured results after a short simulated delay.
router.post('/analyze-documents', requireAuth, async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 2000))

  res.json({
    confidence: 99,
    checks: [
      {
        title:  'Document authenticity check',
        sub:    'All 3 documents passed',
        status: 'complete',
      },
      {
        title:  'Data extraction',
        sub:    '14 fields extracted',
        status: 'complete',
      },
      {
        title:  'Fraud detection scan',
        sub:    'No fraud patterns detected',
        status: 'complete',
      },
      {
        title:  'Final confidence scoring',
        sub:    '99% overall confidence',
        status: 'complete',
      },
    ],
    extractedFields: {
      fullName: 'John A. Doe',
      dob:      '14 Mar 1985',
      address:  '142 W 57th St, Apt 4B, New York NY 10019',
      idNumber: 'D123-456-789',
    },
  })
})

export default router

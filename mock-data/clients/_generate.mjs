/* One-shot generator: produces realistic mock client folders under mock-data/clients/.
 * Run with `node mock-data/clients/_generate.mjs` â€” overwrites any existing files.
 * Safe to delete after running; kept for reproducibility.
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const w = (folder, name, data) => {
  fs.mkdirSync(folder, { recursive: true })
  fs.writeFileSync(path.join(folder, name + '.json'), JSON.stringify(data, null, 2))
}

/* â”€â”€ PERSONAL ADVISORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const personalAdvisory = [
  {
    slug: 'aisha-rahman',
    nationalId: {
      documentType: "Driver's License",
      issuedBy:   'Massachusetts RMV',
      idNumber:   'MA-RAHM-3421-AR',
      fullName:   'AISHA NOOR RAHMAN',
      dateOfBirth:'1991-04-08',
      address:    '14 Beacon Hill Ave, Boston, MA 02108',
      issueDate:  '2023-09-12',
      expiryDate: '2028-04-08',
    },
    salarySlip: {
      employer:      'Mass General Brigham',
      employeeId:    'MGB-44871',
      payPeriod:     'May 2026',
      payDate:       '2026-05-31',
      grossSalary:   9200,
      deductions: {
        federalTax: 1380, stateTax: 460, socialSecurity: 570, medicare: 133,
        healthInsurance: 285, pension401k: 552, other: 60,
      },
      totalDeductions: 3440,
      netPay:        5760,
      ytdGross:      46000,
    },
    bankStatement: {
      bank:           'Bank of America',
      accountHolder:  'Aisha N. Rahman',
      accountNumber:  '40122218',
      statementPeriod:'March 2026 â€“ May 2026',
      months: [
        { month: 'March 2026', openingBalance: 18400, totalCredits: 7100, totalDebits: 5800, closingBalance: 19700, salaryDeposit: 5760 },
        { month: 'April 2026', openingBalance: 19700, totalCredits: 7250, totalDebits: 6100, closingBalance: 20850, salaryDeposit: 5760 },
        { month: 'May 2026',   openingBalance: 20850, totalCredits: 7300, totalDebits: 6450, closingBalance: 21700, salaryDeposit: 5760 },
      ],
      averageMonthlyCredit:  7217,
      averageMonthlyDebit:   6117,
      averageClosingBalance: 20750,
    },
    personalTaxReturn: {
      taxYear:        2025,
      filingStatus:   'Married Filing Jointly',
      totalIncome:    110400,
      adjustments:    6624,
      adjustedGross:  103776,
      itemizedDeductions: 19200,
      taxableIncome:  84576,
      totalTax:       11420,
      withholdings:   12800,
      refund:         1380,
      schedules:      ['Schedule A', 'Schedule B'],
    },
    advisoryRequest: {
      goals: ['Retirement at 60', 'College fund for two children', 'Refinance student loan'],
      timeHorizonYears: 26,
      riskTolerance: 'Moderate',
      currentNetWorth: 145000,
      monthlySurplus: 1800,
    },
  },
  {
    slug: 'tomas-herrera',
    nationalId: {
      documentType: 'Passport',
      issuedBy:   'U.S. Department of State',
      idNumber:   '548-9912-77',
      fullName:   'TOMAS RICARDO HERRERA',
      dateOfBirth:'1973-11-26',
      address:    '892 Westheimer Rd, Houston, TX 77006',
      issueDate:  '2021-05-14',
      expiryDate: '2031-05-14',
    },
    salarySlip: {
      employer:      'Houston Independent School District',
      employeeId:    'HISD-22198',
      payPeriod:     'May 2026',
      payDate:       '2026-05-31',
      grossSalary:   6400,
      deductions: { federalTax: 880, stateTax: 0, socialSecurity: 397, medicare: 93, healthInsurance: 220, pension401k: 320, other: 40 },
      totalDeductions: 1950,
      netPay:        4450,
      ytdGross:      32000,
    },
    bankStatement: {
      bank:           'Chase',
      accountHolder:  'Tomas R. Herrera',
      accountNumber:  '40126614',
      statementPeriod:'March 2026 â€“ May 2026',
      months: [
        { month: 'March 2026', openingBalance: 2100, totalCredits: 5400, totalDebits: 5650, closingBalance: 1850, salaryDeposit: 4450, flags: ['low_balance'] },
        { month: 'April 2026', openingBalance: 1850, totalCredits: 5500, totalDebits: 5900, closingBalance: 1450, salaryDeposit: 4450, flags: ['low_balance'] },
        { month: 'May 2026',   openingBalance: 1450, totalCredits: 5300, totalDebits: 5780, closingBalance:  970, salaryDeposit: 4450, flags: ['low_balance', 'nsf_warning'] },
      ],
      averageMonthlyCredit:  5400,
      averageMonthlyDebit:   5777,
      averageClosingBalance: 1423,
    },
    personalTaxReturn: {
      taxYear:        2025,
      filingStatus:   'Single',
      totalIncome:    76800,
      adjustments:    3840,
      adjustedGross:  72960,
      itemizedDeductions: 13850,
      taxableIncome:  59110,
      totalTax:       7980,
      withholdings:   8600,
      refund:         620,
      schedules:      ['Schedule A'],
    },
    advisoryRequest: {
      goals: ['Consolidate high-interest credit card debt', 'Rebuild emergency fund', 'Catch-up retirement contributions'],
      timeHorizonYears: 12,
      riskTolerance: 'Conservative',
      currentNetWorth: 28000,
      monthlySurplus: -180,
      pressingConcerns: ['Two credit cards at 24% APR', 'Recent divorce settlement payments'],
    },
  },
]

/* â”€â”€ BUSINESS ADVISORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const businessAdvisory = [
  {
    slug: 'nair-logistics',
    certIncorporation: {
      legalName: 'Nair Logistics Inc.',
      ein: '47-3318822',
      stateOfIncorporation: 'New York',
      entityType: 'C-Corp',
      incorporationDate: '2018-02-14',
      registeredAgent: 'Corporate Filings LLC',
      principalOffice: '450 Park Ave, New York, NY 10022',
      directors: ['Priya Nair', 'Vinod Nair', 'Karthik Iyer'],
    },
    businessLicense: {
      licenseNumber: 'NY-COMM-44761',
      issuedBy: 'NY Department of State',
      issueDate: '2018-03-10',
      expiryDate: '2027-03-10',
      scope: 'Commercial freight & logistics',
    },
    auditedFinancials: {
      years: [
        { year: 2023, revenue: 7_240_000, cogs: 4_900_000, opex: 1_580_000, ebitda:   760_000, netIncome:   480_000, totalAssets: 6_100_000, totalLiabilities: 3_800_000, equity: 2_300_000, cashAndEquivalents:   810_000 },
        { year: 2024, revenue: 8_910_000, cogs: 5_950_000, opex: 1_840_000, ebitda: 1_120_000, netIncome:   720_000, totalAssets: 7_400_000, totalLiabilities: 4_350_000, equity: 3_050_000, cashAndEquivalents: 1_180_000 },
        { year: 2025, revenue:10_400_000, cogs: 7_020_000, opex: 2_010_000, ebitda: 1_370_000, netIncome:   910_000, totalAssets: 8_900_000, totalLiabilities: 5_100_000, equity: 3_800_000, cashAndEquivalents: 1_540_000 },
      ],
      auditor: 'Greenwich & Partners CPA',
      opinion: 'Unqualified',
    },
    corporateTaxReturn: {
      taxYear: 2025,
      grossReceipts: 10_400_000,
      deductions: 9_030_000,
      taxableIncome: 1_370_000,
      federalTax: 287_700,
      stateTax: 89_050,
      totalTax: 376_750,
      effectiveRate: 27.5,
    },
    corporateBankStatement: {
      bank: 'JPMorgan Chase',
      accountHolder: 'Nair Logistics Inc.',
      accountNumber: '40128401',
      statementPeriod: 'October 2025 â€“ May 2026',
      months: [
        { month: 'Oct 2025', totalCredits: 870_000, totalDebits: 740_000, closingBalance: 1_280_000 },
        { month: 'Nov 2025', totalCredits: 920_000, totalDebits: 810_000, closingBalance: 1_390_000 },
        { month: 'Dec 2025', totalCredits: 1_080_000, totalDebits: 990_000, closingBalance: 1_480_000 },
        { month: 'Jan 2026', totalCredits: 850_000, totalDebits: 800_000, closingBalance: 1_530_000 },
        { month: 'Feb 2026', totalCredits: 890_000, totalDebits: 830_000, closingBalance: 1_590_000 },
        { month: 'Mar 2026', totalCredits: 940_000, totalDebits: 860_000, closingBalance: 1_670_000 },
        { month: 'Apr 2026', totalCredits: 960_000, totalDebits: 880_000, closingBalance: 1_750_000 },
        { month: 'May 2026', totalCredits: 990_000, totalDebits: 920_000, closingBalance: 1_820_000 },
      ],
      averageMonthlyCredit: 937_500,
      averageMonthlyDebit: 853_750,
      averageClosingBalance: 1_564_000,
    },
    debtSchedule: {
      asOfDate: '2026-05-31',
      facilities: [
        { type: 'Equipment loan',     lender: 'Wells Fargo',  originalAmount: 1_200_000, balance:   720_000, rate: 6.25, monthlyPayment: 18_500, maturityDate: '2029-08-01', collateral: 'Fleet vehicles' },
        { type: 'Revolving LOC',      lender: 'Chase',        creditLimit:   1_500_000, balance:   480_000, rate: 7.50, monthlyInterestOnly: 3_000, maturityDate: '2027-12-31', collateral: 'AR pledge' },
        { type: 'Real estate mortgage', lender: 'Bank of America', originalAmount: 2_100_000, balance: 1_650_000, rate: 5.75, monthlyPayment: 12_800, maturityDate: '2038-06-01', collateral: 'Warehouse property' },
      ],
      totalDebt: 2_850_000,
      totalMonthlyDebtService: 34_300,
    },
    advisoryRequest: {
      goals: ['Expand fleet by 40%', 'Open second warehouse in Pennsylvania', 'Diversify customer base beyond top-3 concentration'],
      currentChallenges: ['Customer concentration: top 3 = 62% of revenue', 'Driver shortage limiting capacity'],
      timeHorizonYears: 3,
      contact: { name: 'Priya Nair', title: 'CEO', email: 'priya@nairlogistics.com', phone: '+1 212-555-8814' },
    },
  },
  {
    slug: 'chen-architects',
    certIncorporation: {
      legalName: 'Chen Architects LLC',
      ein: '88-4471209',
      stateOfIncorporation: 'California',
      entityType: 'LLC',
      incorporationDate: '2009-06-22',
      registeredAgent: 'CSC Corporation Services',
      principalOffice: '1100 Wilshire Blvd Suite 2200, Los Angeles, CA 90017',
      members: ['David Chen (founder, 65%)', 'Mei Chen (35%)'],
    },
    businessLicense: {
      licenseNumber: 'CA-ARCH-29104',
      issuedBy: 'California Architects Board',
      issueDate: '2009-07-15',
      expiryDate: '2027-07-15',
      scope: 'Architectural design & construction administration',
    },
    auditedFinancials: {
      years: [
        { year: 2023, revenue: 3_200_000, cogs: 1_840_000, opex:   980_000, ebitda: 380_000, netIncome: 245_000, totalAssets: 2_400_000, totalLiabilities: 700_000, equity: 1_700_000, cashAndEquivalents: 420_000 },
        { year: 2024, revenue: 3_580_000, cogs: 2_010_000, opex: 1_080_000, ebitda: 490_000, netIncome: 320_000, totalAssets: 2_710_000, totalLiabilities: 760_000, equity: 1_950_000, cashAndEquivalents: 560_000 },
        { year: 2025, revenue: 3_410_000, cogs: 1_980_000, opex: 1_120_000, ebitda: 310_000, netIncome: 195_000, totalAssets: 2_840_000, totalLiabilities: 740_000, equity: 2_100_000, cashAndEquivalents: 640_000 },
      ],
      auditor: 'Bracewell CPA',
      opinion: 'Unqualified',
      notes: '2025 revenue dip driven by two delayed public-sector projects',
    },
    corporateTaxReturn: {
      taxYear: 2025,
      grossReceipts: 3_410_000,
      deductions: 3_100_000,
      taxableIncome: 310_000,
      federalTax: 65_100,
      stateTax: 27_900,
      totalTax: 93_000,
      effectiveRate: 30.0,
      passThrough: true,
    },
    corporateBankStatement: {
      bank: 'East West Bank',
      accountHolder: 'Chen Architects LLC',
      accountNumber: '40120297',
      statementPeriod: 'October 2025 â€“ May 2026',
      months: [
        { month: 'Oct 2025', totalCredits: 295_000, totalDebits: 280_000, closingBalance: 580_000 },
        { month: 'Nov 2025', totalCredits: 310_000, totalDebits: 270_000, closingBalance: 620_000 },
        { month: 'Dec 2025', totalCredits: 340_000, totalDebits: 300_000, closingBalance: 660_000 },
        { month: 'Jan 2026', totalCredits: 250_000, totalDebits: 270_000, closingBalance: 640_000 },
        { month: 'Feb 2026', totalCredits: 280_000, totalDebits: 260_000, closingBalance: 660_000 },
        { month: 'Mar 2026', totalCredits: 300_000, totalDebits: 270_000, closingBalance: 690_000 },
        { month: 'Apr 2026', totalCredits: 310_000, totalDebits: 280_000, closingBalance: 720_000 },
        { month: 'May 2026', totalCredits: 320_000, totalDebits: 290_000, closingBalance: 750_000 },
      ],
      averageMonthlyCredit: 300_625,
      averageMonthlyDebit: 277_500,
      averageClosingBalance: 665_000,
    },
    debtSchedule: {
      asOfDate: '2026-05-31',
      facilities: [
        { type: 'Office build-out loan', lender: 'East West Bank', originalAmount: 600_000, balance: 280_000, rate: 5.50, monthlyPayment: 6_200, maturityDate: '2030-03-01' },
        { type: 'Equipment LOC',          lender: 'East West Bank', creditLimit:    250_000, balance:  85_000, rate: 7.00, monthlyInterestOnly: 500, maturityDate: '2027-06-30' },
      ],
      totalDebt: 365_000,
      totalMonthlyDebtService: 6_700,
    },
    advisoryRequest: {
      goals: ['Plan ownership succession (David retires in 5 years)', 'Buy out a junior partner', 'Smooth out revenue volatility'],
      currentChallenges: ['Founder bus-factor risk', 'Long collection cycles (avg 87 days)'],
      timeHorizonYears: 5,
      contact: { name: 'David Chen', title: 'Founder & Managing Principal', email: 'd.chen@chenarchitects.com', phone: '+1 310-555-7733' },
    },
  },
]

/* â”€â”€ PERSONAL LOAN (new, separate from existing 30) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const personalLoan = [
  {
    slug: 'diego-vargas',
    nationalId: {
      documentType: "Driver's License",
      issuedBy:   'Arizona MVD',
      idNumber:   'AZ-VARG-7762-DV',
      fullName:   'DIEGO ALEJANDRO VARGAS',
      dateOfBirth:'1989-07-19',
      address:    '305 N 5th Ave, Phoenix, AZ 85003',
      issueDate:  '2024-01-10',
      expiryDate: '2032-07-19',
    },
    salarySlip: {
      employer:      'Phoenix Solar Co.',
      employeeId:    'PSC-1188',
      payPeriod:     'May 2026',
      payDate:       '2026-05-31',
      grossSalary:   6800,
      deductions: { federalTax: 1020, stateTax: 180, socialSecurity: 422, medicare: 99, healthInsurance: 240, pension401k: 340, other: 49 },
      totalDeductions: 2350,
      netPay:        4450,
      ytdGross:      34000,
    },
    bankStatement: {
      bank: 'Wells Fargo',
      accountHolder: 'Diego A. Vargas',
      accountNumber: '40124477',
      statementPeriod: 'March 2026 â€“ May 2026',
      months: [
        { month: 'March 2026', openingBalance: 6200, totalCredits: 5300, totalDebits: 4900, closingBalance: 6600, salaryDeposit: 4450 },
        { month: 'April 2026', openingBalance: 6600, totalCredits: 5400, totalDebits: 4750, closingBalance: 7250, salaryDeposit: 4450 },
        { month: 'May 2026',   openingBalance: 7250, totalCredits: 5350, totalDebits: 4820, closingBalance: 7780, salaryDeposit: 4450 },
      ],
      averageMonthlyCredit: 5350,
      averageMonthlyDebit:  4823,
      averageClosingBalance: 7210,
    },
    personalTaxReturn: {
      taxYear: 2025, filingStatus: 'Single', totalIncome: 81600, adjustedGross: 77520,
      itemizedDeductions: 13850, taxableIncome: 63670, totalTax: 8550, withholdings: 9200, refund: 650,
    },
    creditReport: {
      bureau: 'Experian', pullDate: '2026-05-15', creditScore: 712, range: 'Good',
      paymentHistory: { onTimePercent: 98, latePayments24mo: 1 },
      utilizationPercent: 22,
      accounts: [
        { type: 'Credit card', limit: 5000, balance: 1100, status: 'current' },
        { type: 'Auto loan',   balance: 8400, monthlyPayment: 320, status: 'current' },
      ],
      derogatoryMarks: 0,
      inquiriesLast6mo: 2,
    },
    loanRequest: {
      type: 'Auto loan', amount: 32_000, termYears: 5, interestRate: 7.25,
      estimatedMonthlyPayment: 638, purpose: 'Replace 12-yr-old vehicle',
      vehicle: { make: 'Toyota', model: 'RAV4 Hybrid', year: 2025, dealerQuote: 34500 },
      downPayment: 2500,
    },
  },
  {
    slug: 'hana-yamamoto',
    nationalId: {
      documentType: "Driver's License",
      issuedBy:   'Washington DOL',
      idNumber:   'WA-YAMA-3318-HY',
      fullName:   'HANA YAMAMOTO',
      dateOfBirth:'1992-12-03',
      address:    '1207 Pine St #404, Seattle, WA 98101',
      issueDate:  '2023-04-22',
      expiryDate: '2029-12-03',
    },
    salarySlip: {
      employer:      'Microsoft Corporation',
      employeeId:    'MS-887412',
      payPeriod:     'May 2026',
      payDate:       '2026-05-31',
      grossSalary:   11500,
      deductions: { federalTax: 2070, stateTax: 0, socialSecurity: 713, medicare: 167, healthInsurance: 240, pension401k: 920, other: 90 },
      totalDeductions: 4200,
      netPay:        7300,
      ytdGross:      57500,
    },
    bankStatement: {
      bank: 'Wells Fargo',
      accountHolder: 'Hana Yamamoto',
      accountNumber: '40129102',
      statementPeriod: 'March 2026 â€“ May 2026',
      months: [
        { month: 'March 2026', openingBalance: 14200, totalCredits: 8400, totalDebits: 6900, closingBalance: 15700, salaryDeposit: 7300 },
        { month: 'April 2026', openingBalance: 15700, totalCredits: 8500, totalDebits: 7100, closingBalance: 17100, salaryDeposit: 7300 },
        { month: 'May 2026',   openingBalance: 17100, totalCredits: 8550, totalDebits: 7250, closingBalance: 18400, salaryDeposit: 7300 },
      ],
      averageMonthlyCredit: 8483,
      averageMonthlyDebit:  7083,
      averageClosingBalance: 17067,
    },
    personalTaxReturn: {
      taxYear: 2025, filingStatus: 'Single', totalIncome: 138000, adjustedGross: 131100,
      itemizedDeductions: 21500, taxableIncome: 109600, totalTax: 21300, withholdings: 22800, refund: 1500,
    },
    creditReport: {
      bureau: 'Equifax', pullDate: '2026-05-15', creditScore: 778, range: 'Very Good',
      paymentHistory: { onTimePercent: 100, latePayments24mo: 0 },
      utilizationPercent: 8,
      accounts: [
        { type: 'Credit card', limit: 12000, balance: 950, status: 'current' },
        { type: 'Credit card', limit: 8000,  balance: 0,   status: 'current' },
      ],
      derogatoryMarks: 0, inquiriesLast6mo: 1,
    },
    loanRequest: {
      type: 'Personal loan', amount: 45_000, termYears: 5, interestRate: 8.5,
      estimatedMonthlyPayment: 922, purpose: 'Condo renovation (kitchen + bathroom)',
    },
  },
]

/* â”€â”€ BUSINESS LOAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const businessLoan = [
  {
    slug: 'williams-ventures',
    certIncorporation: {
      legalName: 'Williams Ventures, Inc.',
      ein: '82-9047118',
      stateOfIncorporation: 'Texas',
      entityType: 'C-Corp',
      incorporationDate: '2015-09-30',
      registeredAgent: 'Texas Registered Agent LLC',
      principalOffice: '2100 Lake Austin Blvd, Austin, TX 78703',
      directors: ['Marcus Williams (CEO, 70%)', 'Jordan Williams (CFO, 30%)'],
    },
    businessLicense: {
      licenseNumber: 'TX-MFG-66218',
      issuedBy: 'Texas Department of Licensing',
      issueDate: '2015-10-22',
      expiryDate: '2028-10-22',
      scope: 'Light manufacturing & assembly',
    },
    auditedFinancials: {
      years: [
        { year: 2023, revenue: 12_400_000, cogs: 7_900_000, opex: 2_400_000, ebitda: 1_500_000, netIncome:   980_000, totalAssets: 11_200_000, totalLiabilities: 5_800_000, equity: 5_400_000, cashAndEquivalents: 1_350_000 },
        { year: 2024, revenue: 14_600_000, cogs: 9_120_000, opex: 2_800_000, ebitda: 1_880_000, netIncome: 1_240_000, totalAssets: 12_900_000, totalLiabilities: 6_400_000, equity: 6_500_000, cashAndEquivalents: 1_720_000 },
        { year: 2025, revenue: 17_200_000, cogs:10_700_000, opex: 3_200_000, ebitda: 2_310_000, netIncome: 1_520_000, totalAssets: 15_100_000, totalLiabilities: 7_300_000, equity: 7_800_000, cashAndEquivalents: 2_080_000 },
      ],
      auditor: 'Ranch & Berkner LLP', opinion: 'Unqualified',
    },
    corporateTaxReturn: {
      taxYear: 2025, grossReceipts: 17_200_000, deductions: 14_890_000, taxableIncome: 2_310_000,
      federalTax: 485_100, stateTax: 0, totalTax: 485_100, effectiveRate: 21.0,
    },
    corporateBankStatement: {
      bank: 'Frost Bank', accountHolder: 'Williams Ventures, Inc.', accountNumber: '40121730',
      statementPeriod: 'October 2025 â€“ May 2026',
      months: [
        { month: 'Oct 2025', totalCredits: 1_480_000, totalDebits: 1_310_000, closingBalance: 1_950_000 },
        { month: 'Nov 2025', totalCredits: 1_510_000, totalDebits: 1_350_000, closingBalance: 2_110_000 },
        { month: 'Dec 2025', totalCredits: 1_620_000, totalDebits: 1_410_000, closingBalance: 2_320_000 },
        { month: 'Jan 2026', totalCredits: 1_350_000, totalDebits: 1_280_000, closingBalance: 2_390_000 },
        { month: 'Feb 2026', totalCredits: 1_420_000, totalDebits: 1_330_000, closingBalance: 2_480_000 },
        { month: 'Mar 2026', totalCredits: 1_550_000, totalDebits: 1_380_000, closingBalance: 2_650_000 },
        { month: 'Apr 2026', totalCredits: 1_590_000, totalDebits: 1_420_000, closingBalance: 2_820_000 },
        { month: 'May 2026', totalCredits: 1_640_000, totalDebits: 1_460_000, closingBalance: 3_000_000 },
      ],
      averageMonthlyCredit: 1_520_000, averageMonthlyDebit: 1_367_500, averageClosingBalance: 2_465_000,
    },
    debtSchedule: {
      asOfDate: '2026-05-31',
      facilities: [
        { type: 'Equipment term loan',  lender: 'Frost Bank',  originalAmount: 1_800_000, balance: 1_050_000, rate: 6.00, monthlyPayment: 22_400, maturityDate: '2030-10-01', collateral: 'Mfg equipment' },
        { type: 'Revolving LOC',        lender: 'Frost Bank',  creditLimit:    2_500_000, balance:   620_000, rate: 7.25, monthlyInterestOnly: 3_750, maturityDate: '2028-03-31', collateral: 'AR + Inventory' },
      ],
      totalDebt: 1_670_000, totalMonthlyDebtService: 26_150,
    },
    personalGuarantor: {
      guarantor: 'Marcus Williams',
      relationship: 'CEO & 70% shareholder',
      personalNetWorth: 4_200_000,
      personalCreditScore: 791,
      personalLiquidAssets: 850_000,
      backingPercent: 100,
    },
    loanRequest: {
      type: 'Business loan', amount: 850_000, termYears: 7, interestRate: 6.5,
      estimatedMonthlyPayment: 12_640,
      purpose: 'Equipment financing â€” automated production line for new product launch',
      useOfFunds: { equipment: 720_000, installation: 90_000, training: 40_000 },
      collateral: 'Equipment being purchased',
    },
  },
  {
    slug: 'goldman-co',
    certIncorporation: {
      legalName: 'Goldman & Co., LLC',
      ein: '46-7712204',
      stateOfIncorporation: 'New York',
      entityType: 'LLC',
      incorporationDate: '2011-03-08',
      registeredAgent: 'CT Corporation System',
      principalOffice: '350 Fifth Avenue Suite 4400, New York, NY 10118',
      members: ['Rebecca Goldman (Managing Member, 100%)'],
    },
    businessLicense: {
      licenseNumber: 'NY-FIN-29874',
      issuedBy: 'NY Department of Financial Services',
      issueDate: '2011-04-14',
      expiryDate: '2027-04-14',
      scope: 'Financial advisory & consulting services',
    },
    auditedFinancials: {
      years: [
        { year: 2023, revenue: 9_800_000, cogs: 4_100_000, opex: 3_900_000, ebitda: 1_800_000, netIncome: 1_310_000, totalAssets: 7_400_000, totalLiabilities: 1_900_000, equity: 5_500_000, cashAndEquivalents: 2_100_000 },
        { year: 2024, revenue:11_200_000, cogs: 4_700_000, opex: 4_300_000, ebitda: 2_200_000, netIncome: 1_650_000, totalAssets: 8_600_000, totalLiabilities: 2_100_000, equity: 6_500_000, cashAndEquivalents: 2_700_000 },
        { year: 2025, revenue:12_900_000, cogs: 5_350_000, opex: 4_750_000, ebitda: 2_800_000, netIncome: 2_140_000, totalAssets: 9_900_000, totalLiabilities: 2_200_000, equity: 7_700_000, cashAndEquivalents: 3_400_000 },
      ],
      auditor: 'Sterling Hayes CPA', opinion: 'Unqualified',
    },
    corporateTaxReturn: {
      taxYear: 2025, grossReceipts: 12_900_000, deductions: 10_100_000, taxableIncome: 2_800_000,
      federalTax: 588_000, stateTax: 224_000, totalTax: 812_000, effectiveRate: 29.0, passThrough: true,
    },
    corporateBankStatement: {
      bank: 'JPMorgan Chase Private Bank', accountHolder: 'Goldman & Co., LLC', accountNumber: '40127799',
      statementPeriod: 'October 2025 â€“ May 2026',
      months: [
        { month: 'Oct 2025', totalCredits: 1_080_000, totalDebits:   850_000, closingBalance: 3_200_000 },
        { month: 'Nov 2025', totalCredits: 1_110_000, totalDebits:   870_000, closingBalance: 3_440_000 },
        { month: 'Dec 2025', totalCredits: 1_140_000, totalDebits:   910_000, closingBalance: 3_670_000 },
        { month: 'Jan 2026', totalCredits: 1_020_000, totalDebits:   860_000, closingBalance: 3_830_000 },
        { month: 'Feb 2026', totalCredits: 1_060_000, totalDebits:   880_000, closingBalance: 4_010_000 },
        { month: 'Mar 2026', totalCredits: 1_100_000, totalDebits:   910_000, closingBalance: 4_200_000 },
        { month: 'Apr 2026', totalCredits: 1_130_000, totalDebits:   930_000, closingBalance: 4_400_000 },
        { month: 'May 2026', totalCredits: 1_180_000, totalDebits:   960_000, closingBalance: 4_620_000 },
      ],
      averageMonthlyCredit: 1_102_500, averageMonthlyDebit: 896_250, averageClosingBalance: 3_921_000,
    },
    debtSchedule: {
      asOfDate: '2026-05-31',
      facilities: [
        { type: 'Office mortgage', lender: 'JPMorgan Chase', originalAmount: 1_800_000, balance: 1_100_000, rate: 4.75, monthlyPayment: 11_800, maturityDate: '2032-04-01', collateral: 'Office condo' },
      ],
      totalDebt: 1_100_000, totalMonthlyDebtService: 11_800,
    },
    personalGuarantor: {
      guarantor: 'Rebecca Goldman',
      relationship: 'Managing Member & 100% owner',
      personalNetWorth: 8_400_000,
      personalCreditScore: 818,
      personalLiquidAssets: 1_900_000,
      backingPercent: 100,
    },
    loanRequest: {
      type: 'Commercial property loan', amount: 2_400_000, termYears: 20, interestRate: 5.85,
      estimatedMonthlyPayment: 17_010,
      purpose: 'Acquire adjacent office floor for expansion',
      propertyAddress: '350 Fifth Avenue Floor 45, New York, NY 10118',
      propertyValue: 3_100_000, loanToValue: 77.4,
    },
  },
]

/* â”€â”€ Write everything â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const root = __dirname

const writePerson = (flow, person) => {
  const folder = path.join(root, flow, person.slug)
  for (const [docKey, docData] of Object.entries(person)) {
    if (docKey === 'slug') continue
    // camelCase â†’ kebab-case for filenames
    const name = docKey.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
    w(folder, name, docData)
  }
  // manifest (lightweight summary so we can list all clients quickly)
  w(folder, 'manifest', {
    slug:    person.slug,
    flow,
    documents: Object.keys(person).filter(k => k !== 'slug').map(k => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())),
  })
}

let count = 0
for (const p of personalAdvisory) { writePerson('personal-advisory', p); count++ }
for (const p of businessAdvisory) { writePerson('business-advisory', p); count++ }
for (const p of personalLoan)     { writePerson('personal-loan', p);     count++ }
for (const p of businessLoan)     { writePerson('business-loan', p);     count++ }

console.log(`Generated ${count} client folders under ${root}`)

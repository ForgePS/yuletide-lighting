#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const firebaseDir = path.join(root, 'packages/firebase/src');
const findings = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function add(file, line, rule, detail) {
  findings.push({
    severity: 'P0',
    file: path.relative(root, file).replaceAll('\\', '/'),
    line,
    rule,
    detail,
  });
}

const portalFiles = walk(firebaseDir).filter(
  (file) => /portal-[^/\\]+\.ts$/.test(file) && !/\.test\.ts$/.test(file),
);

for (const file of portalFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const codeWithoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  lines.forEach((line, index) => {
    if (/\bMath\.random\s*\(/.test(line)) {
      add(file, index + 1, 'insecure-random', 'Math.random is forbidden in portal secret paths');
    }
    if (/console\.(?:log|info|debug|warn|error)\s*\([^)]*\b(?:otp|token)\b/i.test(line)) {
      add(file, index + 1, 'secret-logging', 'possible OTP/token console logging');
    }
    if (
      /\b(?:invitationToken|otp|code)\s*:/.test(line) &&
      !/\b(?:invitationTokenHash|codeHash)\s*:/.test(line)
    ) {
      const context = lines.slice(Math.max(0, index - 14), index + 1).join('\n');
      if (/\b(?:colCreate|colUpdate|tx\.update|\.set|\.add)\s*\(/.test(context)) {
        add(file, index + 1, 'raw-secret-persistence', 'raw invitation token or OTP persistence');
      }
    }
  });

  if (
    file.endsWith(`${path.sep}portal-delivery.ts`) &&
    (!text.includes('refused in production') || !text.includes('live-disabled-s3'))
  ) {
    add(file, 1, 'delivery-fail-closed', 'delivery adapter lacks explicit production refusal');
  }

  if (
    !file.endsWith(`${path.sep}portal-delivery.ts`) &&
    /\b(?:getEmulatorOtpCaptures|getEmulatorInvitationCaptures|latestEmulatorOtp|setPortalDeliveryProviderForTests)\b/.test(
      codeWithoutComments,
    )
  ) {
    add(
      file,
      1,
      'test-delivery-bundle',
      'test delivery capture API referenced by production source',
    );
  }
}

const validatorsFile = path.join(root, 'packages/validators/src/portal360.ts');
if (!fs.existsSync(validatorsFile)) {
  add(validatorsFile, 1, 'claim-schema-missing', 'portal validators file is missing');
} else {
  const validators = fs.readFileSync(validatorsFile, 'utf8');
  const claim = validators.match(
    /export const portalClaimInvitationSchema\s*=\s*z\.object\(\{([\s\S]*?)\n\}\);/,
  );
  if (!claim) {
    add(validatorsFile, 1, 'claim-schema-missing', 'public invitation claim schema not found');
  } else if (/\b(?:role|organizationId|orgId|customerId)\s*:/.test(claim[1])) {
    const line = validators.slice(0, claim.index).split(/\r?\n/).length;
    add(
      validatorsFile,
      line,
      'client-authority',
      'public claim schema accepts client role/org/customer authority',
    );
  }
}

if (findings.length) {
  console.error('Portal auth security audit: FAIL');
  for (const finding of findings) {
    console.error(
      `[${finding.severity}] ${finding.rule} ${finding.file}:${finding.line} — ${finding.detail}`,
    );
  }
  process.exit(1);
}

console.log(
  `Portal auth security audit: PASS (${portalFiles.length} portal Firebase files scanned)`,
);

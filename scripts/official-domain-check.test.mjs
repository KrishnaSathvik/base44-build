import { expect, test } from 'vitest';
import { validateOfficialDomainConfiguration } from './official-domain-check.mjs';

test('repository configuration locks the official domain without coupling it to Base44', () => {
  expect(validateOfficialDomainConfiguration()).toEqual([]);
});

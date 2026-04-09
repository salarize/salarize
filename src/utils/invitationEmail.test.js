import { describe, expect, it } from 'vitest';
import {
  buildEmailCandidates,
  canonicalizeInvitationEmail,
  normalizeEmail,
} from './invitationEmail';

describe('invitationEmail', () => {
  it('normalizes email casing and whitespace', () => {
    expect(normalizeEmail('  User.Name@Example.COM ')).toBe('user.name@example.com');
  });

  it('canonicalizes gmail aliases to a stable mailbox key', () => {
    expect(canonicalizeInvitationEmail('First.Last+team@googlemail.com')).toBe('firstlast@gmail.com');
    expect(canonicalizeInvitationEmail('first.last+tag@gmail.com')).toBe('firstlast@gmail.com');
  });

  it('builds gmail candidate variations used for invitation lookup', () => {
    const candidates = buildEmailCandidates('first.last+ops@googlemail.com');

    expect(candidates).toEqual(
      expect.arrayContaining([
        'first.last+ops@googlemail.com',
        'first.last@gmail.com',
        'first.last@googlemail.com',
        'firstlast@gmail.com',
        'firstlast@googlemail.com',
      ])
    );
  });
});

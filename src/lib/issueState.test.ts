import { canTransition, transitionRequirementError } from '../../base44/shared/issue-state-machine';

test('allows only approved owner workflow transitions', () => {
  expect(canTransition('unreviewed','open')).toBe(true);
  expect(canTransition('open','planned')).toBe(true);
  expect(canTransition('planned','in_progress')).toBe(true);
  expect(canTransition('in_progress','testing')).toBe(true);
  expect(canTransition('testing','resolved')).toBe(true);
  expect(canTransition('resolved','open')).toBe(false);
  expect(canTransition('open','resolved')).toBe(false);
});

test('requires questions and resolution notes', () => {
  expect(transitionRequirementError('needs_info',{})).toMatch(/public question/i);
  expect(transitionRequirementError('needs_info',{publicMessage:'Can you share steps?'})).toBeNull();
  expect(transitionRequirementError('resolved',{})).toMatch(/resolution note/i);
});

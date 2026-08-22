import db, { initializeDatabase } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export function seedDatabase() {
  initializeDatabase();

  // Check if already seeded (by checking badges)
  const badgeCount = db.prepare('SELECT COUNT(*) as count FROM badges').get() as { count: number };
  if (badgeCount.count > 0) {
    return; // Already seeded
  }

  const insertBadge = db.prepare(
    'INSERT INTO badges (id, label, sub_text, icon, color, requirement) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    // --- Badges ---
    insertBadge.run(uuidv4(), 'Early Bird', '5 AM Sessions', 'verified', 'text-secondary', 'Complete 5 tasks before 6 AM');
    insertBadge.run(uuidv4(), 'Week Warrior', '7 Day Streak', 'flame', 'text-tertiary', 'Maintain a 7 day streak');
    insertBadge.run(uuidv4(), 'Code Ninja', '10 PRs Merged', 'terminal', 'text-primary', 'Complete 10 tasks');
    insertBadge.run(uuidv4(), 'Architect', 'Design System', 'lock', 'text-on-surface-variant', 'Complete Module 2');
    insertBadge.run(uuidv4(), 'Mentor', 'Help 5 Peers', 'lock', 'text-on-surface-variant', 'Help 5 other users');
    insertBadge.run(uuidv4(), 'Speedster', 'Under 30 Min', 'lock', 'text-on-surface-variant', 'Complete a task in under 30 minutes');
  });

  seedAll();
}

// If run directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
  console.log('✅ Database seeded successfully');
}
